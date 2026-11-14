
 // Movies via OMDb API. Get a free key at https://www.omdbapi.com/apikey.aspx
import { OMDB_API_KEY } from './config.js';

const BASE_URL = 'https://www.omdbapi.com/';
const MAX_DETAILED_RESULTS = 8;

const fetchJSON = async (url) => {
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error('Network error. Please check your internet connection.');
  }
  if (!response.ok) throw new Error(`Request failed (status ${response.status}). Try again later.`);
  return response.json();
};

// Movie autocomplete suggestions
export const searchMovieSuggestions = async (query) => {
  if (query.trim().length < 2) return [];

  if (!OMDB_API_KEY || OMDB_API_KEY === 'YOUR_API_KEY_HERE') {
    throw new Error('Missing API key. Add your OMDb key in js/config.js.');
  }

  const search = await fetchJSON(
    `${BASE_URL}?apikey=${OMDB_API_KEY}&type=movie&s=${encodeURIComponent(query)}`
  );

  if (search.Response === 'False') return [];

  return (search.Search || []).slice(0, 6).map((movie) => ({
    title: movie.Title,
    year: movie.Year,
    imdbID: movie.imdbID,
    poster: movie.Poster !== 'N/A' ? movie.Poster : null,
  }));
};

export const searchMovies = async (query) => {
  if (!OMDB_API_KEY || OMDB_API_KEY === 'YOUR_API_KEY_HERE') {
    throw new Error('Missing API key. Add your OMDb key in js/config.js.');
  }

  const search = await fetchJSON(`${BASE_URL}?apikey=${OMDB_API_KEY}&type=movie&s=${encodeURIComponent(query)}`);

  if (search.Response === 'False') {
    if (search.Error === 'Invalid API key!') throw new Error('Invalid OMDb API key. Check js/config.js.');
    throw new Error(`No movies found for "${query}". Try a different title.`);
  }

  // Fetch details for each hit in parallel to get rating + plot
  const details = await Promise.all(
    search.Search.slice(0, MAX_DETAILED_RESULTS).map(({ imdbID }) =>
      fetchJSON(`${BASE_URL}?apikey=${OMDB_API_KEY}&i=${imdbID}&plot=short`)
    )
  );

  return details
    .filter(({ Response }) => Response !== 'False')
    .map(({ Title, Year, Poster, imdbRating, Plot, Genre, Released }) => ({
      title: Title,
      year: Released && Released !== 'N/A' ? Released : Year,
      poster: Poster !== 'N/A' ? Poster : null,
      rating: imdbRating !== 'N/A' ? imdbRating : 'N/A',
      plot: Plot !== 'N/A' ? Plot : '',
      genre: Genre !== 'N/A' ? Genre.split(',')[0] : '',
    }));
};
