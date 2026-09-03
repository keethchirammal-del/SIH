const searchInput = document.getElementById("trainSearch");
const trainRows = [...document.querySelectorAll("#trainTable tr")];
const refreshButton = document.getElementById("refreshButton");
const toast = document.getElementById("toast");
const filterButtons = [...document.querySelectorAll(".filter-button")];
const weatherTabs = [...document.querySelectorAll(".weather-tab")];
const navigationItems = [...document.querySelectorAll(".nav-item")];
const sections = navigationItems
  .map((item) => item.getAttribute("href"))
  .filter((href) => href && href.startsWith("#"))
  .map((href) => document.querySelector(href))
  .filter(Boolean);
const leafletMap = L.map("leafletMap", { zoomControl: true, attributionControl: true }).setView([22.5, 79], 5);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap contributors" }).addTo(leafletMap);
function activateNavigation(sectionId) {
  navigationItems.forEach((item) => item.classList.toggle("active", item.getAttribute("href") === `#${sectionId}`));
}
navigationItems.forEach((item) => item.addEventListener("click", () => {
  const href = item.getAttribute("href");
  if (href && href.startsWith("#")) activateNavigation(href.slice(1));
}));
document.querySelectorAll(".saved-view").forEach((view) => view.addEventListener("click", () => {
  document.getElementById(view.dataset.target).scrollIntoView({ behavior: "smooth", block: "start" });
  activateNavigation(view.dataset.target);
  if (view.dataset.filter) filterButtons.find((button) => button.textContent.includes(view.dataset.filter))?.click();
}));
document.querySelector(".brand").addEventListener("click", () => activateNavigation("overview"));
const sectionObserver = new IntersectionObserver((entries) => {
  const visibleSection = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (visibleSection) activateNavigation(visibleSection.target.id);
}, { rootMargin: "-18% 0px -65% 0px", threshold: [0, 0.25, 0.5] });
sections.forEach((section) => sectionObserver.observe(section));
const stationData = [
  { name: "New Delhi", coords: [28.6139, 77.209], value: "28°" },
  { name: "Jaipur", coords: [26.9124, 75.7873], value: "31°" },
  { name: "Pune", coords: [18.5204, 73.8567], value: "26°" },
  { name: "Mumbai", coords: [19.076, 72.8777], value: "27°" },
  { name: "Kolkata", coords: [22.5726, 88.3639], value: "29°" }
];
const routes = {
  rajdhani: { origin: "New Delhi", destination: "Mumbai Central", type: "Superfast", stops: ["New Delhi", "Mathura", "Kota", "Ratlam", "Vadodara", "Surat", "Borivali", "Mumbai Central"], coords: [[28.6139, 77.209], [27.4924, 77.6737], [25.2138, 75.8648], [23.3342, 75.036], [22.3072, 73.1812], [21.1702, 72.8311], [19.229, 72.857], [18.9402, 72.8356]], halts: 6, search: "12952 rajdhani express new delhi mumbai surat" },
  shatabdi: { origin: "New Delhi", destination: "Chandigarh", type: "Premium day service", stops: ["New Delhi", "Panipat", "Karnal", "Ambala Cantt", "Chandigarh"], coords: [[28.6139, 77.209], [29.3909, 76.9635], [29.6857, 76.9905], [30.3752, 76.7821], [30.7333, 76.7794]], halts: 3, search: "12045 shatabdi express new delhi chandigarh ambala" },
  duronto: { origin: "Pune", destination: "Mumbai", type: "Non-stop", stops: ["Pune", "Lonavala", "Kalyan", "Mumbai Central"], coords: [[18.5204, 73.8567], [18.7546, 73.4062], [19.2437, 73.1355], [18.9402, 72.8356]], halts: 2, search: "12220 duronto express pune mumbai lonavala" },
  garib: { origin: "Jaipur", destination: "New Delhi", type: "Express", stops: ["Jaipur", "Alwar", "Rewari", "Gurgaon", "New Delhi"], coords: [[26.9124, 75.7873], [27.553, 76.6346], [28.199, 76.619], [28.4595, 77.0266], [28.6139, 77.209]], halts: 3, search: "12910 garib rath jaipur delhi gurgaon" },
  tejas: { origin: "Ahmedabad", destination: "Mumbai Central", type: "Premium", stops: ["Ahmedabad", "Vadodara", "Surat", "Vapi", "Borivali", "Mumbai Central"], coords: [[23.0225, 72.5714], [22.3072, 73.1812], [21.1702, 72.8311], [20.371, 72.904], [19.229, 72.857], [18.9402, 72.8356]], halts: 4, search: "82902 tejas express ahmedabad mumbai vadodara" }
};
let routeLine;
let routeStationMarkers = [];
let selectedRouteKey = "rajdhani";
const confidenceProfiles = {
  rajdhani: { score: 92, eta: "19:04" },
  shatabdi: { score: 95, eta: "18:42" },
  duronto: { score: 78, eta: "19:26" },
  garib: { score: 89, eta: "19:18" },
  tejas: { score: 73, eta: "20:02" }
};
function updateForecastLab(routeKey) {
  selectedRouteKey = routeKey;
  const route = routes[routeKey];
  const profile = confidenceProfiles[routeKey];
  document.getElementById("confidenceBadge").textContent = `${profile.score}%`;
  document.getElementById("confidenceBar").style.width = `${profile.score}%`;
  document.getElementById("confidenceLabel").textContent = profile.score >= 90 ? "High confidence" : profile.score >= 80 ? "Moderate confidence" : "Watch closely";
  document.getElementById("confidenceRoute").textContent = `${route.origin} → ${route.destination}`;
  document.getElementById("confidenceReasons").innerHTML = [
    profile.score >= 85 ? "Clear conditions along the route" : "Weather may affect this route",
    route.type === "Non-stop" ? "Fewer scheduled halts to absorb delays" : "Scheduled halts included in prediction",
    profile.score >= 80 ? "Recent GPS updates received" : "Some tracking updates are delayed"
  ].map((reason) => `<li>${reason}</li>`).join("");
  updateSimulation();
}
function updateSimulation() {
  const profile = confidenceProfiles[selectedRouteKey];
  const extraDelay = ["weatherDelay", "congestionDelay", "signalDelay"].reduce((total, id) => total + Number(document.getElementById(id).value), 0);
  ["weatherDelay", "congestionDelay", "signalDelay"].forEach((id) => {
    document.getElementById(`${id}Value`).textContent = `${document.getElementById(id).value} min`;
  });
  const [hours, minutes] = profile.eta.split(":").map(Number);
  const projected = new Date(2026, 8, 3, hours, minutes + extraDelay);
  document.getElementById("simulatedEta").textContent = projected.toTimeString().slice(0, 5);
  document.getElementById("simulatedDelay").textContent = extraDelay ? `+${extraDelay} min simulated delay` : "On schedule";
}
function renderRoute(routeKey) {
  const route = routes[routeKey];
  if (routeLine) leafletMap.removeLayer(routeLine);
  routeStationMarkers.forEach((marker) => leafletMap.removeLayer(marker));
  routeLine = L.polyline(route.coords, { color: "#5364ec", weight: 4, opacity: 0.9, dashArray: route.type === "Non-stop" ? "2 7" : "" }).addTo(leafletMap);
  routeStationMarkers = route.coords.map((coords, index) => L.circleMarker(coords, { radius: index === 0 || index === route.coords.length - 1 ? 7 : 5, color: "#fff", weight: 2, fillColor: index === 0 || index === route.coords.length - 1 ? "#25b481" : "#6675f5", fillOpacity: 1 }).bindTooltip(`${route.stops[index]}${index === 0 || index === route.coords.length - 1 ? " · terminal" : " · scheduled halt"}`, { direction: "top" }).addTo(leafletMap));
  leafletMap.fitBounds(routeLine.getBounds(), { padding: [25, 25], maxZoom: 6 });
  document.getElementById("routeStopCount").textContent = route.stops.length;
  document.getElementById("routeOrigin").textContent = route.origin;
  document.getElementById("routeDestination").textContent = route.destination;
  document.getElementById("routeStops").textContent = `${route.stops.length} stations`;
  document.getElementById("routeHalts").textContent = `${route.halts} stops`;
  document.getElementById("stationStrip").innerHTML = route.stops.map((stop, index) => `${index === 0 || index === route.stops.length - 1 ? `<span class="station-dot ${index === 0 ? "origin" : "destination"}"></span>` : ""}<span>${stop}</span>${index < route.stops.length - 1 ? "<i></i>" : ""}`).join("");
  updateForecastLab(routeKey);
}
document.querySelectorAll(".route-option").forEach((option) => option.addEventListener("click", () => {
  document.querySelectorAll(".route-option").forEach((item) => item.classList.remove("active"));
  option.classList.add("active");
  renderRoute(option.dataset.route);
}));
const weatherMarkers = stationData.map((station, index) => {
  const marker = L.marker(station.coords, { icon: L.divIcon({ className: "weather-leaflet-marker", html: `<span>${station.value}</span>`, iconSize: [44, 38], iconAnchor: [22, 30] }) }).addTo(leafletMap);
  marker.bindTooltip(station.name, { direction: "top", offset: [0, -25] });
  marker.on("click", () => {
    document.querySelector(".weather-card strong").textContent = station.name;
    const data = weatherData[activeWeather];
    document.getElementById("readingValue").textContent = data.values[index] + (activeWeather === "wind" ? " km/h" : activeWeather === "pressure" ? " hPa" : "");
  });
  return marker;
});
const weatherData = {
  temperature: { label: "Temperature", values: ["28°", "31°", "26°", "27°", "29°"], legend: ["20°", "25°", "30°", "35°"] },
  wind: { label: "Wind speed", values: ["14", "19", "11", "22", "9"], legend: ["0", "10", "20", "30 km/h"] },
  pressure: { label: "Pressure", values: ["1008", "1005", "1012", "1009", "1007"], legend: ["990", "1000", "1010", "1020 hPa"] },
  humidity: { label: "Humidity", values: ["64%", "52%", "71%", "78%", "84%"], legend: ["40%", "55%", "70%", "85%"] }
};
let activeWeather = "temperature";

