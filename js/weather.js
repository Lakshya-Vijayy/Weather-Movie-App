
// Weather via Open-Meteo (free, no API key needed)
const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

// WMO weather codes -> [description, emoji]
const WEATHER_CODES = {
  0: ['Clear sky', '☀️'],
  1: ['Mainly clear', '🌤️'],
  2: ['Partly cloudy', '⛅'],
  3: ['Overcast', '☁️'],
  45: ['Fog', '🌫️'],
  48: ['Rime fog', '🌫️'],
  51: ['Light drizzle', '🌦️'],
  53: ['Drizzle', '🌦️'],
  55: ['Dense drizzle', '🌧️'],
  61: ['Light rain', '🌧️'],
  63: ['Rain', '🌧️'],
  65: ['Heavy rain', '🌧️'],
  71: ['Light snow', '🌨️'],
  73: ['Snow', '❄️'],
  75: ['Heavy snow', '❄️'],
  80: ['Rain showers', '🌦️'],
  81: ['Heavy showers', '🌧️'],
  82: ['Violent showers', '⛈️'],
  95: ['Thunderstorm', '⛈️'],
  96: ['Thunderstorm with hail', '⛈️'],
  99: ['Severe thunderstorm', '⛈️'],
};

const fetchJSON = async (url) => {
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error('Network error. Please check your internet connection.');
  }

  if (!response.ok) {
    throw new Error(`Request failed (status ${response.status}). Try again later.`);
  }

  return response.json();
};

// City autocomplete suggestions
export const searchCities = async (query) => {
  if (query.trim().length < 2) return [];

  const geo = await fetchJSON(
    `${GEO_URL}?name=${encodeURIComponent(query)}&count=6&language=en&format=json`
  );

  return (geo.results || []).map((city) => ({
    name: city.name,
    country: city.country,
    region: city.admin1 || '',
    latitude: city.latitude,
    longitude: city.longitude,
  }));
};

export const getWeather = async (city) => {
  // 1. City name -> coordinates
  const geo = await fetchJSON(
    `${GEO_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
  );

  if (!geo.results?.length) {
    throw new Error(`City "${city}" not found. Check the spelling and try again.`);
  }

  const { name, country, latitude, longitude } = geo.results[0];

  // 2. Coordinates -> current weather
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
    wind_speed_unit: 'kmh',
  });

  const { current } = await fetchJSON(`${FORECAST_URL}?${params}`);

  const [condition, icon] =
    WEATHER_CODES[current.weather_code] ?? ['Unknown', '🌡️'];

  return {
    city: name,
    country,
    temperature: Math.round(current.temperature_2m),
    feelsLike: Math.round(current.apparent_temperature),
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    condition,
    icon,
  };
};
