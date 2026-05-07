const app = document.querySelector("#app");
const mapsApiKey = window.APP_CONFIG?.GOOGLE_MAPS_EMBED_API_KEY?.trim() || "";
const isCompactViewport = window.matchMedia("(max-width: 720px)").matches;
let currentTripKey = "taiwan";

const safeImage = (images = []) => images.find((image) => image.src)?.src || "";
const assetSrc = (src = "") => (/^(https?:)?\/\//.test(src) ? src : `./${src}`);
const encode = (value = "") => encodeURIComponent(value);

const ICON_EMOJI = {
  plane: "✈️",
  train: "🚄",
  subway: "🚇",
  car: "🚗",
  bus: "🚌",
  walk: "🚶",
  cable: "🚡",
  elevator: "🛗",
  ferry: "⛴️",
  hotel: "🏨",
  compass: "🧭",
  arrow: "➡️"
};

const icon = (key) =>
  ICON_EMOJI[key]
    ? `<span class="icon icon-${key}" role="img" aria-label="${key}">${ICON_EMOJI[key]}</span>`
    : "";

const MODE_RULES = [
  ["plane", /\b(flight|fly|plane|airline|airport express)\b/i],
  ["train", /\b(train|tra|rail|high[- ]speed|maglev|hsr)\b/i],
  ["subway", /\b(metro|mrt|subway|line\s*\d|red line|blue line|green line)\b/i],
  ["cable", /cable\s?(?:way|car)|gondola/i],
  ["elevator", /\b(elevator|escalator|lift|bailong)\b/i],
  ["bus", /\b(bus|shuttle|coach)\b/i],
  ["ferry", /\b(ferry|boat|ship)\b/i],
  ["car", /\b(car|taxi|driver|cab|drive|didi|robotaxi|pickup|pre[- ]?booked)\b/i],
  ["walk", /\bwalk(?:ing)?\b/i]
];

const detectModes = (text = "") => {
  const matched = [];
  for (const [key, re] of MODE_RULES) {
    if (re.test(text) && !matched.includes(key)) {
      matched.push(key);
    }
  }
  return matched;
};

const modeIconsMarkup = (text, extraClass = "") => {
  const modes = detectModes(text);
  if (!modes.length) return "";
  return `<span class="mode-icons${extraClass ? ` ${extraClass}` : ""}" aria-hidden="true">${modes
    .map((mode) => icon(mode))
    .join("")}</span>`;
};

const imageMarkup = (images = [], alt, max = 2) => {
  if (!images.length) {
    return `<div class="gallery single"><div></div></div>`;
  }

  const visible = images.slice(0, max);
  const cls = visible.length === 1 ? "gallery single" : "gallery";

  return `
    <div class="${cls}">
      ${visible
        .map(
          (image, index) =>
            `<img src="${assetSrc(image.src)}" alt="${alt} photo ${index + 1}" loading="lazy" />`
        )
        .join("")}
    </div>
  `;
};

const foodGridMarkup = (foods = []) => {
  if (!foods.length) {
    return "";
  }
  return `
    <div class="foods">
      ${foods
        .map((food) => {
          const image = safeImage(food.images);
          return `
            <article class="food-card${image ? "" : " no-image"}">
              ${
                image
                  ? `<img src="${assetSrc(image)}" alt="${food.name}" loading="lazy" />`
                  : ""
              }
              <div class="food-body">
                <h4 class="food-title">${food.name}</h4>
                <p class="food-meta">${food.where}</p>
                <p class="food-description">${food.description}</p>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
};

const foodMarkup = (foods = []) => {
  if (!foods.length) {
    return "";
  }

  return `
    <details class="food-section" ${isCompactViewport ? "" : "open"}>
      <summary class="food-section-summary">
        <div>
          <p class="food-section-kicker">Food</p>
          <h4 class="food-section-title">Foods To Try</h4>
        </div>
        <div class="food-section-meta">
          <span>${foods.length} item${foods.length > 1 ? "s" : ""}</span>
          <span class="food-section-state food-open-label">Hide</span>
          <span class="food-section-state food-closed-label">Show</span>
        </div>
      </summary>
      <div class="food-section-panel">
        ${foodGridMarkup(foods)}
      </div>
    </details>
  `;
};

const flightMarkup = (flights = []) => {
  if (!flights.length) {
    return "";
  }

  return `
    <div class="flight-list">
      ${flights
        .map(
          (flight) => `
            <article class="flight-card">
              <div class="flight-top">
                <div>
                  <p class="flight-label">${icon("plane")}Flight</p>
                  <h3 class="flight-route">${flight.from} to ${flight.to}</h3>
                </div>
                <div class="flight-badge">${flight.details}</div>
              </div>
              <div class="flight-main">
                <div class="flight-times">${flight.route}</div>
                <div class="flight-carrier">${flight.carrier}</div>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
};

const extractMapQuery = (url = "") => {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("query") || parsed.searchParams.get("q") || "";
  } catch {
    return "";
  }
};

const placeQuery = (place) =>
  extractMapQuery(place.links?.map) || `${place.name}, ${place.area}, Taiwan`;

