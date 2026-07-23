---
name: lrc-dynamic-lyrics
description: >
  Parser and dynamic renderer for LRC timed lyrics format with real-time sync and auto-scroll.
  Trigger: When parsing .lrc files, rendering synchronized lyrics, karaoke mode, or lyric time-matching.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Core Guidelines

1. **LRC Format Parsing**:
   - Support standard time tags `[mm:ss.xx]` and `[mm:ss:xxx]` (minutes, seconds, hundredths/milliseconds).
   - Support multiple tags per line `[00:12.00][01:15.00]Lyric line` by creating multiple timed entries.
   - Sort parsed items strictly by `time` ascending.

2. **Real-time Synchronization & Rendering**:
   - Find active lyric index by comparing `audio.currentTime` with timestamp intervals (`time <= currentTime < nextTime`).
   - Highlight active line with high contrast styling, scale transform, and ambient shadow.
   - Scroll lyrics smoothly (`container.scrollTo({ top: targetOffset, behavior: 'smooth' })` or CSS translateY).
   - Provide a fallback state when no LRC is available (e.g. metadata summary or instrument indicator).
