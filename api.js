const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

const form = document.getElementById("searchForm");
const input = document.getElementById("cityInput");
const btn = document.getElementById("searchBtn");
const messageEl = document.getElementById("message");
const loaderEl = document.getElementById("loader");
const resultEl = document.getElementById("result");

// Weather code -> icon and description (WMO codes used by Open-Meteo)
function describe(code) {
    if (code === 0) return { icon: "☀️", text: "Clear sky" };
    if (code <= 2) return { icon: "🌤️", text: "Partly cloudy" };
    if (code === 3) return { icon: "☁️", text: "Overcast" };
    if (code <= 48) return { icon: "🌫️", text: "Fog" };
    if (code <= 57) return { icon: "🌦️", text: "Drizzle" };
    if (code <= 67) return { icon: "🌧️", text: "Rain" };
    if (code <= 77) return { icon: "❄️", text: "Snow" };
    if (code <= 82) return { icon: "🌧️", text: "Rain showers" };
    if (code <= 86) return { icon: "🌨️", text: "Snow showers" };
    return { icon: "⛈️", text: "Thunderstorm" };
}

function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function showMessage(text, isInfo = false) {
    messageEl.textContent = text;
    messageEl.classList.toggle("info", isInfo);
}

function setLoading(isLoading) {
    loaderEl.classList.toggle("hidden", !isLoading);
    btn.disabled = isLoading;
}

// Input validation: not empty, letters/spaces/.,'- only, 2+ chars
function validateCity(value) {
    if (!value) return "Please enter a city name.";
    if (value.length < 2) return "City name must be at least 2 characters.";
    if (!/^[\p{L}\s.,'-]+$/u.test(value)) return "City name can only contain letters and spaces.";
    return "";
}

async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Server error (${res.status}). Please try again.`);
    return res.json();
}

async function getWeather(city) {
    const geo = await fetchJSON(`${GEO_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
    if (!geo.results || geo.results.length === 0) {
        throw new Error(`No city found for "${city}". Check the spelling and try again.`);
    }
    const place = geo.results[0];
    const params = new URLSearchParams({
        latitude: place.latitude,
        longitude: place.longitude,
        current: "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
        daily: "weather_code,temperature_2m_max,temperature_2m_min",
        timezone: "auto",
        forecast_days: 5
    });
    const data = await fetchJSON(`${WEATHER_URL}?${params}`);
    return { place, data };
}

function renderWeather({ place, data }) {
    const cur = data.current;
    const now = describe(cur.weather_code);
    const cityLabel = [place.name, place.admin1, place.country].filter(Boolean).join(", ");
    const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const days = data.daily.time.map((d, i) => {
        const info = describe(data.daily.weather_code[i]);
        const name = i === 0 ? "Today" : new Date(d).toLocaleDateString("en-US", { weekday: "short" });
        return `
        <div class="day">
          <div class="name">${name}</div>
          <div class="icon" title="${info.text}">${info.icon}</div>
          <div class="range"><b>${Math.round(data.daily.temperature_2m_max[i])}°</b> / ${Math.round(data.daily.temperature_2m_min[i])}°</div>
        </div>`;
    }).join("");

    resultEl.innerHTML = `
      <div class="current">
        <div>
          <div class="city">${escapeHTML(cityLabel)}</div>
          <div class="date">${today}</div>
          <div class="desc">${now.text}</div>
        </div>
        <div class="temp-block">
          <span class="icon">${now.icon}</span>
          <span class="temp">${Math.round(cur.temperature_2m)}°C</span>
        </div>
        <div class="details">
          <div>Humidity<strong>${cur.relative_humidity_2m}%</strong></div>
          <div>Wind<strong>${Math.round(cur.wind_speed_10m)} km/h</strong></div>
        </div>
      </div>
      <h2 class="forecast-title">5-day forecast</h2>
      <div class="forecast">${days}</div>`;
    resultEl.classList.remove("hidden");
}

async function search(city) {
    const error = validateCity(city);
    input.classList.toggle("invalid", Boolean(error));
    if (error) {
        showMessage(error);
        return;
    }
    showMessage("");
    resultEl.classList.add("hidden");
    setLoading(true);
    try {
        const weather = await getWeather(city);
        renderWeather(weather);
    } catch (err) {
        // fetch() itself throws a TypeError when offline
        const msg = err instanceof TypeError
            ? "Network problem. Check your internet connection."
            : err.message;
        showMessage(msg);
    } finally {
        setLoading(false);
    }
}

form.addEventListener("submit", (e) => {
    e.preventDefault();
    search(input.value.trim());
});

input.addEventListener("input", () => {
    input.classList.remove("invalid");
    showMessage("");
});

// Load a default city on start
search("Delhi");