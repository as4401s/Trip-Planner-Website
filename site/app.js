const app = document.querySelector("#app");

const safeImage = (images = []) => images.find((image) => image.src)?.src || "";

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
            `<img src="./${image.src}" alt="${alt} photo ${index + 1}" loading="lazy" />`
        )
        .join("")}
    </div>
  `;
};

const foodMarkup = (foods = []) => {
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
                  ? `<img src="./${image}" alt="${food.name}" loading="lazy" />`
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
                  <p class="flight-label">Flight</p>
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

const placeMarkup = (place) => `
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
            <h4>How To Get There</h4>
            <p>${place.transport}</p>
          </div>
        </div>
        ${
          place.access_note
            ? `<div class="access-note">${place.access_note}</div>`
            : ""
        }
        <div class="links">
          <a class="button-link primary" href="${place.links.map}" target="_blank" rel="noreferrer">Open Map</a>
          <a class="button-link" href="${place.links.reference}" target="_blank" rel="noreferrer">Reference</a>
        </div>
        ${foodMarkup(place.foods)}
      </div>
    </div>
  </article>
`;

const celebrationMarkup = (images = []) => `
  <div class="celebration-grid">
    ${images
      .map(
        (image, index) =>
          `<img src="./${image.src}" alt="${image.alt || `Celebration image ${index + 1}`}" loading="lazy" />`
      )
      .join("")}
  </div>
`;

const dayMarkup = (day, index) => `
  <details class="day fade-up" id="${day.id}" ${index < 2 ? "open" : ""}>
    <summary class="day-summary">
      <div class="day-head${day.gallery_only ? " compact" : ""}">
        <div>
          <p class="day-label">${day.label}</p>
          <h2 class="day-title">${day.date}</h2>
          ${day.focus ? `<p class="day-focus">${day.focus}</p>` : ""}
        </div>
        <div class="day-summary-meta">
          ${day.transport_note ? `<div class="transport-note">${day.transport_note}</div>` : ""}
          <div class="day-toggle" aria-hidden="true">
            <span>Collapse</span>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M6 9.5 12 15.5 18 9.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
    </summary>
    <div class="day-panel">
      ${flightMarkup(day.flights)}
      ${day.gallery_only ? celebrationMarkup(day.gallery) : ""}
      ${day.places?.length ? `<div class="place-list">${day.places.map(placeMarkup).join("")}</div>` : ""}
    </div>
  </details>
`;

const openDayFromHash = () => {
  const id = window.location.hash.slice(1);
  if (!id) {
    return;
  }
  const day = document.getElementById(id);
  if (day instanceof HTMLDetailsElement) {
    day.open = true;
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

const render = (data) => {
  const heroImage = safeImage(data.hero.images);
  app.innerHTML = `
    <div class="page">
      <header class="hero" style="--hero-image: url('./${heroImage}')">
        <div class="hero-inner">
          <div class="eyebrow">Taiwan Trip Plan</div>
          <h1 class="hero-title">${data.title}</h1>
          <div class="hero-meta">
            <div class="meta-pill">${data.trip_dates}</div>
            <div class="meta-pill">${data.summary}</div>
          </div>
          <p class="hero-copy">Flights, stops, food, and local map links in one mobile-safe itinerary.</p>
        </div>
      </header>
      <nav class="day-nav">
        <div class="day-nav-inner">
          ${data.days.map((day) => `<a href="#${day.id}">${day.label}</a>`).join("")}
        </div>
      </nav>
      <main class="content">
        ${data.days.map(dayMarkup).join("")}
      </main>
      <footer class="footer">Maps and source links are attached to each stop.</footer>
    </div>
  `;

  wireDayNav();
  openDayFromHash();
  startObservers();
};

const init = async () => {
  const response = await fetch("./data/itinerary.json");
  const data = await response.json();
  render(data);
  window.addEventListener("hashchange", openDayFromHash);
};

init().catch((error) => {
  app.innerHTML = `<pre>${error.message}</pre>`;
});
