
/* =========================================================
   INDIA LIVE WEATHER — COMPLETE JAVASCRIPT
   API: Open-Meteo
   Map: Leaflet / OpenStreetMap
   AQI: Open-Meteo Air Quality API

   FEATURES:
   - GPS location
   - Manual city search
   - Autocomplete
   - Current weather
   - 7-day forecast
   - Sunrise / sunset
   - Rain probability
   - Dynamic backgrounds
   - Night detection
   - Lightning
   - Interactive map
   - Travel status
   - Live clock
   - Live AQI
   - Pollutant readings
========================================================= */

"use strict";


/* =========================================================
   DOM ELEMENTS
========================================================= */

const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const locationBtn = document.getElementById("locationBtn");
const errorMsg = document.getElementById("errorMsg");

const locationName = document.getElementById("locationName");
const locationAddress = document.getElementById("locationAddress");

const temperature = document.getElementById("temperature");
const feelsLike = document.getElementById("feelsLike");
const weatherIcon = document.getElementById("weatherIcon");
const weatherCondition = document.getElementById("weatherCondition");

const humidity = document.getElementById("humidity");
const rainValue = document.getElementById("rainValue");
const cloudCover = document.getElementById("cloudCover");
const windSpeed = document.getElementById("windSpeed");
const windDirection = document.getElementById("windDirection");
const rainChance = document.getElementById("rainChance");

const sunrise = document.getElementById("sunrise");
const sunset = document.getElementById("sunset");

const forecastContainer =
  document.getElementById("forecastContainer");

const forecastLocation =
  document.getElementById("forecastLocation");

const mapLocationName =
  document.getElementById("mapLocationName");

const suggestionList =
  document.getElementById("suggestionList");

const weatherBackground =
  document.getElementById("weatherBackground");

const travelIcon =
  document.getElementById("travelIcon");

const travelTitle =
  document.getElementById("travelTitle");

const travelMessage =
  document.getElementById("travelMessage");

const currentDate =
  document.getElementById("currentDate");

const currentTime =
  document.getElementById("currentTime");

const lightning =
  document.getElementById("lightning");


/* =========================================================
   AQI DOM ELEMENTS
========================================================= */

const aqiElements = {

  section:
    document.getElementById("airQualitySection"),

  location:
    document.getElementById("aqiLocation"),

  value:
    document.getElementById("aqiValue"),

  status:
    document.getElementById("aqiStatus"),

  description:
    document.getElementById("aqiDescription"),

  gauge:
    document.getElementById("aqiGauge"),

  gaugeValue:
    document.getElementById("aqiGaugeValue"),

  healthTitle:
    document.getElementById("aqiHealthTitle"),

  healthMessage:
    document.getElementById("aqiHealthMessage"),

  dataStatus:
    document.getElementById("aqiDataStatus"),

  liveIndicator:
    document.querySelector(".aqi-live-indicator"),

  pm25:
    document.getElementById("pm25Value"),

  pm10:
    document.getElementById("pm10Value"),

  co:
    document.getElementById("coValue"),

  no2:
    document.getElementById("no2Value"),

  so2:
    document.getElementById("so2Value"),

  o3:
    document.getElementById("o3Value"),

  pm25Status:
    document.getElementById("pm25Status"),

  pm10Status:
    document.getElementById("pm10Status"),

  coStatus:
    document.getElementById("coStatus"),

  no2Status:
    document.getElementById("no2Status"),

  so2Status:
    document.getElementById("so2Status"),

  o3Status:
    document.getElementById("o3Status")

};


/* =========================================================
   VARIABLES
========================================================= */

let map = null;
let marker = null;

let radarLayer = null;
let radarRefreshTimer = null;
let baseMapLayer = null;
let mapLayerControl = null;

let radarFrames = [];
let radarPlaying = false;
let radarTimer = null;
let radarFrameIndex = 0;
let radarApiHost = "";
let radarPlaybackTimer = null;
let radarPlaybackControl = null;

let searchTimer = null;
let suggestionController = null;
let weatherController = null;
let aqiRequestController = null;

let lightningTimer = null;
let lightningActive = false;

let lastWeatherData = null;
let lastPlace = null;


/* =========================================================
   API URLS
========================================================= */

const GEO_API =
  "https://geocoding-api.open-meteo.com/v1/search";

const WEATHER_API =
  "https://api.open-meteo.com/v1/forecast";

const REVERSE_API =
  "https://nominatim.openstreetmap.org/reverse";

const AQI_API =
  "https://air-quality-api.open-meteo.com/v1/air-quality";


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  startClock();

  initializeMap();

  loadLiveRadar();
  setupRadarOpacityControls();

  setupSearch();

  setupLocationButton();

  autoDetectLocation();

  console.log(
    "India Live Weather initialized."
  );

});

/* =========================================================
   CLOCK
========================================================= */

function startClock() {

  function updateClock() {

    const now = new Date();

    if (currentDate) {

      currentDate.textContent =
        now.toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric"
        });

    }

    if (currentTime) {

      currentTime.textContent =
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        });

    }

  }

  updateClock();

  setInterval(updateClock, 1000);

}

/* =========================================================
   MAP INITIALIZATION + RADAR CONTROL
========================================================= */

function initializeMap() {

  const mapElement =
    document.getElementById("map");

  if (!mapElement) {
    return;
  }

  if (typeof L === "undefined") {

    showError(
      "Map library failed to load."
    );

    return;

  }

  if (map) {
    return;
  }

  map = L.map("map", {
    zoomControl: true
  }).setView([20.5937, 78.9629], 5);


  /* NORMAL MAP */

  baseMapLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }
  );

  baseMapLayer.addTo(map);


  /* RADAR LAYER */

  radarLayer = L.tileLayer(
    "",
    {
      opacity: 0.65,
      attribution: "Radar tiles"
    }
  );


  /* MAP CONTROLS */

  mapLayerControl =
    L.control.layers(
      {
        "Normal Map": baseMapLayer
      },
      {
        "Rain Radar": radarLayer
      },
      {
        collapsed: false
      }
    ).addTo(map);


  setTimeout(() => {

    map.invalidateSize();

  }, 300);

}
/* =========================================================
   LIVE RADAR + AUTO REFRESH
========================================================= */

