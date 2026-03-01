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
  document.body.classList.remove('show-system-cursor');
  if (typeof syncCursorMode === 'function') syncCursorMode();
  setTimeout(() => overlay.classList.add('hidden'), 370);
}