const nativeMapLinks = (query, { includeChina = currentTripKey === "china" } = {}) => {
  const encoded = encode(query);
  const links = [];
  if (includeChina) {
    links.push({
      label: "Amap",
      primary: true,
      href: `https://uri.amap.com/search?keyword=${encoded}&src=tripplanner&coordinate=gaode&callnative=1`
    });
  }
  links.push({
    label: currentTripKey === "china" ? "Apple" : "Apple Maps",
    href: `https://maps.apple.com/?q=${encoded}`
  });
  links.push({
    label: currentTripKey === "china" ? "Google" : "Google Maps",
    primary: !includeChina,
    href: `https://www.google.com/maps/search/?api=1&query=${encoded}`
  });
  return links;
};

const mapLinksMarkup = (query, referenceHref) => `
  <div class="links map-links">
    ${nativeMapLinks(query)
      .map(
        (link) =>
          `<a class="button-link${link.primary ? " primary" : ""}" href="${link.href}" target="_blank" rel="noreferrer">${link.label}</a>`
      )
      .join("")}
    ${
      referenceHref
        ? `<a class="button-link reference-link" href="${referenceHref}" target="_blank" rel="noreferrer">Reference</a>`
        : ""
    }
  </div>
`;

const transitLinksMarkup = (fromPlace, toPlace) => {
  if (!fromPlace || !toPlace) {
    return "";
  }
  const from = placeQuery(fromPlace);
  const to = placeQuery(toPlace);
  const links =
    currentTripKey === "china"
      ? [
          {
            label: "Amap Destination",
            href: `https://uri.amap.com/search?keyword=${encode(to)}&src=tripplanner&coordinate=gaode&callnative=1`
          },
          {
            label: "Amap Origin",
            href: `https://uri.amap.com/search?keyword=${encode(from)}&src=tripplanner&coordinate=gaode&callnative=1`
          }
        ]
      : [
          {
            label: "Google Transit",
            href: `https://www.google.com/maps/dir/?api=1&origin=${encode(from)}&destination=${encode(to)}&travelmode=transit`
          },
          {
            label: "Apple Transit",
            href: `https://maps.apple.com/?saddr=${encode(from)}&daddr=${encode(to)}&dirflg=r`
          }
        ];

  return `
    <div class="transfer-links">
      ${links
        .map(
          (link) =>
            `<a class="button-link" href="${link.href}" target="_blank" rel="noreferrer">${link.label}</a>`
        )
        .join("")}
    </div>
  `;
};

const weatherLocations = {
  china: {
    "day-1": { name: "Berlin / in flight", latitude: 52.52, longitude: 13.405 },
    "day-2": { name: "Shanghai", latitude: 31.2304, longitude: 121.4737 },
    "day-3": { name: "Shanghai", latitude: 31.2304, longitude: 121.4737 },
    "day-4": { name: "Shanghai", latitude: 31.2304, longitude: 121.4737 },
    "day-5": { name: "Fenghuang", latitude: 27.9483, longitude: 109.5992 },
    "day-6": { name: "Fenghuang / Furong / Zhangjiajie", latitude: 28.1659, longitude: 109.9567 },
    "day-7": { name: "Zhangjiajie", latitude: 29.1171, longitude: 110.4792 },
    "day-8": { name: "Zhangjiajie", latitude: 29.1171, longitude: 110.4792 },
    "day-9": { name: "Beijing", latitude: 39.9042, longitude: 116.4074 },
    "day-10": { name: "Beijing", latitude: 39.9042, longitude: 116.4074 },
    "day-11": { name: "Beijing / Taipei", latitude: 25.033, longitude: 121.5654 }
  },
  taiwan: {
    "day-1": { name: "Taipei / Taoyuan", latitude: 25.033, longitude: 121.5654 },
    "day-2": { name: "Taipei", latitude: 25.033, longitude: 121.5654 },
    "day-3": { name: "North Coast / Jiufen", latitude: 25.1096, longitude: 121.8442 },
    "day-4": { name: "Taipei", latitude: 25.033, longitude: 121.5654 },
    "day-5": { name: "Taroko / Hualien", latitude: 24.1587, longitude: 121.6216 },
    "day-6": { name: "Taipei / Tamsui", latitude: 25.1676, longitude: 121.4458 },
    "day-7": { name: "Taipei", latitude: 25.033, longitude: 121.5654 },
    "day-8": { name: "Taipei / Taoyuan", latitude: 25.033, longitude: 121.5654 }
  }
};