async function loadLiveRadar() {

  const slider = document.getElementById("radarTimeline");
  const playBtn = document.getElementById("radarPlayBtn");
  const timeLabel = document.getElementById("radarFrameTime");
  const status = document.getElementById("radarStatus");

  if (!map || !radarLayer) {
    return;
  }

  if (!slider || !playBtn || !timeLabel || !status) {
    console.warn("Radar timeline elements missing.");
    return;
  }

  stopRadarAnimation();

  status.textContent = "Refreshing radar data...";

  try {

    const response = await fetch(
      "https://api.rainviewer.com/public/weather-maps.json"
    );

    if (!response.ok) {
      throw new Error("Radar API request failed.");
    }

    const data = await response.json();

    radarApiHost = data.host || "";

    radarFrames = data.radar?.past || [];

    if (!radarApiHost || radarFrames.length === 0) {
      throw new Error("No radar frames available.");
    }

    slider.min = 0;
    slider.max = radarFrames.length - 1;
    slider.step = 1;

    radarFrameIndex = radarFrames.length - 1;

    slider.value = radarFrameIndex;

    showRadarFrame(radarFrameIndex);

    /* LAST UPDATED TIME */

    const generatedTime = data.generated
      ? new Date(data.generated * 1000)
      : new Date();

    const formattedUpdateTime =
      generatedTime.toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });

    status.textContent =
      ` ${radarFrames.length} frames available • Updated ${formattedUpdateTime}`;

    /* SLIDER */

    slider.oninput = function () {

      stopRadarAnimation();

      radarFrameIndex = Number(this.value);

      showRadarFrame(radarFrameIndex);

    };

    /* PLAY / PAUSE */

    playBtn.onclick = function () {

      if (radarPlaying) {
        stopRadarAnimation();
      } else {
        startRadarAnimation();
      }

    };

    console.log(
      "🌧️ Radar refreshed successfully:",
      formattedUpdateTime
    );

    /* AUTO REFRESH EVERY 10 MINUTES */

    if (radarRefreshTimer !== null) {

      clearInterval(radarRefreshTimer);

    }

    radarRefreshTimer = setInterval(() => {

      loadLiveRadar();

    }, 10 * 60 * 1000);

  } catch (error) {

    status.textContent =
      "Radar data unavailable. Retrying later.";

    console.error(
      "Radar refresh error:",
      error
    );

    /* RETRY AFTER 10 MINUTES */

    if (radarRefreshTimer !== null) {

      clearInterval(radarRefreshTimer);

    }

    radarRefreshTimer = setInterval(() => {

      loadLiveRadar();

    }, 10 * 60 * 1000);

  }

}
/* =========================================================
   SHOW RADAR FRAME
========================================================= */

function showRadarFrame(index) {

  if (!radarFrames.length || !radarLayer) {
    return;
  }

  index = Math.max(
    0,
    Math.min(index, radarFrames.length - 1)
  );

  radarFrameIndex = index;

  const frame = radarFrames[index];

  const tileURL =
    `${radarApiHost}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;

  radarLayer.setUrl(tileURL);

  const slider =
    document.getElementById("radarTimeline");

  const timeLabel =
    document.getElementById("radarFrameTime");

  if (slider) {
    slider.value = index;
  }

  if (timeLabel) {

    timeLabel.textContent =
      new Date(frame.time * 1000).toLocaleString(
        undefined,
        {
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit"
        }
      );

  }

}


/* =========================================================
   START RADAR ANIMATION
========================================================= */

function startRadarAnimation() {

  if (!radarFrames.length) {
    return;
  }

  radarPlaying = true;

  const playBtn =
    document.getElementById("radarPlayBtn");

  if (playBtn) {
    playBtn.textContent = "⏸ Pause";
  }

  animateRadarFrame();

}


/* =========================================================
   ANIMATE RADAR
========================================================= */

function animateRadarFrame() {

  if (!radarPlaying || radarFrames.length === 0) {
    return;
  }

  radarFrameIndex++;

  if (radarFrameIndex >= radarFrames.length) {

    radarFrameIndex = 0;

  }

  showRadarFrame(radarFrameIndex);

  radarTimer = setTimeout(
    animateRadarFrame,
    800
  );

}


/* =========================================================
   STOP RADAR ANIMATION
========================================================= */

function stopRadarAnimation() {

  radarPlaying = false;

  if (radarTimer !== null) {

    clearTimeout(radarTimer);

    radarTimer = null;

  }

  const playBtn =
    document.getElementById("radarPlayBtn");

  if (playBtn) {
    playBtn.textContent = "▶ Play";
  }

}


/* =========================================================
   DISPLAY RADAR FRAME
========================================================= */

function displayRadarFrame(index) {

  if (!radarFrames[index] || !radarLayer) return;

  const frame = radarFrames[index];

  const tileURL =
    `https://tilecache.rainviewer.com${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;

  radarLayer.setUrl(tileURL);

  radarFrameIndex = index;

  const slider =
    document.getElementById("radarTimeline");

  const label =
    document.getElementById("radarFrameLabel");

  if (slider) {
    slider.value = index;
  }

  if (label) {

    label.textContent = new Date(
      frame.time * 1000
    ).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

  }

}


/* =========================================================
   RADAR PLAYBACK CONTROL
========================================================= */

function createRadarPlaybackControl() {

  if (!map || radarPlaybackControl) return;

  radarPlaybackControl = L.control({
    position: "bottomleft"
  });

  radarPlaybackControl.onAdd = function () {

    const container = L.DomUtil.create(
      "div",
      "radar-playback-panel"
    );

    container.innerHTML = `
      <div class="radar-playback-inner">

        <div class="radar-playback-header">
          <span class="radar-playback-title">
            LIVE RADAR
          </span>

          <span id="radarFrameLabel">
            --
          </span>
        </div>

        <div class="radar-playback-actions">

          <button
            type="button"
            id="radarPlayButton"
            aria-label="Play radar animation"
          >
            ▶
          </button>

          <input
            type="range"
            id="radarTimeline"
            min="0"
            max="${radarFrames.length - 1}"
            value="${radarFrameIndex}"
            step="1"
          >

        </div>

        <div class="radar-playback-footer">
          <span>Past radar</span>
          <span>${radarFrames.length} frames</span>
        </div>

      </div>
    `;

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    return container;

  };

  radarPlaybackControl.addTo(map);

  setupRadarPlaybackEvents();

}


