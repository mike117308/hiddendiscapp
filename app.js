const STORAGE_KEY = 'friendMovieRatings_v1';
const FRIENDS = ['Mike', 'Eve', 'Sky'];

const form = document.getElementById('movie-form');
const formTitle = document.getElementById('form-title');
const formError = document.getElementById('form-error');
const movieList = document.getElementById('movie-list');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const tagFilter = document.getElementById('tag-filter');
const sampleBtn = document.getElementById('sample-btn');
const clearBtn = document.getElementById('clear-btn');

let movies = loadMovies();
let editingId = null;

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseScore(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(10, Math.max(0, n)) : null;
}

function metrics(movie) {
  const scores = [movie.scoreMike, movie.scoreEve, movie.scoreSky].filter((v) => v !== null);
  if (!scores.length) return { avg: 0, spread: 0, agreement: 0, tag: 'mid' };
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const spread = Math.max(...scores) - Math.min(...scores);
  const agreement = Math.max(0, Math.round((1 - spread / 10) * 100));
  const tag = spread >= 5 ? 'controversial' : avg >= 8 && spread <= 2 ? 'certified-banger' : 'mid';
  return { avg, spread, agreement, tag };
}

function scoreEntries(movie) {
  const entries = [
    ['Mike', movie.scoreMike],
    ['Eve', movie.scoreEve],
    ['Sky', movie.scoreSky],
  ];
  const ranked = [...entries].sort((a, b) => (b[1] ?? -1) - (a[1] ?? -1));
  const rankMap = new Map(ranked.map(([name], index) => [name, index + 1]));
  return entries.map(([name, score]) => ({ name, score, rank: score === null ? '-' : `#${rankMap.get(name)}` }));
}

function saveMovies() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
}

function loadMovies() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getFilteredMovies() {
  const q = searchInput.value.trim().toLowerCase();
  let out = movies.filter((m) => {
    const mtx = metrics(m);
    const searchHit = !q || m.title.toLowerCase().includes(q) || (m.notes || '').toLowerCase().includes(q);
    const tagHit = tagFilter.value === 'all' || mtx.tag === tagFilter.value;
    return searchHit && tagHit;
  });

  out.sort((a, b) => {
    const ma = metrics(a);
    const mb = metrics(b);
    switch (sortSelect.value) {
      case 'oldest':
        return a.createdAt - b.createdAt;
      case 'avg':
        return mb.avg - ma.avg;
      case 'spread':
        return mb.spread - ma.spread;
      default:
        return b.createdAt - a.createdAt;
    }
  });

  return out;
}

function render() {
  movieList.innerHTML = '';
  const filtered = getFilteredMovies();
  emptyState.classList.toggle('hidden', filtered.length > 0);

  filtered.forEach((movie) => {
    const tpl = document.getElementById('movie-card-template').content.cloneNode(true);
    const m = metrics(movie);
    tpl.querySelector('.movie-title').textContent = movie.title;
    tpl.querySelector('.movie-meta').textContent = `${movie.year || 'Year ?'} • spread ${m.spread.toFixed(1)}`;

    const badge = tpl.querySelector('.badge');
    const label = m.tag === 'certified-banger' ? 'Certified Banger' : m.tag === 'controversial' ? 'Controversial' : 'Mid';
    badge.textContent = label;
    badge.classList.add(m.tag);

    const rowsEl = tpl.querySelector('.score-rows');
    scoreEntries(movie).forEach((entry) => {
      const tr = document.createElement('tr');
      const scoreText = entry.score === null ? '-' : entry.score === 0 ? '0 HOT TAKE' : entry.score.toFixed(1);
      const isTop = entry.rank === '#1' && entry.score !== null;
      tr.innerHTML = `<td><strong>${entry.name}</strong></td><td class="${entry.score === 0 ? 'hot-take' : ''}">${scoreText}${isTop ? '<span class="crown">👑</span>' : ''}</td><td>${entry.rank}</td>`;
      rowsEl.appendChild(tr);
    });

    tpl.querySelector('.avg-value').textContent = m.avg.toFixed(1);
    tpl.querySelector('.agreement-bar').style.width = `${m.agreement}%`;

    tpl.querySelector('.edit-btn').addEventListener('click', () => fillFormForEdit(movie));
    tpl.querySelector('.delete-btn').addEventListener('click', () => {
      movies = movies.filter((x) => x.id !== movie.id);
      saveMovies();
      render();
    });

    movieList.appendChild(tpl);
  });
}

function fillFormForEdit(movie) {
  editingId = movie.id;
  formTitle.textContent = 'Edit Movie';
  form.title.value = movie.title;
  form.year.value = movie.year || '';
  form.scoreMike.value = movie.scoreMike ?? '';
  form.scoreEve.value = movie.scoreEve ?? '';
  form.scoreSky.value = movie.scoreSky ?? '';
  form.notes.value = movie.notes || '';
  document.getElementById('save-btn').textContent = 'Save Changes';
}

function clearForm() {
  form.reset();
  formError.textContent = '';
  editingId = null;
  formTitle.textContent = 'Add / Edit Movie';
  document.getElementById('save-btn').textContent = 'Add Movie';
}

function validate(payload) {
  if (!payload.title.trim()) return 'Title is required.';
  if (payload.year && (payload.year < 1888 || payload.year > 2100)) return 'Year must be between 1888 and 2100.';
  const invalidScore = [payload.scoreMike, payload.scoreEve, payload.scoreSky].some((v) => v !== null && (v < 0 || v > 10));
  if (invalidScore) return 'Scores must be between 0 and 10.';
  return null;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const payload = {
    id: editingId || uid(),
    title: form.title.value.trim(),
    year: form.year.value ? Number(form.year.value) : null,
    notes: form.notes.value.trim(),
    scoreMike: parseScore(form.scoreMike.value),
    scoreEve: parseScore(form.scoreEve.value),
    scoreSky: parseScore(form.scoreSky.value),
    createdAt: editingId ? movies.find((m) => m.id === editingId).createdAt : Date.now(),
  };

  const error = validate(payload);
  if (error) {
    formError.textContent = error;
    return;
  }

  if (editingId) {
    movies = movies.map((m) => (m.id === editingId ? payload : m));
  } else {
    movies.unshift(payload);
  }
  saveMovies();
  clearForm();
  render();
});

clearBtn.addEventListener('click', clearForm);
searchInput.addEventListener('input', render);
sortSelect.addEventListener('change', render);
tagFilter.addEventListener('change', render);

sampleBtn.addEventListener('click', () => {
  movies = [
    {
      id: uid(),
      title: 'Fart',
      year: 2024,
      notes: 'Divisive masterpiece',
      scoreMike: 0,
      scoreEve: 5,
      scoreSky: 10,
      createdAt: Date.now() - 1000,
    },
    {
      id: uid(),
      title: 'D&D',
      year: 2025,
      notes: 'Universal 10/10',
      scoreMike: 10,
      scoreEve: 10,
      scoreSky: 10,
      createdAt: Date.now(),
    },
  ];
  saveMovies();
  clearForm();
  render();
});

render();
