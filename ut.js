// ---------- Somtoday Ultimate Team: kaarten, chemie en je elftal ----------
// De spelers zelf staan in players.js (echte FC-ratings). Elk cijfer krijgt een speler die past bij het cijfer:
// hoe hoger je cijfer, hoe beter de speler. Onder de 4 krijg je een BN'er.

const ALL_PLAYERS = DB;
const WOMEN = FOOTBALLERS.filter((p) => !p.man);
const MEN = FOOTBALLERS.filter((p) => p.man);
const WOMEN_MIN = Math.min(...WOMEN.map((p) => p.base));
const WOMEN_MAX = Math.max(...WOMEN.map((p) => p.base));
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
    // Onder de 4: BN'ers. 4 tot 6: voetbalsters. Vanaf een 6: mannelijke voetballers (hoe hoger, hoe beter).
    const pool = g.cijfer < 4 ? CELEBS : g.cijfer < 6 ? WOMEN : MEN;
    const target = g.cijfer < 4 ? targetRating(g.cijfer)
      : g.cijfer < 6 ? WOMEN_MIN + (WOMEN_MAX - WOMEN_MIN) * ((g.cijfer - 4) / 2)
        : 65 + (g.cijfer - 6) * 6.5;
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
    [/culturele|ckv/, 'Kunst en cultuur'], [/lichamelijke/, 'Lichamelijke opvoeding'], [/bedrijfseconomie/, 'Bedrijfseconomie'],
    [/maatschappijwetenschappen/, 'Maatschappijwetenschappen'], [/levensbeschouwing/, 'Levensbeschouwing'],
  ];
  return (map.find(([re]) => re.test(v)) || [null, vak ? vak.charAt(0).toUpperCase() + vak.slice(1) : ''])[1];
}
// Afkorting van het vak voor op het cijferlabel van de kaart.
function vakAfk(vak) {
  const v = String(vak || '').toLowerCase();
  const map = [[/nederlands/, 'NED'], [/engels/, 'ENG'], [/duits/, 'DU'], [/frans/, 'FA'], [/spaans/, 'SP'], [/wiskunde/, 'WIS'], [/geschiedenis/, 'GS'],
    [/aardrijkskunde/, 'AK'], [/biologie/, 'BIO'], [/natuurkunde/, 'NAT'], [/scheikunde/, 'SCH'], [/economie|bedrijfsec/, 'ECO'], [/lichamelijke|gym/, 'LO'],
    [/culturele|ckv/, 'CKV'], [/maatschappij/, 'MAW'], [/levensbesch/, 'LEV'], [/informatica/, 'INF'], [/tekenen|beeldend/, 'BV'], [/muziek/, 'MU'], [/latijn/, 'LA'], [/grieks/, 'GR'], [/filosofie/, 'FI'], [/natuur/, 'NASK']];
  return (map.find(([re]) => re.test(v)) || [null, v.replace(/[^a-z]/g, '').slice(0, 3).toUpperCase()])[1];
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
  // De rating op de kaart is je cijfer x 10: een 9 wordt 90, een 7,4 wordt 74. Gekochte kaarten houden hun echte rating.
  const ovr = !g.transfer && g.cijfer != null ? Math.max(10, Math.min(99, Math.round(g.cijfer * 10))) : player.base;
  const h = hashOf(player.key + (g.transfer ? '' : g.id));
  const stats = POS_BIAS[player.pos].map((b, i) => Math.max(20, Math.min(99, ovr + 5, ovr + b + (((h >> (i * 4)) & 15) - 7))));
  return { g, player, ovr, tier: tierFor(g, ovr), stats };
}

// ---------- Portret ----------
// Getekend als SVG (zonder inline style: dat staat de beveiliging niet toe). Zo realistisch als het in SVG kan:
// echte hoofdvorm met kaak, oren en nek, schaduw, amandelogen, een neus met neusvleugels en lippen.
const SKINS = [['#efc6a4', '#cf9d78', '#b07f5c'], ['#d9a77c', '#b67f53', '#946240'], ['#b98157', '#956139', '#774a29'],
  ['#8a5532', '#6a3d20', '#512d15'], ['#5a3720', '#432814', '#2f1a0c'], ['#f6dac2', '#e2b693', '#c69874']].map((s) => s.map((c) => c.slice(0, 7)));
const HAIRS = ['#4a2e1a', '#24170e', '#9a4a1f', '#d2ab62', '#121212', '#9a9a9a', '#ece0c2', '#7a5a36'];
const EYES = ['#4a2e18', '#3a6a9a', '#4c6b3e'];
let avatarSeq = 0;

function lighten(hex, amt) {
  const n = parseInt(hex.slice(1, 7), 16);
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((c) => Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt)));
  return '#' + ch.map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}

// Hoofdvormen: rond, hoekig (brede kaak) en smal (spitse kin).
const HEADS = [
  'M60 21 C79 21 88 35 88 53 C88 64 86 72 81 79 C76 86 69 91 60 91 C51 91 44 86 39 79 C34 72 32 64 32 53 C32 35 41 21 60 21 Z',
  'M60 21 C79 21 88 35 88 53 C88 65 88 73 84 80 C80 87 71 91 60 91 C49 91 40 87 36 80 C32 73 32 65 32 53 C32 35 41 21 60 21 Z',
  'M60 21 C78 21 87 35 87 53 C87 63 84 71 78 79 C73 86 67 92 60 92 C53 92 47 86 42 79 C36 71 33 63 33 53 C33 35 42 21 60 21 Z',
];
const NOSES = [
  ['M60 57 C59 62 57 66 56 68.5 C57.5 70.6 59 71 60 70.6 C61 71 62.5 70.6 64 68.5 C63 66 61 62 60 57 Z', 'M55.5 69 Q57.5 71.2 60 70.3 Q62.5 71.2 64.5 69'],
  ['M60 57 C59 62 56.5 66 54 69 C56 71.6 58.5 71.6 60 70.8 C61.5 71.6 64 71.6 66 69 C63.5 66 61 62 60 57 Z', 'M53.8 69.2 Q56.8 72.4 60 70.8 Q63.2 72.4 66.2 69.2'],
  ['M60 55 C59.6 61 58.2 66 57 69.5 C58 71.2 59 71.4 60 71 C61 71.4 62 71.2 63 69.5 C61.8 66 60.4 61 60 55 Z', 'M56.5 69.8 Q58.3 71.6 60 71 Q61.7 71.6 63.5 69.8'],
];

