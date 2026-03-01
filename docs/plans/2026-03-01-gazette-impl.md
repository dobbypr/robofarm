# Daily Gazette Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Daily Gazette newspaper overlay that appears at the start of each new day, showing 2–3 deterministic blurbs drawn from a 100-entry content pool.

**Architecture:** New `gazette.js` (content pool + logic) loaded before `ui.js`; a non-modal `#gazette-overlay` HTML element; CSS in `style.css`; `loop.js` and `input.js` get minimal edits — a single `setTimeout` chain and a 4-line ESC guard.

**Tech Stack:** Vanilla JS, CSS custom properties, no build step, browser globals only.

---

## Task 1: Add gazette HTML overlay to index.html

**Files:**
- Modify: `index.html` — add overlay div before the `<script>` block (before line 777)

The overlay is intentionally NOT a `.modal-overlay` so it doesn't interfere with the modal system. Add `onclick="if(event.target===this)closeGazette()"` on the backdrop so clicking outside the card closes it.

**Step 1: Locate the insertion point**

Find the `<!-- INVENTORY MODAL -->` block in `index.html`. The overlay goes immediately after the closing `</div></div>` of the inventory modal and before the `<script src="rng.js">` line (around line 776).

**Step 2: Insert the gazette HTML**

Add this block between the inventory modal close tags and the first `<script>` tag:

```html
<!-- GAZETTE OVERLAY -->
<div id="gazette-overlay" class="hidden" onclick="if(event.target===this)closeGazette()">
  <div id="gazette-card">
    <div id="gazette-masthead">📰 THE ROBO FARM GAZETTE</div>
    <div id="gazette-dateline">Day <span id="gazette-day"></span> &nbsp;·&nbsp; <span id="gazette-season"></span> &nbsp;·&nbsp; <span id="gazette-weather"></span></div>
    <div id="gazette-body"></div>
    <div id="gazette-footer">
      <button id="gazette-continue" onclick="closeGazette()">Continue ▸</button>
    </div>
  </div>
</div>
```

**Step 3: Verify in browser**

Open `index.html`. The overlay should be invisible (hidden). Open DevTools → Elements and confirm `#gazette-overlay` exists with class `hidden`.

---

## Task 2: Add gazette CSS to style.css

**Files:**
- Modify: `style.css` — append after the `/* ─── DAY TRANSITION ─── */` block (after line 435, before the menu screen section at line 437)

**Step 1: Insert the CSS block**

Add immediately after line 435 (`#day-banner-sub { ... }`):

```css
/* ─── GAZETTE OVERLAY ─── */
#gazette-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.75);
  z-index: 850;
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.35s;
  pointer-events: all;
}
#gazette-overlay.hidden { display: none; }
#gazette-overlay.visible { opacity: 1; }
#gazette-card {
  background: rgba(28, 22, 12, 0.97);
  border: 3px double var(--gold);
  width: 520px; max-width: 90vw;
  display: flex; flex-direction: column;
}
#gazette-masthead {
  font-family: 'Press Start 2P', monospace;
  font-size: 11px; color: var(--gold);
  text-align: center;
  padding: 18px 20px 8px;
  letter-spacing: 1px;
  border-bottom: 1px solid var(--ui-border);
}
#gazette-dateline {
  font-family: 'VT323', monospace;
  font-size: 17px; color: var(--text-dim);
  text-align: center;
  padding: 6px 20px 10px;
  border-bottom: 2px solid var(--ui-border-bright);
}
#gazette-body {
  padding: 14px 22px;
  display: flex; flex-direction: column; gap: 14px;
}
.gazette-blurb { display: flex; flex-direction: column; gap: 3px; }
.gazette-cat {
  font-family: 'Press Start 2P', monospace;
  font-size: 6px; color: var(--gold-dim);
  letter-spacing: 1px;
}
.gazette-text {
  font-family: 'VT323', monospace;
  font-size: 19px; color: var(--text);
  line-height: 1.4; margin: 0;
}
#gazette-footer {
  border-top: 1px solid var(--ui-border);
  padding: 10px 20px;
  display: flex; justify-content: flex-end;
}
#gazette-continue {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px; color: var(--gold);
  background: rgba(200, 150, 50, 0.15);
  border: 1px solid var(--ui-border-bright);
  padding: 8px 14px;
  cursor: pointer; transition: all 0.1s;
}
#gazette-continue:hover {
  background: rgba(200, 150, 50, 0.3);
  border-color: var(--gold);
}
```

