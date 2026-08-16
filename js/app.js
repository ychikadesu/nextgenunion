// =========================================================
// Songbook — app.js
// Data-driven: song content lives as one JSON file per song under
// /data/songs/ (see data/songs/manifest.json), loaded at runtime by
// loadSongData(). Adding a song = add a JSON file + one line in the
// manifest — nothing here needs to change.
// =========================================================

const APP_VERSION = 'v0.0.11';

const state = {
  songs: [],
  loadFailed: false,
  sortBy: 'num',       // 'alpha' | 'num'
  sortOrder: 'asc',     // 'asc' | 'desc'
  query: '',
  activeSong: null,
  transpose: 0,
  lyricsSize: 1.05,   // rem
  chordSize: 0.82,    // rem
  lang: 'mn',
};

// Chord transpose is limited to a full octave in either direction —
// beyond that you're just back to an enharmonic equivalent of an in-range key.
const TRANSPOSE_LIMIT = 12;

const CHROMATIC_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const CHROMATIC_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const FLAT_KEYS = new Set(['F','Bb','Eb','Ab','Db','Gb','Dm','Gm','Cm','Fm','Bbm']);

// Social links shown in Settings → About. Leave `url` empty to hide that
// icon entirely — nothing else needs to change when these are filled in.
// Icon + label per social platform. The actual URLs live in config.js
// (window.SONGBOOK_APP_CONFIG.social) — edit that file, not this list.
const SOCIAL_ICONS = {
  facebook: {
    label: 'Facebook',
    icon: '<svg viewBox="0 0 24 24"><path d="M13.5 21v-7.5H16l.5-3H13.5V8.2c0-.87.24-1.46 1.5-1.46H16.6V4.14C16.3 4.1 15.3 4 14.1 4c-2.5 0-4.2 1.53-4.2 4.33v2.17H7.4v3h2.5V21h3.6z"/></svg>',
  },
  youtube: {
    label: 'YouTube',
    icon: '<svg viewBox="0 0 24 24"><path d="M21.6 7.2s-.2-1.5-.85-2.15c-.8-.85-1.7-.85-2.1-.9C15.8 4 12 4 12 4h0s-3.8 0-6.65.15c-.4.05-1.3.05-2.1.9C2.6 5.7 2.4 7.2 2.4 7.2S2.2 9 2.2 10.75v1.5C2.2 14 2.4 15.8 2.4 15.8s.2 1.5.85 2.15c.8.85 1.85.82 2.3.91 1.7.16 7.2.2 7.45.2 0 0 3.8 0 6.65-.16.4-.05 1.3-.05 2.1-.9.65-.65.85-2.15.85-2.15s.2-1.8.2-3.55v-1.5c0-1.75-.2-3.55-.2-3.55zM9.95 14.6V8.9l5.4 2.85-5.4 2.85z"/></svg>',
  },
  instagram: {
    label: 'Instagram',
    icon: '<svg viewBox="0 0 24 24"><path d="M12 2c-2.7 0-3.05.01-4.12.06-1.06.05-1.79.22-2.43.47-.66.26-1.22.6-1.77 1.16-.56.55-.9 1.11-1.16 1.77-.25.64-.42 1.37-.47 2.43C2 8.95 2 9.3 2 12s.01 3.05.06 4.12c.05 1.06.22 1.79.47 2.43.26.66.6 1.22 1.16 1.77.55.56 1.11.9 1.77 1.16.64.25 1.37.42 2.43.47C8.95 22 9.3 22 12 22s3.05-.01 4.12-.06c1.06-.05 1.79-.22 2.43-.47.66-.26 1.22-.6 1.77-1.16.56-.55.9-1.11 1.16-1.77.25-.64.42-1.37.47-2.43.05-1.07.06-1.42.06-4.12s-.01-3.05-.06-4.12c-.05-1.06-.22-1.79-.47-2.43-.26-.66-.6-1.22-1.16-1.77-.55-.56-1.11-.9-1.77-1.16-.64-.25-1.37-.42-2.43-.47C15.05 2.01 14.7 2 12 2zm0 1.8c2.65 0 2.97.01 4.02.06.97.04 1.5.2 1.85.34.46.18.79.4 1.14.75.35.35.57.68.75 1.14.14.35.3.88.34 1.85.05 1.05.06 1.37.06 4.02s-.01 2.97-.06 4.02c-.04.97-.2 1.5-.34 1.85-.18.46-.4.79-.75 1.14-.35.35-.68.57-1.14.75-.35.14-.88.3-1.85.34-1.05.05-1.37.06-4.02.06s-2.97-.01-4.02-.06c-.97-.04-1.5-.2-1.85-.34-.46-.18-.79-.4-1.14-.75-.35-.35-.57-.68-.75-1.14-.14-.35-.3-.88-.34-1.85C3.8 14.97 3.8 14.65 3.8 12s.01-2.97.06-4.02c.04-.97.2-1.5.34-1.85.18-.46.4-.79.75-1.14.35-.35.68-.57 1.14-.75.35-.14.88-.3 1.85-.34C9.03 3.8 9.35 3.8 12 3.8zm0 3.05a5.15 5.15 0 100 10.3 5.15 5.15 0 000-10.3zm0 8.5a3.35 3.35 0 110-6.7 3.35 3.35 0 010 6.7zm5.35-8.7a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0z"/></svg>',
  },
  website: {
    label: 'Website',
    icon: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm6.93 6H15.7a15.6 15.6 0 00-1.38-4.02A8.03 8.03 0 0118.93 8zM12 4.06c.8 1.1 1.5 2.5 1.95 3.94h-3.9c.45-1.44 1.15-2.84 1.95-3.94zM4.26 14a8.1 8.1 0 010-4h3.6a16.7 16.7 0 000 4h-3.6zm.81 2h3.23a15.6 15.6 0 001.38 4.02A8.03 8.03 0 015.07 16zm3.23-8H5.07a8.03 8.03 0 014.6-4.02A15.6 15.6 0 008.3 8zM12 19.94c-.8-1.1-1.5-2.5-1.95-3.94h3.9c-.45 1.44-1.15 2.84-1.95 3.94zM14.36 14H9.64a14.8 14.8 0 010-4h4.72a14.8 14.8 0 010 4zm.02 5.98A15.6 15.6 0 0015.76 16h3.17a8.03 8.03 0 01-4.55 3.98zM16.14 14a16.7 16.7 0 000-4h3.6a8.1 8.1 0 010 4h-3.6z"/></svg>',
  },
};