// Portret als SVG: hoofdvorm, oren, nek, schaduw, ogen met iris en lichtpuntje, neus, lippen, wenkbrauwen, kapsel en baard.
// Elke persoon heeft een eigen gezicht (breedte, kaak, neus, ogen, wenkbrauwen, lippen) en een eigen kapsel.
function avatarSVG(p, shirt, mood, nummer) {
  const id = `av${++avatarSeq}`;
  const f = p.face || { w: 0, jaw: 0, nose: 0, brow: 1, eye: 1, lip: 1 };
  const [skin, shade, deep] = SKINS[p.skin] || SKINS[0];
  const hair = HAIRS[p.hc] || HAIRS[0];
  const top = p.bleach ? HAIRS[6] : hair;
  const eye = EYES[p.eyes] || EYES[0];
  const accent = p.kit?.[1] || '#ffffff';
  const silhouette = shirt === '#000';
  const man = p.man !== false;
  const head = HEADS[man ? f.jaw : 2];
  const body = man ? 'M6 120 C8 102 23 95 43 91 L52 89 L60 98 L68 89 L77 91 C97 95 112 102 114 120 Z'
    : 'M14 120 C16 104 28 97 45 93 L53 91 L60 99 L67 91 L75 93 C92 97 104 104 106 120 Z';
  const smile = mood === 'blij' ? 1 : mood === 'sip' ? -1 : 0;
  const ey = 56.6, ex = 12 + (f.eye - 1) * 0.8, er = 2.15 + f.eye * 0.15;
  const bw = man ? 2.3 + f.brow * 0.55 : 1.6;
  const lip = f.lip * 0.5;
  const H = (d, extra = '') => `<path d="${d}" fill="${hair}" ${extra}/>`;
  const T = (d, extra = '') => `<path d="${d}" fill="${top}" ${extra}/>`;
  const cap = 'M32 53 C30 30 44 19 60 19 C76 19 90 30 88 53 C85 42 79 36 68 35 C58 37 47 37 39 40 C35 43 33 47 32 53 Z';
  const fadeSides = `<path d="M32 56 C31 47 33 41 37 38 L37 60 Z M88 56 C89 47 87 41 83 38 L83 60 Z" fill="${hair}" opacity=".45"/>`;
  const curls = (r, ys) => ys.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');

  const back = {
    lang: H('M29 56 C25 25 44 12 60 12 C76 12 95 25 91 56 L94 106 C87 110 80 106 80 106 L80 62 C78 46 70 38 60 38 C50 38 42 46 40 62 L40 106 C40 106 33 110 26 106 Z'),
    staart: H('M84 40 C101 48 103 78 92 98 C90 84 88 68 80 57 Z'),
    knot: H('M60 13 m-10 0 a10 8.5 0 1 0 20 0 a10 8.5 0 1 0 -20 0'),
    knotm: H('M60 13 m-8.5 0 a8.5 7 0 1 0 17 0 a8.5 7 0 1 0 -17 0'),
    medium: H('M30 60 C26 27 44 15 60 15 C76 15 94 27 90 60 L89 80 C85 82 83 79 83 79 L82 58 C79 43 72 36 60 36 C48 36 41 43 38 58 L37 79 C37 79 35 82 31 80 Z'),
    dreads: `<g fill="${hair}"><rect x="29" y="42" width="6" height="40" rx="3"/><rect x="36" y="46" width="6" height="36" rx="3"/><rect x="78" y="46" width="6" height="36" rx="3"/><rect x="85" y="42" width="6" height="40" rx="3"/></g>`,
    krullang: `<g fill="${hair}">${curls(9, [[31, 56], [29, 70], [31, 83], [89, 56], [91, 70], [89, 83]])}</g>`,
    mullet: H('M33 58 C31 72 32 86 36 95 L45 92 L41 62 Z M87 58 C89 72 88 86 84 95 L75 92 L79 62 Z'),
    afro: `<circle cx="60" cy="42" r="33" fill="${hair}"/>`,
  };
  const front = {
    kaal: '<path d="M45 28 C52 24 63 24 70 27" stroke="#fff" stroke-opacity=".3" stroke-width="3.2" fill="none" stroke-linecap="round"/>',
    kort: H(cap),
    zij: H('M32 55 C30 30 44 19 61 19 C78 19 91 30 88 55 C86 43 80 37 72 35 C62 33 52 36 44 38 C38 40 34 46 32 55 Z') + H('M44 38 C49 26 66 21 85 30 C76 31 66 33 55 38 Z') + `<path d="M46 22 Q45 29 44 37" stroke="${lighten(hair, -.4)}" stroke-opacity=".5" stroke-width="1" fill="none"/>`,
    fade: T('M35 48 C35 29 47 21 60 21 C73 21 85 29 85 48 C82 39 75 34 60 34 C46 34 38 39 35 48 Z') + fadeSides,
    buzz: H('M33 50 C32 31 45 23 60 23 C75 23 88 31 87 50 C83 40 75 35 60 35 C45 35 37 40 33 50 Z', 'opacity=".72"'),
    kuif: H(cap) + T('M40 37 C42 15 67 7 85 22 C75 22 64 27 58 36 Z'),
    gel: H('M33 52 C31 29 45 20 61 20 C77 20 90 30 87 52 C85 40 79 33 71 31 C63 29 54 30 46 32 C39 35 35 43 33 52 Z') + '<path d="M45 26 C55 22 68 22 80 28 M47 29 C56 26 67 26 78 31" stroke="#fff" stroke-opacity=".18" stroke-width="1.1" fill="none"/>',
    krul: `<g fill="${top}">${curls(8, [[37, 40], [45, 29], [55, 24], [66, 24], [76, 29], [84, 40], [60, 31], [49, 35], [71, 35]])}</g>`,
    krulkort: H('M33 49 C32 30 45 22 60 22 C75 22 88 30 87 49 C83 40 75 35 60 35 C45 35 37 40 33 49 Z') + `<g fill="${top}">${curls(4.3, [[38, 37], [44, 30], [51, 26], [60, 24.5], [69, 26], [76, 30], [82, 37], [48, 33], [56, 30], [64, 30], [72, 33]])}</g>` + fadeSides,
    afro: `<circle cx="60" cy="38" r="28" fill="${hair}"/>`,
    dreads: H(cap) + `<g stroke="${lighten(hair, .25)}" stroke-opacity=".5" stroke-width="1.3"><path d="M45 24 L43 40"/><path d="M55 21 L53 37"/><path d="M66 21 L67 37"/><path d="M76 25 L79 40"/></g>`,
    cornrows: H('M33 51 C32 31 45 22 60 22 C75 22 88 31 87 51 C83 41 75 35 60 35 C45 35 37 41 33 51 Z') + '<g stroke="#fff" stroke-opacity=".16" stroke-width="1.4" fill="none"><path d="M45 25 Q42 36 37 46"/><path d="M53 22.5 Q51 30 49 36"/><path d="M60 22 L60 35"/><path d="M67 22.5 Q69 30 71 36"/><path d="M75 25 Q78 36 83 46"/></g>',
    mohawk: H('M33 50 C32 31 45 23 60 23 C75 23 88 31 87 50 C83 40 75 35 60 35 C45 35 37 40 33 50 Z', 'opacity=".35"') + T('M51 38 C49 20 54 10 60 9 C66 10 71 20 69 38 C66 35 54 35 51 38 Z'),
    stekel: H(cap) + T('M38 40 L41 24 L46 32 L50 17 L55 30 L60 15 L65 29 L70 17 L74 31 L79 22 L82 38 C74 34 62 33 52 35 C46 36 41 38 38 40 Z'),
    mullet: H(cap),
    lang: H(cap), staart: H('M32 53 C30 30 44 19 60 19 C76 19 90 30 88 53 C84 41 76 33 60 33 C44 33 36 41 32 53 Z'), knot: H('M32 53 C30 30 44 19 60 19 C76 19 90 30 88 53 C84 41 76 33 60 33 C44 33 36 41 32 53 Z'),
    knotm: H('M33 53 C31 30 45 21 61 21 C77 21 90 31 87 53 C84 40 76 33 60 33 C44 33 36 40 33 53 Z') + '<path d="M44 28 C52 24 68 24 76 28" stroke="#fff" stroke-opacity=".14" stroke-width="1.2" fill="none"/>',
    medium: H('M31 58 C29 29 44 18 61 18 C79 18 92 29 89 58 C85 44 78 36 64 34 C54 40 43 42 35 46 C33 50 32 54 31 58 Z'),
    krullang: `<g fill="${hair}">${curls(9.5, [[36, 42], [43, 30], [54, 23], [67, 23], [78, 30], [85, 42], [60, 30]])}</g>`,
  };
  const snor = H('M49 73.6 C53 71 57 71 60 72.4 C63 71 67 71 71 73.6 C67 73.2 64 74.2 60 74.6 C56 74.2 53 73.2 49 73.6 Z');
  const beards = {
    stoppels: H('M36 63 C38 80 48 90 60 90 C72 90 82 80 84 63 C80 72 73 76 60 76 C47 76 40 72 36 63 Z', 'opacity=".28"') + H('M50 73 C55 71.5 65 71.5 70 73 L69 75 C64 74 56 74 51 75 Z', 'opacity=".3"'),
    kort: H('M35 61 C36 82 47 93 60 93 C73 93 84 82 85 61 C82 71 76 74 68 72 C64 71 56 71 52 72 C44 74 38 71 35 61 Z', 'opacity=".7"'),
    baard: H('M35 61 C36 82 47 93 60 93 C73 93 84 82 85 61 C82 71 76 74 68 72 C64 71 56 71 52 72 C44 74 38 71 35 61 Z'),
    vol: H('M33 57 C33 84 45 99 60 99 C75 99 87 84 87 57 C84 70 77 75 68 73 C64 72 56 72 52 73 C43 75 36 70 33 57 Z'),
    sik: H('M52 79.5 C52 88 56 92.5 60 92.5 C64 92.5 68 88 68 79.5 C65 82.5 55 82.5 52 79.5 Z'),
    snor: '',
  };
  const beard = man ? (beards[p.beard] ?? '') : '';
  const withSnor = man && ['snor', 'baard', 'vol', 'kort', 'sik'].includes(p.beard);
  const sx = 1 + (f.w || 0);

  const svg = `<svg viewBox="0 0 120 120" class="pc-avatar" aria-hidden="true">
    <defs>
      <radialGradient id="${id}f" cx="42%" cy="34%" r="72%"><stop offset="0" stop-color="${lighten(skin, .1)}"/><stop offset=".55" stop-color="${skin}"/><stop offset="1" stop-color="${shade}"/></radialGradient>
      <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient>
      <linearGradient id="${id}h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lighten(hair, .3)}"/><stop offset=".5" stop-color="${hair}"/><stop offset="1" stop-color="${lighten(hair, -.35)}"/></linearGradient>
      <linearGradient id="${id}n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${deep}"/><stop offset="1" stop-color="${shade}"/></linearGradient>
    </defs>
    <g transform="translate(60 0) scale(${sx.toFixed(3)} 1) translate(-60 0)">${back[p.hair] || ''}</g>
    <path d="${body}" fill="${shirt}"/>
    ${silhouette ? '' : `<path d="M6 120 C7 112 11 106 15 103 L20 105 C16 109 14 115 13 120 Z M114 120 C113 112 109 106 105 103 L100 105 C104 109 106 115 107 120 Z" fill="${accent}" opacity=".9"/>
    <path d="M45 91 L60 105 L75 91" stroke="${accent}" stroke-width="3" fill="none"/>
    ${nummer ? `<text x="88" y="114" font-size="10" font-weight="800" fill="${accent}" fill-opacity=".9" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif">${nummer}</text>` : ''}`}
    <path d="${body}" fill="url(#${id}s)"/>
    <path d="M50 77 L50 95 Q60 102 70 95 L70 77 Z" fill="url(#${id}n)"/>
    <path d="M50 88 Q60 94 70 88" stroke="${deep}" stroke-opacity=".35" stroke-width="1.2" fill="none"/>
    <g transform="translate(60 0) scale(${sx.toFixed(3)} 1) translate(-60 0)">
    <ellipse cx="33" cy="58" rx="4.6" ry="7.5" fill="${shade}"/><ellipse cx="87" cy="58" rx="4.6" ry="7.5" fill="${shade}"/>
    <path d="M32 55 Q34 58 33 62 M88 55 Q86 58 87 62" stroke="${deep}" stroke-opacity=".5" stroke-width="1" fill="none"/>
    <path d="${head}" fill="url(#${id}f)"/>
    <path d="M38 74 C44 86 52 91 60 91 C68 91 76 86 82 74 C78 84 70 88 60 88 C50 88 42 84 38 74 Z" fill="${deep}" opacity=".32"/>
    <path d="M36 60 C37 70 40 76 44 80 M84 60 C83 70 80 76 76 80" stroke="${deep}" stroke-opacity=".16" stroke-width="3" fill="none"/>
    <ellipse cx="${60 - ex - 4}" cy="65" rx="5" ry="3" fill="#d9776a" opacity="${man ? .07 : .16}"/><ellipse cx="${60 + ex + 4}" cy="65" rx="5" ry="3" fill="#d9776a" opacity="${man ? .07 : .16}"/>
    <path d="M${60 - ex - 6} 59.5 Q${60 - ex} 62 ${60 - ex + 6} 59.5 M${60 + ex - 6} 59.5 Q${60 + ex} 62 ${60 + ex + 6} 59.5" stroke="${deep}" stroke-opacity=".28" stroke-width="1" fill="none"/>
    <g fill="#fbfaf7"><path d="M${60 - ex - 5.6} ${ey} Q${60 - ex} ${ey - 4.6} ${60 - ex + 5.6} ${ey} Q${60 - ex} ${ey + 3.6} ${60 - ex - 5.6} ${ey} Z"/><path d="M${60 + ex - 5.6} ${ey} Q${60 + ex} ${ey - 4.6} ${60 + ex + 5.6} ${ey} Q${60 + ex} ${ey + 3.6} ${60 + ex - 5.6} ${ey} Z"/></g>
    <g fill="${eye}"><circle cx="${60 - ex}" cy="${ey + .2}" r="${er}"/><circle cx="${60 + ex}" cy="${ey + .2}" r="${er}"/></g>
    <g fill="#0b0b0b"><circle cx="${60 - ex}" cy="${ey + .2}" r="1.05"/><circle cx="${60 + ex}" cy="${ey + .2}" r="1.05"/></g>
    <g fill="#fff" opacity=".85"><circle cx="${60 - ex + .8}" cy="${ey - .6}" r=".6"/><circle cx="${60 + ex + .8}" cy="${ey - .6}" r=".6"/></g>
    <path d="M${60 - ex - 6} ${ey} Q${60 - ex} ${ey - 5.2} ${60 - ex + 6} ${ey - .2} M${60 + ex - 6} ${ey - .2} Q${60 + ex} ${ey - 5.2} ${60 + ex + 6} ${ey}" stroke="${deep}" stroke-width="${man ? 1.2 : 1.7}" fill="none" stroke-linecap="round"/>
    ${man ? '' : `<path d="M${60 - ex - 6} ${ey - .3} l-1.6 -1.4 M${60 + ex + 6} ${ey - .3} l1.6 -1.4" stroke="#1a1a1a" stroke-width="1" stroke-linecap="round"/>`}
    <g stroke="${p.hair === 'kaal' ? deep : hair}" stroke-width="${bw}" fill="none" stroke-linecap="round" opacity=".92">
      <path d="M${60 - ex - 7} ${50.5 + (f.brow === 2 ? .8 : 0)} Q${60 - ex - 1} ${46.6 + (smile < 0 ? 2 : 0)} ${60 - ex + 6} ${49 + (smile < 0 ? 1.5 : 0)}"/><path d="M${60 + ex - 6} ${49 + (smile < 0 ? 1.5 : 0)} Q${60 + ex + 1} ${46.6 + (smile < 0 ? 2 : 0)} ${60 + ex + 7} ${50.5 + (f.brow === 2 ? .8 : 0)}"/></g>
    <path d="${NOSES[f.nose][0]}" fill="${shade}" opacity=".42"/>
    <path d="M59 58 C58.6 62 58 65 57.5 67" stroke="#fff" stroke-opacity=".18" stroke-width="1.2" fill="none"/>
    <path d="${NOSES[f.nose][1]}" stroke="${deep}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
    ${beard}
    <path d="M${52 - lip} 78.5 Q56 ${77 - lip * .6 + smile * -1.2} 60 ${77.6 - lip * .4 + smile * -0.4} Q64 ${77 - lip * .6 + smile * -1.2} ${68 + lip} 78.5" stroke="${deep}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <path d="M${53 - lip} 79 Q60 ${82.5 + lip + smile} ${67 + lip} 79 Q60 ${80.4 + smile * .5} ${53 - lip} 79 Z" fill="${man ? lighten(shade, -.05) : '#b4545a'}" opacity=".85"/>
    ${man ? '' : `<path d="M${53 - lip} 78.6 Q56 76.6 60 77.6 Q64 76.6 ${67 + lip} 78.6 Q60 79.4 ${53 - lip} 78.6 Z" fill="#b4545a" opacity=".7"/>`}
    ${withSnor ? snor : ''}
    ${front[p.hair] || ''}
    ${p.band ? `<path d="M31 45 C40 37 80 37 89 45 L89 50 C80 42 40 42 31 50 Z" fill="${accent === '#ffffff' ? '#f4f4f4' : accent}"/>` : ''}
    </g>
  </svg>`;
  return svg.split(`fill="${hair}"`).join(`fill="url(#${id}h)"`);
}