**Step 2: Smoke-test layout in browser**

In browser DevTools console, run:
```js
document.getElementById('gazette-overlay').classList.remove('hidden');
document.getElementById('gazette-overlay').classList.add('visible');
document.getElementById('gazette-day').textContent = '7';
document.getElementById('gazette-season').textContent = 'Spring';
document.getElementById('gazette-weather').textContent = '☀️ Clear';
document.getElementById('gazette-body').innerHTML = '<div class="gazette-blurb"><span class="gazette-cat">WEATHER</span><p class="gazette-text">Clear skies today. Your crops are thirsty.</p></div>';
```

Confirm: overlay appears centered, double-gold border, masthead in Press Start 2P, body in VT323.

---

## Task 3: Create gazette.js — content pool

**Files:**
- Create: `gazette.js`

**Step 1: Create the file with the header and seeded PRNG**

```js
/* ═══════════════════════════════════════════════════════════════════════════
 * DAILY GAZETTE
 * ═══════════════════════════════════════════════════════════════════════════ */

/* ─── Seeded PRNG (LCG) — same day = same gazette on reload ─── */
function _gazetteRng(seed) {
  let s = seed >>> 0;
  s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
  s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
  s = (s ^ (s >>> 16)) >>> 0;
  return function () {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}
```

**Step 2: Add the content pool**

Append to `gazette.js`:

```js
/* ─── Content Pool ─── */
const GAZETTE_POOL = {

  /* WEATHER — always picks 1 per edition, filtered by rainDay */
  weather: [
    /* rainy-day entries */
    { tag: 'rain', text: "The clouds showed up early. Good news for your crops — bad news for anyone who forgot their umbrella." },
    { tag: 'rain', text: "Rainy day on the farm. The robots don't mind. Your boots might." },
    { tag: 'rain', text: "Scattered showers throughout the day. Automatic irrigation systems rejoice — the sky is doing their job for them." },
    { tag: 'rain', text: "Meteorological report: wet. Very wet. The tilled fields are drinking well today." },
    { tag: 'rain', text: "Rain's in. If you've been putting off watering, consider this problem solved." },
    { tag: 'rain', text: "Another rainy day on the plains. Locals say 'the rain costs nothing.' Economists at BuPop disagree." },
    { tag: 'rain', text: "Your crops are watered and you didn't lift a finger. Today is a good day." },
    /* clear-day entries */
    { tag: 'clear', text: "Clear skies today. Your crops are thirsty and only you — or your robots — can help." },
    { tag: 'clear', text: "Bright sun, zero clouds. The kind of day your watering can was made for." },
    { tag: 'clear', text: "Dry conditions through tomorrow. RFS meteorologists recommend proactive irrigation. Their robots are standing by." },
    { tag: 'clear', text: "No rain in sight. Manual farmers report sore arms. Automated farms report nothing — they don't have feelings." },
    { tag: 'clear', text: "Hot and dry. The soil remembers every missed watering. Your crops, however, do not forgive." },
    { tag: 'clear', text: "Clear skies mean clear work ahead. Get those fields watered before the roots complain." },
    { tag: 'clear', text: "Sunshine all day. Perfect conditions for farming — or for watching your robots farm while you plan your next expansion." },
    /* neutral entries — work any day */
    { tag: 'any', text: "Weather conditions: variable, as always. The land does what it wants. So do your robots." },
    { tag: 'any', text: "Today's conditions: perfectly farmable. No further comment from our meteorology desk." },
  ],

  /* MARKET — crop price flavor, picked from pool at call time */
  market: [
    { text: "Wheat market showing signs of life. Analysts at BuPop call it 'cyclically positive.' Farmers call it 'finally.'" },
    { text: "Carrot futures: stable. The Gazette says: a dependable root for uncertain times." },
    { text: "Corn prices up after a slow week. The cob bounces back. Farmers celebrate modestly." },
    { text: "Sunflower demand holds strong in all four seasons. BuPop calls them 'a surprisingly resilient asset class.'" },
    { text: "Potato prices holding steady. Farmers call it 'the reliable root.' BuPop analysts call it 'underperforming.'" },
    { text: "Market volatility high across all crops. Classic advice: diversify your fields, not just your feelings." },
    { text: "Bulk sell bonuses remain the most reliable path to margin improvement. Our financial desk confirmed this over breakfast." },
    { text: "BuPop issued a quarterly note on crop turnover. It contained seventeen charts. We summarized it: sell more crops." },
    { text: "Commodity desk reports: wheat selling well near season's end. Plan accordingly." },
    { text: "Early data suggests crop prices may shift tomorrow. Early data also suggested rain last Tuesday. Draw your own conclusions." },
    { text: "A local economist was asked when to sell. He said 'when the price is high.' We are still seeking a second opinion." },
    { text: "Corn and sunflower spreading well across mixed portfolios. Our crop manager says: keep planting." },
    { text: "RFS analyst report: robots harvesting at peak efficiency improve per-unit returns by a number we didn't understand. It was positive." },
    { text: "Seasonal demand shifts expected soon. No one knows the direction. That's what makes markets interesting, apparently." },
    { text: "Carrot prices dipped slightly. RFS calls this 'a buying opportunity in the ground-vegetable sector.'" },
    { text: "Reminder from our finance desk: BuPop Inc. (BPOP) pays dividends daily. For shareholders. Hint hint." },
  ],

  /* LORE — worldbuilding: RFS, BuPop, robots, farming history */
  lore: [
    { text: "Today marks the 50th anniversary of the first Farm Bot. It could only turn left. We've come a long way." },
    { text: "The Robot Farming Society was founded in a shed. Today it has seventeen offices, four labs, and one very confused intern." },
    { text: "BuPop Inc. began as a travelling vegetable cart in 1943. They now hold futures contracts on all five major crop types. The cart is in a museum." },
    { text: "Early automated farms used steam-powered harvesters. They were loud, slow, and beloved. The robots of today are quieter. The farmers are louder." },
    { text: "RFS engineers released the Full Cycle Protocol last spring. Crops planted, watered, and harvested without human input. The inventors wept with joy." },
    { text: "BuPop quarterly earnings beat expectations. When asked for comment, their spokesperson said: 'Your harvest. Our profit.' Then smiled." },
    { text: "The Great Soil Survey of Year 12 found that over 60% of farmland responds best to consistent watering schedules. Robots have no concept of 'inconsistent.'" },
    { text: "A historian once wrote: 'The farming robot changed not what we grow, but how much we dare to grow.' That historian also owned RFS shares." },
    { text: "RFS's newest model, the Pro Unit, was designed in a wind tunnel. Its engineers insist this matters. We are taking their word for it." },
    { text: "Rust Bots were originally designed as post-harvest scavengers. Someone noticed they'd keep working indefinitely if you let them eat the crops." },
    { text: "BuPop's slogan — 'Your harvest. Our profit.' — polled surprisingly well among shareholders and poorly among everyone else." },
    { text: "The Robo Farm Gazette was founded on Day 1 of the first automated harvest season. We have not missed a day since." },
    { text: "It is said that the first farmer to fully automate their operation celebrated by sitting in a field and doing nothing. Progress." },
    { text: "RFS holds the patent on 'autonomous crop pathfinding.' They call it a breakthrough. The crops remain unimpressed." },
    { text: "Annual RFS report: robot deployment up 31%. Farmer complaints down 47%. Correlation suspected but not confirmed." },
    { text: "According to the Robo Farm Archives, the longest continuous robotic harvest lasted 400 days. The farmer slept through most of it." },
    { text: "BuPop's corporate philosophy is three words: scale, automate, extract. Their new marketing team has softened this to: 'Grow together.'" },
    { text: "The oldest crop strain in cultivation is wheat. It has been farmed for thousands of years. It still doesn't water itself. Get a robot." },
    { text: "RFS launched a Junior Farmer Initiative last year. So far, one participant. They have seventeen robots." },
    { text: "A local farmer named Earl built a robot out of old tractor parts. It didn't work, but people respected the effort." },
  ],

  /* TIPS — gameplay hints disguised as ads or advice columns */
  tips: [
    { text: "AD: TIRED OF WATERING? The Robot Farming Society reminds you: one Full Cycle bot covers an entire field. Ask about financing today!" },
    { text: "AD: RFS PRO UNIT — 14-tile work radius. Because some farmers think bigger. Available at your nearest equipment shop." },
    { text: "AD: RUST BOT — never charges, never quits. Just give it crops to eat. The Forever Bot. From RFS." },
    { text: "ADVICE CORNER: Tilling before planting is optional but strongly endorsed by every expert we've ever interviewed." },
    { text: "ADVICE CORNER: A robot full of crops isn't harvesting more crops. Send it home early. It knows the way." },
    { text: "ADVICE CORNER: Season transitions can shift crop prices. A diversified field rarely leaves you scrambling." },
    { text: "ADVICE CORNER: Your robots have a work radius. Place them where the fields are, not where they're convenient." },
    { text: "ADVICE CORNER: Selling in bulk unlocks better prices. Don't dribble out your harvest one carrot at a time." },
    { text: "AD: BUPOP INC. — Buy shares. Earn dividends daily. The more you sell, the more they profit. So do you. Ticker: BPOP." },
    { text: "AD: RFS SHARES — Every robot you deploy supports the Society. Own a piece of the future of farming. Ticker: RFS." },
    { text: "ADVICE CORNER: The hand tool lets you inspect tile status. Press H or 1. Knowledge is power, even on a farm." },
    { text: "ADVICE CORNER: Custom robot behaviors let you write your own automation logic. Find the option in the robot panel." },
    { text: "ADVICE CORNER: robot.memory persists between ticks. Build a state machine. Your robots will thank you — in crops." },
    { text: "AD: THE ROBO FARM EXCHANGE — Monitor crop prices. Time your sales. Don't just farm. Invest." },
    { text: "ADVICE CORNER: Rain waters all tilled tiles automatically. On rainy days, redirect your robots to harvest instead." },
    { text: "ADVICE CORNER: Sunflowers grow slowly but sell well. Consider dedicating a corner to the long game." },
    { text: "AD: BASIC BOT — 8-tile radius, 3 inventory slots, reliable as the sunrise. The RFS workhorse." },
    { text: "ADVICE CORNER: Coins don't grow themselves. Neither do crops, technically. Get robots. Both problems solved." },
    { text: "ADVICE CORNER: The economy panel tracks your 30-day income history. If the chart is flat, your robots need to move." },
    { text: "AD: RFS FINANCING — Can't afford the Pro Unit? Buy RFS shares instead. Perks unlock at 5, 15, 30, and 50 shares." },
  ],

  /* SEASONAL — filtered to current season, weighted 2× in selection */
  seasonal: {
    spring: [
      { text: "It's spring. The soil is soft, the light is long, and the planting window is wide open. Don't waste it." },
      { text: "Spring has arrived on the plains. Crop yields are optimal. RFS calls this 'the golden quarter.' Plant accordingly." },
      { text: "First bloom of the season spotted near the eastern fields. Your crops have opinions about being planted. Plant them anyway." },
      { text: "Spring means new growth. Also mud. Lots of mud. The robots don't mind. You might." },
    ],
    summer: [
      { text: "Summer heat settles in. Dry spells are common this time of year. Your irrigation strategy will be tested." },
      { text: "Long days, short nights. Perfect conditions for farming around the clock — if you have robots that don't sleep." },
      { text: "Peak growing season is underway. BuPop analysts are watching your harvest numbers. So are we." },
      { text: "Mid-summer report: crops thriving, rivers low, robots unaffected. The Gazette recommends expansion." },
    ],
    autumn: [
      { text: "Autumn is harvest time. The fields are ready. The question is whether your robots are keeping up." },
      { text: "Leaves are turning. So are crop prices. Autumn demand patterns favor root vegetables. Plan ahead." },
      { text: "The season is winding down. Make sure your fields are cleared before winter. The soil has a long memory." },
      { text: "Crisp air, golden fields, and one question: did you plant enough? The answer is probably no. It always is." },
    ],
    winter: [
      { text: "First day of winter. The soil sleeps, but your robots don't. Good time to expand those fields." },
      { text: "Cold snap expected. Crop growth slows in winter but doesn't stop entirely. Keep those robots moving." },
      { text: "Winter on the farm: quiet mornings, long evenings, and robots that operate at full capacity regardless of temperature." },
      { text: "Snow on the horizon. The Gazette reminds you: winter is for planning, spring is for planting, autumn is for regretting you didn't plan more." },
    ],
  },

  /* MILESTONE — condition checked against live state, fires at most 1 per edition */
  milestone: [
    { condition: s => s.coins >= 500  && s.coins < 1000,  text: "A local merchant reports seeing a promising new farm operation. Word is they've cracked 500 coins. Aspirational." },
    { condition: s => s.coins >= 1000 && s.coins < 5000,  text: "Word around town is your farm just hit 1000 coins. The big leagues are watching." },
    { condition: s => s.coins >= 5000 && s.coins < 20000, text: "Regional farming census: one operation here has crossed 5,000 coins. Analysts are calling it 'notable.'" },
    { condition: s => s.coins >= 20000,                   text: "Local economy buoyed by a single farm reporting over 20,000 coins. BuPop has sent a fruit basket." },
    { condition: s => s.robotCount >= 1 && s.robotCount < 3, text: "Automated farming spotted on a local property. One robot unit deployed. The future has officially started." },
    { condition: s => s.robotCount >= 3 && s.robotCount < 6, text: "Three robots is a workforce. Locals are starting to notice. One neighbor asked if you were 'going commercial.'" },
    { condition: s => s.robotCount >= 6,                     text: "Six or more robots on a single farm in our coverage area. The Gazette calls this: full automation. Congratulations." },
    { condition: s => s.day >= 10 && s.day < 20, text: "Ten days in. The hard part is behind you. The harder part is ahead. Keep going." },
    { condition: s => s.day >= 20 && s.day < 50, text: "Twenty days of farming. Most people quit by now. You haven't. The Gazette is quietly impressed." },
    { condition: s => s.day >= 50,               text: "Day fifty. Half a century of in-game days. The Gazette hereby awards you the honorary title of 'Serious Farmer.'" },
    { condition: s => s.rfsShares >= 5,   text: "RFS shareholder activity up in this region. Someone local has been buying in. The Board is pleased." },
    { condition: s => s.bupopShares >= 3, text: "BuPop Inc. reports new shareholder activity from a small farm in our coverage area. Welcome to the portfolio life." },
  ],

};
```