function renderSocialLinks() {
  const el = document.getElementById('about-social');
  if (!el) return;
  const social = (window.SONGBOOK_APP_CONFIG && window.SONGBOOK_APP_CONFIG.social) || {};
  el.innerHTML = Object.keys(SOCIAL_ICONS)
    .filter(key => social[key])
    .map(key => `<a href="${escapeHtml(social[key])}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(SOCIAL_ICONS[key].label)}">${SOCIAL_ICONS[key].icon}</a>`)
    .join('');
}

function t(key, ...args) {
  const dict = (window.SONGBOOK_LANG && window.SONGBOOK_LANG[state.lang]) || {};
  const entry = dict[key];
  if (typeof entry === 'function') return entry(...args);
  return entry !== undefined ? entry : key;
}

// ---------------------------------------------------------
// Boot
// ---------------------------------------------------------
document.addEventListener('DOMContentLoaded', init);

async function init() {
  initSplash();
  loadPrefs();
  bindNav();
  bindSongsPage();
  bindSongView();
  bindSettings();
  applyLanguage();
  registerServiceWorker();
  setupInstallPrompt();
  initHistoryNav();

  await loadSongData();
  applyLanguage(); // re-run so the results count reflects the loaded songs
}

// ---------------------------------------------------------
// Song data: one JSON file per song, listed in data/songs/manifest.json.
// Adding a song = add its JSON file + one line in the manifest; nothing
// else in the app needs to change.
// ---------------------------------------------------------
async function fetchSongData() {
  const manifestRes = await fetch('data/songs/manifest.json');
  if (!manifestRes.ok) throw new Error(`manifest.json responded ${manifestRes.status}`);
  const files = await manifestRes.json();

  return Promise.all(files.map(async (file) => {
    const res = await fetch(`data/songs/${file}`);
    if (!res.ok) throw new Error(`${file} responded ${res.status}`);
    return res.json();
  }));
}

async function loadSongData() {
  try {
    state.songs = await fetchSongData();
  } catch (err) {
    console.error('Songbook: failed to load song data —', err);
    // Most likely cause: the app was opened directly from disk (file://),
    // where browsers block fetch() of local files. Serving it over
    // http(s) — even just localhost — resolves this.
    state.songs = [];
    state.loadFailed = true;
  }
}

