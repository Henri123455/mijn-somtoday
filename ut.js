// ---------- Somtoday Ultimate Team: kaarten, chemie en je elftal ----------
// De spelers zelf staan in players.js (echte FC-ratings). Elk cijfer krijgt een speler die past bij het cijfer:
// hoe hoger je cijfer, hoe beter de speler. Onder de 4 krijg je een BN'er.

const ALL_PLAYERS = DB;
const MYSTERY = { naam: 'Onbekende Belofte', key: 'Onbekende Belofte', pos: 'CM', base: 60, nat: 'NED', club: 'BN', liga: 'BNL', man: true, skin: 1, hair: 'kort', hc: 1, eyes: 0, beard: '', kit: ['#5b6475', '#ffffff'] };

// Welke speler bij welk cijfer hoort. Op volgorde van datum; elke speler maar één keer, zodat je club gevarieerd is.
let assignFor = null;
let assigned = new Map();
function assignments() {
  if (assignFor === grades) return assigned;
  assignFor = grades;
  assigned = new Map();
  const used = new Set();
  const sorted = grades.filter((g) => g.cijfer != null).sort((a, b) => new Date(a.datum) - new Date(b.datum) || String(a.id).localeCompare(String(b.id)));
  for (const g of sorted) {
    const pool = g.cijfer < 4 ? CELEBS : FOOTBALLERS;
    const target = targetRating(g.cijfer);
    let pick = null;
    for (let d = 0; d <= 12 && !pick; d++) {
      const cands = pool.filter((p) => Math.abs(p.base - target) <= d && !used.has(p.key));
      if (cands.length) pick = cands[hashOf(g.id) % cands.length];
    }
    if (!pick) pick = pool.reduce((a, b) => (Math.abs(b.base - target) < Math.abs(a.base - target) ? b : a));
    used.add(pick.key);
    assigned.set(g.id, pick);
  }
  return assigned;
}
function playerFor(g) {
  if (g.cijfer == null) return MYSTERY;
  return assignments().get(g.id) || MYSTERY;
}

const POS_NAMES = { GK: 'Keeper', CB: 'Centrale verdediger', LB: 'Linksback', RB: 'Rechtsback', CM: 'Centrale middenvelder', CAM: 'Aanvallende middenvelder', LW: 'Linksbuiten', RW: 'Rechtsbuiten', ST: 'Spits' };

// Kaartsoort. Een cijfer van 9+ is een Team of the Year-kaart; een onvoldoende een rode kaart.
function tierFor(g, ovr) {
  if (!g.transfer && g.cijfer != null) {
    if (g.cijfer >= 9) return { id: 'toty', name: 'Team of the Year' };
    if (g.cijfer < 5.5) return { id: 'red', name: 'Rode kaart' };
  }
  if (g.player?.club === 'ICON') return { id: 'icon', name: 'Icoon' };
  if (ovr >= 83) return { id: 'rare', name: 'Zeldzaam goud' };
  if (ovr >= 75) return { id: 'gold', name: 'Goud' };
  if (ovr >= 65) return { id: 'silver', name: 'Zilver' };
  return { id: 'bronze', name: 'Brons' };
}
const tierOf = (g) => tierFor(g, cardOf(g).ovr);

// Korte vaknaam voor op de kaart.
function vakKort(vak) {
  const v = String(vak || '').toLowerCase();
  const map = [
    [/nederlands/, 'Nederlands'], [/engels/, 'Engels'], [/duits/, 'Duits'], [/frans/, 'Frans'], [/spaans/, 'Spaans'],
    [/culturele|ckv/, 'CKV'], [/lichamelijke/, 'Gym (LO)'], [/bedrijfseconomie/, 'Bedrijfsec.'],
    [/maatschappijwetenschappen/, 'Maatschappijwet.'], [/levensbeschouwing/, 'Levensbesch.'],
  ];
  return (map.find(([re]) => re.test(v)) || [null, vak ? vak.charAt(0).toUpperCase() + vak.slice(1) : ''])[1];
}
const CLUB_COLORS = ['#d62828', '#1d4ed8', '#059669', '#7c3aed', '#ea580c', '#0891b2', '#be185d', '#4d7c0f', '#b45309', '#334155', '#0f766e', '#9333ea'];
const vakColor = (vak) => CLUB_COLORS[hashOf(vakKort(vak)) % CLUB_COLORS.length];