const weatherCodeMeta = {
  0: { label: "Clear sky", icon: "☀️", type: "sunny" },
  1: { label: "Mostly clear", icon: "🌤️", type: "sunny" },
  2: { label: "Partly cloudy", icon: "⛅", type: "cloudy" },
  3: { label: "Overcast", icon: "☁️", type: "cloudy" },
  45: { label: "Fog", icon: "🌫️", type: "foggy" },
  48: { label: "Rime fog", icon: "🌫️", type: "foggy" },
  51: { label: "Light drizzle", icon: "🌦️", type: "rainy" },
  53: { label: "Drizzle", icon: "🌦️", type: "rainy" },
  55: { label: "Dense drizzle", icon: "🌧️", type: "rainy" },
  61: { label: "Light rain", icon: "🌧️", type: "rainy" },
  63: { label: "Rain", icon: "🌧️", type: "rainy" },
  65: { label: "Heavy rain", icon: "⛈️", type: "rainy" },
  71: { label: "Light snow", icon: "🌨️", type: "snowy" },
  73: { label: "Snow", icon: "🌨️", type: "snowy" },
  75: { label: "Heavy snow", icon: "❄️", type: "snowy" },
  77: { label: "Snow grains", icon: "❄️", type: "snowy" },
  80: { label: "Rain showers", icon: "🌦️", type: "rainy" },
  81: { label: "Rain showers", icon: "🌧️", type: "rainy" },
  82: { label: "Heavy showers", icon: "⛈️", type: "stormy" },
  85: { label: "Snow showers", icon: "🌨️", type: "snowy" },
  86: { label: "Snow showers", icon: "❄️", type: "snowy" },
  95: { label: "Thunderstorm", icon: "⛈️", type: "stormy" },
  96: { label: "Thunderstorm + hail", icon: "⛈️", type: "stormy" },
  99: { label: "Thunderstorm + hail", icon: "⛈️", type: "stormy" }
};

const formatFriendlyDate = (dateText = "") => {
  const match = dateText.match(/^(\w+),\s+(\w+)\s+(\d+)/);
  if (!match) return dateText;
  return `${match[1].slice(0, 3)} · ${match[2].slice(0, 3)} ${match[3]}`;
};

const formatClockTime = (iso = "") => {
  const time = iso.split("T")[1];
  return time ? time.slice(0, 5) : "";
};

const formatIsoDate = (dateText = "") => {
  const months = {
    january: "01",
    february: "02",
    march: "03",
    april: "04",
    may: "05",
    june: "06",
    july: "07",
    august: "08",
    september: "09",
    october: "10",
    november: "11",
    december: "12"
  };
  const cleaned = dateText.replace(/(\d+)(st|nd|rd|th)/gi, "$1");
  const match = cleaned.match(
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})|(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i
  );
  if (!match) {
    return "";
  }
  const monthName = (match[1] || match[5]).toLowerCase();
  const day = String(match[2] || match[4]).padStart(2, "0");
  const year = match[3] || match[6];
  return `${year}-${months[monthName]}-${day}`;
};

const weatherMarkup = (day) => {
  const location = weatherLocations[currentTripKey]?.[day.id];
  const isoDate = formatIsoDate(day.date);
  if (!location || !isoDate) {
    return "";
  }

  return `
    <article
      class="weather-card weather-card--loading"
      data-weather-date="${isoDate}"
      data-weather-lat="${location.latitude}"
      data-weather-lon="${location.longitude}"
      data-weather-place="${location.name}"
    >
      <header class="weather-head">
        <div>
          <p class="weather-kicker">Forecast</p>
          <h3 class="weather-title">${location.name}</h3>
        </div>
        <p class="weather-date">${formatFriendlyDate(day.date)}</p>
      </header>
      <div class="weather-body" aria-live="polite">
        <div class="weather-loading">
          <span class="weather-loading-orb" aria-hidden="true"></span>
          <p class="weather-status">Checking forecast…</p>
        </div>
      </div>
    </article>
  `;
};

const singleStayMarkup = (stay) => {
  if (!stay) {
    return "";
  }
  const kicker = stay.city
    ? `${stay.city}${stay.dates ? ` · ${stay.dates}` : ""}`
    : "Stay Base";
  return `
    <section class="stay-card fade-up">
      <div class="stay-copy">
        <p class="stay-kicker">${kicker}</p>
        <h2 class="stay-title">${icon("hotel")}<span>${stay.label}</span></h2>
        <p class="stay-address">${stay.address}</p>
        ${stay.phone ? `<p class="stay-phone">${stay.phone}</p>` : ""}
        <p class="stay-note">${stay.note}</p>
        <p class="stay-transit">${stay.transit}</p>
      </div>
      <div class="stay-links">
        ${mapLinksMarkup(`${stay.label}, ${stay.address || stay.city || ""}`, null)}
      </div>
    </section>
  `;
};

const stayMarkup = (data) => {
  const stays = Array.isArray(data?.stays) ? data.stays : null;
  if (stays?.length) {
    return `
      <section class="stays fade-up">
        <header class="stays-head">
          <p class="stays-kicker">Stay Bases</p>
          <h2 class="stays-title">${stays.length} hotels across the trip</h2>
        </header>
        <div class="stays-grid">
          ${stays.map(singleStayMarkup).join("")}
        </div>
      </section>
    `;
  }
  return singleStayMarkup(data?.stay);
};

const tripSwitcherMarkup = (currentKey) => {
  const trips = [
    { key: "china", label: "China", href: "./china.html" },
    { key: "taiwan", label: "Taiwan", href: "./index.html" }
  ];
  return `
    <nav class="trip-switcher" aria-label="Trip selector">
      ${trips
        .map((trip) => {
          const isActive = trip.key === currentKey;
          return `<a class="trip-tab${isActive ? " active" : ""}" href="${trip.href}"${
            isActive ? ' aria-current="page"' : ""
          }>${trip.label}</a>`;
        })
        .join("")}
    </nav>
  `;
};