// Manual "Refresh song library" button: clears any cached copies of the
// song files first (so the re-fetch actually reaches the network instead
// of hitting the service worker's cache-first match), then re-fetches
// through the exact same plain URLs the app normally uses — which also
// correctly re-populates the cache under those same URLs, so offline
// access keeps working afterward. Unlike the initial load, a failure here
// leaves the existing song list alone — no point wiping out songs that
// were already loaded successfully just because a manual refresh attempt
// failed (e.g. while offline).
async function reloadSongLibrary() {
  const btn = document.getElementById('reload-songs-btn');
  btn.disabled = true;
  btn.textContent = t('reloadBtnBusy');

  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        for (const req of requests) {
          if (req.url.includes('/data/songs/')) {
            await cache.delete(req);
          }
        }
      }
    }

    const songs = await fetchSongData();
    state.songs = songs;
    state.loadFailed = false;
    renderSongList();
    showToast(t('toastLibraryReloaded'));
  } catch (err) {
    console.error('Songbook: manual song library refresh failed —', err);
    showToast(t('toastLibraryReloadFailed'));
  } finally {
    btn.disabled = false;
    btn.textContent = t('reloadBtn');
  }
}

// ---------------------------------------------------------
// In-app back navigation: the hardware/gesture/browser back button should
// move within the app (song → list, settings → list) instead of leaving
// it, and only exit after a second back press at the root within a short
// window — the same "press back again to exit" pattern many apps use.
// ---------------------------------------------------------
let lastBackPressAt = 0;
const EXIT_CONFIRM_WINDOW_MS = 2000;

function initHistoryNav() {
  // Establish the app's root state so the very first back press has
  // something of ours to land on instead of leaving immediately.
  history.replaceState({ page: 'songs' }, '', location.href);

  window.addEventListener('popstate', (e) => {
    const st = e.state;
    if (st && st.page) {
      if (st.page === 'song-view' && st.songId) {
        const song = state.songs.find(s => s.id === st.songId);
        if (song) { openSong(song, { pushHistory: false }); return; }
      }
      showPage(st.page, { pushHistory: false });
      return;
    }

    // No app state left to land on — the next back would leave the app.
    const now = Date.now();
    if (now - lastBackPressAt < EXIT_CONFIRM_WINDOW_MS) {
      // Second press in time: let this one actually exit.
      return;
    }
    lastBackPressAt = now;
    // Re-plant the root state so this press doesn't leave the app, and
    // tell the person to press back again if they really want to exit.
    history.pushState({ page: 'songs' }, '', location.href);
    showPage('songs', { pushHistory: false });
    showToast(t('toastPressBackAgain'));
  });
}

// ---------------------------------------------------------
// Splash screen: shown briefly on launch, then fades into the app
// ---------------------------------------------------------
function initSplash() {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;
  const MIN_DISPLAY_MS = 900;
  const FADE_MS = 1100;
  const shownAt = Date.now();
  const hide = () => {
    const wait = Math.max(0, MIN_DISPLAY_MS - (Date.now() - shownAt));
    setTimeout(() => {
      splash.classList.add('is-hidden');
      setTimeout(() => splash.remove(), FADE_MS);
    }, wait);
  };
  if (document.readyState === 'complete') {
    hide();
  } else {
    window.addEventListener('load', hide);
  }
}

// ---------------------------------------------------------
// Preferences (persisted locally — offline-first, no cloud)
// ---------------------------------------------------------
function loadPrefs() {
  const theme = localStorage.getItem('sb-theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('theme-toggle').setAttribute('aria-checked', String(theme === 'dark'));

  const accent = localStorage.getItem('sb-accent') || 'aqua';
  document.documentElement.setAttribute('data-accent', accent);
  document.querySelectorAll('.accent-swatch').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.accent === accent));
  });

  const savedLang = localStorage.getItem('sb-ui-lang');
  const available = Object.keys(window.SONGBOOK_LANG || {});
  const preferredOrder = window.SONGBOOK_LANG_ORDER || [];
  const orderedLangs = [
    ...preferredOrder.filter(code => available.includes(code)),
    ...available.filter(code => !preferredOrder.includes(code)).sort(),
  ];
  state.lang = (savedLang && available.includes(savedLang)) ? savedLang
    : (available.includes(window.SONGBOOK_DEFAULT_LANG) ? window.SONGBOOK_DEFAULT_LANG : orderedLangs[0]);
  document.documentElement.setAttribute('lang', state.lang);

  const langSelect = document.getElementById('ui-lang-select');
  if (langSelect) {
    langSelect.innerHTML = orderedLangs
      .map(code => `<option value="${code}">${(window.SONGBOOK_LANG[code].meta && window.SONGBOOK_LANG[code].meta.name) || code}</option>`)
      .join('');
    langSelect.value = state.lang;
  }

  const lyricsSize = parseFloat(localStorage.getItem('sb-lyrics-size'));
  const chordSize = parseFloat(localStorage.getItem('sb-chord-size'));
  if (!Number.isNaN(lyricsSize)) state.lyricsSize = lyricsSize;
  if (!Number.isNaN(chordSize)) state.chordSize = chordSize;
  applyFontSizes();
}

