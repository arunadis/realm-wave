# Realm Weave — UX & Polish Improvement Plan

A phased plan to improve Realm Weave across two tracks: **UX & Polish** (Phases 1–6) and **Difficulty & Strategy** (Phases 7–12). Each phase is self-contained and can be implemented independently, though the ordering reflects priority and dependency.

---

## Phase Summary

| Phase | Focus | Impact | Effort | Status |
|-------|-------|--------|--------|--------|
| [Phase 1](./phase-1-navigation.md) | Navigation & Flow | 🔴 High | Low | 🔄 In progress |
| [Phase 2](./phase-2-gameplay-feedback.md) | Gameplay Feedback | 🔴 High | Medium | ✅ Done |
| [Phase 3](./phase-3-onboarding.md) | Onboarding & Tutorials | 🟡 Medium | Medium–High | 🔄 In progress |
| [Phase 4](./phase-4-visual-polish.md) | Visual Polish & Juice | 🟡 Medium | Medium | ✅ Done |
| [Phase 5](./phase-5-meta-progression.md) | Meta-Progression & Replay | 🟢 Low–Med | Medium–High | ✅ Done |
| [Phase 6](./phase-6-accessibility.md) | Accessibility & Mobile | 🟡 Medium | Low–Medium | ✅ Done |

### Difficulty & Strategy (Phases 7–12)

| Phase | Focus | Impact | Effort | Status |
|-------|-------|--------|--------|--------|
| [Phase 7](./phase-7-tighter-resources.md) | Tighter Resources | 🔴 High | Low | ✅ Done |
| [Phase 8](./phase-8-stagnation-penalty.md) | Stagnation Penalty | 🔴 High | Low–Medium | ✅ Done |
| [Phase 9](./phase-9-tile-decay.md) | Tile Decay | 🔴 High | Medium | ✅ Done |
| [Phase 10](./phase-10-frozen-cells.md) | Frozen Cells | 🟡 Medium | Medium | ✅ Done |
| [Phase 11](./phase-11-discard-action.md) | Discard Action | 🟡 Medium | Medium | ✅ Done |
| [Phase 12](./phase-12-score-bleed.md) | Score Bleed | 🟡 Medium | Low | ✅ Done |

---

## Guiding Principles

1. **Minimal disruption** — Each phase should land without breaking existing gameplay or persistence.
2. **Vertical slices** — Implement end-to-end (state → renderer → input) per feature; don't leave half-wired code.
3. **Mobile-first** — Every UI addition must work with touch (≥44px targets) and swipe.
4. **Testable** — Extend `renderGameToText()` for any new state; validate with Playwright.
5. **Follow `/add-realm-weave-feature` workflow** for each feature within a phase.

---

## Files Typically Touched

| File | Role |
|------|------|
| `src/state.js` | State shape, game logic, mode transitions |
| `src/renderer.js` | All drawing, hit-test geometry, layout |
| `src/main.js` | Input routing, keyboard shortcuts, game loop |
| `src/stages.js` | Stage configs (if tutorial flags added) |
| `src/grid.js` | Grid logic (if hover/preview added) |
| `src/audio.js` | SFX (if new sounds added) |
| `agents.md` | Must be updated after every code change |
