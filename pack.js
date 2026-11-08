// ---------- Nieuwe cijfers als FC-pack ----------
// Volgorde zoals een walkout: pack openscheuren → vuurpijl in de kleur van de kaart → het vak
// (in plaats van het land) → de positie → de kaart met de speler, het cijfer en een zin.
// Welke cijfers je al geopend hebt, onthoudt alleen dit venster.

const PACK_KEY = 'pack-opened';

function openedSet() {
  try {
    const raw = localStorage.getItem(PACK_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return null;
}

function saveOpened(set) {
  try { localStorage.setItem(PACK_KEY, JSON.stringify([...set])); } catch {}
}

// Nieuwe cijfers. De app toont alleen cijfers die nu nog meetellen (dit schooljaar, en in het
// examenjaar de gemiddelden van vorig jaar), dus die zijn de eerste keer allemaal een pack.
function newGrades() {
  let opened = openedSet();
  if (!opened) {
    opened = new Set();
    saveOpened(opened);
  }
  return grades.filter((g) => !opened.has(g.id)).sort((a, b) => new Date(a.datum) - new Date(b.datum));
}
window.packOpened = () => { newGrades(); return openedSet() || new Set(); };

function updatePackButton() {
  const fresh = newGrades();
  $('#pack-count').hidden = !fresh.length;
  $('#pack-count').textContent = fresh.length;
  $('#pack-sub').textContent = fresh.length
    ? `${fresh.length} ${fresh.length === 1 ? 'nieuw pack' : 'nieuwe packs'} – open ze!`
    : 'Geen nieuwe cijfers. Bekijk je laatste kaart nog een keer';
  $('#open-pack').classList.toggle('has-new', fresh.length > 0);
}
window.updatePackButton = updatePackButton;

const SENTENCES = {
  toty: ['Wereldklasse! Dit cijfer gaat rechtstreeks het Team of the Year in. 🏆', 'Ballon d’Or-niveau. Hier kan niemand tegenop.', 'Legendarisch. Deze kaart verkoop je nooit meer.'],
  rare: ['Topkaart! Hiermee ga je naar de Champions League.', 'Man of the Match. Je speelde de wedstrijd van je leven.', 'Scoutingsrapport: absolute uitblinker.'],
  gold: ['Goud! Sterke basisspeler, hier bouw je een team mee.', 'Solide prestatie, de trainer is tevreden.', 'Lekker gespeeld, deze kaart blijft in je selectie.'],
  silver: ['Zilver: betrouwbaar, maar er zit nog meer in.', 'Voldoende! De punten zijn binnen.', 'Prima invaller. Volgende keer een basisplaats pakken!'],
  bronze: ['Op het nippertje gewonnen in de blessuretijd. 😅', 'Brons, maar de punten tellen toch. Door naar de volgende!', 'Net boven de streep. Volle gas door!'],
  red: ['Rode kaart… maar elke topspeler heeft weleens een slechte wedstrijd. Revanche bij de volgende!', 'Deze wedstrijd ging verloren. Tijd voor extra training! 💪', 'Even op de bank, maar je comeback komt eraan.'],
};
const sentenceFor = (c) => SENTENCES[c.tier.id][hashOf('zin' + c.g.id) % 3];
const WALKOUT = ['toty', 'rare', 'gold']; // vanaf goud een volledige walkout met vuurwerk

// ---------- Geluid (zelf gemaakt met de Web Audio API, geen bestanden nodig) ----------
let audio = null;
const muted = () => { try { return localStorage.getItem('pack-muted') === '1'; } catch { return false; } };
function ctx() {
  if (muted()) return null;
  audio ||= new (window.AudioContext || window.webkitAudioContext)();
  return audio;
}
function tone(freq, dur, type = 'sine', vol = 0.15, slideTo = null, delay = 0) {
  const a = ctx(); if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator(); const g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur);
}
function noise(dur, vol = 0.2, delay = 0) {
  const a = ctx(); if (!a) return;
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = a.createBufferSource(); const f = a.createBiquadFilter(); const g = a.createGain();
  f.type = 'bandpass'; f.frequency.value = 1200; g.gain.value = vol;
  s.buffer = buf; s.connect(f).connect(g).connect(a.destination); s.start(a.currentTime + delay);
}
const sfx = {
  rip: () => { noise(0.35, 0.35); tone(180, 0.3, 'sawtooth', 0.05, 60); },
  whoosh: () => { noise(0.8, 0.15); tone(200, 0.8, 'sine', 0.08, 900); },
  boom: () => { tone(110, 0.9, 'sine', 0.35, 35); noise(0.25, 0.2); },
  reveal: (tier) => {
    const notes = tier === 'red' ? [330, 262] : tier === 'bronze' || tier === 'silver' ? [392, 523] : [523, 659, 784, 1047];
    notes.forEach((n, i) => tone(n, 0.5, 'triangle', 0.12, null, i * 0.11));
  },
  tick: () => tone(1200, 0.05, 'square', 0.03),
};

// ---------- Schermen ----------
let queue = [];
let opened = [];
let step = null;
let timer = null;
let current = null;
let packTotal = 0;

function openPack() {
  const fresh = newGrades();
  if (fresh.length) queue = fresh;
  else {
    const last = [...grades].sort((a, b) => new Date(b.datum) - new Date(a.datum))[0];
    if (!last) return;
    queue = [last];
  }
  opened = [];
  packTotal = queue.length;
  // Vaste lagen: achtergrond (lichtstralen) en effecten blijven staan; alleen de scène wisselt.
  $('#pack-stage').innerHTML = '<div class="pk-bg"><div class="pk-rays"></div><div class="pk-floor"></div></div><div class="pk-fx"></div>';
  $('#pack').showModal();
  $('#pack-mute').textContent = muted() ? '🔇' : '🔊';
  showPack();
}

// Nieuwe scène die zacht over de vorige heen vloeit (geen harde wissel).
function stage(html, mode, tier) {
  const el = $('#pack-stage');
  el.dataset.mode = mode;
  el.dataset.tier = tier || '';
  el.querySelectorAll('.pk-scene:not(.leaving)').forEach((old) => {
    old.classList.add('leaving');
    setTimeout(() => old.remove(), 400);
  });
  const scene = document.createElement('div');
  scene.className = 'pk-scene';
  scene.innerHTML = html;
  el.appendChild(scene);
  return scene;
}
const fx = () => $('#pack-stage .pk-fx');

function later(fn, ms) { clearTimeout(timer); timer = setTimeout(fn, ms); }

// 1. Het dichte pack
function showPack() {
  step = 'pack';
  current = cardOf(queue[0]);
  fx().innerHTML = '';
  stage(`
    <div class="pk-pack">
      <div class="pk-pack-flap"></div>
      <div class="pk-pack-foil"></div>
      <div class="pk-pack-shine"></div>
      <span class="fc-logo big">FC</span>
      <div class="pk-pack-title">CIJFER PACK</div>
      <div class="pk-pack-sub">1 SPELER · ${esc(current.g.vak.toUpperCase())}</div>
    </div>
    ${packTotal > 1 ? `<div class="pk-dots">${Array.from({ length: packTotal }, (_, i) => `<i class="${i < packTotal - queue.length ? 'done' : i === packTotal - queue.length ? 'now' : ''}"></i>`).join('')}</div>` : ''}
    <p class="pk-hint">${packTotal > 1 ? `Pack ${packTotal - queue.length + 1} van ${packTotal} · ` : ''}${matchMedia('(pointer: coarse)').matches ? 'Tik om te openen' : 'Klik of druk op spatie om te openen'}</p>
    ${queue.length > 1 ? `<div class="pk-actions"><button class="pk-btn" data-act="all">⚡ Alle ${queue.length} packs in één keer openen</button></div>` : ''}`, 'pack', '');
}

// Alles in één keer: meteen alle kaarten in het overzicht.
function openAll() {
  clearTimeout(timer);
  const set = openedSet() || new Set();
  for (const g of queue) {
    const c = cardOf(g);
    set.add(g.id);
    opened.push(c);
    window.utReward?.(c);
  }
  queue = [];
  saveOpened(set);
  updatePackButton();
  sfx.boom();
  setTimeout(() => sfx.reveal(opened.some((c) => WALKOUT.includes(c.tier.id)) ? 'gold' : 'silver'), 300);
  showSummary();
}

// 2. Openscheuren + vuurpijl
function ripPack() {
  step = 'rip';
  const el = $('#pack-stage');
  el.dataset.tier = current.tier.id; // de kleur van het licht verraadt al iets…
  el.querySelector('.pk-scene:not(.leaving) .pk-pack').classList.add('opening');
  el.querySelector('.pk-scene:not(.leaving) .pk-hint').textContent = '';
  sfx.rip();
  later(showFlare, 1300);
}

function showFlare() {
  step = 'flare';
  const walk = WALKOUT.includes(current.tier.id);
  stage('<div class="pk-flash"></div><div class="pk-flare"></div>', 'flare', current.tier.id);
  sfx.whoosh();
  if (walk) { setTimeout(sfx.boom, 900); fireworks(fx(), current.tier.id === 'toty' ? 4 : 2); }
  later(showVak, walk ? 2200 : 1200);
}

// 3. Het vak, zoals het land bij een walkout
function showVak() {
  step = 'vak';
  stage(`
    <div class="pk-reveal">
      <div class="pk-label">VAK</div>
      <div class="pk-big-icon">${vakIcon(current.g.vak)}</div>
      <div class="pk-big-text">${esc(vakKort(current.g.vak))}</div>
    </div>`, 'walkout', current.tier.id);
  sfx.tick();
  later(showPosition, WALKOUT.includes(current.tier.id) ? 2300 : 1500);
}

// 4. De positie van de speler
function showPosition() {
  step = 'positie';
  const p = current.player;
  stage(`
    <div class="pk-reveal">
      <div class="pk-label">POSITIE</div>
      <div class="pk-pos">${p.pos}</div>
      <div class="pk-big-text small">${POS_NAMES[p.pos]}</div>
      <div class="pk-sub">${esc(current.g.omschrijving || 'Toets')} · weging ${current.g.weging}</div>
    </div>`, 'walkout', current.tier.id);
  sfx.tick();
  later(showSilhouette, WALKOUT.includes(current.tier.id) ? 2300 : 1500);
}

// 5. Silhouet van de speler terwijl de rating omhoog telt
function showSilhouette() {
  step = 'silhouet';
  const c = current;
  const el = stage(`
    <div class="pk-reveal pk-sil-wrap">
      <div class="pk-sil">${avatarSVG(c.player, '#000', 'lach', '')}</div>
      <div class="pk-count">0</div>
    </div>`, 'walkout', c.tier.id);
  const out = el.querySelector('.pk-count');
  const start = performance.now();
  const dur = WALKOUT.includes(c.tier.id) ? 1500 : 900;
  const tick = (t) => {
    if (!out.isConnected) return;
    const k = Math.min(1, (t - start) / dur);
    out.textContent = Math.round(c.ovr * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(tick); else sfx.tick();
  };
  requestAnimationFrame(tick);
  later(showCard, dur + 1200);
}

// 5. De kaart: eerst de achterkant, dan omdraaien
function showCard() {
  clearTimeout(timer);
  step = 'kaart';
  const c = current;
  const more = queue.length - 1;
  const el = stage(`
    <div class="pk-card-flip">
      <div class="pk-card-back"><span class="fc-logo big">FC</span></div>
      <div class="pk-card-front">${cardHTML(c, 'lg')}</div>
    </div>
    <div class="pk-player">
      <div class="pk-player-name">${esc(c.player.naam)}</div>
      <div class="pk-player-bio">“${esc(c.player.bio)}”</div>
    </div>
    <p class="pk-sentence"></p>
    <p class="pk-reward" hidden></p>
    <div class="pk-actions">
      ${more ? `<button class="pk-btn primary" data-act="next">Volgende pack (${more})</button>` : ''}
      ${!more && opened.length ? `<button class="pk-btn primary" data-act="summary">Bekijk alle ${opened.length + 1} kaarten</button>` : ''}
      <button class="pk-btn" data-act="team">Naar Ultimate Team</button>
      <button class="pk-btn" data-act="close">${more ? 'Stoppen' : 'Klaar'}</button>
    </div>`, 'card', c.tier.id);

  // Dit cijfer is nu geopend en zit in je club.
  const set = openedSet() || new Set();
  set.add(c.g.id);
  saveOpened(set);
  opened.push(c);
  updatePackButton();
  // Munten voor de transfermarkt (één keer per cijfer).
  const reward = window.utReward?.(c) || 0;
  if (reward) {
    const r = el.querySelector('.pk-reward');
    r.textContent = `+ 🪙 ${reward.toLocaleString('nl-NL')} munten voor de transfermarkt`;
    r.hidden = false;
  }

  setTimeout(() => {
    sfx.reveal(c.tier.id);
    if (WALKOUT.includes(c.tier.id)) confetti(fx(), c.tier.id === 'toty' ? 90 : 50);
  }, 1100);
  typeText(el.querySelector('.pk-sentence'), sentenceFor(c), 1700);
}

// 6. Overzicht van alle geopende kaarten
function showSummary() {
  step = 'summary';
  const best = [...opened].sort((a, b) => b.ovr - a.ovr)[0];
  stage(`
    <div class="pk-summary">
      <h2>Je pack-resultaat</h2>
      <p class="pk-sub">Beste kaart: <b>${esc(best.player.naam)}</b> (${best.ovr})</p>
      <div class="pk-summary-cards">${opened.map((c) => cardHTML(c, 'md')).join('')}</div>
      <div class="pk-actions">
        <button class="pk-btn primary" data-act="team">Naar Ultimate Team</button>
        <button class="pk-btn" data-act="close">Klaar</button>
      </div>
    </div>`, 'summary', best.tier.id);
}

function typeText(el, text, delay) {
  let i = 0;
  const tick = () => {
    if (!el.isConnected) return;
    el.textContent = text.slice(0, ++i);
    if (i < text.length) setTimeout(tick, 26);
  };
  setTimeout(tick, delay);
}

// Confetti en vuurwerk: posities en kleuren via JS (inline styles zijn geblokkeerd door de beveiliging).
function confetti(box, n) {
  const colors = ['#ffd43b', '#ffffff', '#74c0fc', '#ff8787', '#69db7c', '#e599f7'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'cf';
    s.style.left = `${Math.random() * 100}%`;
    s.style.background = colors[i % colors.length];
    s.style.animationDelay = `${Math.random() * 0.8}s`;
    s.style.animationDuration = `${2 + Math.random() * 1.8}s`;
    box.appendChild(s);
  }
}

function fireworks(box, bursts) {
  for (let b = 0; b < bursts; b++) {
    const x = 20 + Math.random() * 60;
    const y = 15 + Math.random() * 40;
    for (let i = 0; i < 22; i++) {
      const s = document.createElement('span');
      s.className = 'fw';
      const angle = (i / 22) * Math.PI * 2;
      const dist = 80 + Math.random() * 70;
      s.style.left = `${x}%`;
      s.style.top = `${y}%`;
      s.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      s.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
      s.style.animationDelay = `${0.8 + b * 0.35}s`;
      box.appendChild(s);
    }
  }
}

function closePack() {
  clearTimeout(timer);
  step = null;
  $('#pack').close();
}

$('#open-pack').addEventListener('click', openPack);
$('#pack-mute').addEventListener('click', (e) => {
  e.stopPropagation();
  try { localStorage.setItem('pack-muted', muted() ? '0' : '1'); } catch {}
  e.target.textContent = muted() ? '🔇' : '🔊';
});

$('#pack').addEventListener('click', (e) => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'close') return closePack();
  if (act === 'next') { queue.shift(); return showPack(); }
  if (act === 'summary') return showSummary();
  if (act === 'all') return openAll();
  if (act === 'team') {
    closePack();
    document.querySelector('#tabs [data-tab="ut"]').click();
    return;
  }
  // Klikken = verder, of een stap van de walkout overslaan.
  if (step === 'pack') ripPack();
  else if (step === 'flare') showVak();
  else if (step === 'vak') showPosition();
  else if (step === 'positie') showSilhouette();
  else if (step === 'silhouet') showCard();
});
// Spatie of pijltje rechts = verder.
$('#pack').addEventListener('keydown', (e) => {
  if (![' ', 'ArrowRight'].includes(e.key) || !['pack', 'flare', 'vak', 'positie', 'silhouet'].includes(step)) return;
  e.preventDefault();
  $('#pack-stage').click();
});

$('#pack').addEventListener('cancel', () => { clearTimeout(timer); step = null; });