// Echte foto van de speler (Wikipedia/Wikimedia Commons), uitgesneden tot hoofd en schouders. Lukt laden niet: getekend poppetje.
// Spelersfoto: al uitgesneden (hoofd en schouders) en meegeleverd met de app, dus snel en ook zonder internet.
const photoUrl = (p) => (typeof PHOTOS !== 'undefined' && PHOTOS[p.key] ? (window.PHOTO_DIR || 'spelers/') + PHOTOS[p.key] : null);
function portrait(p, tier) {
  const src = photoUrl(p);
  if (!src) return avatarSVG(p, p.kit[0], MOODS[tier], '');
  return `<div class="fc-pic"><img class="fc-img" src="${esc(src)}" alt="" draggable="false" decoding="async" data-key="${esc(p.key)}" data-tier="${tier}"></div>`;
}
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || !img.classList.contains('fc-img')) return;
  const p = BY_NAME.get(img.dataset.key);
  if (p) img.closest('.fc-photo').innerHTML = avatarSVG(p, p.kit[0], MOODS[img.dataset.tier], '');
}, true);

const MOODS = { icon: 'blij', toty: 'blij', rare: 'blij', gold: 'lach', silver: 'lach', bronze: 'neutraal', red: 'sip' };

// De kaart zoals in FC: rating, positie, vlag en club links; portret rechts; naam; zes statistieken.
// size: 'lg' (pack), 'md' (club/markt), 'sm' (veld).
function cardHTML(c, size = 'md') {
  const p = c.player;
  const g = c.g;
  const labels = p.pos === 'GK' ? GK_LABELS : STAT_LABELS;
  const room = size === 'sm' ? 10.4 : 12.4;
  const nameSize = Math.max(0.62, Math.min(size === 'sm' ? 1.12 : 1.28, room / (p.naam.length * 0.6))).toFixed(2);
  const cijfer = g.transfer ? '' : String(g.resultaat || (g.cijfer != null ? String(g.cijfer).replace('.', ',') : ''));
  const gcls = g.cijfer == null ? '' : g.cijfer >= 8 ? 'top' : g.cijfer >= 5.5 ? 'ok' : 'bad';
  // Geen afkortingen: lange namen worden kleiner geschreven zodat ze passen.
  const fit = (text, room) => Math.max(0.5, Math.min(1, room / (String(text).length * 0.62))).toFixed(2);
  const vakNaam = g.transfer ? 'Transfermarkt' : vakKort(g.vak);
  const foot = g.transfer && g.vak === '' ? '' : `<span class="fc-vak" data-size="${fit(vakNaam, size === 'sm' ? 9 : 12.5)}">${esc(vakNaam)}</span>`;
  const clubNaam = CLUBS[p.club]?.[0] || '';
  return `<div class="fc-card fc-${size}" data-tier="${c.tier.id}">
    <div class="fc-bg"></div><div class="fc-shine"></div>
    <div class="fc-inner">
      <div class="fc-left">
        <div class="fc-ovr">${c.ovr}</div>
        <div class="fc-pos">${p.pos}</div>
        <div class="fc-badges">${flagSVG(p.nat)}</div>
      </div>
      <div class="fc-photo">${portrait(p, c.tier.id, size)}</div>
      <div class="fc-name"><span data-size="${nameSize}">${esc(p.naam)}</span></div>
      <div class="fc-stats">${c.stats.map((v, i) => `<div><b>${v}</b><span>${labels[i]}</span></div>`).join('')}</div>
      ${foot ? `<div class="fc-foot">${foot}</div>` : ''}
      ${clubNaam ? `<div class="fc-club" data-c1="${CLUBS[p.club]?.[2] || ''}" data-c2="${CLUBS[p.club]?.[3] || ''}"><span data-size="${fit(clubNaam, size === 'sm' ? 10 : 13)}">${esc(clubNaam)}</span></div>` : ''}

    </div>
  </div>`;
}

