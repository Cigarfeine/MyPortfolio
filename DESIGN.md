---
name: Arshad Cyber-Tactical Design System
description: Monochromatic military HUD and cybernetic brutalist design language for AI Researcher & Builder portfolio
colors:
  primary: "#E8E8E3"
  neutral-bg: "#080807"
  text-muted: "#8E8E88"
  border-line: "rgba(232, 232, 227, 0.05)"
  border-active: "rgba(232, 232, 227, 0.4)"
  card-bg: "#111111"
typography:
  display:
    fontFamily: "'Space Grotesk', sans-serif"
    fontSize: "clamp(3rem, 8vw, 6rem)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  display-xl:
    fontFamily: "'Space Grotesk', sans-serif"
    fontSize: "clamp(4rem, 12vw, 10rem)"
    fontWeight: 500
    lineHeight: 0.9
  display-lg:
    fontFamily: "'Space Grotesk', sans-serif"
    fontSize: "clamp(3rem, 8vw, 8rem)"
    fontWeight: 500
    lineHeight: 0.9
  display-md:
    fontFamily: "'Space Grotesk', sans-serif"
    fontSize: "clamp(2rem, 4vw, 3.5rem)"
    fontWeight: 400
    lineHeight: 1.2
  body:
    fontFamily: "'Space Grotesk', sans-serif"
    fontSize: "clamp(1.2rem, 2vw, 1.5rem)"
    fontWeight: 300
    lineHeight: 1.4
    letterSpacing: "normal"
  body-sm:
    fontFamily: "'JetBrains Mono', monospace"
    fontSize: "clamp(1rem, 1.5vw, 1.25rem)"
    lineHeight: 1.6
  mono:
    fontFamily: "'JetBrains Mono', monospace"
    fontSize: "11px"
    fontWeight: 400
    letterSpacing: "0.1em"
  mono-tag:
    fontFamily: "'JetBrains Mono', monospace"
    fontSize: "12px"
    fontWeight: 500
  mono-id:
    fontFamily: "'JetBrains Mono', monospace"
    fontSize: "14px"
rounded:
  none: "0px"
  sm: "2px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "32px"
  xl: "64px"
  section: "10rem"
---

## Overview
A high-agency, cybernetic brutalist aesthetic inspired by tactical aerospace instrumentation, military viewfinders, and cyber warfare diagnostics. Built with vanilla HTML/CSS and GSAP, deliberately rejecting generic LLM design clichés (zero saturated gradients, zero rounded colorful cards).

## Colors
- **Canvas Base (`--black`)**: `#080807` — Deep charcoal off-black; eliminates harsh pure black glare while preserving high contrast.
- **Signal White (`--white`, `--accent`)**: `#E8E8E3` — Warm tactical bone white for primary headlines, reticle crosshairs, and active data nodes.
- **Telemetry Grey (`--grey`)**: `#8E8E88` — High-contrast tactical stone grey meeting WCAG AA (≥ 4.5:1) for body text and telemetry labels.
- **Axis Line (`--line`)**: `rgba(232, 232, 227, 0.05)` — Subtle hairline divider for grid coordinates and section boundaries.
- **Card Surface**: `#111111` — Elevated container background with 1px hairline border.

## Typography
- **Headings & Name (`Space Grotesk`)**: Clean geometric grotesk with tight tracking (`-0.02em` to `-0.04em`), uppercase transforms, and cinematic letterforms.
- **Data & Telemetry (`JetBrains Mono`)**: High-legibility developer monospace for frequency readouts, timecodes, status badges, and GPS coordinates. Minimum functional floor: 11px.

## Layout
- **Hero**: Asymmetric composition pairing left-aligned typography with an ambient ASCII particle canvas.
- **Works**: Split vertical HUD (55% scrolling media on left, 45% sticky telemetry console on right) on desktop, collapsing smoothly to a touch-snapping carousel on mobile viewports.
- **Disciplines**: Sticky card stack with tactile crosshairs and coordinates.
- **Viewport Stability**: Standardized `100dvh` units with `max-w-full overflow-x-hidden`.

## Elevation & Depth
- **Zero Saturated Shadows**: Uses 1px inner/top borders (`border-top: 1px solid rgba(255, 255, 255, 0.4)`) and subtle dark occlusion shadows (`0 -20px 40px rgba(0,0,0,1)`).
- **Interactive Light Field**: Radial mouse hover glow (`card-glow`) tracking cursor position within cards.

## Shapes
- Sharp, hard-edged geometric forms (`rounded-none` / `2px`) reflecting tactical hardware consoles.
- Precision 8px corner reticles (`.corner.tl`, `.tr`, `.bl`, `.br`) for the custom military cursor.

## Components
- **ASCII Canvas**: Real-time 2D canvas glyph engine sampling luminance and alpha from source imagery.
- **Military Reticle**: Custom interactive viewfinder with smooth spring-lag follow and contextual HUD labels.
- **Telemetry Oscillator**: Real-time SVG path oscillator simulating varying kHz frequencies per project.
- **Timeline Ruler**: Vertical right-margin scroll ruler with dynamic audio-meter tick expansion.

## Do's and Don'ts
- **DO** maintain absolute monochromatic palette discipline (Zinc / Bone White / Stone Grey).
- **DO** keep all technical telemetry labels, coordinates, and kHz frequencies sharp and legible (≥ 11px).
- **DO** gracefully disable CPU-heavy 3D/noise layers on touch/mobile devices for 60fps responsiveness.
- **DON'T** use purple gradients, saturated blue buttons, or neon glows.
- **DON'T** use generic stock photos or unverified external image URLs.
- **DON'T** introduce heavy UI frameworks or external component libraries when vanilla performance suffices.
