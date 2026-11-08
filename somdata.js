(function () {
const module = { exports: {} };
// Cijfers, rooster, huiswerk en leermiddelen uit de Somtoday-API halen en netjes maken.
// Gedeeld door de laptop-app (server) en de telefoon-app (browser). `api(pad, range)` doet het
// eigenlijke verzoek met je login en geeft de JSON terug (met `_range` = de Content-Range-header).

// Haalt alle pagina's op (Somtoday geeft max ~100 items per keer).
async function getAll(api, pathAndQuery) {
  const items = [];
  for (let page = 0; page < 30; page++) {
    const from = page * 100;
    const json = await api(pathAndQuery, `items=${from}-${from + 99}`);
    items.push(...(json.items || []));
    const total = Number((json._range || '').split('/')[1]);
    if (!total || items.length >= total || !(json.items || []).length) break;
  }
  return items;
}

// Losse cijfers die meetellen (deeltoetsen zitten al in hun samengestelde toets).
const GRADE_TYPES = new Set(['Toetskolom', 'SamengesteldeToetsKolom', 'Werkstukcijferkolom']);
// Het gemiddelde dat Somtoday zelf berekent.
const AVERAGE_TYPES = ['SEGemiddeldeKolom', 'RapportGemiddeldeKolom', 'PeriodeGemiddeldeKolom'];

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Zit de leerling in het examenjaar? Dan is het huidige schooljaar het laatste jaar van de lichting.
function isExamenjaar(lichting) {
  const jaren = lichting?.lichtingSchooljaren || [];
  const huidig = jaren.find((j) => j.schooljaar?.isHuidig);
  if (!huidig) return false;
  const laatste = jaren.reduce((a, b) => (a.schooljaar?.vanafDatum > b.schooljaar?.vanafDatum ? a : b));
  return huidig === laatste && !!huidig.heeftExamendossier;
}

const round1 = (n) => Math.round(n * 10) / 10;

// De leerling bij een (nieuwe) login.
async function getAccount(api) {
  const leerlingen = await api('/rest/v1/leerlingen');
  const leerling = leerlingen.items?.[0];
  if (!leerling) throw new Error('Ingelogd, maar geen leerling gevonden.');
  return {
    id: leerling.links?.[0]?.id,
    uuid: leerling.UUID,
    naam: leerling.roepnaam || leerling.voorletters || 'leerling',
  };
}

// Alleen cijfers die nu nog meetellen:
// - iedereen: de cijfers van dít schooljaar;
// - examenjaar: plus per vak het gemiddelde van vorig jaar dat is meegenomen naar het SE (als één cijfer).
// Losse cijfers van eerdere jaren laten we weg.
async function getGrades(api, id) {
  const plaatsingen = await getAll(api, `/rest/v1/plaatsingen?leerling=${id}`);
  const plaatsing = plaatsingen.find((p) => p.huidig) || plaatsingen.at(-1);
  if (!plaatsing) return { grades: [], averages: {} };
  const { gemiddelden = [] } = await api(`/rest/v1/vakkeuzes/plaatsing/${plaatsing.UUID}/vakgemiddelden`);

  const grades = [];
  const averages = {};
  const jaarStart = plaatsing.vanafDatum || plaatsing.schooljaar?.vanafDatum || '1900-01-01';
  const ditJaar = (datum) => !datum || datum.slice(0, 10) >= jaarStart;
  // Datum voor de "vorig jaar"-kaarten: de dag voor het begin van dit schooljaar.
  const vorigJaarDatum = new Date(new Date(jaarStart + 'T12:00:00') - 86_400_000).toISOString();
  await Promise.all(gemiddelden.map(async ({ vakkeuze }) => {
    if (!vakkeuze?.vak?.UUID || vakkeuze.vrijstelling) return;
    const vak = capitalize(vakkeuze.vak.naam || vakkeuze.vak.afkorting || 'Onbekend vak');
    const lichting = (vakkeuze.relevanteCijferLichting || vakkeuze.lichting)?.UUID;
    const path = `/vakresultaten/${id}/vak/${vakkeuze.vak.UUID}/lichting/${lichting}?plaatsingUuid=${plaatsing.UUID}`;
    const [voortgang, examen] = await Promise.all([
      getAll(api, '/rest/v1/geldendvoortgangsdossierresultaten' + path).catch(() => []),
      getAll(api, '/rest/v1/geldendexamendossierresultaten' + path).catch(() => []),
    ]);
    const items = [...voortgang.map((r) => ({ ...r, examen: false })), ...examen.map((r) => ({ ...r, examen: true }))];

    for (const type of AVERAGE_TYPES) {
      const avg = items.filter((r) => r.type === type && Number.isFinite(r.cijfer)).sort((a, b) => b.periode - a.periode)[0];
      if (avg) { averages[vak] = avg.cijfer; break; }
    }

    const seen = new Set();
    const vorigJaar = []; // meegenomen SE-cijfers van vorig jaar (alleen examenjaar)
    for (const r of items) {
      if (!GRADE_TYPES.has(r.type)) continue;
      const gid = String(r.links?.[0]?.id ?? `${vak}|${r.volgnummer}|${r.omschrijving}`);
      if (seen.has(gid)) continue;
      seen.add(gid);
      const grade = {
        id: gid,
        vak,
        cijfer: Number.isFinite(r.cijfer) ? r.cijfer : null,
        resultaat: r.formattedResultaat ?? (r.cijfer != null ? String(r.cijfer).replace('.', ',') : ''),
        weging: Number(r.weging) || 0,
        omschrijving: r.omschrijving || r.toetscode || '',
        datum: r.datumInvoerHerkansing1 || r.datumInvoerEerstePoging || null,
        periode: r.periode ?? null,
        examen: r.examen,
      };
      if (ditJaar(grade.datum)) grades.push(grade);
      else if (r.examen) vorigJaar.push(grade);
    }

    // Examenjaar: de cijfers van vorig jaar worden samen één kaart met het (gewogen) gemiddelde.
    if (vorigJaar.length && isExamenjaar(vakkeuze.lichting || vakkeuze.relevanteCijferLichting)) {
      const telt = vorigJaar.filter((g) => g.cijfer != null && g.weging > 0);
      const gewicht = telt.reduce((t, g) => t + g.weging, 0);
      if (gewicht > 0) {
        const gem = round1(telt.reduce((t, g) => t + g.cijfer * g.weging, 0) / gewicht);
        grades.push({
          id: `vorigjaar|${vakkeuze.vak.UUID}`,
          vak,
          cijfer: gem,
          resultaat: gem.toFixed(1).replace('.', ','),
          weging: gewicht,
          omschrijving: 'Gemiddelde vorig jaar (telt mee voor je SE)',
          datum: vorigJaarDatum,
          periode: 0,
          examen: true,
          vorigJaar: true,
        });
      }
    }
  }));
  return { grades, averages };
}

async function getSchedule(api, begin, end) {
  const items = await getAll(api,
    `/rest/v1/afspraken?begindatum=${begin}&einddatum=${end}&additional=vak&additional=docentAfkortingen`
  );
  return items.map((a) => ({
    begin: a.beginDatumTijd,
    eind: a.eindDatumTijd,
    uur: a.beginLesuur ?? null,
    eindUur: a.eindLesuur ?? a.beginLesuur ?? null,
    vak: capitalize(a.additionalObjects?.vak?.naam || a.titel || ''),
    titel: a.titel || '',
    locatie: a.locatie || '',
    docent: a.additionalObjects?.docentAfkortingen || '',
    uitval: /uitval|vervallen/i.test(`${a.afspraakStatus ?? ''} ${a.titel ?? ''}`),
  }));
}

async function getHomework(api, id, begin) {
  const query = `?begintNaOfOp=${begin}&geenDifferentiatieOfGedifferentieerdVoorLeerling=${id}` +
    '&additional=swigemaaktVinkjes&additional=lesgroep';
  const lists = await Promise.all([
    getAll(api, '/rest/v1/studiewijzeritemafspraaktoekenningen' + query).catch(() => []),
    getAll(api, '/rest/v1/studiewijzeritemdagtoekenningen' + query).catch(() => []),
  ]);
  return lists.flat().map((h) => ({
    id: String(h.links?.[0]?.id ?? Math.random()),
    datum: h.datumTijd,
    vak: capitalize(h.lesgroep?.vak?.naam || h.additionalObjects?.lesgroep?.vak?.naam || ''),
    onderwerp: h.studiewijzerItem?.onderwerp || '',
    omschrijving: stripHtml(h.studiewijzerItem?.omschrijving || ''),
    type: h.studiewijzerItem?.huiswerkType || 'HUISWERK',
    gemaakt: !!h.additionalObjects?.swigemaaktVinkjes?.items?.[0]?.gemaakt,
  }));
}

// ---------- Leermiddelen ----------
// Per vak: digitale methodes (met link), bestanden van de docent (in mapjes) en extra links.
async function getLeermiddelen(api, id) {
  const vakken = await getAll(api, `/rest/v1/vakken/studiemateriaal/${id}`);
  const result = await Promise.all(vakken.map(async (v) => {
    let m = null;
    try { m = await api(`/rest/v1/studiemateriaal/${id}/vak/${v.UUID}`); } catch { return null; }
    const zichtbaar = (x) => x.zichtbaarVoorLeerling !== false;
    const methodes = (m.leermiddelKeuzes || []).map((k) => k.leermiddel).filter((l) => l?.url).map((l) => ({
      titel: l.titel || 'Methode',
      url: l.url,
      uitgever: l.methodeInformatie?.uitgever || '',
    }));
    const bestanden = (m.jaarBijlagen || []).filter(zichtbaar).filter((b) => b.bestand?.bestanddataId)
      .sort((a, b) => (a.sortering ?? 0) - (b.sortering ?? 0))
      .map((b) => ({
        naam: b.omschrijving || b.bestand.bestandsnaam,
        bestand: b.bestand.bestandsnaam,
        id: b.bestand.bestanddataId,
        grootte: b.bestand.bestandsgrootte || 0,
        map: b.jaarbijlageMap?.naam || '',
      }));
    const links = (m.externMateriaal || []).filter(zichtbaar).filter((x) => x.uri)
      .map((x) => ({ titel: x.omschrijving || x.uri, url: x.uri }));
    if (!methodes.length && !bestanden.length && !links.length) return null;
    return { vak: v.naam.charAt(0).toUpperCase() + v.naam.slice(1), methodes, bestanden, links };
  }));
  return result.filter(Boolean).sort((a, b) => a.vak.localeCompare(b.vak));
}

function stripHtml(html) {
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

module.exports = { getAll, getAccount, getGrades, getSchedule, getHomework, getLeermiddelen };

window.SomData = module.exports;
})();