function applyFontSizes() {
  document.documentElement.style.setProperty('--lyrics-size', state.lyricsSize + 'rem');
  document.documentElement.style.setProperty('--chord-size', state.chordSize + 'rem');
}

// ---------------------------------------------------------
// Language: apply the active language to every labeled element
// ---------------------------------------------------------
function applyLanguage() {
  document.documentElement.setAttribute('lang', state.lang);

  const map = {
    't-appTitle': 'appTitle',
    't-topbarAppName': 'appTitle',
    't-navSongs': 'navSongs',
    't-navSettings': 'navSettings',
    't-keyLabel': 'keyLabel',
    't-lyricsGroup': 'lyricsGroup',
    't-chordsGroup': 'chordsGroup',
    't-settingsTitle': 'settingsTitle',
    't-sectionAppearance': 'sectionAppearance',
    't-darkModeTitle': 'darkModeTitle',
    't-darkModeSub': 'darkModeSub',
    't-accentTitle': 'accentTitle',
    't-accentSub': 'accentSub',
    't-sectionLangDb': 'sectionLangDb',
    't-uiLangTitle': 'uiLangTitle',
    't-uiLangSub': 'uiLangSub',
    't-dbTitle': 'dbTitle',
    't-dbSub': 'dbSub',
    't-sectionApp': 'sectionApp',
    't-reloadTitle': 'reloadTitle',
    't-reloadSub': 'reloadSub',
    't-sectionAbout': 'sectionAbout',
    't-versionTitle': 'versionTitle',
  };
  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t(key);
  });

  document.getElementById('search-input').placeholder = t('searchPlaceholder');
  document.getElementById('back-btn').setAttribute('aria-label', t('backAria'));
  document.getElementById('transpose-reset').textContent = t('transposeReset');

  document.querySelector('.sort-btn[data-sort-by="alpha"]').textContent = t('sortByAlpha');
  document.querySelector('.sort-btn[data-sort-by="num"]').textContent = t('sortByNumber');
  document.querySelector('.sort-btn[data-sort-order="asc"]').textContent = t('sortAsc');
  document.querySelector('.sort-btn[data-sort-order="desc"]').textContent = t('sortDesc');

  document.getElementById('db-option-en').textContent = t('dbComingSoon', 'English');

  document.getElementById('empty-state').textContent = t('emptyState');
  document.getElementById('about-version-line').textContent = t('versionSub', APP_VERSION);

  const appConfig = window.SONGBOOK_APP_CONFIG || {};
  const orgName = appConfig.orgName || '';
  document.getElementById('about-org').textContent = orgName;
  document.getElementById('about-copyright').textContent =
    `© ${new Date().getFullYear()} ${orgName}. All rights reserved.`;

  const contactBtn = document.getElementById('about-contact-btn');
  const contactFallback = document.getElementById('about-contact-fallback');
  if (appConfig.contactEmail) {
    contactBtn.hidden = false;
    contactBtn.href = `mailto:${appConfig.contactEmail}`;
    contactFallback.hidden = false;
    document.getElementById('about-contact-email').textContent = appConfig.contactEmail;
  } else {
    contactBtn.hidden = true;
    contactFallback.hidden = true;
  }
  document.getElementById('t-contactBtn').textContent = t('contactBtn');
  document.getElementById('about-contact-copy').setAttribute('aria-label', t('copyEmailAria'));

  const reloadBtn = document.getElementById('reload-songs-btn');
  if (!reloadBtn.disabled) reloadBtn.textContent = t('reloadBtn');

  renderSocialLinks();

  refreshInstallLabels();
  renderSongList();
  if (state.activeSong) updateTransposeUI();
}

// ---------------------------------------------------------
// Navigation between the two V1 pages (+ song detail)
// ---------------------------------------------------------
function bindNav() {
  document.querySelectorAll('.nav-btn[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      showPage(btn.dataset.nav === 'songs' ? 'songs' : btn.dataset.nav, { pushHistory: true });
    });
  });
}