**Step 3: Verify entry count**

In DevTools console (after loading the game), run:
```js
const w = GAZETTE_POOL.weather.length;
const m = GAZETTE_POOL.market.length;
const l = GAZETTE_POOL.lore.length;
const t = GAZETTE_POOL.tips.length;
const s = Object.values(GAZETTE_POOL.seasonal).flat().length;
const mi = GAZETTE_POOL.milestone.length;
console.log(`Total: ${w+m+l+t+s+mi} (weather:${w} market:${m} lore:${l} tips:${t} seasonal:${s} milestone:${mi})`);
```
Expected: `Total: 100 (weather:16 market:16 lore:20 tips:20 seasonal:16 milestone:12)`

---

## Task 4: Add generateGazette() to gazette.js

**Files:**
- Modify: `gazette.js` — append after the content pool

**Step 1: Append the function**

```js
/* ─── generateGazette ─── */
function generateGazette(day, season, rainDay, coins, robotArr) {
  /* Day 1: fixed welcome edition */
  if (day === 1) {
    return [
      { category: 'WELCOME', text: "Welcome to Robo Farm. The land is yours. The tools are in the hotbar. The robots are optional — but highly recommended." },
      { category: 'GETTING STARTED', text: "Till the soil (hoe), plant seeds from your bag, then water. Or buy a robot and skip the watering entirely. Your call." },
      { category: 'FROM THE EDITORS', text: "The Gazette publishes every morning — weather, markets, the occasional rumor. We'll be here when you wake up. Good luck out there." },
    ];
  }

  const rng = _gazetteRng(day);
  const blurbs = [];

  /* 1. Weather (always 1) */
  const weatherPool = GAZETTE_POOL.weather.filter(e =>
    e.tag === 'any' || (rainDay ? e.tag === 'rain' : e.tag === 'clear')
  );
  blurbs.push({
    category: 'WEATHER',
    text: weatherPool[Math.floor(rng() * weatherPool.length)].text,
  });

  /* 2. Milestone (at most 1) */
  const state = {
    coins, day,
    robotCount: robotArr ? robotArr.length : 0,
    rfsShares:   (typeof COMPANIES !== 'undefined') ? COMPANIES.rfs.sharesOwned   : 0,
    bupopShares: (typeof COMPANIES !== 'undefined') ? COMPANIES.bupop.sharesOwned : 0,
  };
  const fired = GAZETTE_POOL.milestone.filter(m => m.condition(state));
  if (fired.length > 0) {
    blurbs.push({
      category: 'TOWN NEWS',
      text: fired[Math.floor(rng() * fired.length)].text,
    });
  }

  /* 3. Fill to 3 from seasonal (2× weight) + lore + tips + market */
  const seasonName = (typeof SEASONS !== 'undefined') ? SEASONS[season % SEASONS.length] : '';
  const seasonKey  = seasonName ? seasonName.toLowerCase() : '';
  const seasonalEntries = (GAZETTE_POOL.seasonal[seasonKey] || []).map(e => ({ ...e, _cat: 'SEASONAL' }));

  const fillPool = [
    ...seasonalEntries, ...seasonalEntries,            /* 2× seasonal weight */
    ...GAZETTE_POOL.lore.map(e   => ({ ...e, _cat: 'LORE'   })),
    ...GAZETTE_POOL.tips.map(e   => ({ ...e, _cat: 'NOTICE' })),
    ...GAZETTE_POOL.market.map(e => ({ ...e, _cat: 'MARKET' })),
  ];

  /* Fisher-Yates shuffle with seeded rng */
  const shuffled = [...fillPool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  /* Pick unique-text entries until we have 3 blurbs */
  for (const entry of shuffled) {
    if (blurbs.length >= 3) break;
    if (blurbs.some(b => b.text === entry.text)) continue;
    blurbs.push({ category: entry._cat, text: entry.text });
  }

  return blurbs;
}
```

