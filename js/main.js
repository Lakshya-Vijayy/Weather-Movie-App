
import { getWeather, searchCities } from './weather.js';
import { searchMovies, searchMovieSuggestions } from './movies.js';

// ---------- Helpers ----------
const $ = (selector) => document.querySelector(selector);

const setStatus = (el, message = '', isError = false) => {
  el.textContent = message;
  el.classList.toggle('error', isError);
};

const showLoader = (el) => {
  el.classList.remove('error');
  el.classList.add('loading');
  el.textContent = '';
};

const hideLoader = (el) => {
  el.classList.remove('loading');
};

// Escape API text before injecting into innerHTML
const escapeHTML = (str = '') =>
  String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

// ---------- Autocomplete ----------
const setupAutocomplete = (input, form, searchFunction, getLabel) => {
  const dropdown = document.createElement('div');

  dropdown.className = 'suggestions-dropdown';
  dropdown.hidden = true;
  dropdown.setAttribute('role', 'listbox');

  form.style.position = 'relative';
  form.appendChild(dropdown);

  let debounceTimer;
  let requestNumber = 0;
  let suggestions = [];
  let activeIndex = -1;

  const hideSuggestions = () => {
    dropdown.hidden = true;
    dropdown.innerHTML = '';
    suggestions = [];
    activeIndex = -1;
  };

  const selectSuggestion = (index) => {
    if (index < 0 || index >= suggestions.length) return;

    input.value = getLabel(suggestions[index], true);
    hideSuggestions();
    form.requestSubmit();
  };

  const renderSuggestions = (results) => {
    suggestions = results;
    activeIndex = -1;

    if (!results.length) {
      hideSuggestions();
      return;
    }

    dropdown.innerHTML = results.map((item, index) => `
      <button
        type="button"
        class="suggestion-item"
        role="option"
        data-index="${index}"
      >
        ${getLabel(item, false)}
      </button>
    `).join('');

    dropdown.hidden = false;
  };

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);

    const query = input.value.trim();
    const currentRequest = ++requestNumber;

    if (query.length < 2) {
      hideSuggestions();
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        const results = await searchFunction(query);

        // Ignore older responses
        if (currentRequest !== requestNumber) return;

        renderSuggestions(results);
      } catch {
        if (currentRequest === requestNumber) {
          hideSuggestions();
        }
      }
    }, 300);
  });

  input.addEventListener('keydown', (event) => {
    if (dropdown.hidden) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = (activeIndex + 1) % suggestions.length;
    }

    else if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex =
        activeIndex <= 0 ? suggestions.length - 1 : activeIndex - 1;
    }

    else if (event.key === 'Enter' && activeIndex !== -1) {
      event.preventDefault();
      selectSuggestion(activeIndex);
      return;
    }

    else if (event.key === 'Escape') {
      hideSuggestions();
      return;
    }

    dropdown.querySelectorAll('.suggestion-item').forEach((item, index) => {
      item.classList.toggle('active', index === activeIndex);
    });
  });

  dropdown.addEventListener('click', (event) => {
    const button = event.target.closest('.suggestion-item');
    if (!button) return;

    selectSuggestion(Number(button.dataset.index));
  });

  document.addEventListener('click', (event) => {
    if (!form.contains(event.target)) {
      hideSuggestions();
    }
  });

  form.addEventListener('submit', () => {
    requestNumber++;
    clearTimeout(debounceTimer);
    hideSuggestions();
  });

  return hideSuggestions;
};

// ---------- Tabs ----------
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });

    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));

    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');

    $(`#${tab.dataset.target}`).classList.add('active');
  });
});

// ---------- Weather ----------
const renderWeather = ({
  city,
  country,
  temperature,
  condition,
  icon,
  humidity,
  windSpeed,
  feelsLike
}) => {
  $('#weather-result').innerHTML = `
    <div class="weather-main">
      <div class="place">${escapeHTML(city)}, ${escapeHTML(country)}</div>
      <div class="icon">${icon}</div>
      <div class="temp">${temperature}°C</div>
      <div class="cond">${escapeHTML(condition)}</div>
    </div>

    <div class="detail">
      <div class="label">Feels like</div>
      <div class="value">${feelsLike}°C</div>
    </div>

    <div class="detail">
      <div class="label">Humidity</div>
      <div class="value">${humidity}%</div>
    </div>

    <div class="detail">
      <div class="label">Wind speed</div>
      <div class="value">${windSpeed} km/h</div>
    </div>
  `;
};

// City autocomplete
setupAutocomplete(
  $('#city-input'),
  $('#weather-form'),
  searchCities,
  (city, selected) => selected
    ? city.name
    : `${escapeHTML(city.name)}${city.region ? `, ${escapeHTML(city.region)}` : ''} · ${escapeHTML(city.country)}`
);

$('#weather-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const city = $('#city-input').value.trim();
  const status = $('#weather-status');

  $('#weather-result').innerHTML = '';

  if (!city) {
    return setStatus(status, 'Please enter a city name.', true);
  }

  showLoader(status);

  try {
    renderWeather(await getWeather(city));
    hideLoader(status);
    setStatus(status);
  } catch (err) {
    hideLoader(status);
    setStatus(status, err.message, true);
  }
});

// ---------- Movies ----------
const renderMovies = (movies) => {
  $('#movie-result').innerHTML = `
    <div class="movie-grid">
      ${movies.map(({ title, year, poster, rating, plot, genre }) => `
        <article class="movie-card">
          ${poster
            ? `<img src="${escapeHTML(poster)}" alt="Poster of ${escapeHTML(title)}" loading="lazy" />`
            : `<div class="poster-fallback">No poster</div>`}

          <div class="movie-info">
            <h3>${escapeHTML(title)}</h3>
            <p>Released: ${escapeHTML(year)}${genre ? ` · ${escapeHTML(genre)}` : ''}</p>
            <p class="rating">★ ${escapeHTML(rating)} / 10</p>
            ${plot ? `<p class="plot">${escapeHTML(plot)}</p>` : ''}
          </div>
        </article>
      `).join('')}
    </div>
  `;
};

// Movie autocomplete
setupAutocomplete(
  $('#movie-input'),
  $('#movie-form'),
  searchMovieSuggestions,
  (movie, selected) => selected
    ? movie.title
    : `${escapeHTML(movie.title)} (${escapeHTML(movie.year)})`
);

$('#movie-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const query = $('#movie-input').value.trim();
  const status = $('#movie-status');

  $('#movie-result').innerHTML = '';

  if (query.length < 2) {
    return setStatus(status, 'Please enter at least 2 characters.', true);
  }

  showLoader(status);

  try {
    const movies = await searchMovies(query);

    renderMovies(movies);

    hideLoader(status);
    setStatus(
      status,
      `Found ${movies.length} result${movies.length === 1 ? '' : 's'} for "${query}".`
    );
  } catch (err) {
    hideLoader(status);
    setStatus(status, err.message, true);
  }
});
