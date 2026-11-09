// ---------- Wedstrijden: elke dag één potje, en een superwedstrijd als je goed bezig bent ----------
// Je speelt met je opstelling uit "Mijn team" tegen een willekeurig team. De wedstrijd wordt live gesimuleerd:
// een klok tot 90 minuten plus blessuretijd, kansen, goals, overtredingen en kaarten. In de rust kun je wisselen.
// Superwedstrijd: speel je op 5 van de laatste 7 dagen en win je er 5, dan mag je tegen een topteam voor veel munten.

const MATCH_KEY = 'ut-matches';
const REWARD = { W: 600, D: 250, L: 80, goal: 40, superW: 7500, superD: 2000, superL: 300 };
const OPP_NAMES = ['Sporting Polderstad', 'Dynamo Duinwijk', 'Atlético Achterhoek', 'Olympia Waddenzee', 'Racing Rijnmond', 'Inter IJssel',
  'Celtic Kempen', 'AS Veluwe', 'Spartak Schelde', 'Real Randstad', 'Lokomotiv Lauwersmeer', 'Union Utrechtse Heuvelrug', 'FC Flevopolder',
  'Viktoria Venlo-Noord', 'Juventus Zeeland', 'Benfica Betuwe', 'Galatasaray Gouda', 'Ajax Amsterdam-Noord', 'Borussia Bommelerwaard'];
const OPP_COLORS = [['#0f5132', '#ffd166'], ['#3a0ca3', '#ffffff'], ['#9d0208', '#ffffff'], ['#023e8a', '#90e0ef'], ['#212529', '#e9c46a'],
  ['#6a040f', '#f4a261'], ['#2b9348', '#ffffff'], ['#003049', '#fcbf49'], ['#5a189a', '#f72585'], ['#14213d', '#fca311']];
const SUPER_NAME = 'Galácticos XI';

const readM = () => { try { return JSON.parse(localStorage.getItem(MATCH_KEY) || '[]'); } catch { return []; } };
const writeM = (l) => { try { localStorage.setItem(MATCH_KEY, JSON.stringify(l.slice(-60))); } catch {} window.cloudSave?.(); };
const dayStr = (off = 0) => { const d = new Date(); d.setDate(d.getDate() - off); return d.toLocaleDateString('sv-SE'); };
// Achternaam zoals een commentator hem zegt: "van Dijk", "de Jong", "Mbappé"; één naam blijft één naam.
function lastName(n) {
  const w = n.replace(/ Jr$/, '').split(' ');
  if (w.length === 1) return n;
  const k = w.findIndex((x, idx) => idx > 0 && /^(van|de|der|den|ter|da|dos|el)$/i.test(x));
  return k > 0 ? w.slice(k).join(' ') : w[w.length - 1];
}

function superStatus() {
  const list = readM();
  const week = new Set(Array.from({ length: 7 }, (_, i) => dayStr(i)));
  const normal = list.filter((m) => !m.super && week.has(m.d));
  const days = new Set(normal.map((m) => m.d)).size;
  const wins = normal.filter((m) => m.res === 'W').length;
  const usedSuper = list.some((m) => m.super && week.has(m.d));
  return { days, wins, unlocked: days >= 5 && wins >= 5 && !usedSuper, usedSuper };
}
const playedToday = () => readM().some((m) => !m.super && m.d === dayStr());
window.utPlayedToday = playedToday;

