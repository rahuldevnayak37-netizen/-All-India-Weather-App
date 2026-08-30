/* =====================================================
   INDIA LIVE WEATHER
   MAIN JAVASCRIPT
===================================================== */


/* =====================================================
   ELEMENTS
===================================================== */

const cityInput =
  document.getElementById("cityInput");

const searchBtn =
  document.getElementById("searchBtn");

const locationBtn =
  document.getElementById("locationBtn");

const errorMsg =
  document.getElementById("errorMsg");

const locationName =
  document.getElementById("locationName");

const locationAddress =
  document.getElementById("locationAddress");

const temperature =
  document.getElementById("temperature");

const feelsLike =
  document.getElementById("feelsLike");

const weatherIcon =
  document.getElementById("weatherIcon");

const weatherCondition =
  document.getElementById("weatherCondition");

const humidity =
  document.getElementById("humidity");

const rainValue =
  document.getElementById("rainValue");

const cloudCover =
  document.getElementById("cloudCover");

const windSpeed =
  document.getElementById("windSpeed");

const windDirection =
  document.getElementById("windDirection");

const rainChance =
  document.getElementById("rainChance");

const sunrise =
  document.getElementById("sunrise");

const sunset =
  document.getElementById("sunset");

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


/* =====================================================
   VARIABLES
===================================================== */

let map = null;

let marker = null;

let searchTimer = null;


/* =====================================================
   API
===================================================== */

const GEO_API =
  "https://geocoding-api.open-meteo.com/v1/search";

const WEATHER_API =
  "https://api.open-meteo.com/v1/forecast";

const REVERSE_API =
  "https://nominatim.openstreetmap.org/reverse";


/* =====================================================
   START APP
===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    startClock();

    initializeMap();

    autoDetectLocation();
    
    startLightning();


  }
);


/* =====================================================
   CLOCK
===================================================== */

function startClock() {

  function updateClock() {

    const now =
      new Date();


    currentDate.textContent =
      now.toLocaleDateString(
        "en-IN",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric"
        }
      );


    currentTime.textContent =
      now.toLocaleTimeString(
        "en-IN",
        {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        }
      );

  }


  updateClock();


  setInterval(
    updateClock,
    1000
  );

}


/* =====================================================
   MAP
===================================================== */

function initializeMap() {

  const mapElement =
    document.getElementById("map");


  if (!mapElement) {

    console.error(
      "Map container not found!"
    );

    return;

  }


  if (
    typeof L ===
    "undefined"
  ) {

    console.error(
      "Leaflet is not loaded!"
    );

    return;

  }


  map =
    L.map(
      "map"
    ).setView(
      [20.5937, 78.9629],
      5
    );


  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,

      attribution:
        "&copy; OpenStreetMap contributors"
    }
  ).addTo(map);


  console.log(
    "Map initialized successfully."
  );

}


/* =====================================================
   AUTO LOCATION
===================================================== */

function autoDetectLocation() {

  if (
    !navigator.geolocation
  ) {

    showError(
      "Your browser does not support GPS location."
    );

    return;

  }


  navigator.geolocation.getCurrentPosition(

    async position => {

      const lat =
        position.coords.latitude;

      const lon =
        position.coords.longitude;


      try {

        const place =
          await reverseGeocode(
            lat,
            lon
          );


        await loadWeather(
          lat,
          lon,
          place
        );


      } catch (error) {

        console.error(
          error
        );

        showError(
          "Unable to load current location."
        );

      }

    },


    () => {

      showError(
        "Location permission denied. Search your location manually."
      );

    },


    {
      enableHighAccuracy:
        true,

      timeout:
        15000,

      maximumAge:
        60000
    }

  );

}


/* =====================================================
   USE MY LOCATION
===================================================== */

locationBtn.addEventListener(
  "click",
  () => {

    hideError();


    locationBtn.textContent =
      "📍 Detecting...";


    if (
      !navigator.geolocation
    ) {

      showError(
        "GPS is not supported by your browser."
      );

      return;

    }


    navigator.geolocation.getCurrentPosition(

      async position => {

        const lat =
          position.coords.latitude;

        const lon =
          position.coords.longitude;


        try {

          const place =
            await reverseGeocode(
              lat,
              lon
            );


          await loadWeather(
            lat,
            lon,
            place
          );


        } catch (error) {

          console.error(
            error
          );

          showError(
            "Unable to get your location."
          );

        }


        locationBtn.textContent =
          "📍 Use My Location";

      },


      () => {

        showError(
          "Please allow location permission."
        );


        locationBtn.textContent =
          "📍 Use My Location";

      },


      {
        enableHighAccuracy:
          true,

        timeout:
          15000,

        maximumAge:
          30000
      }

    );

  }
);