const buildMapEmbedUrl = (day) => {
  if (!mapsApiKey || day.gallery_only || !day.places?.length) {
    return "";
  }

  if (day.places.length === 1) {
    const query = placeQuery(day.places[0]);
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(
      mapsApiKey
    )}&q=${encodeURIComponent(query)}&zoom=13&language=en&region=${
      currentTripKey === "china" ? "CN" : "TW"
    }`;
  }

  const [origin, ...rest] = day.places;
  const destination = rest.at(-1);
  const waypoints = rest.slice(0, -1).map(placeQuery).join("|");

  return `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(
    mapsApiKey
  )}&origin=${encodeURIComponent(placeQuery(origin))}&destination=${encodeURIComponent(
    placeQuery(destination)
  )}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ""}&language=en&region=${
    currentTripKey === "china" ? "CN" : "TW"
  }`;
};

const dayMapMarkup = (day) => {
  if (day.gallery_only || !day.places?.length) {
    return "";
  }

  if (currentTripKey === "china") {
    return "";
  }

  if (!mapsApiKey) {
    return "";
  }

  return `
    <article class="map-card">
      <div class="map-head">
        <h3 class="map-title">Tagged Map</h3>
        <p class="map-note">Stops shown on one Google map for this day.</p>
      </div>
      <div class="map-frame-wrap">
        <iframe
          class="map-frame"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          allowfullscreen
          src="${buildMapEmbedUrl(day)}"
          title="${day.label} map"
        ></iframe>
      </div>
    </article>
  `;
};

const transferMarkup = (transfer, fromPlace, toPlace) => {
  if (!transfer || !fromPlace || !toPlace) {
    return "";
  }

  return `
    <article class="transfer-card">
      <div class="transfer-kicker">${icon("arrow")}Next Stop</div>
      <div class="transfer-top">
        <h3>${fromPlace.name} to ${toPlace.name}</h3>
        <div class="transfer-badge">${modeIconsMarkup(transfer.mode)}<span>${transfer.mode}</span></div>
      </div>
      <p class="transfer-instructions">${transfer.instructions}</p>
      ${
        transfer.note
          ? `<p class="transfer-note">${transfer.note}</p>`
          : ""
      }
      ${transitLinksMarkup(fromPlace, toPlace)}
    </article>
  `;
};

const dayStartMarkup = (startTransfer) => {
  if (!startTransfer) {
    return "";
  }

  return `
    <article class="transfer-card start-card">
      <div class="transfer-kicker">${icon("arrow")}${startTransfer.kicker || "Day Start"}</div>
      <div class="transfer-top">
        <h3>${startTransfer.title}</h3>
        <div class="transfer-badge">${modeIconsMarkup(startTransfer.mode)}<span>${startTransfer.mode}</span></div>
      </div>
      <p class="transfer-instructions">${startTransfer.instructions}</p>
      ${
        startTransfer.note
          ? `<p class="transfer-note">${startTransfer.note}</p>`
          : ""
      }
    </article>
  `;
};

const placeMarkup = (place, { showFoods = true } = {}) => `
  <article class="place">
    <div class="place-grid">
      ${imageMarkup(place.images, place.name)}
      <div class="place-body">
        <div class="place-top">
          <div class="place-title-wrap">
            <h3>${place.name}</h3>
            <div class="place-area">${place.area}</div>
          </div>
          <div class="timing">
            <strong>${place.best_time}</strong>
            <span>${place.duration}</span>
          </div>
        </div>
        <p class="place-summary">${place.summary}</p>
        <div class="detail-grid">
          <div class="detail-block">
            <h4>Highlights</h4>
            <ul>${place.highlights.map((item) => `<li>${item}</li>`).join("")}</ul>
          </div>
          <div class="detail-block">
            <h4>${icon("compass")}How To Get There${modeIconsMarkup(place.transport, "inline")}</h4>
            <p>${place.transport}</p>
          </div>
        </div>
        ${
          place.access_note
            ? `<div class="access-note">${place.access_note}</div>`
            : ""
        }
        ${mapLinksMarkup(placeQuery(place), place.links.reference)}
        ${showFoods ? foodMarkup(place.foods) : ""}
      </div>
    </div>
  </article>
`;

const placeListMarkup = (day, options = {}) => {
  if (!day.places?.length) {
    return "";
  }

  return `
    <div class="place-list">
      ${day.places
        .map((place, index) => {
          const nextPlace = day.places[index + 1];
          return `${placeMarkup(place, options)}${transferMarkup(
            day.transfers?.[index],
            place,
            nextPlace
          )}`;
        })
        .join("")}
    </div>
  `;
};

const optionalPlacesMarkup = (day, options = {}) => {
  if (!day.optional_places?.length) {
    return "";
  }

  return `
    <details class="optional-section" open>
      <summary class="optional-section-summary">
        <div>
          <p class="optional-section-kicker">Optional</p>
          <h3 class="optional-section-title">${day.optional_title || "Worth Adding If Time Allows"}</h3>
        </div>
        <div class="optional-section-meta">
          <span>${day.optional_places.length} stop${day.optional_places.length > 1 ? "s" : ""}</span>
          <span class="optional-section-state optional-open-label">Hide</span>
          <span class="optional-section-state optional-closed-label">Show</span>
        </div>
      </summary>
      <div class="optional-section-panel">
        ${placeListMarkup({ places: day.optional_places, transfers: day.optional_transfers || [] }, options)}
      </div>
    </details>
  `;
};

const planMarkup = (plan) => `
  <details class="plan-card" open>
    <summary class="plan-summary">
      <div class="plan-head">
        <div>
          <p class="plan-kicker">${plan.label}</p>
          <h3 class="plan-title">${plan.title}</h3>
          ${plan.focus ? `<p class="plan-focus">${plan.focus}</p>` : ""}
        </div>
        ${
          plan.transport_note
            ? `<div class="plan-transport-note">${modeIconsMarkup(plan.transport_note, "stack")}<span>${plan.transport_note}</span></div>`
            : ""
        }
        <div class="plan-toggle" aria-hidden="true">
          <span class="when-open">Collapse</span>
          <span class="when-closed">Expand</span>
        </div>
      </div>
    </summary>
    <div class="plan-body">
      ${dayStartMarkup(plan.start_transfer)}
      ${dayMapMarkup(plan)}
      ${placeListMarkup(plan)}
    </div>
  </details>