// Statistieken zoals in FC: per positie een eigen profiel rond de rating.
const POS_BIAS = {
  GK: [0, 2, -4, 3, -30, 0], CB: [-8, -30, -10, -14, 4, 3], LB: [4, -24, -4, -2, 0, -4], RB: [4, -24, -4, -2, 0, -4],
  CM: [-6, -6, 3, 0, -8, -1], CAM: [-2, 0, 3, 4, -40, -12], LW: [6, -2, -4, 4, -45, -14], RW: [6, -2, -4, 4, -45, -14], ST: [3, 4, -12, -2, -48, -2],
};
const STAT_LABELS = ['SNE', 'SCH', 'PAS', 'DRI', 'VER', 'FYS'];
const GK_LABELS = ['DUI', 'HAN', 'TRA', 'REF', 'SNE', 'POS'];

function cardOf(g) {
  const player = g.player || playerFor(g);
  let ovr = player.base;
  if (!g.transfer && g.cijfer >= 9) ovr = Math.min(99, ovr + 3); // TOTY-versie
  const h = hashOf(player.key + (g.transfer ? '' : g.id));
  const stats = POS_BIAS[player.pos].map((b, i) => Math.max(20, Math.min(99, ovr + 5, ovr + b + (((h >> (i * 4)) & 15) - 7))));
  return { g, player, ovr, tier: tierFor(g, ovr), stats };
}

// ---------- Portret ----------
// Getekend als SVG (zonder inline style: dat staat de beveiliging niet toe). Zo realistisch als het in SVG kan:
// echte hoofdvorm met kaak, oren en nek, schaduw, amandelogen, een neus met neusvleugels en lippen.
const SKINS = [['#f3cfb0', '#d2a07c', '#b98563'], ['#dcae84', '#b78256', '#9a6a44'], ['#c08a5c', '#9a6638', '#7d5029'],
  ['#8f5a34', '#6c4022', '#553118'], ['#5f3b22', '#462915', '#331d0e'], ['#f7dcc4', '#e0b796', '#c89a78']];
const HAIRS = ['#3b2414', '#22150c', '#8a4b22', '#c9a35a', '#111111', '#8f8f8f'];
const EYES = ['#4a2e18', '#3a6a9a', '#466b3c'];
let avatarSeq = 0;

function lighten(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((c) => Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt)));
  return '#' + ch.map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}

