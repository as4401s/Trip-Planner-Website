# Trip Planner Website

Static travel itinerary website built with plain HTML, CSS, and JavaScript.

## Overview

This project renders a multi-day trip plan from local JSON data and local image assets. It is designed to work as a simple static site that can be previewed locally or deployed directly to Netlify.

## Project Structure

- `site/index.html` - main HTML entry point
- `site/app.js` - client-side rendering logic
- `site/styles.css` - site styling and responsive layout
- `site/data/itinerary.json` - itinerary content
- `site/data/asset-links.json` - source and link metadata
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
http://127.0.0.1:3001/
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
