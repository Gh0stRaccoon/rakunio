---
name: webaudio-canvas-visualizer
description: >
  Guidelines for Web Audio API AudioContext, AnalyserNode frequency analysis, and high-performance HTML5 Canvas visualizers.
  Trigger: When implementing audio visualization, spectrum analyzer, oscilloscope, canvas animations, or WebAudio API nodes.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Core Guidelines

1. **Web Audio API Lifecycle**:
   - Initialize `AudioContext` only after user interaction (click/touch) to respect browser autoplay policies.
   - Connect `<audio>` element via `audioCtx.createMediaElementSource(audioElement)`.
   - Route source to `AnalyserNode` and then `audioCtx.destination` (`source.connect(analyser); analyser.connect(audioCtx.destination)`).
   - Configure `analyser.fftSize` (e.g., 256, 512, 1024) and `analyser.smoothingTimeConstant` (0.8 - 0.85).

2. **Canvas Rendering Optimization**:
   - Handle Retina/High-DPI screens by scaling canvas `width` and `height` properties with `window.devicePixelRatio`.
   - Never allocate objects or arrays inside `requestAnimationFrame` loop. Pre-allocate `Uint8Array(analyser.frequencyBinCount)` buffers.
   - Use `ResizeObserver` to adjust canvas dimensions dynamically without reset lag.
   - Draw sleek gradients (linear/radial HSL color stops) and rounded bars for a modern visual feel.