/* =========================================================
   RADAR PLAYBACK EVENTS
========================================================= */

function setupRadarPlaybackEvents() {

  const playButton =
    document.getElementById("radarPlayButton");

  const slider =
    document.getElementById("radarTimeline");

  if (!playButton || !slider) return;


  slider.addEventListener("input", () => {

    stopRadarPlayback();

    displayRadarFrame(
      Number(slider.value)
    );

    playButton.textContent = "▶";

  });


  playButton.addEventListener("click", () => {

    if (radarPlaybackTimer) {

      stopRadarPlayback();

      playButton.textContent = "▶";

    } else {

      startRadarPlayback();

      playButton.textContent = "❚❚";

    }

  });

}


/* =========================================================
   PLAY RADAR
========================================================= */

function startRadarPlayback() {

  if (radarFrames.length < 2) return;

  stopRadarPlayback();

  const playButton =
    document.getElementById("radarPlayButton");

  radarPlaybackTimer = setInterval(() => {

    let nextIndex = radarFrameIndex + 1;

    if (nextIndex >= radarFrames.length) {
      nextIndex = 0;
    }

    displayRadarFrame(nextIndex);

  }, 800);


  if (playButton) {
    playButton.textContent = "❚❚";
  }

}


/* =========================================================
   STOP RADAR
========================================================= */

function stopRadarPlayback() {

  if (radarPlaybackTimer) {

    clearInterval(radarPlaybackTimer);

    radarPlaybackTimer = null;

  }

  const playButton =
    document.getElementById("radarPlayButton");

  if (playButton) {
    playButton.textContent = "▶";
  }

}
/* =========================================================
   GPS AUTO DETECTION
========================================================= */

function autoDetectLocation() {

  if (!navigator.geolocation) {

    showError(
      "GPS is unavailable. Search your location manually."
    );

    return;

  }

  navigator.geolocation.getCurrentPosition(

    async position => {

      const latitude =
        position.coords.latitude;

      const longitude =
        position.coords.longitude;

      try {

        const place =
          await reverseGeocode(latitude, longitude);

        await loadWeather(
          latitude,
          longitude,
          place
        );

      } catch (error) {

        console.error(error);

        showError(
          "Unable to load weather for your location."
        );

      }

    },

    error => {

      console.warn(
        "Automatic location unavailable:",
        error.message
      );

      showError(
        "Location permission unavailable. Search a city or use the location button."
      );

      if (locationName) {

        locationName.textContent =
          "📍 Search your location";

      }

      if (locationAddress) {

        locationAddress.textContent =
          "Enter a village, town, city or district above.";

      }

    },

    {
      enableHighAccuracy: false,
      timeout: 12000,
      maximumAge: 300000
    }

  );

}


/* =========================================================
   LOCATION BUTTON
========================================================= */

function setupLocationButton() {

  if (!locationBtn) {
    return;
  }

  locationBtn.addEventListener("click", () => {

    hideError();

    if (!navigator.geolocation) {

      showError(
        "Your browser does not support GPS."
      );

      return;

    }

    locationBtn.disabled = true;

    locationBtn.textContent =
      "📍 Detecting location...";

    navigator.geolocation.getCurrentPosition(

      async position => {

        try {

          const latitude =
            position.coords.latitude;

          const longitude =
            position.coords.longitude;

          const place =
            await reverseGeocode(latitude, longitude);

          await loadWeather(
            latitude,
            longitude,
            place
          );

        } catch (error) {

          console.error(error);

          showError(
            "Unable to load weather for your location."
          );

        } finally {

          restoreLocationButton();

        }

      },

      error => {

        console.warn(error);

        showError(
          "Location permission denied or unavailable. Please search manually."
        );

        restoreLocationButton();

      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }

    );

  });

}


function restoreLocationButton() {

  if (!locationBtn) {
    return;
  }

  locationBtn.disabled = false;

  locationBtn.textContent =
    "📍 Use My Location";

}


/* =========================================================
   SEARCH EVENTS
========================================================= */

function setupSearch() {

  if (!searchBtn || !cityInput) {
    return;
  }

  searchBtn.addEventListener(
    "click",
    searchLocation
  );

  cityInput.addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {

        event.preventDefault();

        searchLocation();

      }

      if (event.key === "Escape") {

        hideSuggestions();

      }

    }
  );

  cityInput.addEventListener(
    "input",
    handleSearchInput
  );

  document.addEventListener(
    "click",
    event => {

      if (
        !event.target.closest(".search-area")
      ) {

        hideSuggestions();

      }

    }
  );

}


/* =========================================================
   SEARCH INPUT
========================================================= */

function handleSearchInput() {

  const value =
    cityInput.value.trim();

  clearTimeout(searchTimer);

  if (value.length < 2) {

    hideSuggestions();

    return;

  }

  searchTimer = setTimeout(() => {

    getSuggestions(value);

  }, 350);

}


/* =========================================================
   SEARCH LOCATION
========================================================= */

async function searchLocation() {

  const query =
    cityInput.value.trim();

  if (!query) {

    showError(
      "Please enter a village, town, city or district."
    );

    cityInput.focus();

    return;

  }

  hideError();

  hideSuggestions();

  searchBtn.disabled = true;

  searchBtn.textContent =
    "Searching...";

  try {

    const url =
      `${GEO_API}?name=${encodeURIComponent(query)}` +
      `&count=10&language=en&format=json`;

    const response =
      await fetch(url);

    if (!response.ok) {

      throw new Error(
        "Location search failed."
      );

    }

    const data =
      await response.json();

    if (
      !data.results ||
      data.results.length === 0
    ) {

      showError(
        "Location not found. Try another name."
      );

      return;

    }

    const result =
      chooseBestLocation(data.results);

    const place =
      createPlace(result);

    cityInput.value =
      result.name;

    await loadWeather(
      result.latitude,
      result.longitude,
      place
    );

  } catch (error) {

    console.error(error);

    showError(
      "Search failed. Please check your internet connection."
    );

  } finally {

    searchBtn.disabled = false;

    searchBtn.textContent =
      "🔍 Search";

  }

}


