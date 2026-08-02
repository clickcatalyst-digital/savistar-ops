// lib/weatherIcons.js
// Maps Open-Meteo's WMO weathercode to one of the animated SVGs in public/animated/.
// Day/night pairs are used where the pack has both (clear, partly cloudy, overcast);
// everything else (rain, snow, thunder, fog) has one asset regardless of time of day.
const DAY_NIGHT = {
  clear: { day: 'day.svg', night: 'night.svg' },
  partlyCloudy: { day: 'cloudy-day-1.svg', night: 'cloudy-night-1.svg' },
  moreCloudy: { day: 'cloudy-day-2.svg', night: 'cloudy-night-2.svg' },
  overcast: { day: 'cloudy-day-3.svg', night: 'cloudy-night-3.svg' },
};

function isNight(hour) {
  return hour < 6 || hour >= 19;
}

export function getWeatherIconSrc(code, hour = new Date().getHours()) {
  const night = isNight(hour);
  const pick = (entry) => `/animated/${night ? entry.night : entry.day}`;

  if (code === 0) return pick(DAY_NIGHT.clear);
  if (code === 1) return pick(DAY_NIGHT.partlyCloudy);
  if (code === 2) return pick(DAY_NIGHT.moreCloudy);
  if (code === 3) return pick(DAY_NIGHT.overcast);
  if (code === 45 || code === 48) return '/animated/cloudy.svg'; // no dedicated fog asset in the pack
  if (code === 51 || code === 53 || code === 61) return '/animated/rainy-2.svg';
  if (code === 55 || code === 56 || code === 57) return '/animated/rainy-5.svg';
  if (code === 63) return '/animated/rainy-4.svg';
  if (code === 65 || code === 66 || code === 67) return '/animated/rainy-6.svg';
  if (code === 71) return '/animated/snowy-1.svg';
  if (code === 73) return '/animated/snowy-2.svg';
  if (code === 75 || code === 77) return '/animated/snowy-5.svg';
  if (code === 80 || code === 81) return '/animated/rainy-5.svg';
  if (code === 82) return '/animated/rainy-7.svg';
  if (code === 85 || code === 86) return '/animated/snowy-4.svg';
  if (code === 95 || code === 96 || code === 99) return '/animated/thunder.svg';

  return '/animated/cloudy.svg'; // unknown code — neutral fallback rather than a broken image
}