**Step 2: Verify determinism in console**

Load game, then run:
```js
const a = generateGazette(5, 0, false, 200, []);
const b = generateGazette(5, 0, false, 200, []);
console.log(JSON.stringify(a) === JSON.stringify(b)); // must be true
console.log(generateGazette(5, 0, false, 200, []) !== generateGazette(6, 0, false, 200, [])); // true (different days differ)
```

Expected: both `true`.

---

## Task 5: Add showGazette() and closeGazette() to gazette.js

**Files:**
- Modify: `gazette.js` — append after `generateGazette`

**Step 1: Append the show/close functions**

```js
/* ─── Show / Close ─── */
function showGazette() {
  const blurbs = generateGazette(day, season, rainDay, coins, robots);

  document.getElementById('gazette-day').textContent     = day;
  document.getElementById('gazette-season').textContent  = SEASONS[season % SEASONS.length];
  document.getElementById('gazette-weather').textContent = rainDay ? '🌧 Rainy' : '☀️ Clear';

  const body = document.getElementById('gazette-body');
  body.innerHTML = '';
  for (const blurb of blurbs) {
    const div = document.createElement('div');
    div.className = 'gazette-blurb';
    div.innerHTML =
      `<span class="gazette-cat">${blurb.category}</span>` +
      `<p class="gazette-text">${blurb.text}</p>`;
    body.appendChild(div);
  }

  const overlay = document.getElementById('gazette-overlay');
  overlay.classList.remove('hidden');
  /* small rAF delay so the transition fires after display:flex is applied */
  requestAnimationFrame(() => overlay.classList.add('visible'));
  document.body.classList.add('show-system-cursor');
}

function closeGazette() {
  const overlay = document.getElementById('gazette-overlay');
  overlay.classList.remove('visible');
  overlay.classList.add('hidden');
  document.body.classList.remove('show-system-cursor');
  if (typeof syncCursorMode === 'function') syncCursorMode();
}
```

