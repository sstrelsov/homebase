# Homebase

Personal website for Spencer Strelsov, including a blog, projects, and contact information.

## About

Built with create-react-app, Typescript, and Tailwind. Design system is [NextUI](https://nextui.org/). Hosted on GitHub Pages.

## Setup

```sh
bun install
cp .env.example .env  # fill in the values
bun run dev
```

The Brooklyn Heights map (`/mustache`) prefers CARTO basemap tiles, which
need a free API key (no account required): request one at
<https://carto.com/basemaps/apikey> (it arrives by email — check spam or
write to <support-basemaps@carto.com> if it never shows up) and set it as
`VITE_CARTO_API_KEY` in `.env`. Without a key the map falls back to Esri's
keyless dark tiles, which cap out at zoom 16 so close-ups are slightly
softer. The key is baked into the client bundle at build time, so it is
publicly visible — use a basemaps key, never a secret. For deploys from CI,
add `VITE_CARTO_API_KEY` as a repository Actions secret.
