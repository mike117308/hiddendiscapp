# Friend Movie Ratings Tracker

A lightweight collaborative-style movie ranking web app for three friends (Mike, Eve, Sky), inspired by a dark dashboard layout.

## Features

- Add, edit, and delete movies.
- Track three individual scores (0-10).
- Auto-calculate average score, spread, and agreement bar.
- Badge each movie as **Certified Banger**, **Controversial**, or **Mid**.
- Search by title/notes, sort, and filter.
- Load screenshot-like sample data with one click.
- Persists data in browser `localStorage`.

## Run locally

Because this is a static app, you can run any simple static server:

```bash
python3 -m http.server 4173
```

Then open:

- `http://localhost:4173`

## Files

- `index.html` — UI structure.
- `styles.css` — dark theme and responsive styling.
- `app.js` — app behavior and local data persistence.