/* =====================================================
   SEARCH
===================================================== */

searchBtn.addEventListener(
  "click",
  searchLocation
);


cityInput.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Enter"
    ) {

      searchLocation();

    }

  }
);


/* =====================================================
   SEARCH LOCATION
===================================================== */

async function searchLocation() {

  const query =
    cityInput.value.trim();


  if (!query) {

    showError(
      "Please enter a location."
    );

    return;

  }


  hideError();

  hideSuggestions();


  searchBtn.disabled =
    true;

  searchBtn.textContent =
    "Searching...";


  try {

    const url =
      `${GEO_API}?name=${encodeURIComponent(query)}&count=10&language=en&format=json`;


    const response =
      await fetch(url);


    if (!response.ok) {

      throw new Error(
        "Search failed"
      );

    }


    const data =
      await response.json();


    if (
      !data.results ||
      data.results.length === 0
    ) {

      showError(
        "Location not found. Try village, town, district or nearby city."
      );

      return;

    }


    const result =
      chooseBestLocation(
        data.results
      );


    const place = {

      name:
        result.name,

      district:
        result.admin2 || "",

      state:
        result.admin1 || "",

      country:
        result.country || "India"

    };


    cityInput.value =
      result.name;


    await loadWeather(
      result.latitude,
      result.longitude,
      place
    );


  } catch (error) {

    console.error(
      error
    );

    showError(
      "Unable to search location."
    );

  } finally {

    searchBtn.disabled =
      false;

    searchBtn.textContent =
      "🔍 Search";

  }

}


/* =====================================================
   BEST LOCATION
===================================================== */

function chooseBestLocation(
  results
) {

  const india =
    results.find(
      item =>
        item.country_code ===
        "IN"
    );


  return india ||
    results[0];

}


/* =====================================================
   SEARCH SUGGESTIONS
===================================================== */

cityInput.addEventListener(
  "input",
  () => {

    const value =
      cityInput.value.trim();


    clearTimeout(
      searchTimer
    );


    if (
      value.length < 2
    ) {

      hideSuggestions();

      return;

    }


    searchTimer =
      setTimeout(
        () => {

          getSuggestions(
            value
          );

        },
        400
      );

  }
);


/* =====================================================
   GET SUGGESTIONS
===================================================== */

async function getSuggestions(
  value
) {

  try {

    const url =
      `${GEO_API}?name=${encodeURIComponent(value)}&count=8&language=en&format=json`;


    const response =
      await fetch(url);


    const data =
      await response.json();


    if (
      !data.results
    ) {

      hideSuggestions();

      return;

    }


    const indiaResults =
      data.results.filter(
        item =>
          item.country_code ===
          "IN"
      );


    const results =
      indiaResults.length
        ? indiaResults
        : data.results;


    suggestionList.innerHTML =
      "";


    results.forEach(
      result => {

        const item =
          document.createElement(
            "div"
          );


        item.className =
          "suggestion-item";


        const title =
          document.createElement(
            "strong"
          );


        title.textContent =
          `📍 ${result.name}`;


        const details =
          document.createElement(
            "span"
          );


        details.textContent =
          [
            result.admin2,
            result.admin1,
            result.country
          ]
            .filter(Boolean)
            .join(", ");


        item.appendChild(
          title
        );


        item.appendChild(
          details
        );


        item.addEventListener(
          "click",
          async () => {

            cityInput.value =
              result.name;


            hideSuggestions();


            const place = {

              name:
                result.name,

              district:
                result.admin2 || "",

              state:
                result.admin1 || "",

              country:
                result.country || "India"

            };


            await loadWeather(
              result.latitude,
              result.longitude,
              place
            );

          }
        );


        suggestionList.appendChild(
          item
        );

      }
    );


    suggestionList.style.display =
      "block";


  } catch (error) {

    console.error(
      error
    );

  }

}


/* =====================================================
   HIDE SUGGESTIONS
===================================================== */

function hideSuggestions() {

  suggestionList.style.display =
    "none";

}


document.addEventListener(
  "click",
  event => {

    if (
      !event.target.closest(
        ".search-area"
      )
    ) {

      hideSuggestions();

    }

  }
);


/* =====================================================
   REVERSE GEOCODING
===================================================== */