function paintCards(root = document) {
  root.querySelectorAll('.fc-card [data-size]').forEach((el) => { el.style.fontSize = el.dataset.size + 'em'; });
  // Foto zo vergroten en verschuiven dat het gezicht altijd even groot en op dezelfde plek staat (hoofd en schouders).
  root.querySelectorAll('img.fc-img.faced[data-f]').forEach((img) => {
    const [x, y, w, h, ar] = img.dataset.f.split(',').map(Number);
    const k = 1.07; // hoogte/breedte van het fotovak
    let ih = (0.4 * k) / h; let iw = ih * ar;
    const s = Math.max(1, 1 / iw, k / ih); iw *= s; ih *= s;
    let left = 0.5 - (x + w / 2) * iw; let top = 0.43 * k - (y + h / 2) * ih;
    left = Math.min(0, Math.max(1 - iw, left)); top = Math.min(0, Math.max(k - ih, top));
    img.style.width = (iw * 100).toFixed(2) + '%';
    img.style.left = (left * 100).toFixed(2) + '%';
    img.style.top = ((top / k) * 100).toFixed(2) + '%';
  });
  // Clubnaam in de clubkleuren (tekst altijd goed leesbaar).
  root.querySelectorAll('.fc-club[data-c1]').forEach((el) => {
    const lum = (h) => { const n = parseInt(String(h).slice(1, 7), 16) || 0; return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
    const bg = el.dataset.c1, fg = el.dataset.c2;
    if (!bg) return;
    el.style.setProperty('--cb', bg); el.style.setProperty('--cr', fg || bg);
    el.style.setProperty('--ct', Math.abs(lum(bg) - lum(fg)) > 0.35 ? fg : lum(bg) > 0.55 ? '#111111' : '#ffffff');
  });
}
// Lichtgewicht: alleen nieuw toegevoegde kaarten verwerken (geen hele pagina doorzoeken bij elke wijziging).
new MutationObserver((list) => {
  for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1 && (n.classList?.contains('fc-card') || n.querySelector?.('.fc-name'))) paintCards(n);
}).observe(document.body, { childList: true, subtree: true });

