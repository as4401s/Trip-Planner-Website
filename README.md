# Trip Planner Website

Static travel itinerary website built with plain HTML, CSS, and JavaScript.

## Overview

This project renders a multi-day trip plan from local JSON data and local image assets. It is designed to work as a simple static site that can be previewed locally or deployed directly to Netlify.

## Project Structure

- `site/index.html` - Taiwan itinerary entry point
- `site/china.html` - China itinerary entry point
- `site/app.js` - shared client-side rendering logic
- `site/styles.css` - site styling and responsive layout
- `site/data/itinerary.json` - Taiwan itinerary content
- `site/data/china.json` - China itinerary content
- `site/data/asset-links.json` - Taiwan source and link metadata
- `site/data/china-links.json` - China source and link metadata
- `site/assets/images/` - local image assets
- `site/config.js` - client-side configuration values
- `scripts/fetch_assets.py` - helper script for downloading and wiring local images

## Local Development

Run a local static server from the project root:

```bash
uv run python -m http.server 3001 --directory site
```

Then open:

```text
http://127.0.0.1:3001/            # Taiwan itinerary
http://127.0.0.1:3001/china.html  # China itinerary
```

Use the China / Taiwan switcher inside the hero on either page to jump between trips.

## Fetching images

The `fetch_assets.py` script searches Wikimedia Commons for each `image_queries` entry and downloads the chosen images locally.

```bash
# Taiwan (default data file)
uv run python scripts/fetch_assets.py

# China
uv run python scripts/fetch_assets.py --data site/data/china.json

# Re-fetch only specific slugs
uv run python scripts/fetch_assets.py --data site/data/china.json --include the-bund yu-garden
```

## Deployment

This project can be deployed as a static site on Netlify.

- Publish directory: `site`
- Build command: none

## Optional Configuration

Google Maps embeds can be enabled through `site/config.js`:

```js
window.APP_CONFIG = {
  GOOGLE_MAPS_EMBED_API_KEY: "YOUR_KEY"
};
```

If no key is set, the site falls back gracefully without embedded maps.