async function reverseGeocode(
  latitude,
  longitude
) {

  try {

    const url =
      `${REVERSE_API}?lat=${latitude}&lon=${longitude}&format=json&zoom=18&addressdetails=1`;


    const response =
      await fetch(
        url,
        {
          headers: {
            "Accept":
              "application/json"
          }
        }
      );


    if (!response.ok) {

      throw new Error(
        "Reverse geocoding failed"
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
        "Current Location",

      district:
        address.county ||
        address.state_district ||
        "",

      state:
        address.state ||
        "",

      country:
        address.country ||
        "India"

    };


  } catch (error) {

    console.error(
      error
    );


    return {

      name:
        "Current Location",

      district:
        "",

      state:
        "",

      country:
        "India"

    };

  }

}


/* =====================================================
   LOAD WEATHER
===================================================== */

async function loadWeather(
  latitude,
  longitude,
  place
) {

  try {

    showLoading();


    const url =
      `${WEATHER_API}?latitude=${latitude}&longitude=${longitude}` +

      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m` +

      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset` +

      `&timezone=auto`;


    const response =
      await fetch(url);


    if (!response.ok) {

      throw new Error(
        "Weather API failed"
      );

    }


    const data =
      await response.json();


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
      data.current.weather_code
    );


    updateTravelStatus(
      data.current,
      data.daily
    );


    hideError();


  } catch (error) {

    console.error(
      error
    );


    showError(
      "Unable to load weather data."
    );

  }

}


/* =====================================================
   CURRENT WEATHER
===================================================== */

function updateCurrentWeather(
  data,
  place
) {

  const current =
    data.current;


  const address =
    [
      place.name,
      place.district,
      place.state,
      place.country
    ]
      .filter(Boolean)
      .join(", ");


  locationName.textContent =
    `📍 ${place.name}`;


  locationAddress.textContent =
    address;


  forecastLocation.textContent =
    address;


  mapLocationName.textContent =
    address;


  temperature.textContent =
    Math.round(
      current.temperature_2m
    );


  feelsLike.textContent =
    `${Math.round(
      current.apparent_temperature
    )}°C`;


  humidity.textContent =
    `${current.relative_humidity_2m}%`;


  rainValue.textContent =
    `${current.rain || 0} mm`;


  cloudCover.textContent =
    `${current.cloud_cover || 0}%`;


  windSpeed.textContent =
    `${Math.round(
      current.wind_speed_10m
    )} km/h`;


  windDirection.textContent =
    `${Math.round(
      current.wind_direction_10m
    )}°`;


  rainChance.textContent =
    `${data.daily.precipitation_probability_max[0] || 0}%`;


  sunrise.textContent =
    formatTime(
      data.daily.sunrise[0]
    );


  sunset.textContent =
    formatTime(
      data.daily.sunset[0]
    );


  const weather =
    getWeatherInfo(
      current.weather_code
    );


  weatherIcon.textContent =
    weather.icon;


  weatherCondition.textContent =
    weather.name;

}


/* =====================================================
   FORECAST
===================================================== */

function updateForecast(
  data,
  place
) {

  forecastContainer.innerHTML =
    "";


  const daily =
    data.daily;


  for (
    let i = 0;
    i < daily.time.length;
    i++
  ) {

    const date =
      new Date(
        daily.time[i]
      );


    const day =
      i === 0
        ? "Today"
        : date.toLocaleDateString(
          "en-IN",
          {
            weekday:
              "short"
          }
        );


    const weather =
      getWeatherInfo(
        daily.weather_code[i]
      );


    const card =
      document.createElement(
        "div"
      );


    card.className =
      "forecast-card";


    card.innerHTML = `

            <div class="forecast-day">
                ${day}
            </div>

            <div class="forecast-date">
                ${formatDate(date)}
            </div>

            <div class="forecast-icon">
                ${weather.icon}
            </div>

            <div class="forecast-condition">
                ${weather.name}
            </div>

            <div class="forecast-temp">
                ${Math.round(
      daily.temperature_2m_max[i]
    )}° /
                ${Math.round(
      daily.temperature_2m_min[i]
    )}°
            </div>

            <div class="forecast-rain">
                💧 ${daily.precipitation_probability_max[i] || 0}%
            </div>

        `;


    forecastContainer.appendChild(
      card
    );

  }

}


/* =====================================================
   WEATHER INFORMATION
===================================================== */

function getWeatherInfo(
  code
) {

  if (code === 0) {

    return {
      name:
        "Clear Sky",

      icon:
        "☀️"
    };

  }


  if (
    code === 1 ||
    code === 2
  ) {

    return {
      name:
        "Partly Cloudy",

      icon:
        "🌤️"
    };

  }


  if (code === 3) {

    return {
      name:
        "Cloudy",

      icon:
        "☁️"
    };

  }


  if (
    code >= 45 &&
    code <= 48
  ) {

    return {
      name:
        "Foggy",

      icon:
        "🌫️"
    };

  }


  if (
    code >= 51 &&
    code <= 57
  ) {

    return {
      name:
        "Drizzle",

      icon:
        "🌦️"
    };

  }


  if (
    code >= 61 &&
    code <= 67
  ) {

    return {
      name:
        "Rain",

      icon:
        "🌧️"
    };

  }


  if (
    code >= 80 &&
    code <= 82
  ) {

    return {
      name:
        "Rain Showers",

      icon:
        "🌦️"
    };

  }


  if (code >= 95) {

    return {
      name:
        "Thunderstorm",

      icon:
        "⛈️"
    };

  }


  return {

    name:
      "Weather",

    icon:
      "🌤️"

  };

}


