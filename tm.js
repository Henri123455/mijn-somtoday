// ---------- Transfermarkt ----------
// Munten verdien je met elk nieuw cijferpack. Elke dag staan er 5 nieuwe spelers op de markt;
// hoe zeldzamer de kaart, hoe minder vaak hij voorkomt. Alles wordt alleen in dit venster bewaard.

const TM = {
  coins: 'ut-coins', paid: 'ut-paid', sold: 'ut-sold', bought: 'ut-bought',
};
const readJSON = (k, fb) => { try { const v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); } catch { return fb; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// Prijzen stijgen hard met de rating: rood/brons is een paar tientjes, goud een paar packs,
// zeldzaam (80+) tientallen packs en een TOTY-kaart is echt een topaankoop.
const niceRound = (n) => { const s = n < 1000 ? 25 : n < 10000 ? 250 : 1000; return Math.round(n / s) * s; };
const tmPrice = (ovr) => Math.max(25, niceRound(50 * Math.pow(1.13, ovr - 50)));
const tmSellPrice = (ovr) => Math.max(10, niceRound(tmPrice(ovr) * 0.6));
const tmReward = (ovr) => Math.round(ovr * 3);
const fmtCoins = (n) => n.toLocaleString('nl-NL');

function tmCoins() {
  let coins = readJSON(TM.coins, null);
  if (coins == null || readJSON('ut-econ', 0) < 2) {
    // Eerste keer (of oude spaarpot van vóór de nieuwe prijzen): 100 startmunten.
    // Packs die je al geopend had leveren niets meer op; alleen nieuwe cijfers geven munten.
    const opened = window.packOpened?.() || new Set();
    coins = 100;
    writeJSON(TM.paid, grades.filter((g) => opened.has(g.id)).map((g) => g.id));
    writeJSON(TM.coins, coins);
    writeJSON('ut-econ', 2);
  }
  return coins;
}
function setCoins(n) { writeJSON(TM.coins, n); updateCoinDisplays(); }
function updateCoinDisplays() {
  document.querySelectorAll('.tm-coins-value').forEach((el) => { el.textContent = fmtCoins(tmCoins()); });
}

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
  const p = ALL_PLAYERS.find((x) => x.naam === b.naam);
  return p ? tmCardG(b.id, p) : null;
}).filter(Boolean);

function tmCardG(id, p) {
  return { id, vak: 'Transfermarkt', cijfer: p.base / 10, resultaat: '', weging: 0, transfer: true, player: p };
}

// Dagelijkse markt: 5 spelers, vast voor de hele dag (zelfde datum = zelfde spelers).
const TIERS = [
  { id: 'red', min: 10, max: 54, w: 30 },
  { id: 'bronze', min: 55, max: 59, w: 22 },
  { id: 'silver', min: 60, max: 69, w: 24 },
  { id: 'gold', min: 70, max: 79, w: 14 },
  { id: 'rare', min: 80, max: 89, w: 8 },
  { id: 'toty', min: 90, max: 100, w: 2 },
];
const todayKey = () => new Date().toLocaleDateString('sv-SE'); // 2026-10-23
function seeded(seed) {
  let h = hashOf(seed);
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}
function todaysOffers() {
  const day = todayKey();
  const rnd = seeded('markt-' + day);
  const total = TIERS.reduce((t, x) => t + x.w, 0);
  const picked = new Set();
  const offers = [];
  for (let i = 0; offers.length < 5 && i < 50; i++) {
    let r = rnd() * total;
    const tier = TIERS.find((x) => (r -= x.w) < 0) || TIERS[0];
    const pool = ALL_PLAYERS.filter((p) => p.base >= tier.min && p.base <= tier.max && !picked.has(p.naam));
    if (!pool.length) continue;
    const p = pool[Math.floor(rnd() * pool.length)];
    picked.add(p.naam);
    offers.push({ id: `tm-${day}-${offers.length}`, player: p });
  }
  return offers.sort((a, b) => b.player.base - a.player.base);
}