function renderWeatherLayer(layer) {
  const data = weatherData[layer];
  activeWeather = layer;
  weatherTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.weather === layer));
  weatherMarkers.forEach((marker, index) => {
    const value = data.values[index];
    marker.setIcon(L.divIcon({ className: "weather-leaflet-marker", html: `<span>${value}</span>`, iconSize: [44, 38], iconAnchor: [22, 30] }));
  });
  document.getElementById("legendTitle").textContent = data.label;
  document.querySelector(".legend-values").innerHTML = data.legend.map((value) => `<span>${value}</span>`).join("");
  document.getElementById("readingLabel").textContent = data.label;
  document.getElementById("readingValue").textContent = data.values[0] + (layer === "wind" ? " km/h" : layer === "pressure" ? " hPa" : "");
}

weatherTabs.forEach((tab) => tab.addEventListener("click", () => renderWeatherLayer(tab.dataset.weather)));
["weatherDelay", "congestionDelay", "signalDelay"].forEach((id) => document.getElementById(id).addEventListener("input", updateSimulation));
document.getElementById("resetSimulator").addEventListener("click", () => {
  ["weatherDelay", "congestionDelay", "signalDelay"].forEach((id) => { document.getElementById(id).value = 0; });
  updateSimulation();
});
updateForecastLab(selectedRouteKey);

