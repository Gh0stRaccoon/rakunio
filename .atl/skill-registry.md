# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

## User Skills & Project Skills

| Trigger | Skill | Path |
|---------|-------|------|
| When building Astro pages, components, client islands, persistent state across navigations, or SEO meta tags. | astro-client-architecture-seo | file:///home/joaquin/Documents/repos/personal/rakunio/.agent/skills/astro-client-architecture-seo/SKILL.md |
| When implementing audio visualization, spectrum analyzer, oscilloscope, canvas animations, or WebAudio API nodes. | webaudio-canvas-visualizer | file:///home/joaquin/Documents/repos/personal/rakunio/.agent/skills/webaudio-canvas-visualizer/SKILL.md |
| When parsing .lrc files, rendering synchronized lyrics, karaoke mode, or lyric time-matching. | lrc-dynamic-lyrics | file:///home/joaquin/Documents/repos/personal/rakunio/.agent/skills/lrc-dynamic-lyrics/SKILL.md |
| Search tool for modern web development best practices. Execute FIRST for all HTML/CSS and client JS tasks. | modern-web-guidance | file:///home/joaquin/.gemini/config/plugins/modern-web-guidance-plugin/skills/modern-web-guidance/SKILL.md |
| Uses Chrome DevTools MCP for accessibility (a11y) debugging and auditing based on web.dev guidelines. | a11y-debugging | file:///home/joaquin/.gemini/config/plugins/chrome-devtools-plugin/skills/a11y-debugging/SKILL.md |
| Guides debugging and optimizing Largest Contentful Paint (LCP) using Chrome DevTools MCP tools. | debug-optimize-lcp | file:///home/joaquin/.gemini/config/plugins/chrome-devtools-plugin/skills/debug-optimize-lcp/SKILL.md |

## Compact Rules

### astro-client-architecture-seo
- Keep track/album pages pre-rendered (`output: 'static'`) for instant SEO indexing.
- Use `import.meta.env.BASE_URL` (or `withBase()`) for all static assets (audio, images, links) so subpath hosting on GitHub Pages (e.g., `/rakunio/`) works flawlessly.
- Create `public/.nojekyll` to prevent GitHub Pages from bypassing `_astro/` asset folders.
- Use Client Islands (`client:load` / `client:only`) for player bar, canvas visualizer, and LRC container.
- Use Astro View Transitions (`<ClientRouter />` / `transition:persist`) for continuous uninterrupted audio playback.
- Inject JSON-LD Schema.org (`MusicRecording`, `MusicAlbum`) and OpenGraph (`og:type="music.song"`).
- Connect player to `navigator.mediaSession` for OS system media controls & hardware keys.

### webaudio-canvas-visualizer
- Initialize `AudioContext` inside user gesture (click/touch) handler to bypass browser autoplay restrictions.
- Connect `<audio>` element with `createMediaElementSource(audioElement)` -> `AnalyserNode` -> `destination`.
- Handle Retina/HiDPI scaling with `window.devicePixelRatio` on canvas `width`/`height`.
- Zero memory allocations in `requestAnimationFrame` loop; pre-allocate `Uint8Array` buffers.
- Use `ResizeObserver` for dynamic responsive canvas resizing.

### lrc-dynamic-lyrics
- Parse `[mm:ss.xx]` and `[mm:ss:xxx]` time tags and handle multiple timestamps per line.
- Sort parsed lyric items strictly by time ascending.
- Synchronize current lyric line with `audio.currentTime` (`time <= currentTime < nextTime`).
- Highlight active line with high contrast, ambient glow, and scale transform.
- Smooth auto-scroll active lyric line to center using `scrollTo` or CSS transform.

### modern-web-guidance
- Use semantic HTML tags (`<main>`, `<section>`, `<article>`, `<header>`, `<footer>`, `<figure>`).
- Use CSS design tokens, HSL colors, CSS grid/flexbox, container queries, and backdrop filters.
- Avoid obsolete JS/CSS patterns; follow modern Web standard APIs.

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| Project Root | file:///home/joaquin/Documents/repos/personal/rakunio | Astro project directory |
