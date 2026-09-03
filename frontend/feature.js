const views = {
  trains: {
    title: "Live train movement",
    subtitle: "Track every active service and its predicted arrival in one focused view.",
    cards: [
      '<article class="feature-card train-search-card"><h2>Find a train</h2><p>Search by train name or train number.</p><label class="feature-search"><span>⌕</span><input id="featureTrainSearch" type="search" placeholder="e.g. Rajdhani or 12952" autocomplete="off" /></label><p class="search-result-count" id="searchResultCount">Showing all active trains</p></article>',
      '<article class="feature-card"><h2>Train availability</h2><p>Availability and predicted timing for matching services</p><ul class="feature-list searchable-trains" id="searchableTrains"><li data-search="12952 rajdhani express"><span><b class="train-name">12952 Rajdhani Express</b><small>New Delhi → Mumbai Central · Departs 14:00</small></span><b><em class="availability available">Available</em>19:04</b></li><li data-search="12045 shatabdi express"><span><b class="train-name">12045 Shatabdi Express</b><small>New Delhi → Chandigarh · Departs 06:00</small></span><b><em class="availability available">Available</em>18:42</b></li><li data-search="12220 duronto express"><span><b class="train-name">12220 Duronto Express</b><small>Pune → Mumbai · Departs 22:30</small></span><b><em class="availability limited">Limited</em>19:26</b></li><li data-search="12910 garib rath"><span><b class="train-name">12910 Garib Rath</b><small>Jaipur → New Delhi · Departs 16:10</small></span><b><em class="availability available">Available</em>19:18</b></li><li data-search="82902 tejas express"><span><b class="train-name">82902 Tejas Express</b><small>Ahmedabad → Mumbai · Departs 15:40</small></span><b><em class="availability unavailable">Unavailable</em>20:02</b></li></ul><p class="no-search-results" id="noSearchResults" hidden>No matching train found. Try a train name or number.</p></article>'
    ]
  },
  network: {
    title: "Network view",
    subtitle: "See corridor health, operational pressure, and route activity at a glance.",
    cards: [
      '<article class="feature-card"><h2>Corridor health map</h2><p>Live operational status across the national network</p><div class="network-visual"><span></span><span></span><span></span></div></article>',
      '<article class="feature-card"><h2>Corridor performance</h2><p>Current on-time health by region</p><ul class="feature-list"><li><span>Western corridor</span><b>92%</b></li><li><span>Northern corridor</span><b>88%</b></li><li><span>Central corridor</span><b>79%</b></li><li><span>Eastern corridor</span><b>68%</b></li></ul></article>'
    ]
  },
  analytics: {
    title: "Forecast analysis simulation",
    subtitle: "Model operational scenarios and see how they could change network ETA performance.",
    cards: [
      '<article class="feature-card simulation-controls-card"><div class="panel-heading"><div><h2>Build a scenario</h2><p>Adjust conditions to simulate the next 3 hours.</p></div><span class="simulator-icon">⌁</span></div><label class="simulation-select">Corridor<select id="simulationCorridor"><option value="western">Western corridor</option><option value="northern">Northern corridor</option><option value="central">Central corridor</option><option value="eastern">Eastern corridor</option></select></label><label class="simulation-slider">Weather severity <output id="weatherSeverityValue">25%</output><input id="weatherSeverity" type="range" min="0" max="100" value="25" /></label><label class="simulation-slider">Traffic load <output id="trafficLoadValue">35%</output><input id="trafficLoad" type="range" min="0" max="100" value="35" /></label><label class="simulation-slider">Signal reliability <output id="signalReliabilityValue">90%</output><input id="signalReliability" type="range" min="50" max="100" value="90" /></label><button class="primary-button simulation-button" id="runSimulation" type="button">Run forecast simulation <span>→</span></button></article>',
      '<article class="feature-card simulation-output-card"><div class="panel-heading"><div><h2>Projected network impact</h2><p id="simulationStatus">Baseline conditions · ready to simulate</p></div><span class="simulation-status-dot" id="simulationStatusDot"></span></div><div class="simulation-metrics"><div><span>Average delay</span><strong id="simulationDelay">04 min</strong></div><div><span>On-time forecast</span><strong id="simulationOnTime">86%</strong></div><div><span>Risk level</span><strong id="simulationRisk">Low</strong></div></div><div class="forecast-graph" aria-label="Forecast impact graph"><div class="graph-y-axis"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div><div class="graph-plot"><div class="graph-grid"><i></i><i></i><i></i><i></i></div><svg viewBox="0 0 520 150" preserveAspectRatio="none"><path class="graph-area" id="forecastArea" d="M0 40 L104 48 L208 55 L312 64 L416 70 L520 76 V150 H0Z"></path><path class="graph-line" id="forecastLine" d="M0 40 L104 48 L208 55 L312 64 L416 70 L520 76"></path></svg><div class="graph-labels"><span>Now</span><span>+30m</span><span>+60m</span><span>+90m</span><span>+120m</span><span>+180m</span></div></div></div><div class="graph-legend"><span><i class="graph-dot on-time-dot"></i>On-time forecast</span><span><i class="graph-dot delay-dot"></i>Delay risk</span></div><div class="impact-track"><span id="impactBar"></span></div><ul class="feature-list"><li><span>Most affected service</span><b id="affectedService">Tejas Express</b></li><li><span>Expected recovery</span><b id="recoveryTime">42 min</b></li><li><span>Confidence</span><b id="simulationConfidence">91%</b></li></ul><button class="ghost-button" id="resetSimulation" type="button">Reset scenario <span>↺</span></button></article>'
    ]
  }
};
const key = new URLSearchParams(location.search).get("view") || "trains";
const view = views[key] || views.trains;
document.title = `RailSense — ${view.title}`;
document.getElementById("featureTitle").textContent = view.title;
document.getElementById("breadcrumbTitle").textContent = view.title;
document.getElementById("featureSubtitle").textContent = view.subtitle;
document.getElementById("featureGrid").innerHTML = view.cards.join("");
document.querySelectorAll(".nav-item[data-view]").forEach((item) => item.classList.toggle("active", item.dataset.view === key));