// ---------- Teamsterkte ----------
function effOvr(c, slot, chem) {
  if (!c) return 30;
  const exact = inPosition(slot, c);
  const fits = FITS[slotPos(slot)].includes(c.player.pos);
  const pen = exact ? 0 : fits ? 4 : 12;
  return (c.ovr - pen) * (0.92 + 0.08 * (chem ?? 0) / 3);
}
// Plekken in de huidige opstelling met een van deze posities.
const slotIds = (posList) => SLOTS.filter((s) => posList.includes(slotPos(s))).map((s) => s.id);
function lineStrength(side) {
  const by = (ids) => ids.map((id) => side.eff[id]).filter((x) => x != null);
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 30);
  const off = side.out; // spelers met rood ontbreken
  const att = avg(by(slotIds(['ST', 'LW', 'RW', 'CAM']).filter((id) => !off.has(id))));
  const mid = avg(by(slotIds(['CM', 'CAM'])));
  const def = avg(by(slotIds(['CB', 'LB', 'RB'])));
  const gk = side.eff.GK ?? 30;
  const short = off.size * 4; // elke rode kaart kost sterkte over het hele veld
  return { att: att - short, mid: mid - short, def: def - short, gk: gk - off.has('GK') * 20 };
}
function makeSide(name, colors, cards, chem, bench, isUser) {
  const eff = {};
  for (const s of SLOTS) eff[s.id] = effOvr(cards[s.id], s, chem?.[s.id]);
  return { name, colors, cards: { ...cards }, chem: chem || {}, bench: bench || [], eff, out: new Set(), yellow: {}, goals: 0, shots: 0, onTarget: 0, poss: 0, subs: 0, isUser };
}
function recalc(side) {
  side.chem = chemistry(side.cards);
  for (const s of SLOTS) side.eff[s.id] = side.out.has(s.id) ? null : effOvr(side.cards[s.id], s, side.chem[s.id]);
}

// Tegenstander: per positie een echte speler rond de doelrating.
function opponent(target, isSuper, seed) {
  const rnd = seeded(seed);
  const used = new Set();
  const cards = {};
  const pool = isSuper ? FOOTBALLERS.filter((p) => p.base >= 86) : FOOTBALLERS.filter((p) => p.club !== 'ICON');
  for (const s of SLOTS) {
    const want = slotPos(s) === 'CAM' ? ['CAM', 'CM'] : [slotPos(s)];
    let cands = [];
    for (let d = 2; d <= 14 && cands.length < 3; d += 2) cands = pool.filter((p) => want.includes(p.pos) && Math.abs(p.base - (target + (rnd() * 4 - 2))) <= d && !used.has(p.key));
    if (!cands.length) cands = pool.filter((p) => want.includes(p.pos) && !used.has(p.key));
    const p = cands[Math.floor(rnd() * cands.length)];
    used.add(p.key);
    cards[s.id] = cardOf({ id: 'opp-' + p.key, vak: '', transfer: true, player: p });
  }
  const name = isSuper ? SUPER_NAME : OPP_NAMES[Math.floor(rnd() * OPP_NAMES.length)];
  const colors = isSuper ? ['#f4f4f4', '#b08d3c'] : OPP_COLORS[Math.floor(rnd() * OPP_COLORS.length)];
  return { name, colors, cards };
}

// ---------- Overzicht (tab Wedstrijden) ----------
function renderMatches() {
  const st = window.utTeamState();
  const sup = superStatus();
  const full = Object.keys(st.cards).length === 11;
  const today = playedToday();
  const hist = readM().slice().reverse().slice(0, 10);
  $('#mt-today').innerHTML = `
    <div class="mt-card">
      <div class="mt-kicker">Dagwedstrijd</div>
      <h3>${today ? 'Vandaag gespeeld' : 'Je wedstrijd van vandaag staat klaar'}</h3>
      <p class="hint">${today ? 'Morgen kun je weer spelen.' : `Tegen een willekeurige tegenstander rond jouw teamrating (${st.ovr}). Winst: ${REWARD.W} munten, gelijk: ${REWARD.D}, verlies: ${REWARD.L}, plus ${REWARD.goal} per goal.`}</p>
      <button id="mt-play" ${today || !full ? 'disabled' : ''}>${!full ? 'Zet eerst 11 spelers in je team' : today ? 'Al gespeeld' : 'Speel wedstrijd'}</button>
    </div>
    <div class="mt-card super ${sup.unlocked ? 'open' : ''}">
      <div class="mt-kicker">Superwedstrijd</div>
      <h3>${sup.unlocked ? 'Ontgrendeld! Speel tegen de Galácticos' : sup.usedSuper ? 'Deze week al gespeeld' : 'Speel en win 5 van de 7 dagen'}</h3>
      <div class="mt-week">${Array.from({ length: 7 }, (_, i) => { const m = readM().find((x) => !x.super && x.d === dayStr(6 - i)); return `<span class="${m ? m.res : ''}" title="${dayStr(6 - i)}">${m ? m.res : ''}</span>`; }).join('')}</div>
      <p class="hint">${sup.days}/7 dagen gespeeld · ${sup.wins}/5 gewonnen. Winst levert ${fmtCoins(REWARD.superW)} munten op.</p>
      <button id="mt-super" ${sup.unlocked && full ? '' : 'disabled'}>${sup.unlocked ? 'Speel superwedstrijd' : 'Nog niet beschikbaar'}</button>
    </div>`;
  $('#mt-history').innerHTML = hist.map((m) => `<div class="mt-hist ${m.res}"><b>${m.res === 'W' ? 'Winst' : m.res === 'D' ? 'Gelijk' : 'Verlies'}</b>
      <span>${m.gf} - ${m.ga} tegen ${esc(m.opp)}${m.super ? ' (super)' : ''}</span><span class="hint">${new Date(m.d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} · +${fmtCoins(m.coins)}</span></div>`).join('')
    || '<p class="hint">Nog geen wedstrijden gespeeld.</p>';
  $('#mt-play')?.addEventListener('click', () => startMatch(false));
  $('#mt-super')?.addEventListener('click', () => startMatch(true));
}
window.renderMatches = renderMatches;