`;

const planListMarkup = (plans = []) => {
  if (!plans.length) {
    return "";
  }

  return `
    <div class="plan-list">
      ${plans.map(planMarkup).join("")}
    </div>
  `;
};

const celebrationMarkup = (images = []) => `
  <div class="celebration-grid${images.length === 1 ? " single" : ""}">
    ${images
      .map(
        (image, index) =>
          `<img src="${assetSrc(image.src)}" alt="${image.alt || `Celebration image ${index + 1}`}" loading="lazy" />`
      )
      .join("")}
  </div>
`;

const aggregateDayFoods = (day) => {
  const foods = [];
  const seen = new Set();
  const collect = (places = []) => {
    places.forEach((place) => {
      (place.foods || []).forEach((food) => {
        const key = food.slug || food.name;
        if (!key || seen.has(key)) return;
        seen.add(key);
        foods.push(food);
      });
    });
  };
  collect(day.places);
  collect(day.optional_places);
  return foods;
};

const daySectionMarkup = (section) => {
  const hasContent = !!section.body && section.body.trim().length > 0;
  const meta = hasContent && section.count
    ? `<span class="day-section-count">${section.count}</span>`
    : "";
  const body = hasContent
    ? section.body
    : `<div class="day-section-empty">
        <span class="day-section-empty-icon" aria-hidden="true">${section.icon}</span>
        <p>${section.emptyMessage}</p>
      </div>`;
  return `
    <details class="day-section day-section--${section.type}${hasContent ? "" : " day-section--empty-state"}" id="${section.id}"${section.defaultOpen ? " open" : ""}>
      <summary class="day-section-summary">
        <div class="day-section-summary-main">
          <span class="day-section-icon" aria-hidden="true">${section.icon}</span>
          <div>
            <p class="day-section-kicker">${section.kicker}</p>
            <h3 class="day-section-title">${section.title}</h3>
          </div>
        </div>
        <div class="day-section-meta">
          ${meta}
          <span class="day-section-toggle" aria-hidden="true">
            <span class="when-open">Hide</span>
            <span class="when-closed">Show</span>
          </span>
        </div>
      </summary>
      <div class="day-section-panel">
        ${body}
      </div>
    </details>
  `;
};

const daySectionNavMarkup = (sections) => `
  <nav class="day-section-nav" aria-label="Day sections">
    <div class="day-section-nav-track">
      ${sections
        .map(
          (section) => `
            <a class="day-section-chip day-section-chip--${section.type}${section.empty ? " is-empty" : ""}"
               href="#${section.id}"
               data-section-target="${section.id}">
              <span class="day-section-chip-icon" aria-hidden="true">${section.icon}</span>
              <span class="day-section-chip-label">${section.title}</span>
              ${section.count ? `<span class="day-section-chip-count">${section.count}</span>` : ""}
            </a>
          `
        )
        .join("")}
    </div>
  </nav>