if (key === "trains") {
  const trainSearch = document.getElementById("featureTrainSearch");
  const trainItems = [...document.querySelectorAll("#searchableTrains li")];
  const resultCount = document.getElementById("searchResultCount");
  const noResults = document.getElementById("noSearchResults");
  trainSearch.addEventListener("input", () => {
    const query = trainSearch.value.trim().toLowerCase();
    const matches = trainItems.filter((item) => item.dataset.search.includes(query));
    trainItems.forEach((item) => { item.hidden = !matches.includes(item); });
    noResults.hidden = matches.length > 0;
    resultCount.textContent = query ? `${matches.length} train${matches.length === 1 ? "" : "s"} found` : "Showing all active trains";
  });
}

if (key === "analytics") {
  const controls = ["weatherSeverity", "trafficLoad", "signalReliability"];
  const updateSimulation = () => {
    const weather = Number(document.getElementById("weatherSeverity").value);
    const traffic = Number(document.getElementById("trafficLoad").value);
    const reliability = Number(document.getElementById("signalReliability").value);
    document.getElementById("weatherSeverityValue").textContent = `${weather}%`;
    document.getElementById("trafficLoadValue").textContent = `${traffic}%`;
    document.getElementById("signalReliabilityValue").textContent = `${reliability}%`;
    const delay = Math.max(2, Math.round(weather * 0.08 + traffic * 0.07 + (100 - reliability) * 0.12));
    const onTime = Math.max(42, Math.round(96 - delay * 1.55));
    const risk = delay >= 15 ? "High" : delay >= 8 ? "Moderate" : "Low";
    const graphValues = [onTime + 8, onTime + 4, onTime, onTime - 3, onTime - 5, onTime - (risk === "High" ? 12 : 7)];
    const graphPoints = graphValues.map((value, index) => `${index * 104} ${Math.max(12, 150 - Math.min(100, value) * 1.38)}`);
    document.getElementById("forecastLine").setAttribute("d", `M${graphPoints.join(" L")}`);
    document.getElementById("forecastArea").setAttribute("d", `M${graphPoints.join(" L")} V150 H0Z`);
    document.getElementById("simulationDelay").textContent = `${String(delay).padStart(2, "0")} min`;
    document.getElementById("simulationOnTime").textContent = `${onTime}%`;
    document.getElementById("simulationRisk").textContent = risk;
    document.getElementById("impactBar").style.width = `${Math.min(100, delay * 4)}%`;
    document.getElementById("simulationStatus").textContent = `${document.getElementById("simulationCorridor").selectedOptions[0].text} · scenario updated`;
    document.getElementById("simulationConfidence").textContent = `${Math.max(62, 96 - delay)}%`;
    document.getElementById("recoveryTime").textContent = `${Math.max(18, 60 - delay)} min`;
    document.getElementById("simulationStatusDot").className = `simulation-status-dot ${risk.toLowerCase()}`;
  };
  controls.forEach((id) => document.getElementById(id).addEventListener("input", updateSimulation));
  document.getElementById("simulationCorridor").addEventListener("change", updateSimulation);
  document.getElementById("runSimulation").addEventListener("click", updateSimulation);
  document.getElementById("resetSimulation").addEventListener("click", () => {
    document.getElementById("weatherSeverity").value = 25;
    document.getElementById("trafficLoad").value = 35;
    document.getElementById("signalReliability").value = 90;
    updateSimulation();
  });
  updateSimulation();
}