// ---------- Je elftal en wissels: kies je opstelling ----------
// Elke plek heeft een id (waarop je speler bewaard wordt), een positie en een plek op het veld (x/y in %).
const BACK4 = [{ id: 'LB', x: 12, y: 68 }, { id: 'CB1', pos: 'CB', x: 36, y: 71 }, { id: 'CB2', pos: 'CB', x: 64, y: 71 }, { id: 'RB', x: 88, y: 68 }];
const GK = { id: 'GK', x: 50, y: 89 };
const FORMATIONS = {
  '4-3-3': [{ id: 'LW', x: 17, y: 19 }, { id: 'ST', x: 50, y: 15 }, { id: 'RW', x: 83, y: 19 },
    { id: 'CM1', pos: 'CM', x: 24, y: 44 }, { id: 'CM2', pos: 'CAM', x: 50, y: 40 }, { id: 'CM3', pos: 'CM', x: 76, y: 44 }, ...BACK4, GK],
  '4-4-2': [{ id: 'ST', x: 35, y: 16 }, { id: 'ST2', pos: 'ST', x: 65, y: 16 },
    { id: 'LW', x: 11, y: 42 }, { id: 'CM1', pos: 'CM', x: 37, y: 45 }, { id: 'CM3', pos: 'CM', x: 63, y: 45 }, { id: 'RW', x: 89, y: 42 }, ...BACK4, GK],
  '4-2-3-1': [{ id: 'ST', x: 50, y: 14 }, { id: 'LW', x: 14, y: 33 }, { id: 'CM2', pos: 'CAM', x: 50, y: 34 }, { id: 'RW', x: 86, y: 33 },
    { id: 'CM1', pos: 'CM', x: 35, y: 53 }, { id: 'CM3', pos: 'CM', x: 65, y: 53 },
    { id: 'LB', x: 11, y: 70 }, { id: 'CB1', pos: 'CB', x: 36, y: 73 }, { id: 'CB2', pos: 'CB', x: 64, y: 73 }, { id: 'RB', x: 89, y: 70 }, { id: 'GK', x: 50, y: 90 }],
  '3-5-2': [{ id: 'ST', x: 35, y: 16 }, { id: 'ST2', pos: 'ST', x: 65, y: 16 },
    { id: 'LW', x: 10, y: 42 }, { id: 'CM1', pos: 'CM', x: 31, y: 47 }, { id: 'CM2', pos: 'CAM', x: 50, y: 38 }, { id: 'CM3', pos: 'CM', x: 69, y: 47 }, { id: 'RW', x: 90, y: 42 },
    { id: 'CB1', pos: 'CB', x: 24, y: 71 }, { id: 'CB3', pos: 'CB', x: 50, y: 73 }, { id: 'CB2', pos: 'CB', x: 76, y: 71 }, GK],
  '5-3-2': [{ id: 'ST', x: 35, y: 16 }, { id: 'ST2', pos: 'ST', x: 65, y: 16 },
    { id: 'CM1', pos: 'CM', x: 24, y: 42 }, { id: 'CM2', pos: 'CM', x: 50, y: 40 }, { id: 'CM3', pos: 'CM', x: 76, y: 42 },
    { id: 'LB', x: 8, y: 64 }, { id: 'CB1', pos: 'CB', x: 29, y: 71 }, { id: 'CB3', pos: 'CB', x: 50, y: 73 }, { id: 'CB2', pos: 'CB', x: 71, y: 71 }, { id: 'RB', x: 92, y: 64 }, GK],
  '4-1-2-1-2': [{ id: 'ST', x: 35, y: 14 }, { id: 'ST2', pos: 'ST', x: 65, y: 14 }, { id: 'CM2', pos: 'CAM', x: 50, y: 31 },
    { id: 'CM1', pos: 'CM', x: 24, y: 45 }, { id: 'CM3', pos: 'CM', x: 76, y: 45 }, { id: 'CM4', pos: 'CM', x: 50, y: 55 },
    { id: 'LB', x: 11, y: 70 }, { id: 'CB1', pos: 'CB', x: 36, y: 73 }, { id: 'CB2', pos: 'CB', x: 64, y: 73 }, { id: 'RB', x: 89, y: 70 }, { id: 'GK', x: 50, y: 90 }],
};
const FIVE_ROWS = new Set(['4-2-3-1', '4-1-2-1-2']);
let formation = (() => { try { return FORMATIONS[localStorage.getItem('ut-form')] ? localStorage.getItem('ut-form') : '4-3-3'; } catch { return '4-3-3'; } })();
let SLOTS = FORMATIONS[formation];
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
let clubSort = (() => { try { return ['rating', 'vak', 'positie'].includes(localStorage.getItem('ut-sort')) ? localStorage.getItem('ut-sort') : 'rating'; } catch { return 'rating'; } })();
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

