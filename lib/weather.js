// lib/weather.js
// WMO weather-interpretation codes, as returned by Open-Meteo's `weathercode` field.
// `icon` is a lucide-react name (mapped to a component in the dashboard, since this
// file stays framework-free); `category` is a rough bucket if you ever want to group
// by "is this a rainy/gloomy/sunny day" rather than the exact label.
export const WEATHER_CODES = {
  0: { label: 'Clear sky', icon: 'Sun', category: 'sunny' },
  1: { label: 'Mainly clear', icon: 'CloudSun', category: 'sunny' },
  2: { label: 'Partly cloudy', icon: 'CloudSun', category: 'cloudy' },
  3: { label: 'Overcast', icon: 'Cloud', category: 'gloomy' },
  45: { label: 'Fog', icon: 'CloudFog', category: 'gloomy' },
  48: { label: 'Freezing fog', icon: 'CloudFog', category: 'gloomy' },
  51: { label: 'Light drizzle', icon: 'CloudDrizzle', category: 'rainy' },
  53: { label: 'Drizzle', icon: 'CloudDrizzle', category: 'rainy' },
  55: { label: 'Heavy drizzle', icon: 'CloudDrizzle', category: 'rainy' },
  56: { label: 'Freezing drizzle', icon: 'CloudDrizzle', category: 'rainy' },
  57: { label: 'Freezing drizzle', icon: 'CloudDrizzle', category: 'rainy' },
  61: { label: 'Light rain', icon: 'CloudRain', category: 'rainy' },
  63: { label: 'Rain', icon: 'CloudRain', category: 'rainy' },
  65: { label: 'Heavy rain', icon: 'CloudRain', category: 'rainy' },
  66: { label: 'Freezing rain', icon: 'CloudRain', category: 'rainy' },
  67: { label: 'Freezing rain', icon: 'CloudRain', category: 'rainy' },
  71: { label: 'Light snow', icon: 'CloudSnow', category: 'snowy' },
  73: { label: 'Snow', icon: 'CloudSnow', category: 'snowy' },
  75: { label: 'Heavy snow', icon: 'CloudSnow', category: 'snowy' },
  77: { label: 'Snow grains', icon: 'CloudSnow', category: 'snowy' },
  80: { label: 'Rain showers', icon: 'CloudRainWind', category: 'rainy' },
  81: { label: 'Rain showers', icon: 'CloudRainWind', category: 'rainy' },
  82: { label: 'Heavy rain showers', icon: 'CloudRainWind', category: 'rainy' },
  85: { label: 'Snow showers', icon: 'CloudSnow', category: 'snowy' },
  86: { label: 'Heavy snow showers', icon: 'CloudSnow', category: 'snowy' },
  95: { label: 'Thunderstorm', icon: 'CloudLightning', category: 'stormy' },
  96: { label: 'Thunderstorm, hail', icon: 'CloudLightning', category: 'stormy' },
  99: { label: 'Thunderstorm, hail', icon: 'CloudLightning', category: 'stormy' },
};

export function describeWeatherCode(code) {
  return WEATHER_CODES[code] || { label: 'Unknown', icon: 'Cloud', category: 'cloudy' };
}

// Open-Meteo's single /v1/forecast endpoint doubles as a lightweight history source
// via past_days — recent past_days values are the model's past *forecast* for that
// day, not a verified ground observation (true observed history lags ~2 days behind,
// via a separate Historical Weather API). Fine for an ops calendar; not a weather
// station log, so we don't bother with the second API.
export async function fetchWeather(lat, lon, { pastDays = 14, forecastDays = 14 } = {}) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weathercode` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min` +
    `&past_days=${pastDays}&forecast_days=${forecastDays}&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather request failed');
  return res.json();
}

// Reshapes Open-Meteo's parallel daily arrays into { [isoDate]: {code, tempMax, tempMin} }
// — same map-by-ISO-date convention as `byDate` in the dashboard, so the calendar can
// look weather up per cell the same way it looks up tasks/milestones/visits.
export function weatherByDate(data) {
  const map = {};
  if (!data?.daily?.time) return map;
  const { time, weathercode, temperature_2m_max, temperature_2m_min } = data.daily;
  time.forEach((iso, i) => {
    map[iso] = { code: weathercode[i], tempMax: temperature_2m_max[i], tempMin: temperature_2m_min[i] };
  });
  return map;
}