/* =========================================================
   SELECT BEST SEARCH RESULT
========================================================= */

function chooseBestLocation(results) {

  const indiaResults =
    results.filter(
      item => item.country_code === "IN"
    );

  if (indiaResults.length > 0) {

    return indiaResults[0];

  }

  return results[0];

}


/* =========================================================
   PLACE OBJECT
========================================================= */

function createPlace(result) {

  return {

    name: result.name || "Unknown Location",

    district:
      result.admin2 ||
      result.admin3 ||
      result.admin4 ||
      "",

    state:
      result.admin1 || "",

    country:
      result.country || "",

    countryCode:
      result.country_code || ""

  };

}


/* =========================================================
   AUTOCOMPLETE
========================================================= */

async function getSuggestions(value) {

  if (suggestionController) {

    suggestionController.abort();

  }

  suggestionController =
    new AbortController();

  try {

    const url =
      `${GEO_API}?name=${encodeURIComponent(value)}` +
      `&count=10&language=en&format=json`;

    const response =
      await fetch(url, {
        signal: suggestionController.signal
      });

    if (!response.ok) {

      throw new Error(
        "Suggestions unavailable."
      );

    }

    const data =
      await response.json();

    if (!data.results) {

      hideSuggestions();

      return;

    }

    const indiaResults =
      data.results.filter(
        item => item.country_code === "IN"
      );

    const results =
      indiaResults.length > 0
        ? indiaResults
        : data.results;

    renderSuggestions(results);

  } catch (error) {

    if (error.name !== "AbortError") {

      console.error(error);

    }

  }

}


/* =========================================================
   RENDER SUGGESTIONS
========================================================= */

function renderSuggestions(results) {

  if (!suggestionList) {
    return;
  }

  suggestionList.innerHTML = "";

  results.forEach(result => {

    const item =
      document.createElement("div");

    item.className =
      "suggestion-item";

    item.setAttribute(
      "role",
      "button"
    );

    item.setAttribute(
      "tabindex",
      "0"
    );

    const title =
      document.createElement("strong");

    title.textContent =
      `📍 ${result.name}`;

    const details =
      document.createElement("span");

    details.textContent =
      [
        result.admin2,
        result.admin1,
        result.country
      ]
        .filter(Boolean)
        .join(", ");

    item.appendChild(title);

    item.appendChild(details);

    const selectResult =
      async () => {

        cityInput.value =
          result.name;

        hideSuggestions();

        const place =
          createPlace(result);

        await loadWeather(
          result.latitude,
          result.longitude,
          place
        );

      };

    item.addEventListener(
      "click",
      selectResult
    );

    item.addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Enter" ||
          event.key === " "
        ) {

          event.preventDefault();

          selectResult();

        }

      }
    );

    suggestionList.appendChild(item);

  });

  suggestionList.style.display =
    results.length > 0
      ? "block"
      : "none";

}


/* =========================================================
   HIDE SUGGESTIONS
========================================================= */

function hideSuggestions() {

  if (suggestionList) {

    suggestionList.style.display =
      "none";

  }

}


/* =========================================================
   REVERSE GEOCODING
========================================================= */

async function reverseGeocode(
  latitude,
  longitude
) {

  try {

    const url =
      `${REVERSE_API}?lat=${latitude}` +
      `&lon=${longitude}` +
      `&format=json&zoom=18&addressdetails=1`;

    const response =
      await fetch(url);

    if (!response.ok) {

      throw new Error(
        "Reverse geocoding unavailable."
      );

    }

    const data =
      await response.json();

    const address =
      data.address || {};

    return {

      name:
        address.village ||
        address.town ||
        address.city ||
        address.municipality ||
        address.suburb ||
        address.hamlet ||
        address.county ||
        "Current Location",

      district:
        address.state_district ||
        address.county ||
        "",

      state:
        address.state ||
        "",

      country:
        address.country ||
        "",

      countryCode:
        address.country_code || ""

    };

  } catch (error) {

    console.error(
      "Reverse geocoding:",
      error
    );

    return {

      name: "Current Location",

      district: "",

      state: "",

      country: "",

      countryCode: ""

    };

  }

}


/* =========================================================
   LOAD WEATHER + AUTOMATIC AQI
========================================================= */

async function loadWeather(
  latitude,
  longitude,
  place
) {

  if (weatherController) {

    weatherController.abort();

  }

  weatherController =
    new AbortController();

  showLoading();

  try {

    const url =
      `${WEATHER_API}?latitude=${latitude}` +
      `&longitude=${longitude}` +

      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,is_day` +

      `&hourly=precipitation_probability` +

      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset` +

      `&timezone=auto` +

      `&forecast_days=7`;


    const response =
      await fetch(url, {
        signal: weatherController.signal
      });


    if (!response.ok) {

      throw new Error(
        `Weather API error: ${response.status}`
      );

    }


    const data =
      await response.json();


    if (
      !data.current ||
      !data.daily
    ) {

      throw new Error(
        "Weather data is incomplete."
      );

    }


    /* SAVE DATA */

    lastWeatherData =
      data;

    lastPlace =
      place;


    /* UPDATE WEATHER */

    updateCurrentWeather(
      data,
      place
    );

    updateForecast(
      data,
      place
    );

    updateMap(
      latitude,
      longitude,
      place
    );

    updateWeatherBackground(
      data.current
    );

    updateTravelStatus(
      data.current,
      data.daily
    );


    /* AUTOMATIC AQI UPDATE */

    loadAQI(
      latitude,
      longitude,
      formatAddress(place)
    );


    hideError();


  } catch (error) {

    if (
      error.name === "AbortError"
    ) {

      return;

    }

    console.error(error);

    showError(
      "Unable to load weather. Please try again."
    );

  }

}


/* =========================================================
   LOADING STATE
========================================================= */