**Step 2: Smoke-test in console**

Load game to playing state, then run `showGazette()`. The gazette should fade in centered on screen with the correct day/season/weather header and 2–3 blurbs. Click "Continue ▸" — gazette should close. System cursor should disappear.

---

## Task 6: Wire loop.js — show gazette after day banner fades

**Files:**
- Modify: `loop.js` lines 64–69 (the `S.display.showDayBanner` block)

**Step 1: Read the current block**

```js
if (S.display.showDayBanner !== false) {
  const bannerEl = document.getElementById('day-banner');
  document.getElementById('day-banner-text').textContent = `Day ${day}`;
  document.getElementById('day-banner-sub').textContent = `${SEASONS[season]} • ${rainDay ? '🌧 Rainy Day' : '☀️ Clear Day'}`;
  bannerEl.classList.add('show');
  setTimeout(() => bannerEl.classList.remove('show'), 2500);
}
```

**Step 2: Replace just the setTimeout line**

Change `setTimeout(() => bannerEl.classList.remove('show'), 2500);` to:

```js
setTimeout(() => {
  bannerEl.classList.remove('show');
  setTimeout(() => { if (typeof showGazette === 'function') showGazette(); }, 500);
}, 2500);
```

The banner fades out over 500 ms (`transition: opacity 0.5s`); the gazette appears exactly when it finishes.