`;

const dayBodySectionsMarkup = (day) => {
  const flightsBody = flightMarkup(day.flights);
  const stayBody = singleStayMarkup(day.stay);

  const itineraryParts = [
    dayStartMarkup(day.start_transfer),
    dayStartMarkup(day.after_flight_transfer),
    dayMapMarkup(day),
    day.gallery_only ? celebrationMarkup(day.gallery) : "",
    placeListMarkup(day, { showFoods: false }),
    optionalPlacesMarkup(day, { showFoods: false }),
    dayStartMarkup(day.end_transfer)
  ].filter((part) => part && part.trim().length);
  const itineraryBody = itineraryParts.join("\n");

  const aggregatedFoods = aggregateDayFoods(day);
  const foodsBody = foodGridMarkup(aggregatedFoods);

  const flightsCount = day.flights?.length || 0;
  const placesCount = (day.places?.length || 0) + (day.optional_places?.length || 0);

  const sections = [
    {
      id: `${day.id}-flights`,
      type: "flights",
      icon: "✈️",
      kicker: "Travel",
      title: "Flights & Trains",
      count: flightsCount ? `${flightsCount} segment${flightsCount > 1 ? "s" : ""}` : "",
      body: flightsBody,
      empty: !flightsBody,
      emptyMessage: "No flights or trains today — enjoy a slower morning.",
      defaultOpen: !!flightsBody
    },
    {
      id: `${day.id}-hotel`,
      type: "hotel",
      icon: "🏨",
      kicker: "Stay",
      title: "Hotel",
      count: day.stay?.label ? "1 base" : "",
      body: stayBody,
      empty: !stayBody,
      emptyMessage: "Travel night — no fixed hotel for this date.",
      defaultOpen: false
    },
    {
      id: `${day.id}-itinerary`,
      type: "itinerary",
      icon: "🧭",
      kicker: "Plan",
      title: "Itinerary",
      count: placesCount ? `${placesCount} stop${placesCount > 1 ? "s" : ""}` : "",
      body: itineraryBody,
      empty: !itineraryBody,
      emptyMessage: "Free day to wander — no fixed stops.",
      defaultOpen: true
    },
    {
      id: `${day.id}-foods`,
      type: "foods",
      icon: "🍜",
      kicker: "Eats",
      title: "Foods to Try",
      count: aggregatedFoods.length ? `${aggregatedFoods.length} pick${aggregatedFoods.length > 1 ? "s" : ""}` : "",
      body: foodsBody,
      empty: !foodsBody,
      emptyMessage: "No curated picks — explore neighborhood spots as you go.",
      defaultOpen: false
    }
  ];

  return `
    ${daySectionNavMarkup(sections)}
    <div class="day-sections">
      ${sections.map(daySectionMarkup).join("")}
    </div>
  `;
};

const dayMarkup = (day, index) => `
  <details class="day fade-up" id="${day.id}"${index === 0 ? " open" : ""}>
    <summary class="day-summary">
      <div class="day-head${day.gallery_only ? " compact" : ""}">
        <div>
          <p class="day-label">${day.label}</p>
          <h2 class="day-title">${day.date}</h2>
          ${day.display_title ? `<p class="day-subtitle">${day.display_title}</p>` : ""}
          ${day.focus ? `<p class="day-focus">${day.focus}</p>` : ""}
        </div>
        <div class="day-summary-meta">
          ${
            day.transport_note
              ? `<div class="transport-note">${modeIconsMarkup(day.transport_note, "stack")}<span>${day.transport_note}</span></div>`
              : ""
          }
          <div class="day-toggle" aria-hidden="true">
            <span class="when-open">Collapse</span>
            <span class="when-closed">Expand</span>
          </div>
        </div>
      </div>
    </summary>
    <div class="day-panel">
      ${weatherMarkup(day)}
      ${day.plans?.length ? planListMarkup(day.plans) : dayBodySectionsMarkup(day)}
    </div>
  </details>
`;

const openDayFromHash = () => {
  const id = window.location.hash.slice(1);
  if (!id) {
    return;
  }
  const target = document.getElementById(id);
  if (!target) return;
  if (target instanceof HTMLDetailsElement) {
    target.open = true;
  }
  const parentDay = target.closest("details.day");
  if (parentDay instanceof HTMLDetailsElement) {
    parentDay.open = true;
  }
};

const wireDayNav = () => {
  document.querySelectorAll(".day-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      const id = link.getAttribute("href")?.slice(1);
      if (!id) {
        return;
      }
      const day = document.getElementById(id);
      if (day instanceof HTMLDetailsElement) {
        day.open = true;
      }
    });
  });
};

const wireDaySectionNav = () => {
  document.querySelectorAll("[data-section-target]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("data-section-target");
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      if (target instanceof HTMLDetailsElement) {
        target.open = true;
      }
      const parentDay = target.closest("details.day");
      if (parentDay instanceof HTMLDetailsElement) {
        parentDay.open = true;
      }
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", `#${id}`);
    });
  });
};

const centerNavLink = (link) => {
  const scroller = link.closest(".day-nav-scroller");
  if (!scroller) {
    return;
  }
  const linkRect = link.getBoundingClientRect();
  const scrollerRect = scroller.getBoundingClientRect();
  const target =
    scroller.scrollLeft +
    linkRect.left -
    scrollerRect.left -
    scrollerRect.width / 2 +
    linkRect.width / 2;
  scroller.scrollTo({ left: target, behavior: "smooth" });
};

const setActiveDay = (id) => {
  document.querySelectorAll(".day-nav a").forEach((link) => {
    const isActive = link.getAttribute("href") === `#${id}`;
    link.classList.toggle("active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "location");
      centerNavLink(link);
    } else {
      link.removeAttribute("aria-current");
    }
  });
};