// Chemielijnen zoals in FC: tussen spelers die naast elkaar staan. Groen = sterke link, oranje = zwak, rood = geen.
// Lijnen tussen spelers die dicht bij elkaar staan (werkt voor elke opstelling): elke speler met zijn 2-3 dichtste buren.
function linksFor(slots) {
  const d = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.1);
  const set = new Map();
  for (const a of slots) {
    const near = slots.filter((b) => b !== a).sort((p, q) => d(a, p) - d(a, q));
    near.slice(0, a.id === 'GK' ? 2 : 3).filter((b, i) => i < 2 || d(a, b) < 30)
      .forEach((b) => set.set([a.id, b.id].sort().join('|'), [a.id, b.id]));
  }
  return [...set.values()];
}
let LINKS = linksFor(SLOTS);

// Opstelling wisselen: spelers schuiven naar de best passende plek; wie er niet meer in past gaat naar de bank.
function setFormation(name) {
  if (!FORMATIONS[name] || name === formation) return;
  loadTeam();
  const owned = new Map(ownedCards().map((c) => [c.g.id, c]));
  const players = SLOTS.map((s) => team[s.id]).filter((id) => owned.has(id));
  for (const s of SLOTS) delete team[s.id];
  formation = name;
  SLOTS = FORMATIONS[name];
  LINKS = linksFor(SLOTS);
  try { localStorage.setItem('ut-form', name); } catch {}
  const left = [...players];
  for (const pass of ['exact', 'fit', 'any']) {
    for (const s of SLOTS) {
      if (team[s.id]) continue;
      const i = left.findIndex((id) => { const p = owned.get(id).player.pos; return pass === 'any' || (pass === 'exact' ? inPosition(s, owned.get(id)) : FITS[slotPos(s)].includes(p)); });
      if (i >= 0) team[s.id] = left.splice(i, 1)[0];
    }
  }
  for (const id of left) { const b = BENCH.find((x) => !team[x]); if (b) team[b] = id; }
  selectedSlot = null;
  saveTeam();
  renderTeam();
}
window.utSetFormation = setFormation;
function linkStrength(a, b) {
  if (!a || !b) return 'n';
  const p = a.player, q = b.player;
  const icon = p.club === 'ICON' || q.club === 'ICON';
  const pts = (!icon && p.club === q.club ? 2 : 0) + (p.nat === q.nat ? 1 : 0) + (icon || p.liga === q.liga ? 1 : 0);
  return pts >= 2 ? 2 : pts;
}
function drawLinks(cards) {
  const svg = document.getElementById('ut-links');
  if (!svg) return;
  const at = Object.fromEntries(SLOTS.map((s) => [s.id, s]));
  svg.innerHTML = LINKS.map(([a, b]) => `<line class="lk-${linkStrength(cards[a], cards[b])}" x1="${at[a].x}" y1="${at[a].y}" x2="${at[b].x}" y2="${at[b].y}"/>`).join('');
}

