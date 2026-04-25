from __future__ import annotations

import argparse
import json
import re
import shutil
import time
import urllib.parse
import urllib.request
from pathlib import Path
from urllib.error import HTTPError, URLError


ROOT = Path(__file__).resolve().parents[1]
SITE_DIR = ROOT / "site"
DATA_DIR = SITE_DIR / "data"
DEFAULT_DATA_FILE = DATA_DIR / "itinerary.json"
DEFAULT_LINKS_FILE = DATA_DIR / "asset-links.json"
IMAGE_ROOT = SITE_DIR / "assets" / "images"
USER_AGENT = "Mozilla/5.0 (compatible; TaiwanItineraryBuilder/1.0)"
COMMONS_ENDPOINT = "https://commons.wikimedia.org/w/api.php"
BLACKLIST = {
    "logo",
    "icon",
    "symbol",
    "map",
    "route",
    "location",
    "blank",
    "flag",
    "diagram",
    "plan",
    "svg",
}
RETRYABLE_STATUS = {429, 503}
MAX_ATTEMPTS = 4


def open_url(url: str, timeout: int):
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    last_error = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            return urllib.request.urlopen(request, timeout=timeout)
        except HTTPError as error:
            last_error = error
            if error.code not in RETRYABLE_STATUS or attempt == MAX_ATTEMPTS:
                raise
            time.sleep(attempt * 1.2)
        except (URLError, TimeoutError) as error:
            last_error = error
            if attempt == MAX_ATTEMPTS:
                raise
            time.sleep(attempt * 1.2)
    raise last_error


def request_json(url: str) -> dict:
    with open_url(url, timeout=30) as response:
        return json.load(response)


def is_usable_image(title: str, url: str) -> bool:
    lower_title = title.lower()
    lower_url = url.lower()
    if not re.search(r"\.(jpg|jpeg|png)$", lower_url):
        return False
    return not any(term in lower_title or term in lower_url for term in BLACKLIST)


def commons_search(query: str, limit: int = 10) -> list[dict]:
    params = urllib.parse.urlencode(
        {
            "action": "query",
            "generator": "search",
            "gsrsearch": f"{query} filetype:bitmap",
            "gsrnamespace": "6",
            "gsrlimit": str(limit),
            "prop": "imageinfo",
            "iiprop": "url",
            "iiurlwidth": "1600",
            "format": "json",
        }
    )
    try:
        payload = request_json(f"{COMMONS_ENDPOINT}?{params}")
    except (HTTPError, URLError, TimeoutError):
        return []
    pages = payload.get("query", {}).get("pages", {})
    results: list[dict] = []
    for page in sorted(pages.values(), key=lambda item: item.get("index", 999)):
        info = (page.get("imageinfo") or [{}])[0]
        url = info.get("url")
        if not url:
            continue
        if not is_usable_image(page.get("title", ""), url):
            continue
        results.append(
            {
                "title": page.get("title", ""),
                "url": info.get("thumburl") or url,
                "page": info.get("descriptionurl"),
            }
        )
    return results


def download(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with open_url(url, timeout=60) as response:
        with destination.open("wb") as handle:
            shutil.copyfileobj(response, handle)


def choose_images(queries: list[str], count: int) -> list[dict]:
    chosen: list[dict] = []
    seen: set[str] = set()
    for query in queries:
        for candidate in commons_search(query):
            if candidate["url"] in seen:
                continue
            seen.add(candidate["url"])
            chosen.append(candidate)
            if len(chosen) >= count:
                return chosen
        time.sleep(0.4)
    return chosen


def normalize_ext(url: str) -> str:
    suffix = Path(urllib.parse.urlparse(url).path).suffix.lower()
    return suffix if suffix in {".jpg", ".jpeg", ".png"} else ".jpg"


def iter_place_groups(data: dict):
    for day in data.get("days", []):
        yield day, None, day.get("places", [])
        for plan in day.get("plans", []):
            yield day, plan, plan.get("places", [])


def collect_targets(data: dict, allowed: set[str] | None = None) -> list[tuple[dict, Path, str]]:
    targets: list[tuple[dict, Path, str]] = []
    hero = data.get("hero")
    if hero and (allowed is None or hero["slug"] in allowed):
        targets.append((hero, IMAGE_ROOT / "hero", hero["slug"]))
    for _, _, places in iter_place_groups(data):
        for place in places:
            if allowed is None or place["slug"] in allowed:
                targets.append((place, IMAGE_ROOT / "places", place["slug"]))
            for food in place.get("foods", []):
                if allowed is None or food["slug"] in allowed:
                    targets.append((food, IMAGE_ROOT / "foods", food["slug"]))
    return targets


def build_link_manifest(data: dict) -> dict:
    manifest = {"trip_dates": data["trip_dates"], "items": []}
    for day, plan, places in iter_place_groups(data):
        for place in places:
            manifest["items"].append(
                {
                    "kind": "place",
                    "day": day["label"],
                    "plan": plan.get("label") if plan else None,
                    "name": place["name"],
                    "links": place.get("links", {}),
                    "images": place.get("images", []),
                }
            )
            for food in place.get("foods", []):
                manifest["items"].append(
                    {
                        "kind": "food",
                        "day": day["label"],
                        "plan": plan.get("label") if plan else None,
                        "name": food["name"],
                        "parent_place": place["name"],
                        "links": food.get("links", {}),
                        "images": food.get("images", []),
                    }
                )
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--include",
        nargs="*",
        help="Optional list of target slugs to fetch. Leave empty to fetch everything.",
    )
    parser.add_argument(
        "--data",
        type=Path,
        default=DEFAULT_DATA_FILE,
        help="Path to the itinerary JSON file. Defaults to site/data/itinerary.json.",
    )
    parser.add_argument(
        "--links",
        type=Path,
        default=None,
        help="Path to write the asset-links manifest. Defaults to <data-dir>/<stem>-links.json or asset-links.json for itinerary.json.",
    )
    args = parser.parse_args()
    allowed = set(args.include) if args.include else None

    data_file = args.data if args.data.is_absolute() else (Path.cwd() / args.data).resolve()
    if not data_file.exists():
        candidate = DATA_DIR / args.data.name
        if candidate.exists():
            data_file = candidate
    if args.links is not None:
        links_file = args.links if args.links.is_absolute() else (Path.cwd() / args.links).resolve()
    elif data_file.name == "itinerary.json":
        links_file = DEFAULT_LINKS_FILE
    else:
        links_file = data_file.with_name(f"{data_file.stem}-links.json")

    data = json.loads(data_file.read_text())
    for target, directory, slug in collect_targets(data, allowed):
        count = int(target.get("desired_images", 1))
        selected = target.get("manual_images") or choose_images(target.get("image_queries", []), count)
        target["images"] = []
        for index, image in enumerate(selected, start=1):
            ext = normalize_ext(image["url"])
            local_path = directory / f"{slug}-{index}{ext}"
            if not local_path.exists():
                try:
                    download(image["url"], local_path)
                except (HTTPError, URLError, TimeoutError):
                    continue
                time.sleep(0.4)
            target["images"].append(
                {
                    "src": str(local_path.relative_to(SITE_DIR)).replace("\\", "/"),
                    "source_url": image["url"],
                    "source_page": image["page"],
                    "title": image["title"],
                }
            )

    data_file.write_text(json.dumps(data, indent=2, ensure_ascii=True) + "\n")
    links_file.write_text(json.dumps(build_link_manifest(data), indent=2, ensure_ascii=True) + "\n")
    print(f"Updated {data_file}")
    print(f"Wrote {links_file}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