const wireActiveDay = () => {
  const days = Array.from(document.querySelectorAll(".day"));
  if (!days.length) {
    return;
  }

  let frame = 0;
  const update = () => {
    frame = 0;
    const offset = 120;
    let active = days[0];
    for (const day of days) {
      if (day.getBoundingClientRect().top - offset <= 0) {
        active = day;
      } else {
        break;
      }
    }
    if (active?.id) {
      setActiveDay(active.id);
    }
  };

  const onScroll = () => {
    if (frame) {
      return;
    }
    frame = window.requestAnimationFrame(update);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  update();
};

const wireToggleAll = () => {
  const button = document.querySelector(".toggle-all");
  if (!button) {
    return;
  }
  const days = Array.from(document.querySelectorAll(".day"));
  if (!days.length) {
    return;
  }

  const sync = () => {
    const anyClosed = days.some((day) => !day.open);
    button.dataset.state = anyClosed ? "expand" : "collapse";
    button.setAttribute(
      "aria-label",
      anyClosed ? "Expand all days" : "Collapse all days"
    );
  };

  button.addEventListener("click", () => {
    const anyClosed = days.some((day) => !day.open);
    days.forEach((day) => {
      day.open = anyClosed;
    });
    sync();
  });

  days.forEach((day) => {
    day.addEventListener("toggle", sync);
  });

  sync();
};

const wirePrint = () => {
  const stash = new WeakMap();
  window.addEventListener("beforeprint", () => {
    document.querySelectorAll("details").forEach((node) => {
      stash.set(node, node.open);
      node.open = true;
    });
  });
  window.addEventListener("afterprint", () => {
    document.querySelectorAll("details").forEach((node) => {
      if (stash.has(node)) {
        node.open = stash.get(node);
      }
    });
  });
};

const wireBackToTop = () => {
  const button = document.querySelector(".back-to-top");
  if (!button) {
    return;
  }

  const update = () => {
    button.classList.toggle("is-visible", window.scrollY > 480);
  };

  button.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", update, { passive: true });
  update();
};

const weatherCache = new Map();

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

const setWeatherStatus = (card, message) => {
  card.classList.remove("weather-card--loading", "weather-card--ready");
  card.classList.add("weather-card--unavailable");
  const body = card.querySelector(".weather-body");
  if (body) {
    body.innerHTML = `<p class="weather-status">${message}</p>`;
  }
};

const animateCount = (el, target) => {
  if (!Number.isFinite(target)) {
    el.textContent = "--";
    return;
  }
  if (prefersReducedMotion()) {
    el.textContent = String(target);
    return;
  }
  const duration = 900;
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = String(Math.round(target * eased));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const renderWeatherData = (card, data, index) => {
  const code = data.daily.weather_code?.[index];
  const meta = weatherCodeMeta[code] || { label: "Forecast", icon: "🌡️", type: "cloudy" };
  const max = Math.round(data.daily.temperature_2m_max?.[index]);
  const min = Math.round(data.daily.temperature_2m_min?.[index]);
  const feelsMax = Math.round(data.daily.apparent_temperature_max?.[index]);
  const rain = data.daily.precipitation_probability_max?.[index] ?? 0;
  const wind = Math.round(data.daily.wind_speed_10m_max?.[index]);
  const humidity = data.daily.relative_humidity_2m_mean?.[index];
  const uv = data.daily.uv_index_max?.[index];
  const sunrise = formatClockTime(data.daily.sunrise?.[index] || "");
  const sunset = formatClockTime(data.daily.sunset?.[index] || "");

  card.classList.remove(
    "weather-card--loading",
    "weather-card--unavailable",
    "weather-card--sunny",
    "weather-card--cloudy",
    "weather-card--rainy",
    "weather-card--stormy",
    "weather-card--foggy",
    "weather-card--snowy"
  );
  card.classList.add("weather-card--ready", `weather-card--${meta.type}`);

  const body = card.querySelector(".weather-body");
  if (!body) return;

  const humidityRow = Number.isFinite(humidity)
    ? `<div class="weather-stat" style="--stat-delay:180ms">
        <span class="weather-stat-icon" aria-hidden="true">💦</span>
        <span class="weather-stat-label">Humidity</span>
        <span class="weather-stat-value">${Math.round(humidity)}%</span>
      </div>`
    : "";
  const uvRow = Number.isFinite(uv)
    ? `<div class="weather-stat" style="--stat-delay:240ms">
        <span class="weather-stat-icon" aria-hidden="true">🌞</span>
        <span class="weather-stat-label">UV index</span>
        <span class="weather-stat-value">${Math.round(uv)}</span>
      </div>`
    : "";
  const sunRow = sunrise && sunset
    ? `<div class="weather-sun">
        <span class="weather-sun-item">🌅 ${sunrise}</span>
        <span class="weather-sun-divider" aria-hidden="true"></span>
        <span class="weather-sun-item">🌇 ${sunset}</span>
      </div>`
    : "";

  body.innerHTML = `
    <div class="weather-hero">
      <div class="weather-icon-wrap weather-icon-wrap--${meta.type}">
        <span class="weather-atmosphere" aria-hidden="true"></span>
        <span class="weather-icon-emoji" aria-hidden="true">${meta.icon}</span>
      </div>
      <div class="weather-hero-info">
        <p class="weather-condition">${meta.label}</p>
        <div class="weather-temp">
          <span class="weather-temp-value">0</span>
          <span class="weather-temp-unit">°C</span>
        </div>
        <p class="weather-feels">Low ${Number.isFinite(min) ? `${min}°` : "--"}${Number.isFinite(feelsMax) ? ` · Feels ${feelsMax}°` : ""}</p>
      </div>
    </div>
    <div class="weather-stats">
      <div class="weather-stat" style="--stat-delay:60ms">
        <span class="weather-stat-icon" aria-hidden="true">💧</span>
        <span class="weather-stat-label">Rain</span>
        <span class="weather-stat-value">${rain}%</span>
      </div>
      <div class="weather-stat" style="--stat-delay:120ms">
        <span class="weather-stat-icon" aria-hidden="true">💨</span>
        <span class="weather-stat-label">Wind</span>
        <span class="weather-stat-value">${Number.isFinite(wind) ? `${wind} km/h` : "--"}</span>
      </div>
      ${humidityRow}
      ${uvRow}
    </div>
    ${sunRow}
  `;

  const tempEl = body.querySelector(".weather-temp-value");
  if (tempEl) animateCount(tempEl, max);
};

const fetchWeather = async (lat, lon) => {
  const key = `${lat},${lon}`;
  if (!weatherCache.has(key)) {
    const params = [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "apparent_temperature_max",
      "apparent_temperature_min",
      "precipitation_probability_max",
      "precipitation_sum",
      "wind_speed_10m_max",
      "relative_humidity_2m_mean",
      "uv_index_max",
      "sunrise",
      "sunset"
    ].join(",");
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${encode(lat)}&longitude=${encode(lon)}&daily=${params}&forecast_days=16&timezone=auto`;
    weatherCache.set(
      key,
      fetch(url).then((response) => {
        if (!response.ok) {
          throw new Error("Weather unavailable");
        }
        return response.json();
      })
    );
  }
  return weatherCache.get(key);
};

const hydrateWeather = async () => {
  const cards = Array.from(document.querySelectorAll(".weather-card"));
  if (!cards.length) {
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await Promise.all(
    cards.map(async (card) => {
      const date = card.dataset.weatherDate;
      const lat = card.dataset.weatherLat;
      const lon = card.dataset.weatherLon;
      const tripDate = new Date(`${date}T00:00:00`);
      const daysAway = Math.round((tripDate - today) / 86400000);

      if (Number.isNaN(daysAway)) {
        setWeatherStatus(card, "Date unavailable");
        return;
      }

      if (daysAway < 0) {
        setWeatherStatus(card, "Trip date has passed");
        return;
      }

      if (daysAway > 15) {
        setWeatherStatus(card, `Forecast opens about 16 days before ${date}`);
        return;
      }

      try {
        const data = await fetchWeather(lat, lon);
        const index = data.daily?.time?.indexOf(date) ?? -1;
        if (index === -1) {
          setWeatherStatus(card, `Forecast not published yet for ${date}`);
          return;
        }
        renderWeatherData(card, data, index);
      } catch {
        setWeatherStatus(card, "Weather service unavailable. Try again later.");
      }
    })
  );
};

const startObservers = () => {
  const items = document.querySelectorAll(".fade-up");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08 }
  );
  items.forEach((item) => observer.observe(item));
};

const tripDefaults = {
  taiwan: {
    eyebrow: "Taiwan Trip Plan",
    titleMain: "Taiwan",
    titleSub: "8-day Itinerary"
  },
  china: {
    eyebrow: "China Trip Plan",
    titleMain: "China",
    titleSub: "11-day Itinerary"
  }
};

const render = (data, tripKey) => {
  currentTripKey = tripKey;
  const heroImage = safeImage(data.hero?.images);
  const trip = tripDefaults[tripKey] || tripDefaults.taiwan;
  const hasDayStays = data.days?.some((day) => day.stay);
  app.innerHTML = `
    <div class="page">
      <header class="hero" style="--hero-image: url('${assetSrc(heroImage)}')">
        <div class="hero-inner">
          ${tripSwitcherMarkup(tripKey)}
          <div class="eyebrow">${trip.eyebrow}</div>
          <h1 class="hero-title"><span class="hero-title-main">${trip.titleMain}</span><span class="hero-title-sub">${trip.titleSub}</span></h1>
          <div class="hero-meta">
            <div class="meta-pill">${data.trip_dates}</div>
            <div class="meta-pill">${data.summary}</div>
          </div>
          <p class="hero-copy">Flights, stops, food, and route planning in one polished itinerary.</p>
        </div>
      </header>
      <nav class="day-nav" aria-label="Day navigation">
        <div class="day-nav-inner">
          <div class="day-nav-scroller">
            ${data.days.map((day) => `<a href="#${day.id}">${day.label}</a>`).join("")}
          </div>
          <button type="button" class="toggle-all" data-state="collapse" aria-label="Collapse all days">
            <span class="toggle-all-collapse">Collapse all</span>
            <span class="toggle-all-expand">Expand all</span>
          </button>
        </div>
      </nav>
      <main class="content">
        ${hasDayStays ? "" : stayMarkup(data)}
        ${data.days.map(dayMarkup).join("")}
      </main>
      <footer class="footer">Maps and source links are attached to each stop.</footer>
      <button type="button" class="back-to-top" aria-label="Back to top">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5l-7 7h4v7h6v-7h4z" fill="currentColor"/></svg>
      </button>
    </div>
  `;

  wireDayNav();
  wireDaySectionNav();
  openDayFromHash();
  startObservers();
  wireActiveDay();
  wireToggleAll();
  wireBackToTop();
  wirePrint();
  hydrateWeather();
};

const init = async () => {
  const tripKey = window.TRIP_KEY || "taiwan";
  const dataPath = window.TRIP_DATA_PATH || "./data/itinerary.json";
  const response = await fetch(dataPath);
  const data = await response.json();
  render(data, tripKey);
  window.addEventListener("hashchange", openDayFromHash);
};

init().catch((error) => {
  app.innerHTML = `<pre>${error.message}</pre>`;
});