/* =====================================================
   BACKGROUND
===================================================== */

function updateWeatherBackground(
  code
) {

  weatherBackground.classList.remove(
    "clear-weather",
    "cloudy-weather",
    "rain-weather",
    "storm-weather",
    "night-weather"
  );


  if (code >= 95) {

    weatherBackground.classList.add(
      "storm-weather"
    );

    return;

  }


  if (
    code >= 51 &&
    code <= 82
  ) {

    weatherBackground.classList.add(
      "rain-weather"
    );

    return;

  }


  if (
    code === 3 ||
    (code >= 45 && code <= 48)
  ) {

    weatherBackground.classList.add(
      "cloudy-weather"
    );

    return;

  }


  weatherBackground.classList.add(
    "clear-weather"
  );

}


/* =====================================================
   TRAVEL STATUS
===================================================== */

function updateTravelStatus(
  current,
  daily
) {

  const rain =
    daily.precipitation_probability_max[0] || 0;


  const code =
    current.weather_code;


  if (code >= 95) {

    travelIcon.textContent =
      "🔴";

    travelTitle.textContent =
      "Travel Not Recommended";

    travelMessage.textContent =
      "Thunderstorm conditions are possible. Consider delaying outdoor travel.";

    return;

  }


  if (
    rain >= 70 ||
    (code >= 65 && code <= 82)
  ) {

    travelIcon.textContent =
      "🟠";

    travelTitle.textContent =
      "Travel With Caution";

    travelMessage.textContent =
      "Rain is likely. Carry rain protection and check local road conditions.";

    return;

  }


  if (rain >= 40) {

    travelIcon.textContent =
      "🟡";

    travelTitle.textContent =
      "Possible Rain";

    travelMessage.textContent =
      "There is a chance of rain. Carry an umbrella or raincoat.";

    return;

  }


  travelIcon.textContent =
    "🟢";

  travelTitle.textContent =
    "Good Travel Conditions";

  travelMessage.textContent =
    "No major weather warning detected in the current forecast.";

}


/* =====================================================
   UPDATE MAP
===================================================== */

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
    13
  );


  if (marker) {

    map.removeLayer(
      marker
    );

  }


  marker =
    L.marker(
      [latitude, longitude]
    )
      .addTo(map);


  const address =
    [
      place.name,
      place.district,
      place.state,
      place.country
    ]
      .filter(Boolean)
      .join(", ");


  marker.bindPopup(
    `
        <strong>
            📍 ${place.name}
        </strong>

        <br>

        ${address}
        `
  );


  marker.openPopup();


  setTimeout(
    () => {

      map.invalidateSize();

    },
    300
  );

}


/* =====================================================
   FORMAT TIME
===================================================== */

function formatTime(
  value
) {

  if (!value) {

    return "--";

  }


  const date =
    new Date(value);


  return date.toLocaleTimeString(
    "en-IN",
    {
      hour:
        "2-digit",

      minute:
        "2-digit"
    }
  );

}


/* =====================================================
   FORMAT DATE
===================================================== */

function formatDate(
  date
) {

  return date.toLocaleDateString(
    "en-IN",
    {
      day:
        "numeric",

      month:
        "short"
    }
  );

}


/* =====================================================
   LOADING
===================================================== */

function showLoading() {

  weatherIcon.textContent =
    "⏳";

  weatherCondition.textContent =
    "Loading weather...";

}


/* =====================================================
   ERROR
===================================================== */

function showError(
  message
) {

  errorMsg.textContent =
    message;

  errorMsg.style.display =
    "block";

}


/* =====================================================
   HIDE ERROR
===================================================== */

function hideError() {

  errorMsg.style.display =
    "none";

}


/* =====================================================
   CONSOLE
===================================================== */

console.log(
  "🌦️ India Live Weather loaded successfully."
);

function startLightning() {

  const lightning =
    document.getElementById("lightning");

  if (!lightning) return;

  function flash() {

    lightning.classList.remove(
      "lightning-flash"
    );

    void lightning.offsetWidth;

    lightning.classList.add(
      "lightning-flash"
    );

  }

  function randomFlash() {

    const delay =
      4000 +
      Math.random() * 9000;

    setTimeout(() => {

      flash();

      randomFlash();

    }, delay);

  }

  randomFlash();

}