function showLoading() {

  if (weatherIcon) {

    weatherIcon.textContent =
      "⏳";

  }

  if (weatherCondition) {

    weatherCondition.textContent =
      "Loading weather...";

  }

  if (temperature) {

    temperature.textContent =
      "--";

  }

  if (feelsLike) {

    feelsLike.textContent =
      "--°C";

  }

  if (forecastContainer) {

    forecastContainer.innerHTML =
      '<div class="forecast-card">Loading forecast...</div>';

  }

  if (aqiElements.value) {

    aqiElements.value.textContent =
      "--";

  }

  if (aqiElements.status) {

    aqiElements.status.textContent =
      "Loading...";

  }

  if (aqiElements.dataStatus) {

    aqiElements.dataStatus.textContent =
      "Waiting for weather location...";

  }

}


/* =========================================================
   CURRENT WEATHER
========================================================= */

function updateCurrentWeather(
  data,
  place
) {

  const current =
    data.current;

  const address =
    formatAddress(place);

  if (locationName) {

    locationName.textContent =
      `📍 ${place.name}`;

  }

  if (locationAddress) {

    locationAddress.textContent =
      address;

  }

  if (forecastLocation) {

    forecastLocation.textContent =
      address;

  }

  if (mapLocationName) {

    mapLocationName.textContent =
      address;

  }

  if (temperature) {

    temperature.textContent =
      Math.round(current.temperature_2m);

  }

  if (feelsLike) {

    feelsLike.textContent =
      `${Math.round(current.apparent_temperature)}°C`;

  }

  if (humidity) {

    humidity.textContent =
      `${current.relative_humidity_2m}%`;

  }

  if (rainValue) {

    rainValue.textContent =
      `${Number(current.rain || 0).toFixed(1)} mm`;

  }

  if (cloudCover) {

    cloudCover.textContent =
      `${current.cloud_cover}%`;

  }

  if (windSpeed) {

    windSpeed.textContent =
      `${Math.round(current.wind_speed_10m)} km/h`;

  }

  if (windDirection) {

    windDirection.textContent =
      `${Math.round(current.wind_direction_10m)}° ${getWindDirection(current.wind_direction_10m)}`;

  }

  if (rainChance) {

    rainChance.textContent =
      `${getCurrentRainChance(data)}%`;

  }

  if (sunrise) {

    sunrise.textContent =
      formatTime(data.daily.sunrise?.[0]);

  }

  if (sunset) {

    sunset.textContent =
      formatTime(data.daily.sunset?.[0]);

  }

  const weather =
    getWeatherInfo(current.weather_code);

  if (weatherIcon) {

    weatherIcon.textContent =
      weather.icon;

  }

  if (weatherCondition) {

    weatherCondition.textContent =
      weather.name;

  }

}


/* =========================================================
   FORMAT ADDRESS
========================================================= */

function formatAddress(place) {

  return [
    place.name,
    place.district,
    place.state,
    place.country
  ]
    .filter(Boolean)
    .filter((value, index, array) =>
      array.indexOf(value) === index
    )
    .join(", ");

}


/* =========================================================
   CURRENT RAIN PROBABILITY
========================================================= */

function getCurrentRainChance(data) {

  const hourly =
    data.hourly;

  if (
    !hourly ||
    !hourly.time ||
    !hourly.precipitation_probability
  ) {

    return (
      data.daily.precipitation_probability_max?.[0] ||
      0
    );

  }

  const currentTime =
    data.current.time;

  const currentIndex =
    hourly.time.findIndex(
      time => time >= currentTime
    );

  if (currentIndex >= 0) {

    return (
      hourly.precipitation_probability[currentIndex] ||
      0
    );

  }

  return (
    data.daily.precipitation_probability_max?.[0] ||
    0
  );

}


/* =========================================================
   WIND DIRECTION
========================================================= */

function getWindDirection(degrees) {

  if (
    degrees === null ||
    degrees === undefined
  ) {

    return "";

  }

  const directions = [
    "N",
    "NE",
    "E",
    "SE",
    "S",
    "SW",
    "W",
    "NW"
  ];

  const index =
    Math.round(degrees / 45) % 8;

  return directions[index];

}


/* =========================================================
   7 DAY FORECAST
========================================================= */

function updateForecast(data) {

  if (!forecastContainer) {
    return;
  }

  forecastContainer.innerHTML = "";

  const daily =
    data.daily;

  if (!daily.time) {
    return;
  }

  for (
    let i = 0;
    i < daily.time.length;
    i++
  ) {

    const date =
      parseDateOnly(daily.time[i]);

    const day =
      i === 0
        ? "Today"
        : date.toLocaleDateString(
          "en-IN",
          {
            weekday: "short"
          }
        );

    const weather =
      getWeatherInfo(
        daily.weather_code[i]
      );

    const card =
      document.createElement("div");

    card.className =
      "forecast-card";

    const dayElement =
      document.createElement("div");

    dayElement.className =
      "forecast-day";

    dayElement.textContent =
      day;

    const dateElement =
      document.createElement("div");

    dateElement.className =
      "forecast-date";

    dateElement.textContent =
      formatDate(date);

    const iconElement =
      document.createElement("div");

    iconElement.className =
      "forecast-icon";

    iconElement.textContent =
      weather.icon;

    const conditionElement =
      document.createElement("div");

    conditionElement.className =
      "forecast-condition";

    conditionElement.textContent =
      weather.name;

    const tempElement =
      document.createElement("div");

    tempElement.className =
      "forecast-temp";

    tempElement.textContent =
      `${Math.round(daily.temperature_2m_max[i])}° / ${Math.round(daily.temperature_2m_min[i])}°`;

    const rainElement =
      document.createElement("div");

    rainElement.className =
      "forecast-rain";

    rainElement.textContent =
      `💧 ${daily.precipitation_probability_max[i] ?? 0}%`;

    card.append(
      dayElement,
      dateElement,
      iconElement,
      conditionElement,
      tempElement,
      rainElement
    );

    forecastContainer.appendChild(card);

  }

}


/* =========================================================
   DATE HELPERS
========================================================= */

function parseDateOnly(value) {

  const [
    year,
    month,
    day
  ] = value.split("-").map(Number);

  return new Date(
    year,
    month - 1,
    day
  );

}


function formatDate(date) {

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short"
    }
  );

}


/* =========================================================
   TIME HELPERS
========================================================= */

function formatTime(value) {

  if (!value) {
    return "--";
  }

  const timePart =
    value.split("T")[1];

  if (!timePart) {
    return value;
  }

  const [
    hour,
    minute
  ] = timePart.split(":");

  const date =
    new Date();

  date.setHours(
    Number(hour),
    Number(minute),
    0,
    0
  );

  return date.toLocaleTimeString(
    "en-IN",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );

}