// Op de pc past het hele teamscherm in het venster: alleen de lijst met spelers scrolt.
function fitTeamView() {
  const lay = document.querySelector('#ut-team-view .ut-layout');
  if (!lay || !lay.offsetParent) return;
  const top = lay.getBoundingClientRect().top + window.scrollY;
  lay.style.setProperty('--ut-h', Math.max(560, window.innerHeight - top - 62) + 'px');
}
window.addEventListener('resize', () => requestAnimationFrame(fitTeamView));

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

  const fsel = $('#ut-form');
  if (fsel && !fsel.options.length) { fsel.innerHTML = Object.keys(FORMATIONS).map((f) => `<option>${f}</option>`).join(''); fsel.addEventListener('change', (e) => setFormation(e.target.value)); }
  if (fsel) fsel.value = formation;
  document.querySelector('#ut .ut-pitch')?.classList.toggle('rows5', FIVE_ROWS.has(formation));
  $('#ut-pitch-slots').innerHTML = SLOTS.map((s) => {
    const c = cards[s.id];
    const dots = c ? `<div class="ut-chem" title="${chem[s.id]} chemie">${'<i class="on"></i>'.repeat(chem[s.id])}${'<i></i>'.repeat(3 - chem[s.id])}</div>` : '';
    return `<div class="ut-slot ${c ? 'filled' : 'empty'} ${selectedSlot === s.id ? 'selected' : ''} ${c && !inPosition(s, c) ? 'oop' : ''}" data-slot="${s.id}" data-x="${s.x}" data-y="${s.y}">
      ${c ? cardHTML(c, 'sm') + `<button class="ut-remove" data-remove="${s.id}" aria-label="Haal uit team">×</button>` : `<div class="ut-empty-card"><b>${slotPos(s)}</b><span>+</span></div>`}
      ${dots}
    </div>`;
  }).join('');
  document.querySelectorAll('#ut-pitch-slots .ut-slot').forEach((el) => { el.style.left = el.dataset.x + '%'; el.style.top = el.dataset.y + '%'; });
  drawLinks(cards);
  fitTeamView();

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
  const POS_ORDER = ['GK', 'LB', 'CB', 'RB', 'CM', 'CAM', 'LW', 'RW', 'ST'];
  const sorters = {
    rating: (a, b) => b.ovr - a.ovr,
    vak: (a, b) => (a.g.vak || '').localeCompare(b.g.vak || '') || b.ovr - a.ovr,
    positie: (a, b) => POS_ORDER.indexOf(a.player.pos) - POS_ORDER.indexOf(b.player.pos) || b.ovr - a.ovr,
  };
  const list = owned.filter((c) => !sel.value || (c.g.transfer ? 'Transfermarkt' : c.g.vak) === sel.value)
    .sort((a, b) => (want ? (b.player.pos === want) - (a.player.pos === want) : 0) || (inTeam.has(a.g.id) - inTeam.has(b.g.id)) || sorters[clubSort](a, b));
  $('#ut-club-count').textContent = `${owned.length} ${owned.length === 1 ? 'kaart' : 'kaarten'}`;
  $('#ut-hint').textContent = selectedSlot
    ? (want ? `Kies een ${POS_NAMES[want] || want}. Alleen op zijn eigen positie krijgt een speler chemie.` : 'Kies een wissel voor op de bank.')
    : '';
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
$('#ut-sort').value = clubSort;
$('#ut-sort').addEventListener('change', (e) => { clubSort = e.target.value; try { localStorage.setItem('ut-sort', clubSort); } catch {} renderTeam(); });
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