// ---------- De wedstrijd ----------
let M = null;
function startMatch(isSuper) {
  const st = window.utTeamState();
  if (Object.keys(st.cards).length < 11) return;
  if (!isSuper && playedToday()) return;
  if (isSuper && !superStatus().unlocked) return;
  const naam = ($('#hello')?.textContent.match(/Hoi (.+?)!/) || [])[1];
  const target = isSuper ? 89 : Math.max(55, st.ovr + Math.round(Math.random() * 7 - 4));
  const opp = opponent(target, isSuper, `${dayStr()}-${isSuper ? 'super' : 'dag'}-${Math.random()}`);
  const user = makeSide(naam ? `FC ${naam}` : 'Jouw team', ['#1e3a8a', '#f36c21'], st.cards, st.chem, st.bench, true);
  const them = makeSide(opp.name, opp.colors, opp.cards, null, [], false);
  recalc(them);
  M = { isSuper, user, them, min: 0, half: 1, added: [1 + Math.floor(Math.random() * 4), 2 + Math.floor(Math.random() * 5)], speed: 1, feed: [], ball: 50, timer: null, done: false };
  openMatchUI();
  intro();
}

function openMatchUI() {
  const el = document.createElement('div');
  el.id = 'match';
  el.innerHTML = `<div class="mx-stage"></div>`;
  document.body.appendChild(el);
  document.body.classList.add('match-open');
}
function closeMatch() {
  clearTimeout(M?.timer);
  $('#match')?.remove();
  document.body.classList.remove('match-open');
  M = null;
  renderMatches();
  updateCoinDisplays();
}
const mxStage = (html) => { $('#match .mx-stage').innerHTML = html; };
const crest = (side) => `<span class="mx-crest" data-c1="${side.colors[0]}" data-c2="${side.colors[1]}">${esc(side.name.split(' ').map((w) => w[0]).join('').slice(0, 3))}</span>`;
function paintCrests() { document.querySelectorAll('#match .mx-crest').forEach((e) => { e.style.background = e.dataset.c1; e.style.color = e.dataset.c2; e.style.borderColor = e.dataset.c2; }); }

// Intro: de tegenstander komt binnen, kaart voor kaart.
function intro() {
  const t = M.them;
  const order = [...SLOTS].sort((a, b) => b.y - a.y || a.x - b.x).map((s) => s.id);
  mxStage(`<div class="mx-intro ${M.isSuper ? 'super' : ''}">
    <div class="mx-intro-head">${crest(t)}<div><div class="mx-kicker">${M.isSuper ? 'Superwedstrijd' : 'Je tegenstander'}</div><h2>${esc(t.name)}</h2>
      <div class="mx-vs">Rating ${teamRating(Object.values(t.cards))} <span>vs</span> jouw team ${teamRating(Object.values(M.user.cards))}</div></div></div>
    <div class="mx-lineup">${order.map((id, i) => `<div class="mx-in" data-i="${i}">${cardHTML(t.cards[id], 'sm')}</div>`).join('')}</div>
    <button id="mx-kickoff" class="mx-go" disabled>Aftrap</button>
  </div>`);
  paintCrests();
  document.querySelectorAll('#match .mx-in').forEach((el) => { el.style.animationDelay = `${0.15 + el.dataset.i * 0.18}s`; });
  setTimeout(() => { const b = $('#mx-kickoff'); if (b) { b.disabled = false; b.focus(); } }, 2300);
  $('#mx-kickoff').addEventListener('click', liveView);
}