function timeToMidnight() {
  const now = new Date();
  const mid = new Date(now); mid.setHours(24, 0, 0, 0);
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
  $('#tm-refresh').textContent = `Nieuwe spelers over ${timeToMidnight()}`;
  const bought = new Set(readJSON(TM.bought, []).map((b) => b.id));
  $('#tm-offers').innerHTML = todaysOffers().map((o) => {
    const c = cardOf(tmCardG(o.id, o.player));
    const price = tmPrice(c.ovr);
    const have = bought.has(o.id);
    return `<div class="tm-offer">
      ${cardHTML(c, 'md')}
      <div class="tm-price">🪙 ${fmtCoins(price)}</div>
      <button class="${have ? 'secondary' : ''}" data-buy="${o.id}" ${have || coins < price ? 'disabled' : ''}>
        ${have ? '✓ Gekocht' : coins < price ? 'Te weinig munten' : 'Kopen'}</button>
    </div>`;
  }).join('');

  const owned = ownedCards();
  $('#tm-sell').innerHTML = owned.map((c) => `
    <div class="tm-sell-row">
      ${cardHTML(c, 'sm')}
      <div class="tm-sell-info"><b>${esc(c.player.naam)}</b><span>${c.ovr} · ${c.player.pos} · ${esc(c.g.transfer ? 'Transfermarkt' : vakKort(c.g.vak))}</span></div>
      <button class="secondary" data-sell="${esc(c.g.id)}">Verkoop voor 🪙 ${fmtCoins(tmSellPrice(c.ovr))}</button>
    </div>`).join('') || '<p class="hint">Je hebt nog geen spelers. Open je cijferpacks of koop iemand op de markt.</p>';
}

$('#tm-offers').addEventListener('click', (e) => {
  const id = e.target.closest('[data-buy]')?.dataset.buy;
  if (!id) return;
  const offer = todaysOffers().find((o) => o.id === id);
  const list = readJSON(TM.bought, []);
  if (!offer || list.some((b) => b.id === id)) return;
  const price = tmPrice(offer.player.base);
  if (tmCoins() < price) return tmSay('Je hebt niet genoeg munten.', 'bad');
  list.push({ id, naam: offer.player.naam });
  writeJSON(TM.bought, list);
  setCoins(tmCoins() - price);
  tmSay(`${offer.player.naam} zit nu in je club! 🎉`, 'good');
  renderMarket();
});

// Verkopen vraagt een tweede klik ter bevestiging.
$('#tm-sell').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-sell]');
  if (!btn) return;
  if (!btn.dataset.armed) {
    document.querySelectorAll('#tm-sell [data-armed]').forEach((b) => { delete b.dataset.armed; b.classList.remove('danger'); b.textContent = b.dataset.label; });
    btn.dataset.armed = '1';
    btn.dataset.label = btn.textContent;
    btn.textContent = 'Zeker weten? Klik nog een keer';
    btn.classList.add('danger');
    return;
  }
  const id = btn.dataset.sell;
  const card = ownedCards().find((c) => c.g.id === id);
  if (!card) return;
  if (card.g.transfer) writeJSON(TM.bought, readJSON(TM.bought, []).filter((b) => b.id !== id));
  else writeJSON(TM.sold, [...new Set([...readJSON(TM.sold, []), id])]);
  // Ook uit je opstelling halen.
  const t = readJSON('ut-team', {});
  for (const k of Object.keys(t)) if (t[k] === id) delete t[k];
  writeJSON('ut-team', t);
  setCoins(tmCoins() + tmSellPrice(card.ovr));
  tmSay(`${card.player.naam} verkocht voor 🪙 ${fmtCoins(tmSellPrice(card.ovr))}.`, 'good');
  renderMarket();
});

// Wisselen tussen "Mijn team" en "Transfermarkt".
$('#ut-views').addEventListener('click', (e) => {
  const view = e.target.closest('[data-view]')?.dataset.view;
  if (!view) return;
  document.querySelectorAll('#ut-views [data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  $('#ut-team-view').hidden = view !== 'team';
  $('#ut-market-view').hidden = view !== 'markt';
  if (view === 'markt') renderMarket();
  else window.renderTeam?.();
});

window.tmInit = () => updateCoinDisplays();