// ---------- Kaarten slepen ----------
// Sleep een kaart uit je club naar een plek in het veld of op de bank, of sleep spelers in het veld om ze te ruilen.
// Werkt met muis en vinger. Gewoon tikken blijft werken zoals altijd.
(function dragCards() {
  let drag = null; // { id, fromSlot, x0, y0, ghost, moved }
  let suppressClick = 0;
  window.addEventListener('click', (ev) => { if (Date.now() < suppressClick) { ev.stopPropagation(); ev.preventDefault(); suppressClick = 0; } }, true);
  const cardIdAt = (el) => {
    const club = el.closest('#ut-club [data-card]');
    if (club) return { id: club.dataset.card, fromSlot: null, el: club };
    const slot = el.closest('#ut-pitch-slots [data-slot], #ut-bench [data-slot]');
    if (slot && team[slot.dataset.slot]) return { id: team[slot.dataset.slot], fromSlot: slot.dataset.slot, el: slot };
    return null;
  };
  document.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('.ut-remove') || !e.target.closest('#ut-team-view')) return;
    const hit = cardIdAt(e.target);
    if (!hit) return;
    if (e.pointerType === 'touch' && !hit.fromSlot) return; // op de telefoon scrolt de lijst; tik om te plaatsen
    drag = { ...hit, x0: e.clientX, y0: e.clientY, moved: false, pid: e.pointerId };
  });
  document.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pid) return;
    if (!drag.moved) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 8) return;
      drag.moved = true;
      const src = drag.el.querySelector('.fc-card');
      const ghost = src.cloneNode(true);
      ghost.classList.add('ut-ghost');
      const r = src.getBoundingClientRect();
      ghost.style.width = r.width + 'px';
      ghost.style.height = r.height + 'px';
      ghost.style.fontSize = getComputedStyle(src).fontSize;
      drag.dx = r.width / 2; drag.dy = r.height / 2;
      document.body.append(ghost);
      drag.ghost = ghost;
      drag.el.classList.add('ut-dragging');
      document.body.classList.add('ut-drag-on');
    }
    e.preventDefault();
    drag.ghost.style.left = e.clientX - drag.dx + 'px';
    drag.ghost.style.top = e.clientY - drag.dy + 'px';
    document.querySelectorAll('.ut-drop').forEach((x) => x.classList.remove('ut-drop'));
    drag.ghost.hidden = true;
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('#ut-pitch-slots [data-slot], #ut-bench [data-slot]');
    drag.ghost.hidden = false;
    over?.classList.add('ut-drop');
  }, { passive: false });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.pid) return;
    const d = drag;
    drag = null;
    if (!d.moved) return;
    d.ghost.hidden = true;
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('#ut-pitch-slots [data-slot], #ut-bench [data-slot]');
    d.ghost.remove();
    d.el.classList.remove('ut-dragging');
    document.body.classList.remove('ut-drag-on');
    document.querySelectorAll('.ut-drop').forEach((x) => x.classList.remove('ut-drop'));
    // na een sleep geen klik laten doorgaan
    suppressClick = Date.now() + 400;
    if (over) {
      const to = over.dataset.slot;
      const prev = team[to];
      for (const k of Object.keys(team)) if (team[k] === d.id) delete team[k];
      team[to] = d.id;
      if (d.fromSlot && prev && prev !== d.id) team[d.fromSlot] = prev; // ruilen
      selectedSlot = null;
      saveTeam();
      renderTeam();
    } else if (d.fromSlot && !e.target.closest('#ut-team-view')) {
      // buiten het veld losgelaten: speler uit het team
      delete team[d.fromSlot];
      saveTeam();
      renderTeam();
    }
  };
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', (e) => { if (drag?.ghost) { drag.ghost.remove(); drag.el.classList.remove('ut-dragging'); document.body.classList.remove('ut-drag-on'); } drag = null; });
})();

// ---------- Laadscherm voor Ultimate Team ----------
// De eerste keer per sessie: wachten tot de foto's van je team er zijn (max. 6 seconden), met een voortgangsbalk.
window.utLoading = function () {
  try { if (sessionStorage.getItem('ut-loaded')) return; } catch {}
  const ut = document.getElementById('ut');
  const imgs = [...ut.querySelectorAll('#ut-pitch-slots img.fc-img, #ut-bench img.fc-img, #ut-club .ut-club-card:nth-child(-n+9) img.fc-img')];
  if (!imgs.length) return;
  imgs.forEach((i) => { i.loading = 'eager'; });
  const ov = document.createElement('div');
  ov.className = 'ut-loader';
  ov.innerHTML = `<div class="utl-box"><span class="fc-logo">UT</span><b>SOMTODAY ULTIMATE TEAM</b>
    <div class="utl-bar"><i></i></div><small>Spelers laden…</small></div>`;
  ut.append(ov);
  const bar = ov.querySelector('.utl-bar i');
  const start = performance.now();
  const done = () => imgs.filter((i) => i.complete).length;
  const tick = () => {
    const k = done() / imgs.length;
    bar.style.width = Math.round(k * 100) + '%';
    const t = performance.now() - start;
    if ((k >= 1 && t > 700) || t > 6000) {
      try { sessionStorage.setItem('ut-loaded', '1'); } catch {}
      ov.classList.add('out');
      setTimeout(() => ov.remove(), 450);
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
// Foto's van je team alvast op de achtergrond laden, zodat Ultimate Team daarna snel opent.
setTimeout(() => {
  const go = () => {
    try {
      loadTeam();
      const ids = new Set(Object.values(team));
      for (const c of ownedCards()) if (ids.has(c.g.id) && photoUrl(c.player)) { const im = new Image(); im.decoding = 'async'; im.src = photoUrl(c.player); }
    } catch {}
  };
  if (window.requestIdleCallback) window.requestIdleCallback(go, { timeout: 2500 }); else setTimeout(go, 500);
}, 3000);