function liveView() {
  mxStage(`<div class="mx-live">
    <div class="mx-score">
      <div class="mx-team">${crest(M.user)}<b>${esc(M.user.name)}</b></div>
      <div class="mx-mid"><div class="mx-goals"><span id="mx-gu">0</span><i>-</i><span id="mx-gt">0</span></div><div class="mx-clock" id="mx-clock">0'</div></div>
      <div class="mx-team right">${crest(M.them)}<b>${esc(M.them.name)}</b></div>
    </div>
    <div class="mx-pitch"><div class="mx-lines"></div><div class="mx-ball" id="mx-ball"></div><div class="mx-flash" id="mx-flash"></div></div>
    <div class="mx-bar"><span id="mx-poss">Balbezit 50% - 50%</span><span id="mx-shots">Schoten 0 - 0</span>
      <span class="mx-speed"><button data-speed="1" class="on">1x</button><button data-speed="2">2x</button><button data-speed="4">4x</button></span></div>
    <ol class="mx-feed" id="mx-feed"></ol>
  </div>`);
  paintCrests();
  $('#match .mx-speed').addEventListener('click', (e) => {
    const s = e.target.closest('[data-speed]'); if (!s) return;
    M.speed = +s.dataset.speed;
    document.querySelectorAll('#match .mx-speed button').forEach((b) => b.classList.toggle('on', b === s));
  });
  say('whistle', M.half === 1 ? 'Aftrap! De wedstrijd is begonnen.' : 'De tweede helft is begonnen.');
  tick();
}

function say(type, text, side) {
  const li = document.createElement('li');
  li.className = `mx-ev ${type} ${side ? (side.isUser ? 'us' : 'them') : ''}`;
  li.innerHTML = `<span class="mx-min">${clockText()}</span><span class="mx-ico"></span><span>${text}</span>`;
  $('#mx-feed')?.prepend(li);
}
function clockText() {
  const base = M.half === 1 ? 45 : 90;
  return M.min > base ? `${base}+${M.min - base}'` : `${M.min}'`;
}
function flash(text, cls) {
  const f = $('#mx-flash'); if (!f) return;
  f.textContent = text; f.className = `mx-flash on ${cls || ''}`;
  setTimeout(() => { if (f) f.className = 'mx-flash'; }, 1600);
}
function pickPlayer(side, ids, weightBy) {
  const list = ids.filter((id) => side.cards[id] && !side.out.has(id));
  if (!list.length) return null;
  const w = list.map((id) => Math.max(1, (weightBy ? side.cards[id].stats[weightBy] : side.cards[id].ovr) - 40));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) if ((r -= w[i]) < 0) return list[i];
  return list[0];
}
const nameOf = (side, id) => esc(lastName(side.cards[id].player.naam));

