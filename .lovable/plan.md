

# Enhance Diagnostics to Catch Landing Page Failures

## The Problem

The current `/diagnostics` page checks generic browser capabilities (SW, cache, storage, viewport) but does NOT test the actual landing page components. The landing page has several complex subsystems that could silently fail:

1. **Three.js / WebGL 3D player rendering** (Player3DEffect) - could crash on specific GPU drivers
2. **Performance check** (usePerformanceCheck) - GPU benchmark, frame rate test, or WebGL shader compilation could hang or error
3. **Three.js bundle loading** - the lazy-loaded chunk could fail to download or parse
4. **Service Worker serving stale/corrupt cached JS bundle** - SW could serve an old broken version
5. **Unhandled JS errors** - runtime errors that crash React but aren't captured anywhere

The diagnostics pass because they test basic APIs, not the actual code paths the landing page uses.

## Plan

### 1. Add Landing-Specific Tests to Diagnostics Page

Extend `src/pages/Diagnostics.tsx` to include:

- **Three.js load test**: Dynamically import `three` and attempt to create a WebGLRenderer, capturing any errors
- **Performance check simulation**: Run the same `usePerformanceCheck` logic and report the tier/reason
- **Cached JS bundle integrity**: Check if the SW cache contains the main JS bundle and whether it's the correct version
- **WebGL stress test**: Attempt the same shader compilation the landing page does (vertex + fragment shader)
- **Error capture**: Add a global `window.onerror` and `unhandledrejection` listener that stores errors to localStorage, then display them in diagnostics

### 2. Add Error Boundary Logging to Landing Page

In `src/pages/Landing.tsx`, wrap the landing content in an error boundary that:
- Catches React render errors
- Stores the error message + stack in localStorage (`pwa_error_log`)
- Shows the StaticLandingFallback with an error indicator
- These stored errors will then appear in the diagnostics page

### 3. Add "Test Landing Page" Button to Diagnostics

Add a button that navigates to `/` with a query param like `?diag=1`, which:
- Triggers the landing page to run with extra logging
- Captures any errors and redirects back to `/diagnostics` with results

### 4. Enhance Staff Diagnostics Viewer

In `src/components/staff/VisitorDiagnostics.tsx`, display the new fields (Three.js status, performance tier, cached bundle info, stored errors) with appropriate status badges.

## Files to Edit

- `src/pages/Diagnostics.tsx` - Add Three.js, perf check, and bundle integrity tests
- `src/pages/Landing.tsx` - Add error boundary wrapper that logs to localStorage
- `src/components/staff/VisitorDiagnostics.tsx` - Display new diagnostic fields

