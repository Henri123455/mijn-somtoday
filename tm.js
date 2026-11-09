// ---------- Transfermarkt en munten ----------
// Munten verdien je met nieuwe cijferpacks en met wedstrijden. Elke dag 8 spelers op de markt; de prijs schommelt
// per dag. Kaarten zijn duur (zoals in FC), en je kunt maximaal 2 spelers per dag kopen: je team bouw je vooral met
// je eigen cijfers.

const TM = { coins: 'ut-coins', paid: 'ut-paid', sold: 'ut-sold', bought: 'ut-bought', buys: 'ut-buys' };
const readJSON = (k, fb) => { try { const v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); } catch { return fb; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} window.cloudSave?.(); };

const niceRound = (n) => { const s = n < 1000 ? 50 : n < 10000 ? 250 : n < 100000 ? 1000 : 5000; return Math.max(s, Math.round(n / s) * s); };
// Basisprijs per rating: brons een paar honderd, goud duizenden, 85+ tienduizenden, iconen honderdduizenden.
function basePrice(ovr) {
  if (ovr < 55) return 200;
  if (ovr < 65) return 300 + (ovr - 55) * 60;
  if (ovr < 75) return 1000 * Math.pow(1.13, ovr - 65);
  if (ovr < 83) return 4000 * Math.pow(1.2, ovr - 75);
  if (ovr < 88) return 20000 * Math.pow(1.3, ovr - 83);
  return 80000 * Math.pow(1.35, ovr - 88);
}
const todayKey = (d = new Date()) => d.toLocaleDateString('sv-SE');
function seeded(seed) {
  let h = hashOf(seed) || 1;
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}
// Dagprijs: ±12% rond de basisprijs, per speler per dag anders.
const dayFactor = (key, day) => 0.88 + seeded(`prijs-${key}-${day}`)() * 0.24;
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return todayKey(d); };
const tmPrice = (ovr, key = '') => niceRound(basePrice(ovr) * dayFactor(key, todayKey()));
const tmSellPrice = (ovr, key = '') => niceRound(tmPrice(ovr, key) * 0.6);
const tmReward = (ovr) => Math.round(150 + ovr * 4);
const fmtCoins = (n) => Number(n || 0).toLocaleString('nl-NL');

function tmCoins() {
  let coins = readJSON(TM.coins, null);
  if (coins == null) {
    // Eerste keer: 500 startmunten. Packs die je al had geopend leveren niets meer op.
    const opened = window.packOpened?.() || new Set();
    coins = 500;
    writeJSON(TM.paid, grades.filter((g) => opened.has(g.id)).map((g) => g.id));
    writeJSON(TM.coins, coins);
  }
  writeJSON('ut-econ', 3);
  return coins;
}
function setCoins(n) { writeJSON(TM.coins, Math.max(0, Math.round(n))); updateCoinDisplays(); }
function updateCoinDisplays() { document.querySelectorAll('.tm-coins-value').forEach((el) => { el.textContent = fmtCoins(tmCoins()); }); }
window.utAddCoins = (n) => { setCoins(tmCoins() + n); return tmCoins(); };
window.utCoins = () => tmCoins();

// Munten voor een net geopend pack (één keer per cijfer).
window.utReward = (card) => {
  const paid = new Set(readJSON(TM.paid, []));
  if (paid.has(card.g.id)) return 0;
  tmCoins();
  const reward = tmReward(card.ovr);
  paid.add(card.g.id);
  writeJSON(TM.paid, [...paid]);
  setCoins(tmCoins() + reward);
  return reward;
};

window.tmSold = () => readJSON(TM.sold, []);
window.tmBoughtCards = () => readJSON(TM.bought, []).map((b) => {
  const p = BY_NAME.get(b.key || b.naam) || DB.find((x) => x.naam === b.naam);
  return p ? tmCardG(b.id, p) : null;
}).filter(Boolean);
function tmCardG(id, p) {
  return { id, vak: 'Transfermarkt', cijfer: null, resultaat: '', weging: 0, transfer: true, player: p, datum: '' };
}

// 8 spelers per dag, vooral goud en zilver; iconen zijn heel zeldzaam.
const TIERS = [
  { min: 55, max: 64, w: 14 }, { min: 65, max: 74, w: 30 }, { min: 75, max: 82, w: 34 },
  { min: 83, max: 87, w: 16 }, { min: 88, max: 91, w: 5 }, { min: 92, max: 99, w: 1 },
];
function todaysOffers() {
  const day = todayKey();
  const rnd = seeded('markt2-' + day);
  const total = TIERS.reduce((t, x) => t + x.w, 0);
  const picked = new Set();
  const offers = [];
  for (let i = 0; offers.length < 8 && i < 80; i++) {
    let r = rnd() * total;
    const tier = TIERS.find((x) => (r -= x.w) < 0) || TIERS[0];
    const pool = FOOTBALLERS.filter((p) => p.base >= tier.min && p.base <= tier.max && !picked.has(p.key));
    if (!pool.length) continue;
    const p = pool[Math.floor(rnd() * pool.length)];
    picked.add(p.key);
    offers.push({ id: `tm-${day}-${offers.length}`, player: p });
  }
  return offers.sort((a, b) => b.player.base - a.player.base);
}
const buysToday = () => (readJSON(TM.buys, {})[todayKey()] || 0);

