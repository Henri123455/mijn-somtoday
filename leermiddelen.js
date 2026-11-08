// ---------- Leermiddelen ----------
// Links een lijst met vakken, rechts alles van het gekozen vak: methodes, links en bestanden per mapje.
let lmItems = null;
let lmVak = null;

const lmSize = (b) => (b > 1_000_000 ? `${(b / 1_000_000).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1000))} kB`);
const lmExt = (name) => (String(name).split('.').pop() || '').toLowerCase();
const LM_ICON = { pdf: '📕', doc: '📘', docx: '📘', ppt: '📙', pptx: '📙', xls: '📗', xlsx: '📗', jpg: '🖼️', png: '🖼️', mp4: '🎬', zip: '🗜️' };
const lmHost = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };
// "Memo MAX volledig online havo/vwo bovenbouw ..." -> "Memo MAX" met de rest als kleine tekst.
function lmTitle(t) {
  const m = String(t).match(/^(.+?)\s+(?=(volledig\s+)?online\b|\+|boek\b|leerlinglicentie\b|\d+\s+maanden\b|LRN-line\b)/i);
  return m ? { kort: m[1], rest: t.slice(m[1].length).trim() } : { kort: t, rest: '' };
}

function lmFilter(v, q) {
  const match = (...t) => !q || t.some((x) => String(x || '').toLowerCase().includes(q));
  const vakHit = match(v.vak);
  return {
    ...v,
    methodes: v.methodes.filter((m) => vakHit || match(m.titel, m.uitgever)),
    bestanden: v.bestanden.filter((b) => vakHit || match(b.naam, b.map)),
    links: v.links.filter((l) => vakHit || match(l.titel)),
  };
}
const lmCount = (v) => v.methodes.length + v.links.length + v.bestanden.length;

function lmDetail(v, q) {
  const mappen = {};
  for (const b of v.bestanden) (mappen[b.map || 'Losse bestanden'] ||= []).push(b);
  const section = (title, body) => `<section class="lm-sec"><h3>${title}</h3>${body}</section>`;
  return `<div class="lm-detail-head"><span class="lm-big-icon">${vakIcon(v.vak)}</span><div><h2>${esc(v.vak)}</h2>
      <span class="hint">${[v.methodes.length && `${v.methodes.length} methode${v.methodes.length > 1 ? 's' : ''}`, v.links.length && `${v.links.length} link${v.links.length > 1 ? 's' : ''}`, v.bestanden.length && `${v.bestanden.length} bestand${v.bestanden.length > 1 ? 'en' : ''}`].filter(Boolean).join(' · ')}</span></div></div>
    ${v.methodes.length ? section('📚 Digitale methodes', `<div class="lm-methodes">${v.methodes.map((m) => {
      const t = lmTitle(m.titel);
      return `<a class="lm-methode" href="${esc(m.url)}" data-ext>
        <b>${esc(t.kort)}</b>${t.rest ? `<small>${esc(t.rest)}</small>` : ''}<span>${esc(lmHost(m.url) || m.uitgever || '')}</span><i>Openen ↗</i></a>`;
    }).join('')}</div>`) : ''}
    ${v.links.length ? section('🔗 Links', `<div class="lm-links">${v.links.map((l) => `<a href="${esc(l.url)}" data-ext><b>${esc(l.titel)}</b><span>${esc(lmHost(l.url))}</span></a>`).join('')}</div>`) : ''}
    ${v.bestanden.length ? section('📁 Bestanden van je docent', `${Object.entries(mappen).map(([map, list]) => `
      <details class="lm-map" ${q || Object.keys(mappen).length === 1 ? 'open' : ''}>
        <summary><span>📁 ${esc(map)}</span><span class="lm-badge">${list.length}</span></summary>
        <ul>${list.map((b) => `<li><span class="lm-file">${LM_ICON[lmExt(b.bestand)] || '📄'} ${esc(b.naam)}</span><span class="hint">${lmExt(b.bestand).toUpperCase()} · ${lmSize(b.grootte)}</span></li>`).join('')}</ul>
      </details>`).join('')}
      <a class="lm-open" href="https://leerling.somtoday.nl" data-ext>Bestanden openen in Somtoday ↗</a>`) : ''}`;
}

function renderLeermiddelen() {
  const q = $('#lm-search').value.trim().toLowerCase();
  const list = lmItems.map((v) => lmFilter(v, q)).filter((v) => lmCount(v));
  if (!list.length) {
    $('#lm-list').innerHTML = `<p class="hint">${q ? 'Niets gevonden voor deze zoekopdracht.' : 'Geen leermiddelen gevonden.'}</p>`;
    return;
  }
  if (!list.some((v) => v.vak === lmVak)) lmVak = list[0].vak;
  const cur = list.find((v) => v.vak === lmVak);
  $('#lm-list').innerHTML = `<nav class="lm-nav card">${list.map((v) => `
      <button class="${v.vak === lmVak ? 'active' : ''}" data-lm-vak="${esc(v.vak)}">
        <span class="lm-vak-icon">${vakIcon(v.vak)}</span><span class="lm-nav-name">${esc(v.vak)}</span><span class="lm-badge">${lmCount(v)}</span>
      </button>`).join('')}</nav>
    <div class="lm-detail card">${lmDetail(cur, q)}</div>`;
}

async function loadLeermiddelen() {
  if (lmItems) return renderLeermiddelen();
  try {
    const res = await api('/api/leermiddelen');
    if (res.demo) {
      $('#lm-list').innerHTML = '<p class="hint">Log in bij Somtoday om je leermiddelen te zien.</p>';
      return;
    }
    lmItems = res.items;
    renderLeermiddelen();
  } catch (err) {
    $('#lm-list').innerHTML = `<p class="bad">${esc(err.message)}</p>`;
  }
}
window.loadLeermiddelen = loadLeermiddelen;
$('#lm-search').addEventListener('input', () => lmItems && renderLeermiddelen());
$('#lm-list').addEventListener('click', (e) => {
  const vak = e.target.closest('[data-lm-vak]')?.dataset.lmVak;
  if (vak) {
    lmVak = vak;
    renderLeermiddelen();
    // Smal scherm (telefoon): de inhoud staat onder de lijst, dus daarheen scrollen.
    if (matchMedia('(max-width: 800px)').matches) $('.lm-detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const a = e.target.closest('a[data-ext]');
  if (!a) return;
  // Links openen in Chrome (valt terug op je standaardbrowser als Chrome er niet is).
  e.preventDefault();
  api('/api/open-url', { url: a.href }).catch(() => window.open(a.href, '_blank', 'noopener'));
});