/* =========================================================
   WEATHER CODE CLASSIFICATION
========================================================= */

function getWeatherInfo(code) {

  if (code === 0) {

    return {
      name: "Clear Sky",
      icon: "☀️",
      type: "clear"
    };

  }

  if (code === 1) {

    return {
      name: "Mainly Clear",
      icon: "🌤️",
      type: "clear"
    };

  }

  if (code === 2) {

    return {
      name: "Partly Cloudy",
      icon: "⛅",
      type: "cloudy"
    };

  }

  if (code === 3) {

    return {
      name: "Overcast",
      icon: "☁️",
      type: "cloudy"
    };

  }

  if (code === 45 || code === 48) {

    return {
      name: "Fog",
      icon: "🌫️",
      type: "fog"
    };

  }

  if (
    code >= 51 &&
    code <= 55
  ) {

    return {
      name: "Drizzle",
      icon: "🌦️",
      type: "rain"
    };

  }

  if (
    code === 56 ||
    code === 57
  ) {

    return {
      name: "Freezing Drizzle",
      icon: "🌧️",
      type: "rain"
    };

  }

  if (
    code >= 61 &&
    code <= 65
  ) {

    return {
      name: "Rain",
      icon: "🌧️",
      type: "rain"
    };

  }

  if (
    code === 66 ||
    code === 67
  ) {

    return {
      name: "Freezing Rain",
      icon: "🌧️",
      type: "rain"
    };

  }

  if (
    code >= 71 &&
    code <= 77
  ) {

    return {
      name: "Snow",
      icon: "❄️",
      type: "snow"
    };

  }

  if (
    code >= 80 &&
    code <= 82
  ) {

    return {
      name: "Rain Showers",
      icon: "🌦️",
      type: "rain"
    };

  }

  if (
    code === 85 ||
    code === 86
  ) {

    return {
      name: "Snow Showers",
      icon: "🌨️",
      type: "snow"
    };

  }

  if (code === 95) {

    return {
      name: "Thunderstorm",
      icon: "⛈️",
      type: "storm"
    };

  }

  if (
    code === 96 ||
    code === 99
  ) {

    return {
      name: "Thunderstorm with Hail",
      icon: "⛈️",
      type: "storm"
    };

  }

  return {

    name: "Unknown Weather",
    icon: "🌤️",
    type: "unknown"

  };

}


/* =========================================================
   WEATHER BACKGROUND
========================================================= */

function updateWeatherBackground(current) {

  if (!weatherBackground) {
    return;
  }

  weatherBackground.classList.remove(
    "clear-weather",
    "cloudy-weather",
    "rain-weather",
    "storm-weather",
    "night-weather"
  );

  const code =
    current.weather_code;

  const isNight =
    Number(current.is_day) === 0;

  const weather =
    getWeatherInfo(code);

  if (isNight) {

    weatherBackground.classList.add(
      "night-weather"
    );

  }

  if (
    weather.type === "storm"
  ) {

    weatherBackground.classList.add(
      "storm-weather"
    );

  } else if (
    weather.type === "rain"
  ) {

    weatherBackground.classList.add(
      "rain-weather"
    );

  } else if (
    weather.type === "snow" ||
    weather.type === "cloudy" ||
    weather.type === "fog"
  ) {

    weatherBackground.classList.add(
      "cloudy-weather"
    );

  } else {

    weatherBackground.classList.add(
      "clear-weather"
    );

  }

  if (weather.type === "storm") {

    startLightning();

  } else {

    stopLightning();

  }

}


/* =========================================================
   LIGHTNING
========================================================= */

function startLightning() {

  if (
    lightningActive ||
    !lightning
  ) {

    return;

  }

  lightningActive = true;

  scheduleLightning();

}


function scheduleLightning() {

  if (!lightningActive) {
    return;
  }

  const delay =
    5000 + Math.random() * 12000;

  lightningTimer =
    setTimeout(() => {

      if (
        lightningActive &&
        lightning
      ) {

        lightning.classList.remove(
          "lightning-flash"
        );

        void lightning.offsetWidth;

        lightning.classList.add(
          "lightning-flash"
        );

      }

      scheduleLightning();

    }, delay);

}


function stopLightning() {

  lightningActive = false;

  clearTimeout(lightningTimer);

  if (lightning) {

    lightning.classList.remove(
      "lightning-flash"
    );

  }

}


/* =========================================================
   TRAVEL STATUS
========================================================= */

function updateTravelStatus(
  current,
  daily
) {

  const code =
    current.weather_code;

  const rain =
    daily.precipitation_probability_max?.[0] || 0;

  const wind =
    current.wind_speed_10m || 0;

  const temperatureValue =
    current.temperature_2m;

  if (
    code >= 95 ||
    code === 96 ||
    code === 99
  ) {

    setTravelStatus(
      "🔴",
      "Travel With Extra Caution",
      "Thunderstorms are present or possible. Avoid exposed areas and monitor local alerts."
    );

    return;

  }

  if (
    code === 66 ||
    code === 67 ||
    code === 56 ||
    code === 57
  ) {

    setTravelStatus(
      "🟠",
      "Weather Caution",
      "Freezing precipitation is reported in the weather data. Check local road conditions before travelling."
    );

    return;

  }

  if (
    code >= 61 &&
    code <= 82
  ) {

    setTravelStatus(
      "🟠",
      "Travel With Caution",
      "Rain or showers are reported. Carry rain protection and check road conditions."
    );

    return;

  }

  if (wind >= 50) {

    setTravelStatus(
      "🟠",
      "Strong Wind Caution",
      "Strong winds are reported. Take extra care outdoors and while travelling."
    );

    return;

  }

  if (rain >= 70) {

    setTravelStatus(
      "🟠",
      "Rain Likely",
      "Rain probability is high. Carry rain protection and check local conditions."
    );

    return;

  }

  if (
    code >= 45 &&
    code <= 48
  ) {

    setTravelStatus(
      "🟡",
      "Fog Caution",
      "Fog may reduce visibility. Drive carefully and use appropriate lights."
    );

    return;

  }

  if (temperatureValue >= 40) {

    setTravelStatus(
      "🟠",
      "Extreme Heat Caution",
      "Very high temperatures are reported. Stay hydrated and avoid prolonged exposure."
    );

    return;

  }

  if (rain >= 40) {

    setTravelStatus(
      "🟡",
      "Possible Rain",
      "Rain may occur. Carry an umbrella or raincoat."
    );

    return;

  }

  setTravelStatus(
    "🟢",
    "Weather Looks Favorable",
    "No major weather concern detected from the available weather data. Always check local conditions."
  );

}