function avatarSVG(p, shirt, mood, nummer) {
  const id = `av${++avatarSeq}`;
  const [skin, shade, deep] = SKINS[p.skin] || SKINS[0];
  const hair = HAIRS[p.hc] || HAIRS[0];
  const eye = EYES[p.eyes] || EYES[0];
  const accent = p.kit?.[1] || '#ffffff';
  const silhouette = shirt === '#000';
  const head = 'M60 22 C79 22 88 36 88 54 C88 64 86 72 81 79 C76 86 69 91 60 91 C51 91 44 86 39 79 C34 72 32 64 32 54 C32 36 41 22 60 22 Z';
  const body = 'M8 120 C10 103 24 96 44 92 L52 90 L60 99 L68 90 L76 92 C96 96 110 103 112 120 Z';

  const back = {
    lang: `<path d="M30 56 C26 26 44 13 60 13 C76 13 94 26 90 56 L93 104 C86 108 80 104 80 104 L80 62 C78 46 70 38 60 38 C50 38 42 46 40 62 L40 104 C40 104 34 108 27 104 Z" fill="${hair}"/>`,
    staart: `<path d="M84 42 C100 50 102 76 92 94 C90 82 88 68 80 58 Z" fill="${hair}"/>`,
    knot: `<ellipse cx="60" cy="14" rx="10" ry="8.5" fill="${hair}"/>`,
    knotm: `<ellipse cx="60" cy="16" rx="8.5" ry="7" fill="${hair}"/>`,
    medium: `<path d="M30 60 C26 28 44 16 60 16 C76 16 94 28 90 60 L89 78 C85 80 83 77 83 77 L82 58 C79 43 72 36 60 36 C48 36 41 43 38 58 L37 77 C37 77 35 80 31 78 Z" fill="${hair}"/>`,
    dreads: `<g fill="${hair}"><rect x="30" y="44" width="6" height="34" rx="3"/><rect x="37" y="48" width="6" height="30" rx="3"/><rect x="77" y="48" width="6" height="30" rx="3"/><rect x="84" y="44" width="6" height="34" rx="3"/></g>`,
    krullang: `<g fill="${hair}"><circle cx="32" cy="56" r="9"/><circle cx="30" cy="70" r="8"/><circle cx="88" cy="56" r="9"/><circle cx="90" cy="70" r="8"/></g>`,
  };
  const top = 'M32 54 C30 31 44 20 60 20 C76 20 90 31 88 54 C85 43 79 37 68 36 C58 38 47 38 39 41 C35 44 33 48 32 54 Z';
  const front = {
    kaal: `<path d="M46 29 C52 25 62 25 69 28" stroke="#fff" stroke-opacity=".28" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    kort: `<path d="${top}" fill="${hair}"/>`,
    fade: `<path d="M35 49 C35 30 47 22 60 22 C73 22 85 30 85 49 C82 40 75 35 60 35 C46 35 38 40 35 49 Z" fill="${hair}"/><path d="M32 55 C32 47 34 43 36 41 L36 57 Z M88 55 C88 47 86 43 84 41 L84 57 Z" fill="${hair}" opacity=".4"/>`,
    buzz: `<path d="M33 51 C32 32 45 24 60 24 C75 24 88 32 87 51 C83 41 75 36 60 36 C45 36 37 41 33 51 Z" fill="${hair}" opacity=".75"/>`,
    kuif: `<path d="${top}" fill="${hair}"/><path d="M40 38 C42 17 66 9 84 23 C74 23 64 28 58 37 Z" fill="${hair}"/>`,
    gel: `<path d="M33 53 C31 30 45 21 61 21 C77 21 90 31 87 53 C85 41 79 34 71 32 C63 30 54 31 46 33 C39 36 35 44 33 53 Z" fill="${hair}"/><path d="M45 27 C55 23 68 23 80 29" stroke="#fff" stroke-opacity=".16" stroke-width="1.2" fill="none"/>`,
    krul: `<g fill="${hair}"><circle cx="37" cy="40" r="7.5"/><circle cx="45" cy="30" r="8.5"/><circle cx="55" cy="25" r="8.5"/><circle cx="66" cy="25" r="8.5"/><circle cx="77" cy="30" r="8.5"/><circle cx="84" cy="40" r="7.5"/><circle cx="60" cy="31" r="7.5"/></g>`,
    afro: `<circle cx="60" cy="40" r="30" fill="${hair}"/>`,
    lang: `<path d="${top}" fill="${hair}"/>`, staart: `<path d="${top}" fill="${hair}"/>`, knot: `<path d="${top}" fill="${hair}"/>`,
    knotm: `<path d="M33 53 C31 30 45 21 61 21 C77 21 90 31 87 53 C84 40 76 33 60 33 C44 33 36 40 33 53 Z" fill="${hair}"/>`,
    dreads: `<path d="${top}" fill="${hair}"/><g stroke="${deep}" stroke-opacity=".5" stroke-width="1.3"><path d="M45 24 L43 40"/><path d="M55 21 L53 37"/><path d="M66 21 L67 37"/><path d="M76 25 L79 40"/></g>`,
    medium: `<path d="M31 58 C29 30 44 19 61 19 C79 19 92 30 89 58 C85 44 78 36 64 34 C54 40 43 42 35 46 C33 50 32 54 31 58 Z" fill="${hair}"/>`,
    krullang: `<g fill="${hair}"><circle cx="36" cy="42" r="8.5"/><circle cx="43" cy="30" r="9.5"/><circle cx="54" cy="24" r="9.5"/><circle cx="67" cy="24" r="9.5"/><circle cx="78" cy="30" r="9.5"/><circle cx="85" cy="42" r="8.5"/></g>`,
  };
  const beard = {
    stoppels: `<path d="M36 63 C38 80 48 90 60 90 C72 90 82 80 84 63 C80 72 73 76 60 76 C47 76 40 72 36 63 Z" fill="${hair}" opacity=".3"/>`,
    baard: `<path d="M35 61 C36 82 47 93 60 93 C73 93 84 82 85 61 C82 71 76 74 68 72 C64 71 56 71 52 72 C44 74 38 71 35 61 Z" fill="${hair}"/>`,
    snor: `<path d="M48 73 C52 70 57 70 60 71.5 C63 70 68 70 72 73 C67 72.5 64 73.5 60 74 C56 73.5 53 72.5 48 73 Z" fill="${hair}"/>`,
  }[p.beard] || '';
  const smile = mood === 'blij' ? 1 : mood === 'sip' ? -1 : 0;

  const svg = `<svg viewBox="0 0 120 120" class="pc-avatar" aria-hidden="true">
    <defs>
      <radialGradient id="${id}f" cx="42%" cy="36%" r="70%"><stop offset="0" stop-color="${lighten(skin, .08)}"/><stop offset=".6" stop-color="${skin}"/><stop offset="1" stop-color="${shade}"/></radialGradient>
      <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></linearGradient>
      <linearGradient id="${id}h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lighten(hair, .28)}"/><stop offset=".5" stop-color="${hair}"/><stop offset="1" stop-color="${lighten(hair, -.3)}"/></linearGradient>
      <linearGradient id="${id}n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${deep}"/><stop offset="1" stop-color="${shade}"/></linearGradient>
    </defs>
    ${back[p.hair] || ''}
    <path d="${body}" fill="${shirt}"/>
    ${silhouette ? '' : `<path d="M8 120 C9 112 12 107 16 104 L21 106 C17 110 15 115 14 120 Z M112 120 C111 112 108 107 104 104 L99 106 C103 110 105 115 106 120 Z" fill="${accent}" opacity=".9"/>
    <path d="M45 92 L60 106 L75 92" stroke="${accent}" stroke-width="3" fill="none"/>
    ${nummer ? `<text x="88" y="114" font-size="10" font-weight="800" fill="${accent}" fill-opacity=".9" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif">${nummer}</text>` : ''}`}
    <path d="${body}" fill="url(#${id}s)"/>
    <path d="M50 78 L50 95 Q60 102 70 95 L70 78 Z" fill="url(#${id}n)"/>
    <ellipse cx="33" cy="58" rx="4.6" ry="7.5" fill="${shade}"/><ellipse cx="87" cy="58" rx="4.6" ry="7.5" fill="${shade}"/>
    <path d="M32 55 Q34 58 33 62 M88 55 Q86 58 87 62" stroke="${deep}" stroke-opacity=".5" stroke-width="1" fill="none"/>
    <path d="${head}" fill="url(#${id}f)"/>
    <path d="M38 74 C44 86 52 91 60 91 C68 91 76 86 82 74 C78 84 70 88 60 88 C50 88 42 84 38 74 Z" fill="${deep}" opacity=".35"/>
    <path d="M36 60 C37 70 40 76 44 80 M84 60 C83 70 80 76 76 80" stroke="${deep}" stroke-opacity=".18" stroke-width="3" fill="none"/>
    <g fill="#fbfaf7"><path d="M42.5 57 Q48 52.5 53.5 57 Q48 60.5 42.5 57 Z"/><path d="M66.5 57 Q72 52.5 77.5 57 Q72 60.5 66.5 57 Z"/></g>
    <g fill="${eye}"><circle cx="48" cy="56.8" r="2.3"/><circle cx="72" cy="56.8" r="2.3"/></g>
    <g fill="#0b0b0b"><circle cx="48" cy="56.8" r="1.05"/><circle cx="72" cy="56.8" r="1.05"/></g>
    <g fill="#fff" opacity=".85"><circle cx="48.8" cy="56" r=".55"/><circle cx="72.8" cy="56" r=".55"/></g>
    <path d="M42 56.6 Q48 51.6 54 56.4 M66 56.4 Q72 51.6 78 56.6" stroke="${deep}" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <path d="M43 59 Q48 61 53 59 M67 59 Q72 61 77 59" stroke="${shade}" stroke-opacity=".6" stroke-width=".8" fill="none"/>
    <g stroke="${p.hair === 'kaal' ? deep : hair}" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".92">
      <path d="M41 ${50 - (smile < 0 ? 0 : 0)} Q47 ${46.5 + (smile < 0 ? 2 : 0)} 54 ${49 + (smile < 0 ? 1.5 : 0)}"/><path d="M66 ${49 + (smile < 0 ? 1.5 : 0)} Q73 ${46.5 + (smile < 0 ? 2 : 0)} 79 50"/></g>
    <path d="M60 58 C59 63 57 67 56 69 C57.5 71 59 71.5 60 71 C61 71.5 62.5 71 64 69 C63 67 61 63 60 58 Z" fill="${shade}" opacity=".45"/>
    <path d="M55.5 69.5 Q57.5 71.5 60 70.6 Q62.5 71.5 64.5 69.5" stroke="${deep}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
    ${p.beard === 'snor' ? '' : beard}
    <path d="M52 78.5 Q56 ${77 + smile * -1.2} 60 ${77.6 + smile * -0.4} Q64 ${77 + smile * -1.2} 68 78.5" stroke="${deep}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <path d="M53 79 Q60 ${82.5 + smile} 67 79 Q60 ${80.4 + smile * .5} 53 79 Z" fill="${lighten(shade, -.05)}" opacity=".85"/>
    ${p.beard === 'snor' ? beard : ''}
    ${front[p.hair] || ''}
  </svg>`;
  return svg.split(`fill="${hair}"`).join(`fill="url(#${id}h)"`);
}

const MOODS = { icon: 'blij', toty: 'blij', rare: 'blij', gold: 'lach', silver: 'lach', bronze: 'neutraal', red: 'sip' };

// De kaart zoals in FC: rating, positie, vlag en club links; portret rechts; naam; zes statistieken.
// size: 'lg' (pack), 'md' (club/markt), 'sm' (veld).
function cardHTML(c, size = 'md') {
  const p = c.player;
  const g = c.g;
  const labels = p.pos === 'GK' ? GK_LABELS : STAT_LABELS;
  const room = size === 'sm' ? 9.6 : 12.4;
  const nameSize = Math.max(0.6, Math.min(1.08, room / (p.naam.length * 0.62))).toFixed(2);
  const foot = g.transfer ? 'Transfermarkt' : `${esc(vakKort(g.vak))} · ${esc(g.resultaat || '')}`;
  return `<div class="fc-card fc-${size}" data-tier="${c.tier.id}">
    <div class="fc-bg"></div><div class="fc-shine"></div>
    <div class="fc-inner">
      <div class="fc-left">
        <div class="fc-ovr">${c.ovr}</div>
        <div class="fc-pos">${p.pos}</div>
        <div class="fc-badges">${flagSVG(p.nat)}${crestSVG(p.club)}</div>
      </div>
      <div class="fc-photo">${avatarSVG(p, p.kit[0], MOODS[c.tier.id], '')}</div>
      <div class="fc-name"><span data-size="${nameSize}">${esc(p.naam)}</span></div>
      <div class="fc-stats">${c.stats.map((v, i) => `<div><b>${v}</b><span>${labels[i]}</span></div>`).join('')}</div>
      <div class="fc-foot">${foot}</div>
    </div>
  </div>`;
}

function paintCards(root = document) {
  root.querySelectorAll('.fc-name span[data-size]').forEach((el) => { el.style.fontSize = el.dataset.size + 'em'; });
}
// Lichtgewicht: alleen nieuw toegevoegde kaarten verwerken (geen hele pagina doorzoeken bij elke wijziging).
new MutationObserver((list) => {
  for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1 && (n.classList?.contains('fc-card') || n.querySelector?.('.fc-name'))) paintCards(n);
}).observe(document.body, { childList: true, subtree: true });

// ---------- Je elftal (4-3-3) en wissels ----------
const SLOTS = [
  { id: 'LW', x: 17, y: 16 }, { id: 'ST', x: 50, y: 11 }, { id: 'RW', x: 83, y: 16 },
  { id: 'CM1', pos: 'CM', x: 24, y: 40 }, { id: 'CM2', pos: 'CAM', x: 50, y: 36 }, { id: 'CM3', pos: 'CM', x: 76, y: 40 },
  { id: 'LB', x: 12, y: 64 }, { id: 'CB1', pos: 'CB', x: 36, y: 67 }, { id: 'CB2', pos: 'CB', x: 64, y: 67 }, { id: 'RB', x: 88, y: 64 },
  { id: 'GK', x: 50, y: 87 },
];
const BENCH = ['B1', 'B2', 'B3', 'B4', 'B5'];
const slotPos = (s) => s.pos || s.id;
// Op welke posities een speler nog mag spelen (zonder chemie te verliezen: alleen de eigen positie telt als "in positie").
const FITS = {
  GK: ['GK'], LB: ['LB', 'RB', 'CB'], RB: ['RB', 'LB', 'CB'], CB: ['CB', 'LB', 'RB'],
  CM: ['CM', 'CAM'], CAM: ['CAM', 'CM', 'ST'], LW: ['LW', 'RW', 'ST'], RW: ['RW', 'LW', 'ST'], ST: ['ST', 'LW', 'RW', 'CAM'],
};
const inPosition = (s, c) => c.player.pos === slotPos(s) || (slotPos(s) === 'CAM' && c.player.pos === 'CM') || (slotPos(s) === 'CM' && c.player.pos === 'CAM');

let team = {};
let selectedSlot = null;
let clubFilter = '';
const loadTeam = () => { try { team = JSON.parse(localStorage.getItem('ut-team') || '{}'); } catch { team = {}; } };
const saveTeam = () => { try { localStorage.setItem('ut-team', JSON.stringify(team)); } catch {} window.cloudSave?.(); };

function ownedCards() {
  const opened = window.packOpened?.() || new Set();
  const sold = new Set(window.tmSold?.() || []);
  const fromGrades = grades.filter((g) => opened.has(g.id) && !sold.has(g.id)).map(cardOf);
  const bought = (window.tmBoughtCards?.() || []).map(cardOf);
  return [...fromGrades, ...bought].sort((a, b) => b.ovr - a.ovr);
}

// ---------- Chemie zoals in FC ----------
// Per speler 0-3 punten, alleen als hij op zijn eigen positie staat. Punten komen van spelers in je elftal met:
// dezelfde club (2/5/7 → 1/2/3), hetzelfde land (2/5/8) of dezelfde competitie (3/5/8). Iconen tellen dubbel voor
// hun land, krijgen altijd 3 chemie en geven elke competitie in je team +1. BN'ers zijn één club.
const CHEM_STEPS = { club: [2, 5, 7], nat: [2, 5, 8], liga: [3, 5, 8] };
const stepPoints = (n, steps) => (n >= steps[2] ? 3 : n >= steps[1] ? 2 : n >= steps[0] ? 1 : 0);
function chemistry(cards) {
  const count = { club: {}, nat: {}, liga: {} };
  const icons = Object.values(cards).filter((c) => c?.player.club === 'ICON').length;
  for (const s of SLOTS) {
    const c = cards[s.id];
    if (!c || !inPosition(s, c)) continue;
    const p = c.player;
    const icon = p.club === 'ICON';
    if (!icon) count.club[p.club] = (count.club[p.club] || 0) + 1;
    count.nat[p.nat] = (count.nat[p.nat] || 0) + (icon ? 2 : 1);
    if (!icon) count.liga[p.liga] = (count.liga[p.liga] || 0) + 1;
  }
  const result = {};
  for (const s of SLOTS) {
    const c = cards[s.id];
    if (!c) continue;
    if (!inPosition(s, c)) { result[s.id] = 0; continue; }
    const p = c.player;
    if (p.club === 'ICON') { result[s.id] = 3; continue; }
    const pts = stepPoints(count.club[p.club] || 0, CHEM_STEPS.club) + stepPoints(count.nat[p.nat] || 0, CHEM_STEPS.nat)
      + stepPoints((count.liga[p.liga] || 0) + icons, CHEM_STEPS.liga);
    result[s.id] = Math.min(3, pts);
  }
  return result;
}
// Teamrating zoals FC: gemiddelde, plus een bonus voor spelers die boven het gemiddelde uitsteken.
function teamRating(list) {
  if (!list.length) return 0;
  const r = list.map((c) => c.ovr).concat(Array(Math.max(0, 11 - list.length)).fill(0));
  const avg = r.reduce((a, b) => a + b, 0) / 11;
  const extra = r.reduce((t, x) => t + Math.max(0, x - avg), 0) / 11;
  return Math.min(99, Math.floor(avg + extra));
}
window.utTeamState = () => {
  loadTeam();
  const owned = ownedCards();
  const byId = new Map(owned.map((c) => [c.g.id, c]));
  const cards = Object.fromEntries(SLOTS.map((s) => [s.id, byId.get(team[s.id])]).filter(([, c]) => c));
  const bench = BENCH.map((b) => byId.get(team[b])).filter(Boolean);
  const chem = chemistry(cards);
  return { cards, bench, chem, owned, ovr: teamRating(Object.values(cards)), chemTotal: Object.values(chem).reduce((a, b) => a + b, 0) };
};

function renderTeam() {
  loadTeam();
  const owned = ownedCards();
  const byId = new Map(owned.map((c) => [c.g.id, c]));
  for (const k of Object.keys(team)) if (!byId.has(team[k])) delete team[k];
  const st = window.utTeamState();
  const { cards, chem } = st;

  $('#ut-ovr').textContent = st.ovr;
  $('#ut-chem').textContent = `${st.chemTotal}/33`;
  $('#ut-count').textContent = `${Object.keys(cards).length}/11`;
  $('#ut-chem-bar').style.width = `${(st.chemTotal / 33) * 100}%`;

  $('#ut-pitch-slots').innerHTML = SLOTS.map((s) => {
    const c = cards[s.id];
    const dots = c ? `<div class="ut-chem" title="${chem[s.id]} chemie">${'<i class="on"></i>'.repeat(chem[s.id])}${'<i></i>'.repeat(3 - chem[s.id])}</div>` : '';
    return `<div class="ut-slot ${c ? 'filled' : 'empty'} ${selectedSlot === s.id ? 'selected' : ''} ${c && !inPosition(s, c) ? 'oop' : ''}" data-slot="${s.id}" data-x="${s.x}" data-y="${s.y}">
      ${c ? cardHTML(c, 'sm') + `<button class="ut-remove" data-remove="${s.id}" aria-label="Haal uit team">×</button>` : `<div class="ut-empty-card"><b>${slotPos(s)}</b><span>+</span></div>`}
      ${dots}
    </div>`;
  }).join('');
  document.querySelectorAll('#ut-pitch-slots .ut-slot').forEach((el) => { el.style.left = el.dataset.x + '%'; el.style.top = el.dataset.y + '%'; });

  $('#ut-bench').innerHTML = BENCH.map((b) => {
    const c = byId.get(team[b]);
    return `<div class="ut-slot bench ${c ? 'filled' : 'empty'} ${selectedSlot === b ? 'selected' : ''}" data-slot="${b}">
      ${c ? cardHTML(c, 'sm') + `<button class="ut-remove" data-remove="${b}" aria-label="Haal van de bank">×</button>` : '<div class="ut-empty-card"><b>Wissel</b><span>+</span></div>'}
    </div>`;
  }).join('');

  const sel = $('#ut-filter');
  const vakken = [...new Set(owned.map((c) => (c.g.transfer ? 'Transfermarkt' : c.g.vak)))].sort();
  sel.innerHTML = '<option value="">Alle kaarten</option>' + vakken.map((v) => `<option>${esc(v)}</option>`).join('');
  sel.value = vakken.includes(clubFilter) ? clubFilter : '';
  const inTeam = new Set(Object.values(team));
  const slot = SLOTS.find((s) => s.id === selectedSlot);
  const want = slot ? slotPos(slot) : null;
  const list = owned.filter((c) => !sel.value || (c.g.transfer ? 'Transfermarkt' : c.g.vak) === sel.value);
  $('#ut-club-count').textContent = `${owned.length} ${owned.length === 1 ? 'kaart' : 'kaarten'}`;
  $('#ut-hint').textContent = selectedSlot
    ? (want ? `Kies een ${POS_NAMES[want] || want}. Alleen op zijn eigen positie krijgt een speler chemie.` : 'Kies een wissel voor op de bank.')
    : 'Tik op een plek in het veld of op de bank en kies een kaart. Of laat het beste team maken.';
  $('#ut-club').innerHTML = list.map((c) => `
    <button class="ut-club-card ${inTeam.has(c.g.id) ? 'in-team' : ''} ${want && c.player.pos === want ? 'fits' : ''}" data-card="${esc(c.g.id)}">
      ${cardHTML(c, 'md')}${inTeam.has(c.g.id) ? '<span class="ut-badge">In team</span>' : ''}
    </button>`).join('') || '<p class="hint">Nog geen kaarten. Open eerst je packs bij <b>Cijfers</b>.</p>';
}

function placeCard(cardId) {
  let slot = selectedSlot;
  const c = ownedCards().find((x) => x.g.id === cardId);
  if (!c) return;
  if (!slot) {
    const free = SLOTS.filter((s) => !team[s.id]);
    slot = (free.find((s) => slotPos(s) === c.player.pos) || free.find((s) => FITS[slotPos(s)].includes(c.player.pos)) || free[0])?.id
      || BENCH.find((b) => !team[b]);
    if (!slot) return;
  }
  for (const k of Object.keys(team)) if (team[k] === cardId) delete team[k];
  team[slot] = cardId;
  selectedSlot = null;
  saveTeam();
  renderTeam();
}

// Beste elftal: per positie de hoogste rating, daarna de chemie verbeteren door te ruilen waar dat punten oplevert.
function autoTeam() {
  const pool = ownedCards();
  const used = new Set();
  team = {};
  for (const pass of ['exact', 'fit', 'any']) {
    for (const s of SLOTS) {
      if (team[s.id]) continue;
      const pick = pool.find((c) => !used.has(c.g.id) && (pass === 'any' || (pass === 'exact' ? c.player.pos === slotPos(s) || (slotPos(s) === 'CAM' && c.player.pos === 'CM') : FITS[slotPos(s)].includes(c.player.pos))));
      if (pick) { team[s.id] = pick.g.id; used.add(pick.g.id); }
    }
  }
  // Ruilen met spelers van de bank/club als dat meer chemie oplevert zonder veel rating te verliezen.
  const byId = new Map(pool.map((c) => [c.g.id, c]));
  const score = () => { const cards = Object.fromEntries(SLOTS.map((s) => [s.id, byId.get(team[s.id])]).filter(([, c]) => c)); const ch = chemistry(cards); return teamRating(Object.values(cards)) * 3 + Object.values(ch).reduce((a, b) => a + b, 0); };
  for (let round = 0; round < 2; round++) {
    for (const s of SLOTS) {
      let best = score();
      for (const c of pool) {
        if (Object.values(team).includes(c.g.id) || c.player.pos !== slotPos(s)) continue;
        const old = team[s.id]; team[s.id] = c.g.id;
        const sc = score();
        if (sc > best) best = sc; else team[s.id] = old;
      }
    }
  }
  const rest = pool.filter((c) => !Object.values(team).includes(c.g.id));
  BENCH.forEach((b, i) => { if (rest[i]) team[b] = rest[i].g.id; });
  selectedSlot = null;
  saveTeam();
  renderTeam();
}

$('#ut-pitch-slots').addEventListener('click', onSlotClick);
$('#ut-bench').addEventListener('click', onSlotClick);
function onSlotClick(e) {
  const rm = e.target.closest('[data-remove]');
  if (rm) { delete team[rm.dataset.remove]; saveTeam(); return renderTeam(); }
  const slot = e.target.closest('[data-slot]');
  if (!slot) return;
  selectedSlot = selectedSlot === slot.dataset.slot ? null : slot.dataset.slot;
  renderTeam();
  if (selectedSlot && matchMedia('(max-width: 900px)').matches) $('#ut-club').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
$('#ut-club').addEventListener('click', (e) => { const card = e.target.closest('[data-card]'); if (card) placeCard(card.dataset.card); });
$('#ut-filter').addEventListener('change', (e) => { clubFilter = e.target.value; renderTeam(); });
$('#ut-auto').addEventListener('click', autoTeam);
$('#ut-clear').addEventListener('click', () => { team = {}; selectedSlot = null; saveTeam(); renderTeam(); });

// ---------- Foto van je team (alleen op de pc) ----------
async function teamPhoto() {
  const btn = $('#ut-photo-btn');
  const msg = $('#ut-photo-msg');
  btn.disabled = true;
  msg.textContent = 'Foto maken…';
  const naam = ($('#hello').textContent.match(/Hoi (.+?)!/) || [])[1];
  const photo = document.createElement('div');
  photo.id = 'ut-photo';
  photo.innerHTML = `<div class="utp-head"><span class="fc-logo">UT</span>
      <div class="utp-title"><b>${naam ? `Ultimate Team van ${esc(naam)}` : 'Mijn Ultimate Team'}</b><span>${new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
      <div class="utp-stats"><div><span>Rating</span><b>${esc($('#ut-ovr').textContent)}</b></div><div><span>Chemie</span><b>${esc($('#ut-chem').textContent)}</b></div></div></div>
    <div class="utp-foot">Somtoday Ultimate Team</div>`;
  const pitch = $('#ut .ut-pitch').cloneNode(true);
  pitch.querySelectorAll('.ut-remove').forEach((el) => el.remove());
  pitch.querySelectorAll('.selected').forEach((el) => el.classList.remove('selected'));
  photo.insertBefore(pitch, photo.querySelector('.utp-foot'));
  photo.style.top = `${window.scrollY}px`;
  document.body.appendChild(photo);
  photo.querySelectorAll('.ut-slot').forEach((el) => { el.style.left = el.dataset.x + '%'; el.style.top = el.dataset.y + '%'; });
  paintCards(photo);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise((r) => setTimeout(r, 150));
  const rect = photo.getBoundingClientRect();
  try {
    const res = await api('/api/team-photo', { x: rect.left + window.scrollX, y: rect.top + window.scrollY, width: rect.width, height: rect.height });
    msg.textContent = `Opgeslagen in je Downloads-map: ${res.naam}`;
  } catch (err) {
    msg.textContent = err.message;
  } finally {
    photo.remove();
    btn.disabled = false;
  }
}
$('#ut-photo-btn').addEventListener('click', teamPhoto);

window.renderTeam = renderTeam;
