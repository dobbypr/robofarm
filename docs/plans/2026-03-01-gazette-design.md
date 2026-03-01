# Daily Gazette — Design Doc

**Date:** 2026-03-01
**Feature:** Daily Gazette overlay — newspaper/broadcast that appears each new day
**Approach:** Weighted pool + day-seeded LCG (Approach A)

---

## Summary

A small newspaper card overlay that appears at the start of each new day, after the existing day banner fades. It picks 2–3 short blurbs deterministically (same day = same content on reload), anchored by a weather entry plus seasonal/lore/tip/milestone fills.

---

## Files Changed

| File | Change |
|------|--------|
| `gazette.js` (new) | Content pool, `generateGazette()`, `showGazette()`, `closeGazette()` |
| `index.html` | Add `#gazette-overlay` HTML; add `<script src="gazette.js">` before `ui.js` |
| `style.css` | Gazette CSS in day-transition section |
| `loop.js` | Call `showGazette()` 3000ms after day transition (500ms after banner fades) |

No changes to: `settings.js`, save/load format, existing keybindings.

---

## Content Pool

```
GAZETTE_POOL = {
  weather:   ~15 entries   // always 1 per edition
  market:    ~15 entries   // use live priceMultipliers at call time
  lore:      ~20 entries   // RFS, BuPop, robots, farming history
  tips:      ~20 entries   // gameplay hints as ads / advice columns
  seasonal:  { spring:~4, summer:~4, autumn:~4, winter:~4 }
  milestone: ~10 entries   // {condition: fn(state), text}
}
```

**Total: ~100 entries.** Day 1 is a fixed "welcome edition" bypassing the pool entirely.

---

## generateGazette(day, season, rainDay, coins, robots)

1. Day 1 → return 3 fixed welcome entries
2. Seed LCG PRNG with `day` for determinism
3. Pick 1 weather entry (always)
4. Check all milestone conditions → if any fire, pick 1
5. Fill remaining 1–2 slots: seasonal (2× weight in-season) → lore → tips → market

---

## HTML Overlay

```
#gazette-overlay         ← fixed inset, dim backdrop, z-index 850
  #gazette-card          ← centered card, paper tint
    #gazette-masthead    ← "📰 THE ROBO FARM GAZETTE"
    #gazette-dateline    ← "Day N · Season · ☀️ Clear"
    .gazette-rule        ← decorative separator
    #gazette-body        ← 2-3 .gazette-blurb divs
    #gazette-footer      ← "Continue ▸" button
```

Not a `.modal-overlay` — separate element, no interference with modal system.

---

## CSS

- z-index 850 (above day-banner 800, above modals 500)
- Card: `background: rgba(28, 22, 12, 0.97)`, `border: 3px double var(--gold)` (newspaper feel)
- Masthead: Press Start 2P, gold, centered
- Dateline + blurbs: VT323, readable size
- Category labels: small, `var(--gold-dim)`, uppercase
- Fade-in via `.visible` class + CSS transition
- Body gets `show-system-cursor` while open

---

## Integration (loop.js)

```js
// After existing banner setTimeout:
setTimeout(() => {
  if (typeof showGazette === 'function') showGazette();
}, 3000); // 2500 banner display + 500 fade-out
```

**"Don't show on save load"**: satisfied naturally — `showGazette()` only called from day-transition path.

**ESC dismiss**: keydown listener inside gazette.js, checks `Escape` key. No input.js changes.

**Click backdrop to dismiss**: yes.

---

## Tone

Warm, slightly humorous, in-world. Small-town radio / one-page local newspaper.
Examples:
- Weather: *"Tomorrow's looking dry. Your crops won't water themselves — well, unless you've got robots for that."*
- Market: *"Potato prices holding steady. BuPop analysts call it 'underperforming.'"*
- Lore: *"Today marks the 50th anniversary of the first Farm Bot. It could only turn left. We've come a long way."*
- Tip (ad): *"TIRED OF WATERING? The Robot Farming Society reminds you: one Full Cycle bot covers an entire field."*
- Milestone: *"Word around town is your farm just hit 1000 coins. The big leagues are watching."*