// Eén minuut spelen.
function minute() {
  const U = lineStrength(M.user), T = lineStrength(M.them);
  const possU = 1 / (1 + Math.exp(-(U.mid - T.mid) / 6));
  M.user.poss += possU; M.them.poss += 1 - possU;
  const attackSide = Math.random() < possU ? M.user : M.them;
  const defSide = attackSide === M.user ? M.them : M.user;
  const A = attackSide === M.user ? U : T, D = attackSide === M.user ? T : U;
  M.ball += ((attackSide === M.user ? 1 : -1) * (8 + Math.random() * 18) - (M.ball - 50) * 0.35);
  M.ball = Math.max(6, Math.min(94, M.ball));

  // Kans?
  const chance = 0.14 * (1 / (1 + Math.exp(-(A.att - D.def) / 7))) * (M.isSuper && !attackSide.isUser ? 1.15 : 1);
  if (Math.random() < chance) {
    const creator = pickPlayer(attackSide, slotIds(['CM', 'CAM', 'LW', 'RW', 'LB', 'RB']), 2);
    const shooter = pickPlayer(attackSide, slotIds(['ST', 'LW', 'RW', 'CAM', 'CM']), 1);
    if (!shooter) return;
    attackSide.shots++;
    M.ball = attackSide === M.user ? 88 : 12;
    const sh = attackSide.cards[shooter].stats[1];
    const keeper = defSide.out.has('GK') ? 40 : (defSide.cards.GK?.ovr ?? 40);
    const pGoal = Math.max(0.12, Math.min(0.55, 0.3 + (sh - keeper) / 90));
    const pTarget = 0.58;
    const by = creator && creator !== shooter ? `${nameOf(attackSide, creator)} speelt ${nameOf(attackSide, shooter)} vrij` : `${nameOf(attackSide, shooter)} komt tot een kans`;
    const r = Math.random();
    if (r < pGoal) {
      attackSide.goals++; attackSide.onTarget++;
      say('goal', `GOAL! ${nameOf(attackSide, shooter)} scoort${creator && creator !== shooter ? `, assist van ${nameOf(attackSide, creator)}` : ''}.`, attackSide);
      flash('GOAL!', attackSide.isUser ? 'us' : 'them');
      $('#mx-gu').textContent = M.user.goals; $('#mx-gt').textContent = M.them.goals;
      return 1800;
    }
    if (r < pGoal + pTarget * (1 - pGoal)) {
      attackSide.onTarget++;
      say('save', `${by}... maar ${defSide.cards.GK && !defSide.out.has('GK') ? nameOf(defSide, 'GK') : 'de verdediging'} redt!`, attackSide);
    } else {
      say('chance', `${by}... net naast.`, attackSide);
    }
    return 700;
  }
  // Overtreding?
  if (Math.random() < 0.085) {
    const fouler = pickPlayer(defSide, slotIds(['CB', 'LB', 'RB', 'CM', 'CAM']));
    if (!fouler) return;
    const victim = pickPlayer(attackSide, ['LW', 'RW', 'ST', 'CM2']);
    const r = Math.random();
    const fn = nameOf(defSide, fouler);
    if (r < 0.025) {
      defSide.out.add(fouler); recalc(defSide);
      say('red', `ROOD! ${fn} gaat er met gestrekt been in${victim ? ` op ${nameOf(attackSide, victim)}` : ''} en moet eraf.`, defSide);
      flash('ROOD', 'red');
      return 1500;
    }
    if (r < 0.27) {
      if (defSide.yellow[fouler]) {
        defSide.out.add(fouler); recalc(defSide);
        say('red', `Tweede gele kaart voor ${fn}: rood! ${defSide.name} met een man minder.`, defSide);
        flash('ROOD', 'red');
        return 1500;
      }
      defSide.yellow[fouler] = 1;
      say('yellow', `Gele kaart voor ${fn} na een overtreding${victim ? ` op ${nameOf(attackSide, victim)}` : ''}.`, defSide);
      return 900;
    }
    say('foul', `Overtreding van ${fn}${victim ? ` op ${nameOf(attackSide, victim)}` : ''}. Vrije trap.`, defSide);
    return 500;
  }
  return 0;
}

function tick() {
  if (!M || M.done) return;
  M.min++;
  const extra = minute() || 0;
  const tot = M.user.poss + M.them.poss || 1;
  $('#mx-clock').textContent = clockText();
  $('#mx-poss').textContent = `Balbezit ${Math.round((M.user.poss / tot) * 100)}% - ${Math.round((M.them.poss / tot) * 100)}%`;
  $('#mx-shots').textContent = `Schoten ${M.user.shots} - ${M.them.shots}`;
  const ball = $('#mx-ball'); if (ball) ball.style.left = M.ball + '%';
  if (M.half === 1 && M.min === 45) say('time', `Er komen ${M.added[0]} minuten bij.`);
  if (M.half === 2 && M.min === 90) say('time', `Er komen ${M.added[1]} minuten bij.`);
  if (M.half === 1 && M.min >= 45 + M.added[0]) return halftime();
  if (M.half === 2 && M.min >= 90 + M.added[1]) return fulltime();
  M.timer = setTimeout(tick, (380 + extra) / M.speed);
}

