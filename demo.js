(function () {
const module = { exports: {} };
// Voorbeelddata zodat je de app kunt bekijken zonder in te loggen.
const VAKKEN = [
  ['Nederlands', 6.8], ['Engels', 7.6], ['Wiskunde', 5.4], ['Biologie', 7.1],
  ['Geschiedenis', 6.2], ['Natuurkunde', 5.9], ['Frans', 6.5],
];
const TOETSEN = ['Hoofdstuk 1', 'SO woordjes', 'Hoofdstuk 2', 'Praktische opdracht', 'Proefwerk H3', 'SO grammatica'];

// Vaste "willekeur" zodat de demo er elke keer hetzelfde uitziet.
function rng(seed) {
  return () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
}

function grades() {
  const rand = rng(42);
  const start = new Date();
  start.setDate(start.getDate() - 55);
  const out = [];
  VAKKEN.forEach(([vak, basis], v) => {
    const aantal = 3 + Math.floor(rand() * 3);
    for (let i = 0; i < aantal; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + Math.floor((i + rand()) * (50 / aantal)));
      const cijfer = Math.min(10, Math.max(1, Math.round((basis + (rand() - 0.5) * 3) * 10) / 10));
      out.push({
        id: `demo-${v}-${i}`,
        vak,
        cijfer,
        resultaat: cijfer.toFixed(1).replace('.', ','),
        weging: [1, 2, 3, 1, 2][Math.floor(rand() * 5)],
        omschrijving: TOETSEN[i % TOETSEN.length],
        datum: d.toISOString(),
        periode: 1,
        examen: false,
      });
    }
  });
  return out;
}

const LESUREN = [['08:30', '09:20'], ['09:20', '10:10'], ['10:30', '11:20'], ['11:20', '12:10'],
  ['12:40', '13:30'], ['13:30', '14:20'], ['14:30', '15:20']];

function schedule(begin) {
  const rand = rng(7 + new Date(begin).getDate());
  const out = [];
  for (let dag = 0; dag < 5; dag++) {
    const lessen = 5 + Math.floor(rand() * 3);
    for (let uur = 0; uur < lessen; uur++) {
      const d = new Date(begin);
      d.setDate(d.getDate() + dag);
      const day = d.toISOString().slice(0, 10);
      const vak = VAKKEN[Math.floor(rand() * VAKKEN.length)][0];
      out.push({
        begin: `${day}T${LESUREN[uur][0]}:00`,
        eind: `${day}T${LESUREN[uur][1]}:00`,
        uur: uur + 1,
        eindUur: uur + 1,
        vak,
        titel: vak,
        locatie: `Lokaal ${100 + Math.floor(rand() * 120)}`,
        docent: ['JAN', 'PVD', 'KLM', 'BRT', 'SMI'][Math.floor(rand() * 5)],
        uitval: rand() < 0.04,
      });
    }
  }
  return out;
}

function homework(begin) {
  const items = [
    [1, 'Wiskunde', 'Opgaven 12 t/m 20', 'Paragraaf 3.2 afmaken', 'HUISWERK'],
    [1, 'Engels', 'Woordjes unit 4', 'Leer de woordjes van unit 4 (blz. 52)', 'HUISWERK'],
    [2, 'Biologie', 'SO hoofdstuk 3', 'Leren: paragraaf 3.1 t/m 3.4', 'TOETS'],
    [3, 'Nederlands', 'Betoog inleveren', 'Lever je betoog in via de studiewijzer', 'HUISWERK'],
    [4, 'Geschiedenis', 'Proefwerk H2', 'Hoofdstuk 2 helemaal leren, inclusief begrippen', 'GROTE_TOETS'],
    [7, 'Frans', 'Grammatica oefenen', 'Oefening A t/m D op blz. 40', 'HUISWERK'],
    [8, 'Natuurkunde', 'Practicumverslag', 'Verslag van de proef over snelheid', 'HUISWERK'],
  ];
  return items.map(([dag, vak, onderwerp, omschrijving, type], i) => {
    const d = new Date(begin);
    d.setDate(d.getDate() + dag);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1); // geen huiswerk in het weekend
    return { id: `demo-hw-${i}`, datum: d.toISOString(), vak, onderwerp, omschrijving, type, gemaakt: i === 0 };
  });
}

module.exports = { grades, schedule, homework };

window.SomDemo = module.exports;
})();
