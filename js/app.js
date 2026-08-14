// =========================================================
// Songbook — app.js
// Version 0.0.1: official songs, search, sort, chord transpose,
// light/dark mode, settings, PWA install, EN/MN interface language.
// Data-driven: all song content lives in /data/songs.js (window.SONGBOOK_DATA).
// =========================================================

const APP_VERSION = 'v0.0.5';

const state = {
  songs: (window.SONGBOOK_DATA || []),
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

function t(key, ...args) {
  const dict = (window.SONGBOOK_I18N && window.SONGBOOK_I18N[state.lang]) || {};
  const entry = dict[key];
  if (typeof entry === 'function') return entry(...args);
  return entry !== undefined ? entry : key;
}

// ---------------------------------------------------------
// Boot
// ---------------------------------------------------------
document.addEventListener('DOMContentLoaded', init);

function init() {
  initSplash();
  loadPrefs();
  bindNav();
  bindSongsPage();
  bindSongView();
  bindSettings();
  applyI18n();
  registerServiceWorker();
  setupInstallPrompt();

  if (!state.songs.length) {
    console.warn('Songbook: no song data found on window.SONGBOOK_DATA — check that data/songs.js loaded before app.js.');
  }
  renderSongList();
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

  const accent = localStorage.getItem('sb-accent') || 'periwinkle';
  document.documentElement.setAttribute('data-accent', accent);
  document.querySelectorAll('.accent-swatch').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.accent === accent));
  });

  const savedLang = localStorage.getItem('sb-ui-lang');
  state.lang = savedLang || window.SONGBOOK_DEFAULT_LANG || 'mn';
  document.documentElement.setAttribute('lang', state.lang);
  const langSelect = document.getElementById('ui-lang-select');
  if (langSelect) langSelect.value = state.lang;

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
// i18n: apply the active language to every labeled element
// ---------------------------------------------------------
function applyI18n() {
  document.documentElement.setAttribute('lang', state.lang);

  const map = {
    't-appTitle': 'appTitle',
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
  document.getElementById('version-sub').textContent = t('versionSub', APP_VERSION);
  document.getElementById('about-copyright').textContent =
    `© ${new Date().getFullYear()} Next Gen Union. All rights reserved.`;

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
      showPage(btn.dataset.nav === 'songs' ? 'songs' : btn.dataset.nav);
    });
  });
}

function showPage(name) {
  const map = { songs: 'page-songs', settings: 'page-settings', 'song-view': 'page-song-view' };
  Object.values(map).forEach(id => document.getElementById(id).hidden = true);
  document.getElementById(map[name]).hidden = false;

  document.querySelectorAll('.nav-btn[data-nav]').forEach(b => b.classList.remove('is-active'));
  if (name === 'songs' || name === 'song-view') {
    document.querySelector('.nav-btn[data-nav="songs"]').classList.add('is-active');
  } else if (name === 'settings') {
    document.querySelector('.nav-btn[data-nav="settings"]').classList.add('is-active');
  }
  window.scrollTo(0, 0);
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
  if (song.title.toLowerCase().includes(q)) return true;
  if (String(song.number).includes(q)) return true;
  if ((song.alternateTitles || []).some(tt => tt.toLowerCase().includes(q))) return true;
  if ((song.artist || '').toLowerCase().includes(q)) return true;
  const plain = stripChords(song.lyrics).toLowerCase();
  if (plain.includes(q)) return true;
  return false;
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
  document.getElementById('back-btn').addEventListener('click', () => showPage('songs'));

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

function openSong(song) {
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
    applyI18n();
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
  installedBadge.textContent = t('installedBadge');

  switch (installState) {
    case 'installed':
      installBtn.hidden = true;
      installedBadge.hidden = false;
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
