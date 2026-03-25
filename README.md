# Trip-Planner-Website

Taiwan trip planner website with a static itinerary site in `site/`.

## Local run

```bash
uv run python -m http.server 3001 --directory site
```

Open `http://127.0.0.1:3001/`.

## Netlify

- Publish directory: `site`
- Build command: none

## Google Maps Embeds

The site supports day-level Google Maps Embed API iframes with tagged stops.

Set your key in `site/config.js`:

```js
window.APP_CONFIG = {
  GOOGLE_MAPS_EMBED_API_KEY: "YOUR_KEY"
};
```

Use a referrer-restricted browser key for your deployed domain.