function showPage(name, opts = {}) {
  const { pushHistory = false, replaceHistory = false } = opts;
  const map = { songs: 'page-songs', settings: 'page-settings', 'song-view': 'page-song-view' };
  Object.values(map).forEach(id => document.getElementById(id).hidden = true);
  document.getElementById(map[name]).hidden = false;

  document.querySelectorAll('.nav-btn[data-nav]').forEach(b => b.classList.remove('is-active'));
  if (name === 'songs' || name === 'song-view') {
    document.querySelector('.nav-btn[data-nav="songs"]').classList.add('is-active');
  } else if (name === 'settings') {
    document.querySelector('.nav-btn[data-nav="settings"]').classList.add('is-active');
  }

  // The song view is a focused reading mode: hide the bottom tab bar so
  // nothing competes with the lyrics (the song view has its own slim top bar).
  document.getElementById('bottom-nav').hidden = (name === 'song-view');
  document.body.classList.toggle('nav-hidden', name === 'song-view');

  window.scrollTo(0, 0);

  if (pushHistory) {
    history.pushState({ page: name }, '', location.href);
  } else if (replaceHistory) {
    history.replaceState({ page: name }, '', location.href);
  }
}

// ---------------------------------------------------------
// Songs page: search + sort + list rendering
// ---------------------------------------------------------
function bindSongsPage() {
  const input = document.getElementById('search-input');
  input.addEventListener('input', () => {
    state.query = input.value.trim().toLowerCase();
    renderSongList();
  });

  document.querySelectorAll('.sort-btn[data-sort-by]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.sortBy = btn.dataset.sortBy;
      document.querySelectorAll('.sort-btn[data-sort-by]').forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      renderSongList();
    });
  });

  document.querySelectorAll('.sort-btn[data-sort-order]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.sortOrder = btn.dataset.sortOrder;
      document.querySelectorAll('.sort-btn[data-sort-order]').forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      renderSongList();
    });
  });
}

function stripChords(lyricsArr) {
  return lyricsArr.join(' \n ').replace(/\[[^\]]+\]/g, '');
}

function matchesQuery(song, q) {
  if (!q) return true;

  const haystack = [
    song.title,
    String(song.number),
    ...(song.alternateTitles || []),
    song.artist || '',
    stripChords(song.lyrics),
  ].join(' \n ').toLowerCase();

  // Every word in the query must appear somewhere in the combined text,
  // in any order — so "God awesome" matches "God Is an Awesome God"
  // even though that exact phrase never appears contiguously.
  const words = q.split(/\s+/).filter(Boolean);
  return words.every(word => haystack.includes(word));
}

function sortSongs(list) {
  const arr = [...list];
  const dir = state.sortOrder === 'desc' ? -1 : 1;
  if (state.sortBy === 'num') {
    arr.sort((a, b) => (a.number - b.number) * dir);
  } else {
    arr.sort((a, b) => a.title.localeCompare(b.title) * dir);
  }
  return arr;
}

function highlight(text, q) {
  if (!q) return escapeHtml(text);
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return escapeHtml(text);
  return escapeHtml(text.slice(0, idx)) + '<mark>' + escapeHtml(text.slice(idx, idx + q.length)) + '</mark>' + escapeHtml(text.slice(idx + q.length));
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function renderSongList() {
  const listEl = document.getElementById('song-list');
  const emptyEl = document.getElementById('empty-state');
  const countEl = document.getElementById('results-count');

  if (state.loadFailed) {
    listEl.innerHTML = `<li class="load-error">${escapeHtml(t('songLoadError'))}</li>`;
    emptyEl.hidden = true;
    countEl.textContent = '';
    return;
  }


  const filtered = sortSongs(state.songs.filter(s => matchesQuery(s, state.query)));

  countEl.textContent = filtered.length === state.songs.length
    ? t('resultsAll', filtered.length)
    : t('resultsFiltered', filtered.length, state.songs.length);

  listEl.innerHTML = '';
  emptyEl.hidden = filtered.length !== 0;

  const q = state.query;
  filtered.forEach(song => {
    const li = document.createElement('li');
    const row = document.createElement('button');
    row.className = 'song-row';
    row.innerHTML = `
      <span class="song-badge">${song.number}</span>
      <span class="song-row-text">
        <span class="song-row-title">${highlight(song.title, q)}</span>
        ${song.artist ? `<span class="song-row-sub">${escapeHtml(song.artist)}</span>` : ''}
      </span>
    `;
    row.addEventListener('click', () => openSong(song));
    li.appendChild(row);
    listEl.appendChild(li);
  });
}

// ---------------------------------------------------------
// Song view: chord-over-lyric rendering + transpose
// ---------------------------------------------------------
function bindSongView() {
  document.getElementById('back-btn').addEventListener('click', () => history.back());

  document.getElementById('transpose-up').addEventListener('click', () => {
    if (state.transpose >= TRANSPOSE_LIMIT) return;
    state.transpose += 1;
    updateTransposeUI();
  });
  document.getElementById('transpose-down').addEventListener('click', () => {
    if (state.transpose <= -TRANSPOSE_LIMIT) return;
    state.transpose -= 1;
    updateTransposeUI();
  });
  document.getElementById('transpose-reset').addEventListener('click', () => {
    state.transpose = 0;
    updateTransposeUI();
  });

  document.querySelectorAll('[data-font]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.font;
      if (action === 'lyrics-up') state.lyricsSize = Math.min(1.6, state.lyricsSize + 0.08);
      if (action === 'lyrics-down') state.lyricsSize = Math.max(0.75, state.lyricsSize - 0.08);
      if (action === 'chords-up') state.chordSize = Math.min(1.2, state.chordSize + 0.06);
      if (action === 'chords-down') state.chordSize = Math.max(0.6, state.chordSize - 0.06);
      applyFontSizes();
      localStorage.setItem('sb-lyrics-size', state.lyricsSize);
      localStorage.setItem('sb-chord-size', state.chordSize);
    });
  });
}

