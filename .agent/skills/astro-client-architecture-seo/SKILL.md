---
name: astro-client-architecture-seo
description: >
  Best practices for Astro SSG/SSR hybrid architecture with client-side audio player state and SEO optimization.
  Trigger: When building Astro pages, components, client islands, persistent state across navigations, or SEO meta tags.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Core Guidelines

1. **Astro Islands Strategy**:
   - Keep static pages (Track details, Album listing, Artist info) pre-rendered for instant load and search engine indexing (SEO).
   - Use Client Islands (`client:load` or `client:only`) for interactive UI components: audio player bar, canvas visualizer, lyric synchronizer, and volume/seek controls.
   - Maintain continuous audio playback during page navigations using Astro's View Transitions (`<ClientRouter />` or `transition:persist`).

2. **GitHub Pages Deployment Optimization**:
   - Configure `output: 'static'` in `astro.config.mjs`.
   - Use `import.meta.env.BASE_URL` (or helper `withBase(path)`) for all relative asset paths, audio files (`public/music/...`), images, and internal link hrefs to support subpath hosting (e.g. `/rakunio/`).
   - Include a `.nojekyll` file in `public/.nojekyll` so GitHub Pages does not skip `_astro` build artifacts.
   - Configure canonical URLs dynamically matching `site` property.

3. **SEO & Structured Data**:
   - Include standard HTML5 semantic elements (`<main>`, `<article>`, `<header>`, `<nav>`, `<footer>`).
   - Add OpenGraph and Twitter meta tags for track shareability (`og:type="music.song"`, `og:audio`, `og:image`).
   - Inject JSON-LD Schema.org structured data for `MusicRecording`, `MusicAlbum`, and `MusicPlaylist`.

4. **MediaSession API Integration**:
   - Connect playback state to `navigator.mediaSession` for system media controls, lock screen metadata, album art, and hardware media keys (Play, Pause, Next, Previous, Seek).