**Step 3: Verify the timing in browser**

Let a day tick over (or in console: `tick = TPDAY - 1`). Observe: day banner shows → fades → gazette appears. No overlap.

---

## Task 7: Handle ESC in input.js

**Files:**
- Modify: `input.js` lines 31–39 (the `Escape` branch)

**Step 1: Read the current Escape block**

```js
else if (e.code === 'Escape') {
  const hasOpenModal = !!document.querySelector('.modal-overlay:not(.hidden)');
  if (hasOpenModal) {
    closeAllModals();
    cancelAssign();
  } else if (typeof menuHandleEscape === 'function') {
    menuHandleEscape();
  }
}
```

**Step 2: Prepend gazette check**

Replace with:

```js
else if (e.code === 'Escape') {
  const gazetteEl = document.getElementById('gazette-overlay');
  if (gazetteEl && !gazetteEl.classList.contains('hidden')) {
    if (typeof closeGazette === 'function') closeGazette();
  } else {
    const hasOpenModal = !!document.querySelector('.modal-overlay:not(.hidden)');
    if (hasOpenModal) {
      closeAllModals();
      cancelAssign();
    } else if (typeof menuHandleEscape === 'function') {
      menuHandleEscape();
    }
  }
}
```

**Step 3: Verify ESC behavior**

- Open gazette → press ESC → gazette closes, no menu opens. ✓
- Open gazette → close with "Continue ▸" → ESC does nothing (no gazette). ✓
- Open shop modal → press ESC → shop closes (existing behavior unchanged). ✓

---

## Task 8: Add gazette.js script tag to index.html

**Files:**
- Modify: `index.html` — the script block starting around line 777

**Step 1: Locate the script block**

```html
<script src="loop.js"></script>
<script src="ui.js"></script>
```

**Step 2: Insert gazette.js between loop.js and ui.js**

```html
<script src="loop.js"></script>
<script src="gazette.js"></script>
<script src="ui.js"></script>
```

Rationale: All globals (`day`, `season`, `rainDay`, `coins`, `robots`, `COMPANIES`, `SEASONS`) are defined by the time the game starts ticking; the script load position is for clarity, not dependency ordering.

**Step 3: Verify load**

Open browser DevTools → Network tab. Confirm `gazette.js` loads with 200 status. In console: `typeof generateGazette` should return `"function"`.

---

## Task 9: End-to-end verification

No automated test suite exists — verify manually in browser.

**Checklist:**

1. **Day 1 welcome edition**: Start a new game. On Day 2 tick-over, the gazette shows welcome content (not the regular pool).
   - Actually Day 1 is the starting day. Advance to Day 2 (`tick = TPDAY - 1` in console) → gazette shows the welcome edition (categories: WELCOME / GETTING STARTED / FROM THE EDITORS).

2. **Regular edition**: Advance to Day 3. Gazette shows 3 blurbs, always starts with WEATHER category.

3. **Determinism**: Reload page, load same save, advance to same day. Gazette shows identical content.

4. **Rain day**: Force a rainy day (`rainDay = true`) and advance day. Weather blurb should be a rain-tagged entry.

5. **Milestone fires**: Set `coins = 1500` in console, advance a day. "TOWN NEWS" blurb should appear about hitting 1000 coins.

6. **ESC dismiss**: While gazette is open, press ESC → gazette closes, no menu. ✓

7. **Click backdrop**: While gazette is open, click outside the card → closes. ✓

8. **No save-load ghost**: Load a mid-game save. Gazette should NOT appear on load (only on tick-triggered day transitions). ✓

9. **Existing modals unbroken**: Open shop (E), robots (R), inventory (I). Press ESC to close each. All work as before. ✓

10. **Day banner still shows**: Day banner appears, fades, THEN gazette appears. They don't overlap. ✓

---

## Task 10: Commit

```bash
git add gazette.js index.html style.css loop.js input.js
git commit -m "feat: add Daily Gazette overlay — newspaper shown each new day"
```