searchInput.addEventListener("input", (event) => {
  const query = event.target.value.trim().toLowerCase();
  trainRows.forEach((row) => {
    row.hidden = query.length > 0 && !row.dataset.search.includes(query);
  });
  const routeSummary = document.getElementById("routeSummary");
  const matchedRoute = Object.entries(routes).find(([, route]) => query.length > 0 && route.search.includes(query));
  routeSummary.classList.toggle("is-hidden", !matchedRoute);
  if (matchedRoute) {
    document.querySelectorAll(".route-option").forEach((option) => option.classList.toggle("active", option.dataset.route === matchedRoute[0]));
    renderRoute(matchedRoute[0]);
  } else if (routeLine) {
    leafletMap.removeLayer(routeLine);
    routeLine = null;
    routeStationMarkers.forEach((marker) => leafletMap.removeLayer(marker));
    routeStationMarkers = [];
  }
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((item) => item.classList.remove("active-filter"));
    button.classList.add("active-filter");
    const filter = button.textContent.toLowerCase();
    trainRows.forEach((row) => {
      const isDelayed = row.querySelector(".status")?.classList.contains("delayed");
      row.hidden = filter.includes("at risk") ? !isDelayed : filter.includes("on time") ? isDelayed : false;
    });
    searchInput.value = "";
  });
});

refreshButton.addEventListener("click", () => {
  refreshButton.disabled = true;
  refreshButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 11a8.1 8.1 0 0 0-14.9-3L3 11m0 0V5m0 6h6M4 13a8.1 8.1 0 0 0 14.9 3L21 13m0 0v6m0-6h-6"/></svg>Refreshing...';
  setTimeout(() => {
    refreshButton.disabled = false;
    refreshButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 11a8.1 8.1 0 0 0-14.9-3L3 11m0 0V5m0 6h6M4 13a8.1 8.1 0 0 0 14.9 3L21 13m0 0v6m0-6h-6"/></svg>Refresh forecast';
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2600);
  }, 750);
});
