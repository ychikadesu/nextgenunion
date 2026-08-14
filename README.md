# Songbook — Worship Song App (v0.0.1)

An offline-first worship songbook PWA. Static HTML/CSS/JS, no build step, no
backend — built to run on GitHub Pages and install like a native app.

## What's in this version

- Official songs library with search (title, song number, artist, and lyric
  phrases — try searching "God awesome")
- Sort: A–Z, Z–A, number low–high, number high–low
- Song view with chords rendered above lyrics
- Chord transpose (up/down by semitone, resets to original key)
- Independent lyric and chord font size controls
- Light / dark mode (saved on-device)
- **Interface language: Mongolian (default) and English**, switchable in
  Settings
- Settings page with a song-database selector and an **Install App** button
- Full PWA support: manifest, service worker, offline caching
- Bottom navigation shows only what's live in this version (Songs, Settings) —
  User Songs, Playlists, and Sheet Music are not yet in the nav; they'll be
  added back in when their versions land

## Project structure

```
index.html          App shell — every page lives here, toggled by JS
css/style.css        Design tokens + styles (light & dark themes)
js/app.js            All app logic: search, sort, transpose, i18n, install
data/songs.js         Song content as a plain JS global — edit this to add/remove songs
data/i18n.js          Interface text for Mongolian and English
manifest.json         PWA manifest
service-worker.js     Offline caching (cache-first w/ background refresh)
icons/                App icons (192, 512, and maskable variants)
```

## Why song data is a `.js` file, not `.json`

Earlier drafts loaded `songs.json` with `fetch()`. Browsers block `fetch()`
of local files when a page is opened directly (`file://…/index.html`) — no
server involved — which is almost certainly why songs weren't showing up.
`data/songs.js` sets a plain `window.SONGBOOK_DATA` global and loads via a
normal `<script>` tag, which works whether the app is opened directly from
disk, from a local server, or from GitHub Pages. No other change needed.

## Editing the song list

Every song lives in `data/songs.js` inside the `window.SONGBOOK_DATA` array —
open the file, add a new object, save. The app picks it up automatically.

Chords are written inline in the lyric line using square brackets right
before the syllable they land on:

```js
"lyrics": [
  "[Am]Oh Holy [G]Amazing God we pray"
]
```

renders as "Am" above "Oh" and "G" above "Amazing". A `""` empty string in
the `lyrics` array creates a blank line (verse/chorus break).

Fields match the planning doc's data structure: `id`, `number`, `title`,
`alternateTitles`, `artist`, `key`, `lyrics`, `labels`, `metadata`, `audio`,
`sheetMusic`. `audio` and `sheetMusic` are wired into the data model now so
later versions can light them up without a schema change.

## Interface language (Mongolian / English)

`data/i18n.js` holds every UI string in both languages. The app defaults to
**Mongolian** — set by `window.SONGBOOK_DEFAULT_LANG = "mn"` at the bottom of
that file. Change that line to `"en"` if you want English as the default;
either way, people can switch languages themselves from **Settings → App
language**, and their choice is remembered on their device.

This is the *interface* language (menus, buttons, labels) — separate from
the song database selector, which controls which songbook's content you're
viewing, matching the plan's note that these are independent settings.

To add a third language: copy the `en` block in `data/i18n.js`, translate
each value, add it under a new key (e.g. `ko`), and add an `<option>` for it
in the `#ui-lang-select` dropdown in `index.html`.

## Running locally

Any static file server works, e.g.:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

Opening `index.html` directly via `file://` now works for browsing and
searching songs too (see above), but **the service worker and the Install
button require HTTPS or `localhost`** — that's a browser security rule, not
something this app can opt out of. Use a local server (or GitHub Pages) to
test those two specifically. When the page isn't on a secure origin, the
Install row in Settings explains this instead of showing a dead button.

## Deploying to GitHub Pages

1. Create a new GitHub repository and push this folder's contents to it
   (this folder should be the repo root, or the root of the branch/folder
   you configure Pages to serve).
2. In the repo: **Settings → Pages → Build and deployment → Source** = "Deploy
   from a branch", pick `main` and `/ (root)`.
3. Wait for the Pages build to finish, then visit the URL GitHub gives you
   (`https://<username>.github.io/<repo-name>/`).
4. All paths in this project are relative (`./`, `css/…`, `data/…`), so it
   works whether it's served from a root domain or a `/repo-name/`
   subpath — no path edits needed.
5. GitHub Pages serves everything over HTTPS automatically, which is exactly
   what the service worker and Install button need to work.

### Updating the app later

Bump `CACHE_VERSION` at the top of `service-worker.js` (e.g. `songbook-v0.0.2`)
whenever you ship changed files. That's what tells installed devices to fetch
the new version instead of serving the old cached copy.

## Installing the app (PWA)

- **Android / Desktop Chrome, Edge:** open the site (over HTTPS), go to
  **Settings → Install app**, or use the browser's own install icon in the
  address bar. The button only appears once the browser decides the site is
  installable — that can take a moment after the page first loads.
- **iOS Safari:** Safari doesn't support the automatic install prompt, so the
  Install button opens a hint instead — tap the **Share** icon, then
  **Add to Home Screen**.
- Once installed, the Settings page shows an "Installed" badge instead of
  the button.
- **If Install still doesn't appear on a real HTTPS deployment:** check the
  browser console for a service worker registration error, and confirm
  `manifest.json` and both icon files are reachable at their exact paths —
  those are the two most common installability blockers.

## Notes for future versions

- `User Songs`, `Playlists`, and `Sheet Music` are intentionally out of the
  nav for now (see above) — add them back as new `<button class="nav-btn"
  data-nav="…">` entries when those versions are built.
- No cloud database is used anywhere — everything is static JS/JSON plus
  on-device `localStorage`, per the plan.
- The song data model already includes `labels`, `audio`, and `sheetMusic`
  fields so Version 3+ features don't require restructuring existing data.