function setTravelStatus(
  icon,
  title,
  message
) {

  if (travelIcon) {

    travelIcon.textContent =
      icon;

  }

  if (travelTitle) {

    travelTitle.textContent =
      title;

  }

  if (travelMessage) {

    travelMessage.textContent =
      message;

  }

}


/* =========================================================
   MAP UPDATE
========================================================= */

function updateMap(
  latitude,
  longitude,
  place
) {

  if (!map) {

    initializeMap();

  }

  if (!map) {
    return;
  }

  map.setView(
    [latitude, longitude],
    13,
    {
      animate: true
    }
  );

  if (marker) {

    map.removeLayer(marker);

  }

  marker =
    L.marker([
      latitude,
      longitude
    ]).addTo(map);

  const address =
    formatAddress(place);

  marker.bindPopup(
    `<strong>${escapeHTML(place.name)}</strong><br>${escapeHTML(address)}`
  );

  marker.openPopup();

  setTimeout(() => {

    map.invalidateSize();

  }, 250);

}


/* =========================================================
   HTML ESCAPING
========================================================= */

function escapeHTML(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


/* =========================================================
   ERROR HANDLING
========================================================= */

function showError(message) {

  if (!errorMsg) {
    return;
  }

  errorMsg.textContent =
    message;

  errorMsg.style.display =
    "block";

}


function hideError() {

  if (!errorMsg) {
    return;
  }

  errorMsg.textContent =
    "";

  errorMsg.style.display =
    "none";

}


/* =========================================================
   AQI CATEGORY
========================================================= */

function getAQICategory(aqi) {

  if (aqi <= 50) {

    return {

      label: "Good",

      color: "#22c55e",

      description:
        "Air quality is satisfactory. Air pollution poses little or no risk.",

      advice:
        "Air quality is good. Outdoor activities are generally suitable."

    };

  }

  if (aqi <= 100) {

    return {

      label: "Moderate",

      color: "#eab308",

      description:
        "Air quality is acceptable. Some sensitive individuals may experience effects.",

      advice:
        "Most people can enjoy outdoor activities. Sensitive individuals should monitor symptoms."

    };

  }

  if (aqi <= 150) {

    return {

      label: "Unhealthy for Sensitive Groups",

      color: "#f97316",

      description:
        "Sensitive groups may experience health effects.",

      advice:
        "Children, older adults and people with respiratory or heart conditions should reduce prolonged outdoor exertion."

    };

  }

  if (aqi <= 200) {

    return {

      label: "Unhealthy",

      color: "#ef4444",

      description:
        "Everyone may begin to experience health effects.",

      advice:
        "Reduce prolonged or strenuous outdoor activity. Sensitive groups should avoid outdoor exertion."

    };

  }

  if (aqi <= 300) {

    return {

      label: "Very Unhealthy",

      color: "#a855f7",

      description:
        "Health alert. The risk of health effects is increased for everyone.",

      advice:
        "Avoid prolonged outdoor exertion. Consider staying indoors and reducing exposure."

    };

  }

  return {

    label: "Hazardous",

    color: "#7c3aed",

    description:
      "Health warning. Everyone may experience serious health effects.",

    advice:
      "Avoid outdoor activity and reduce exposure to polluted air as much as possible."

  };

}


/* =========================================================
   AQI POLLUTANT STATUS
========================================================= */

function getPollutantStatus(
  type,
  value
) {

  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {

    return {

      label: "Unavailable",

      className: ""

    };

  }

  const thresholds = {

    pm25: [12, 35.4, 55.4, 150.4],

    pm10: [54, 154, 254, 354],

    co: [4400, 9400, 12400, 15400],

    no2: [40, 80, 180, 280],

    so2: [40, 80, 380, 800],

    o3: [60, 100, 140, 180]

  };

  const levels =
    thresholds[type];

  if (!levels) {

    return {

      label: "Available",

      className: ""

    };

  }

  if (value <= levels[0]) {

    return {

      label: "Low",

      className: "good"

    };

  }

  if (value <= levels[1]) {

    return {

      label: "Moderate",

      className: "moderate"

    };

  }

  if (value <= levels[2]) {

    return {

      label: "Elevated",

      className: "poor"

    };

  }

  if (value <= levels[3]) {

    return {

      label: "High",

      className: "unhealthy"

    };

  }

  return {

    label: "Very High",

    className: "severe"

  };

}


/* =========================================================
   FORMAT POLLUTANT VALUE
========================================================= */

function formatPollutant(value) {

  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {

    return "--";

  }

  return Number(value).toFixed(1);

}


/* =========================================================
   UPDATE POLLUTANT CARD
========================================================= */

function updatePollutant(
  valueElement,
  statusElement,
  type,
  value
) {

  if (
    !valueElement ||
    !statusElement
  ) {

    return;

  }

  valueElement.textContent =
    formatPollutant(value);

  const result =
    getPollutantStatus(
      type,
      value
    );

  statusElement.textContent =
    result.label;

  statusElement.className =
    "pollutant-status " + result.className;

}


/* =========================================================
   AQI STATUS CLASS
========================================================= */

function getAQIStatusClass(aqi) {

  if (aqi <= 50) return "good";

  if (aqi <= 100) return "moderate";

  if (aqi <= 150) return "poor";

  if (aqi <= 200) return "unhealthy";

  if (aqi <= 300) return "severe";

  return "severe";

}


/* =========================================================
   UPDATE AQI DASHBOARD
========================================================= */

function updateAQIDashboard(
  data,
  locationLabel
) {

  const current =
    data.current;

  if (
    !current ||
    current.us_aqi === undefined ||
    current.us_aqi === null
  ) {

    throw new Error(
      "AQI data is unavailable."
    );

  }

  const aqi =
    Number(current.us_aqi);

  if (!Number.isFinite(aqi)) {

    throw new Error(
      "Invalid AQI value received."
    );

  }

  const category =
    getAQICategory(aqi);

  const percentage =
    Math.min(aqi, 500) / 500 * 100;

  const angle =
    percentage * 360;


  /* LOCATION */

  if (aqiElements.location) {

    aqiElements.location.textContent =
      locationLabel || "Selected location";

  }


  /* AQI SCORE */

  if (aqiElements.value) {

    aqiElements.value.textContent =
      aqi;

  }

  if (aqiElements.gaugeValue) {

    aqiElements.gaugeValue.textContent =
      aqi;

  }

  if (aqiElements.status) {

    aqiElements.status.textContent =
      category.label;

    aqiElements.status.className =
      "aqi-status " + getAQIStatusClass(aqi);

  }

  if (aqiElements.description) {

    aqiElements.description.textContent =
      category.description;

  }


  /* GAUGE */

  if (aqiElements.gauge) {

    aqiElements.gauge.style.setProperty(
      "--aqi-angle",
      angle + "deg"
    );

    aqiElements.gauge.style.setProperty(
      "--aqi-color",
      category.color
    );

  }


  /* MAIN COLOR */

  if (aqiElements.section) {

    aqiElements.section.style.setProperty(
      "--aqi-color",
      category.color
    );

  }


  /* HEALTH ADVISORY */

  if (aqiElements.healthTitle) {

    aqiElements.healthTitle.textContent =
      category.label + " Air Quality";

  }

  if (aqiElements.healthMessage) {

    aqiElements.healthMessage.textContent =
      category.advice;

  }


  /* POLLUTANTS */

  updatePollutant(
    aqiElements.pm25,
    aqiElements.pm25Status,
    "pm25",
    current.pm2_5
  );

  updatePollutant(
    aqiElements.pm10,
    aqiElements.pm10Status,
    "pm10",
    current.pm10
  );

  updatePollutant(
    aqiElements.co,
    aqiElements.coStatus,
    "co",
    current.carbon_monoxide
  );

  updatePollutant(
    aqiElements.no2,
    aqiElements.no2Status,
    "no2",
    current.nitrogen_dioxide
  );

  updatePollutant(
    aqiElements.so2,
    aqiElements.so2Status,
    "so2",
    current.sulphur_dioxide
  );

  updatePollutant(
    aqiElements.o3,
    aqiElements.o3Status,
    "o3",
    current.ozone
  );


  /* DATA STATUS */

  if (aqiElements.dataStatus) {

    aqiElements.dataStatus.textContent =
      "Air quality data updated • " +
      (current.time || "Current conditions");

  }

  if (aqiElements.liveIndicator) {

    aqiElements.liveIndicator.classList.add(
      "live"
    );

  }

}


/* =========================================================
   LOAD AQI
========================================================= */

async function loadAQI(
  latitude,
  longitude,
  locationLabel
) {

  if (
    !Number.isFinite(Number(latitude)) ||
    !Number.isFinite(Number(longitude))
  ) {

    console.error(
      "Invalid AQI coordinates."
    );

    return;

  }


  /* CANCEL PREVIOUS REQUEST */

  if (aqiRequestController) {

    aqiRequestController.abort();

  }

  aqiRequestController =
    new AbortController();

  const signal =
    aqiRequestController.signal;


  /* LOADING STATE */

  if (aqiElements.dataStatus) {

    aqiElements.dataStatus.textContent =
      "Loading air quality data...";

  }

  if (aqiElements.liveIndicator) {

    aqiElements.liveIndicator.classList.remove(
      "live"
    );

  }


  /* API PARAMETERS */

  const params =
    new URLSearchParams({

      latitude: String(latitude),

      longitude: String(longitude),

      current: [
        "us_aqi",
        "pm2_5",
        "pm10",
        "carbon_monoxide",
        "nitrogen_dioxide",
        "sulphur_dioxide",
        "ozone"
      ].join(","),

      timezone: "auto"

    });


  const url =
    `${AQI_API}?${params.toString()}`;


  /* FETCH */

  try {

    const response =
      await fetch(url, {
        signal
      });

    if (!response.ok) {

      throw new Error(
        "Air quality API HTTP " + response.status
      );

    }

    const data =
      await response.json();

    if (signal.aborted) {
      return;
    }

    updateAQIDashboard(
      data,
      locationLabel
    );

    console.log(
      "🌫️ AQI updated successfully:",
      data.current
    );


  } catch (error) {

    if (
      error.name === "AbortError"
    ) {

      return;

    }

    console.error(
      "AQI loading failed:",
      error
    );

    if (aqiElements.dataStatus) {

      aqiElements.dataStatus.textContent =
        "Air quality data could not be loaded.";

    }

    if (aqiElements.liveIndicator) {

      aqiElements.liveIndicator.classList.remove(
        "live"
      );

    }

  }

}


/* =========================================================
   END
========================================================= */

console.log(
  "🌦️ India Live Weather — JavaScript Ready."
);
/* =========================================================
   RADAR OPACITY + VISIBILITY CONTROL
========================================================= */

function setupRadarOpacityControls() {

  const opacitySlider =
    document.getElementById("radarOpacity");

  const opacityValue =
    document.getElementById("radarOpacityValue");

  const visibilityToggle =
    document.getElementById("radarVisibility");


  if (!opacitySlider || !opacityValue || !visibilityToggle) {
    return;
  }


  /* OPACITY */

  opacitySlider.addEventListener("input", function () {

    const value = Number(this.value);

    opacityValue.textContent = `${value}%`;

    if (radarLayer) {

      radarLayer.setOpacity(
        visibilityToggle.checked
          ? value / 100
          : 0
      );

    }

  });


  /* VISIBILITY */

  visibilityToggle.addEventListener("change", function () {

    if (!radarLayer) {
      return;
    }

    const value = Number(opacitySlider.value);

    radarLayer.setOpacity(
      this.checked
        ? value / 100
        : 0
    );

  });


  /* INITIAL OPACITY */

  if (radarLayer) {

    radarLayer.setOpacity(
      Number(opacitySlider.value) / 100
    );

  }

}