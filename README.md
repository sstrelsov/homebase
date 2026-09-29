# Homebase

Personal website for Spencer Strelsov, including a blog, projects, and contact information.

## About

Built with Vite, React, TypeScript, and Tailwind. Design system is [NextUI](https://nextui.org/). Hosted on GitHub Pages.

## Setup

```sh
bun install
cp .env.example .env  # fill in the values
bun run dev
```

`VITE_CARTO_API_KEY` gives the Brooklyn Heights map (`/mustache`) CARTO's dark
basemap; without it the map falls back to Esri's keyless tiles (see
`.env.example` for how to get a key). The key is baked into the client bundle,
so it is public: restrict it by referer in the CARTO dashboard, and put a
separate localhost-only key in `.env.development.local` for `bun run dev`. CI
builds read it from the `VITE_CARTO_API_KEY` repository Actions secret.
