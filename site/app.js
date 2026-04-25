const app = document.querySelector("#app");
const mapsApiKey = window.APP_CONFIG?.GOOGLE_MAPS_EMBED_API_KEY?.trim() || "";
const isCompactViewport = window.matchMedia("(max-width: 720px)").matches;

const safeImage = (images = []) => images.find((image) => image.src)?.src || "";
const assetSrc = (src = "") => (/^(https?:)?\/\//.test(src) ? src : `./${src}`);

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
        <h2 class="stay-title">${stay.label}</h2>
        <p class="stay-address">${stay.address}</p>
        ${stay.phone ? `<p class="stay-phone">${stay.phone}</p>` : ""}
        <p class="stay-note">${stay.note}</p>
        <p class="stay-transit">${stay.transit}</p>
      </div>
      <div class="stay-links">
        <a class="button-link primary" href="${stay.map}" target="_blank" rel="noreferrer">Open Map</a>
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
    )}&q=${encodeURIComponent(query)}&zoom=13&language=en&region=TW`;
  }

  const [origin, ...rest] = day.places;
  const destination = rest.at(-1);
  const waypoints = rest.slice(0, -1).map(placeQuery).join("|");

  return `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(
    mapsApiKey
  )}&origin=${encodeURIComponent(placeQuery(origin))}&destination=${encodeURIComponent(
    placeQuery(destination)
  )}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ""}&language=en&region=TW`;
};

const dayMapMarkup = (day) => {
  if (day.gallery_only || !day.places?.length || !mapsApiKey) {
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
      <div class="transfer-kicker">Next Stop</div>
      <div class="transfer-top">
        <h3>${fromPlace.name} to ${toPlace.name}</h3>
        <div class="transfer-badge">${transfer.mode}</div>
      </div>
      <p class="transfer-instructions">${transfer.instructions}</p>
      ${
        transfer.note
          ? `<p class="transfer-note">${transfer.note}</p>`
          : ""
      }
    </article>
  `;
};

const dayStartMarkup = (startTransfer) => {
  if (!startTransfer) {
    return "";
  }

  return `
    <article class="transfer-card start-card">
      <div class="transfer-kicker">${startTransfer.kicker || "Day Start"}</div>
      <div class="transfer-top">
        <h3>${startTransfer.title}</h3>
        <div class="transfer-badge">${startTransfer.mode}</div>
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

const placeListMarkup = (day) => {
  if (!day.places?.length) {
    return "";
  }

  return `
    <div class="place-list">
      ${day.places
        .map((place, index) => {
          const nextPlace = day.places[index + 1];
          return `${placeMarkup(place)}${transferMarkup(
            day.transfers?.[index],
            place,
            nextPlace
          )}`;
        })
        .join("")}
    </div>
  `;
};

const optionalPlacesMarkup = (day) => {
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
        ${placeListMarkup({ places: day.optional_places, transfers: day.optional_transfers || [] })}
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
            ? `<div class="plan-transport-note">${plan.transport_note}</div>`
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
          ${day.transport_note ? `<div class="transport-note">${day.transport_note}</div>` : ""}
          <div class="day-toggle" aria-hidden="true">
            <span class="when-open">Collapse</span>
            <span class="when-closed">Expand</span>
          </div>
        </div>
      </div>
    </summary>
    <div class="day-panel">
      ${
        day.plans?.length
          ? planListMarkup(day.plans)
          : `${dayStartMarkup(day.start_transfer)}
      ${day.stay_position ? "" : singleStayMarkup(day.stay)}
      ${day.flight_position === "after_places" ? "" : flightMarkup(day.flights)}
      ${dayStartMarkup(day.after_flight_transfer)}
      ${day.stay_position === "after_flights" ? singleStayMarkup(day.stay) : ""}
      ${dayMapMarkup(day)}
      ${day.gallery_only ? celebrationMarkup(day.gallery) : ""}
      ${placeListMarkup(day)}
      ${optionalPlacesMarkup(day)}
      ${dayStartMarkup(day.end_transfer)}
      ${day.stay_position === "after_places" ? singleStayMarkup(day.stay) : ""}
      ${day.flight_position === "after_places" ? flightMarkup(day.flights) : ""}`
      }
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
  openDayFromHash();
  startObservers();
  wireActiveDay();
  wireToggleAll();
  wireBackToTop();
  wirePrint();
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