function timeToMidnight() {
  const now = new Date(); const mid = new Date(now); mid.setHours(24, 0, 0, 0);
  const mins = Math.round((mid - now) / 60000);
  return `${Math.floor(mins / 60)}u ${mins % 60}m`;
}
let tmMsgTimer;
function tmSay(text, kind) {
  const el = $('#tm-msg');
  el.textContent = text;
  el.className = `tm-msg ${kind || ''}`;
  clearTimeout(tmMsgTimer);
  tmMsgTimer = setTimeout(() => { el.textContent = ''; }, 5000);
}

function renderMarket() {
  const coins = tmCoins();
  updateCoinDisplays();
  const left = Math.max(0, 2 - buysToday());
  $('#tm-refresh').textContent = `Nieuwe spelers over ${timeToMidnight()} · nog ${left} ${left === 1 ? 'aankoop' : 'aankopen'} vandaag`;
  const bought = new Set(readJSON(TM.bought, []).map((b) => b.id));
  $('#tm-offers').innerHTML = todaysOffers().map((o) => {
    const c = cardOf(tmCardG(o.id, o.player));
    const price = tmPrice(c.ovr, o.player.key);
    const prev = niceRound(basePrice(c.ovr) * dayFactor(o.player.key, yesterday()));
    const trend = price > prev ? '<span class="tm-up">▲</span>' : price < prev ? '<span class="tm-down">▼</span>' : '';
    const have = bought.has(o.id);
    const why = have ? 'Gekocht' : !left ? 'Limiet bereikt' : coins < price ? 'Te weinig munten' : 'Kopen';
    return `<div class="tm-offer">
      ${cardHTML(c, 'md')}
      <div class="tm-price"><span class="coin"></span>${fmtCoins(price)} ${trend}</div>
      <button class="${have ? 'secondary' : ''}" data-buy="${o.id}" ${have || !left || coins < price ? 'disabled' : ''}>${why}</button>
    </div>`;
  }).join('');

  const owned = ownedCards();
  $('#tm-sell').innerHTML = owned.map((c) => `
    <div class="tm-sell-row">
      ${cardHTML(c, 'sm')}
      <div class="tm-sell-info"><b>${esc(c.player.naam)}</b><span>${c.ovr} · ${c.player.pos} · ${esc(CLUBS[c.player.club]?.[0] || '')}</span></div>
      <button class="secondary" data-sell="${esc(c.g.id)}">Verkoop · ${fmtCoins(tmSellPrice(c.ovr, c.player.key))}</button>
    </div>`).join('') || '<p class="hint">Je hebt nog geen spelers. Open je cijferpacks of koop iemand op de markt.</p>';
}

$('#tm-offers').addEventListener('click', (e) => {
  const id = e.target.closest('[data-buy]')?.dataset.buy;
  if (!id) return;
  const offer = todaysOffers().find((o) => o.id === id);
  const list = readJSON(TM.bought, []);
  if (!offer || list.some((b) => b.id === id)) return;
  if (buysToday() >= 2) return tmSay('Je hebt vandaag al 2 spelers gekocht. Morgen weer.', 'bad');
  const price = tmPrice(offer.player.base, offer.player.key);
  if (tmCoins() < price) return tmSay('Je hebt niet genoeg munten.', 'bad');
  list.push({ id, naam: offer.player.naam, key: offer.player.key });
  writeJSON(TM.bought, list);
  const buys = readJSON(TM.buys, {});
  writeJSON(TM.buys, { [todayKey()]: (buys[todayKey()] || 0) + 1 });
  setCoins(tmCoins() - price);
  tmSay(`${offer.player.naam} zit nu in je club.`, 'good');
  renderMarket();
});

$('#tm-sell').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-sell]');
  if (!btn) return;
  if (!btn.dataset.armed) {
    document.querySelectorAll('#tm-sell [data-armed]').forEach((b) => { delete b.dataset.armed; b.classList.remove('danger'); b.textContent = b.dataset.label; });
    btn.dataset.armed = '1';
    btn.dataset.label = btn.textContent;
    btn.textContent = 'Zeker weten? Tik nog een keer';
    btn.classList.add('danger');
    return;
  }
  const id = btn.dataset.sell;
  const card = ownedCards().find((c) => c.g.id === id);
  if (!card) return;
  if (card.g.transfer) writeJSON(TM.bought, readJSON(TM.bought, []).filter((b) => b.id !== id));
  else writeJSON(TM.sold, [...new Set([...readJSON(TM.sold, []), id])]);
  const t = readJSON('ut-team', {});
  for (const k of Object.keys(t)) if (t[k] === id) delete t[k];
  writeJSON('ut-team', t);
  const got = tmSellPrice(card.ovr, card.player.key);
  setCoins(tmCoins() + got);
  tmSay(`${card.player.naam} verkocht voor ${fmtCoins(got)} munten.`, 'good');
  renderMarket();
});

// Wisselen tussen Mijn team, Wedstrijden en Transfermarkt.
$('#ut-views').addEventListener('click', (e) => {
  const view = e.target.closest('[data-view]')?.dataset.view;
  if (!view) return;
  document.querySelectorAll('#ut-views [data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  $('#ut-team-view').hidden = view !== 'team';
  $('#ut-market-view').hidden = view !== 'markt';
  $('#ut-match-view').hidden = view !== 'match';
  if (view === 'markt') renderMarket();
  else if (view === 'match') window.renderMatches?.();
  else window.renderTeam?.();
});

window.tmInit = () => updateCoinDisplays();