// ---------- Rust: wissels ----------
function halftime() {
  say('whistle', 'Rust.');
  const U = M.user;
  let sel = null;
  const render = () => {
    const onField = SLOTS.filter((s) => U.cards[s.id]);
    mxStage(`<div class="mx-half">
      <div class="mx-kicker">Rust</div><h2>${esc(U.name)} ${U.goals} - ${M.them.goals} ${esc(M.them.name)}</h2>
      <p class="hint">Schoten ${U.shots} - ${M.them.shots} · op doel ${U.onTarget} - ${M.them.onTarget}. Je mag ${3 - U.subs} keer wisselen. Tik eerst op een speler in het veld, dan op een wissel.</p>
      <div class="mx-subs">
        <div><h3>In het veld</h3><div class="mx-sublist">${onField.map((s) => `<button class="mx-p ${sel === s.id ? 'sel' : ''} ${U.out.has(s.id) ? 'out' : ''}" data-out="${s.id}" ${U.out.has(s.id) ? 'disabled' : ''}>
          <b>${slotPos(s)}</b><span>${esc(U.cards[s.id].player.naam)}</span><i>${U.cards[s.id].ovr}</i>${U.yellow[s.id] ? '<em class="yc"></em>' : ''}${U.out.has(s.id) ? '<em class="rc"></em>' : ''}</button>`).join('')}</div></div>
        <div><h3>Wissels</h3><div class="mx-sublist">${U.bench.map((c, i) => `<button class="mx-p bench" data-in="${i}" ${!sel || U.subs >= 3 ? 'disabled' : ''}>
          <b>${c.player.pos}</b><span>${esc(c.player.naam)}</span><i>${c.ovr}</i></button>`).join('') || '<p class="hint">Geen wissels op je bank. Zet ze bij Mijn team.</p>'}</div></div>
      </div>
      <button id="mx-second" class="mx-go">Tweede helft</button>
    </div>`);
    document.querySelectorAll('#match [data-out]').forEach((b) => b.addEventListener('click', () => { sel = sel === b.dataset.out ? null : b.dataset.out; render(); }));
    document.querySelectorAll('#match [data-in]').forEach((b) => b.addEventListener('click', () => {
      if (!sel || U.subs >= 3) return;
      const i = +b.dataset.in;
      const incoming = U.bench[i];
      U.bench[i] = U.cards[sel];
      U.cards[sel] = incoming;
      delete U.yellow[sel];
      U.subs++;
      recalc(U);
      M.feed.push({ min: 45, text: `Wissel: ${incoming.player.naam} komt erin voor ${U.bench[i].player.naam}.` });
      sel = null;
      render();
    }));
    $('#mx-second').addEventListener('click', () => {
      M.half = 2; M.min = 45;
      const subs = M.feed.splice(0);
      liveView2(subs);
    });
  };
  render();
}
function liveView2(subs) {
  const keepU = M.user.goals, keepT = M.them.goals;
  liveView();
  $('#mx-gu').textContent = keepU; $('#mx-gt').textContent = keepT;
  for (const s of subs) say('sub', s.text, M.user);
}

// ---------- Eindstand ----------
function fulltime() {
  M.done = true;
  say('whistle', 'Einde wedstrijd!');
  const gf = M.user.goals, ga = M.them.goals;
  const res = gf > ga ? 'W' : gf === ga ? 'D' : 'L';
  const coins = M.isSuper ? (res === 'W' ? REWARD.superW : res === 'D' ? REWARD.superD : REWARD.superL) + gf * REWARD.goal * 3
    : REWARD[res] + gf * REWARD.goal;
  const list = readM();
  list.push({ d: dayStr(), super: M.isSuper, gf, ga, res, opp: M.them.name, coins });
  writeM(list);
  window.utAddCoins?.(coins);
  setTimeout(() => {
    if (!M) return;
    const box = document.createElement('div');
    box.className = `mx-end ${res}`;
    box.innerHTML = `<div class="mx-kicker">Eindstand</div><h2>${res === 'W' ? 'Gewonnen!' : res === 'D' ? 'Gelijkspel' : 'Verloren'}</h2>
      <div class="mx-final">${gf} - ${ga}</div><div class="mx-reward"><span class="coin"></span> +${fmtCoins(coins)} munten</div>
      ${M.isSuper ? '' : `<p class="hint">${superStatus().unlocked ? 'Je superwedstrijd is ontgrendeld!' : `Superwedstrijd: ${superStatus().wins}/5 winstpartijen deze week.`}</p>`}
      <button id="mx-close" class="mx-go">Klaar</button>`;
    $('#match .mx-live')?.appendChild(box);
    $('#mx-close').addEventListener('click', closeMatch);
  }, 1200);
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && M?.done) closeMatch(); });