function openSong(song, opts = {}) {
  const { pushHistory = true } = opts;
  state.activeSong = song;
  state.transpose = 0;

  document.getElementById('sv-number').textContent = `#${song.number}`;
  document.getElementById('sv-title').textContent = song.title;

  const altEl = document.getElementById('sv-alt-title');
  const altTitles = (song.alternateTitles || []).filter(Boolean);
  if (altTitles.length) {
    altEl.textContent = altTitles.join(' • ');
    altEl.hidden = false;
  } else {
    altEl.textContent = '';
    altEl.hidden = true;
  }

  const artistEl = document.getElementById('sv-artist');
  if (song.artist) {
    artistEl.textContent = song.artist;
    artistEl.hidden = false;
  } else {
    artistEl.textContent = '';
    artistEl.hidden = true;
  }

  const labelsEl = document.getElementById('sv-labels');
  labelsEl.innerHTML = (song.labels || [])
    .map(l => `<span class="sv-label-chip">${escapeHtml(l)}</span>`).join('');

  const audioEl = document.getElementById('sv-audio');
  if (song.audio && song.audio.length) {
    audioEl.hidden = false;
    audioEl.innerHTML = song.audio.map(a => {
      const url = escapeHtml(a.url || a);
      const fileName = escapeHtml((a.url || a).split('/').pop());
      return `
        <div class="audio-item">
          <audio controls style="width:100%" src="${url}"></audio>
          <a class="audio-download" href="${url}" download="${fileName}">⭳ ${t('downloadAudio')}</a>
        </div>`;
    }).join('');
  } else {
    audioEl.hidden = true;
    audioEl.innerHTML = '';
  }

  const linksEl = document.getElementById('sv-links');
  if (song.links && song.links.length) {
    linksEl.hidden = false;
    linksEl.innerHTML = song.links.map(l => {
      const url = typeof l === 'string' ? l : l.url;
      const label = (typeof l === 'object' && l.label) ? l.label : t('listenLink');
      return `<a class="sv-link-btn" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
    }).join('');
  } else {
    linksEl.hidden = true;
    linksEl.innerHTML = '';
  }

  updateTransposeUI();
  showPage('song-view');
  if (pushHistory) {
    history.pushState({ page: 'song-view', songId: song.id }, '', location.href);
  }
}

function updateTransposeUI() {
  document.getElementById('transpose-offset').textContent =
    (state.transpose > 0 ? '+' : '') + state.transpose;
  document.getElementById('transpose-up').disabled = state.transpose >= TRANSPOSE_LIMIT;
  document.getElementById('transpose-down').disabled = state.transpose <= -TRANSPOSE_LIMIT;
  const song = state.activeSong;
  document.getElementById('sv-key').textContent = song ? transposeChord(song.key, state.transpose) : '—';
  renderLyrics();
}

function transposeChord(chord, steps) {
  if (!chord || !steps) return chord;
  // Split root (+ optional accidental) from the rest (quality/extensions), and handle slash bass.
  const parts = chord.split('/');
  const transposedParts = parts.map(part => transposeSingle(part, steps));
  return transposedParts.join('/');
}

function transposeSingle(token, steps) {
  const m = token.match(/^([A-G])(#|b)?(.*)$/);
  if (!m) return token;
  const [, letter, accidental, rest] = m;
  const useFlats = FLAT_KEYS.has(letter + (accidental || '') + (rest.startsWith('m') ? 'm' : ''));
  const name = letter + (accidental || '');
  let idx = CHROMATIC_SHARP.indexOf(name);
  if (idx === -1) idx = CHROMATIC_FLAT.indexOf(name);
  if (idx === -1) return token;
  const newIdx = ((idx + steps) % 12 + 12) % 12;
  const table = useFlats ? CHROMATIC_FLAT : CHROMATIC_SHARP;
  return table[newIdx] + rest;
}

function renderLyrics() {
  const container = document.getElementById('lyrics-container');
  const song = state.activeSong;
  container.innerHTML = '';
  if (!song) return;

  // Group lines into sections (verses/choruses) using blank lines as
  // boundaries — the same simple convention a future song editor can
  // produce by just leaving a blank line between parts. A section whose
  // first line starts with leading whitespace in the source is treated as
  // an indented part (e.g. a chorus set off from the verses), matching how
  // it's laid out in the original songbook document.
  const sections = [];
  let current = [];
  song.lyrics.forEach(rawLine => {
    if (rawLine.trim() === '') {
      if (current.length) { sections.push(current); current = []; }
    } else {
      current.push(rawLine);
    }
  });
  if (current.length) sections.push(current);

  // Only number parts when there's more than one — a single-section song
  // has nothing to distinguish, so a lone "1" would just be noise.
  const numberParts = sections.length > 1;

  sections.forEach((sectionLines, sectionIdx) => {
    const isIndented = /^\s{2,}/.test(sectionLines[0]);

    const sectionEl = document.createElement('div');
    sectionEl.className = 'lyric-section' + (isIndented ? ' is-indented' : '');

    if (numberParts) {
      const numEl = document.createElement('div');
      numEl.className = 'lyric-section-number';
      numEl.textContent = String(sectionIdx + 1);
      sectionEl.appendChild(numEl);
    }

    sectionLines.forEach((rawLine, lineIdx) => {
      // Leading whitespace on the first line is only a structural indent
      // marker (see isIndented above), not literal spacing to render.
      const line = lineIdx === 0 ? rawLine.replace(/^\s+/, '') : rawLine;

      const lineEl = document.createElement('div');
      lineEl.className = 'lyric-line';

      // Tokenize on [Chord] markers: each chord attaches to the text run that follows it,
      // up to the next chord marker (or end of line). Leading text with no chord is its own token.
      const chordPositions = [...line.matchAll(/\[([^\]]+)\]/g)];
      const tokens = [];
      if (chordPositions.length === 0) {
        tokens.push({ chord: null, text: line });
      } else {
        if (chordPositions[0].index > 0) {
          tokens.push({ chord: null, text: line.slice(0, chordPositions[0].index) });
        }
        chordPositions.forEach((cm, i) => {
          const textStart = cm.index + cm[0].length;
          const textEnd = i + 1 < chordPositions.length ? chordPositions[i + 1].index : line.length;
          tokens.push({ chord: cm[1], text: line.slice(textStart, textEnd) });
        });
      }

      tokens.forEach(tok => {
        const wrap = document.createElement('span');
        wrap.className = 'lyric-token';
        if (tok.chord) {
          const chordEl = document.createElement('span');
          chordEl.className = 'chord-tag';
          chordEl.textContent = transposeChord(tok.chord, state.transpose);
          wrap.appendChild(chordEl);
        } else if (tok.text) {
          const spacer = document.createElement('span');
          spacer.className = 'chord-tag-spacer';
          wrap.appendChild(spacer);
        }
        const textEl = document.createElement('span');
        textEl.className = 'lyric-word';
        textEl.textContent = tok.text || '\u00A0';
        wrap.appendChild(textEl);
        lineEl.appendChild(wrap);
      });

      sectionEl.appendChild(lineEl);
    });

    container.appendChild(sectionEl);
  });
}

// ---------------------------------------------------------
// Settings: theme, UI language, database select, install
// ---------------------------------------------------------
function bindSettings() {
  document.getElementById('reload-songs-btn').addEventListener('click', reloadSongLibrary);

  document.getElementById('about-contact-copy').addEventListener('click', async () => {
    const email = (window.SONGBOOK_APP_CONFIG && window.SONGBOOK_APP_CONFIG.contactEmail) || '';
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      showToast(t('toastEmailCopied'));
    } catch (err) {
      console.error('Songbook: clipboard copy failed —', err);
      showToast(t('toastEmailCopyFailed'));
    }
  });

  const toggle = document.getElementById('theme-toggle');
  toggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    toggle.setAttribute('aria-checked', String(next === 'dark'));
    localStorage.setItem('sb-theme', next);
  });

  document.querySelectorAll('.accent-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      const accent = btn.dataset.accent;
      document.documentElement.setAttribute('data-accent', accent);
      localStorage.setItem('sb-accent', accent);
      document.querySelectorAll('.accent-swatch').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    });
  });

  const langSelect = document.getElementById('ui-lang-select');
  langSelect.addEventListener('change', () => {
    state.lang = langSelect.value;
    localStorage.setItem('sb-ui-lang', state.lang);
    applyLanguage();
  });

  const dbSelect = document.getElementById('db-select');
  // Only 'mn' is a real, selectable option right now (others are coming
  // soon) — this also corrects a stale value left over from an older
  // version of the app that allowed picking a different database.
  dbSelect.value = 'mn';
  localStorage.setItem('sb-db', 'mn');
  dbSelect.addEventListener('change', () => {
    localStorage.setItem('sb-db', dbSelect.value);
    showToast(t('toastDbSaved'));
  });
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { el.hidden = true; }, 2200);
}

// ---------------------------------------------------------
// PWA: install prompt (Android/Desktop) + iOS fallback
// ---------------------------------------------------------
let deferredPrompt = null;
let installState = 'unavailable'; // 'unavailable' | 'insecure' | 'ios' | 'promptable' | 'installed'

function isStandaloneNow() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

function setupInstallPrompt() {
  if (isStandaloneNow()) {
    installState = 'installed';
    refreshInstallLabels();
    return;
  }

  // Install (and the underlying service worker) only work on HTTPS or localhost —
  // this is a browser security requirement, not something the app can work around.
  if (!window.isSecureContext) {
    installState = 'insecure';
    refreshInstallLabels();
    return;
  }

  const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installState = 'promptable';
    refreshInstallLabels();
  });

  document.getElementById('install-btn').addEventListener('click', async () => {
    if (deferredPrompt) {
      // The prompt is single-use: capture and clear it before awaiting, so a
      // stray second click can't reuse an already-consumed prompt event.
      const promptEvent = deferredPrompt;
      deferredPrompt = null;
      promptEvent.prompt();
      await promptEvent.userChoice;
      // Intentionally not branching on `outcome` here: accepting the native
      // dialog does not guarantee installation actually completed. The
      // `appinstalled` event (and isStandaloneNow() as a fallback) is the
      // only source of truth for "installed" — see the listener below.
      if (!isStandaloneNow()) {
        installState = 'unavailable';
        refreshInstallLabels();
      }
    } else if (isIOS) {
      showToast(t('toastIosHint'));
    }
  });

  installState = isIOS ? 'ios' : 'unavailable';
  refreshInstallLabels();

  window.addEventListener('appinstalled', () => {
    installState = 'installed';
    refreshInstallLabels();
  });
}

function refreshInstallLabels() {
  const installBtn = document.getElementById('install-btn');
  const installedBadge = document.getElementById('installed-badge');
  const installSub = document.getElementById('install-sub');
  const installTitle = document.getElementById('install-title');

  installTitle.textContent = t('installTitle');
  installBtn.textContent = t('installBtn');

  switch (installState) {
    case 'installed':
      installBtn.hidden = true;
      installedBadge.hidden = false;
      installedBadge.textContent = t('installedBadgeDone');
      installSub.textContent = t('installSubInstalled');
      break;
    case 'insecure':
      installBtn.hidden = true;
      installedBadge.hidden = true;
      installSub.textContent = t('installSubInsecure');
      break;
    case 'ios':
      installBtn.hidden = false;
      installedBadge.hidden = true;
      installSub.textContent = t('installSubIOS');
      break;
    case 'promptable':
      installBtn.hidden = false;
      installedBadge.hidden = true;
      installSub.textContent = t('installSub');
      break;
    default:
      installBtn.hidden = true;
      installedBadge.hidden = true;
      installSub.textContent = t('installSub');
  }
}

// ---------------------------------------------------------
// Service worker registration (offline-first)
// Requires HTTPS or localhost — browsers refuse to register
// service workers on plain http:// or file:// origins.
// ---------------------------------------------------------
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Songbook: service workers are not supported in this browser — offline mode and Install are unavailable.');
    return;
  }
  if (!window.isSecureContext) {
    console.warn('Songbook: not a secure context (HTTPS or localhost) — service worker registration skipped.');
    return;
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').then((reg) => {
      console.log('Songbook: service worker registered with scope', reg.scope);
    }).catch(err => {
      console.error('Songbook: service worker registration failed —', err);
    });
  });
}
