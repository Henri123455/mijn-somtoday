// ---------- Helpers ----------
const $ = (sel) => document.querySelector(sel);
const fmt = (n) => (n == null || !Number.isFinite(n) ? '–' : n.toFixed(1).replace('.', ','));
const cls = (n) => (n == null ? '' : n < 5.5 ? 'bad' : 'good');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const dayName = (d) => new Date(d).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
const time = (d) => new Date(d).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

async function api(path, body) {
  // Telefoonversie: geen server, de app haalt alles zelf op (zie web-api.js).
  if (window.WEB_API) return WEB_API.handle(path, body);
  // Is de app even niet bereikbaar (bijv. tijdens een herstart of update)? Dan een paar keer opnieuw proberen.
  let res;
  for (let poging = 0; ; poging++) {
    try {
      res = await fetch(path, body ? {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      } : undefined);
      break;
    } catch (err) {
      if (poging >= 8) throw new Error('De app is niet bereikbaar. Sluit het venster en open Mijn Somtoday opnieuw.');
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json;
}

function showError(err) {
  const el = $('#error');
  el.textContent = err ? `Er ging iets mis: ${err.message}` : '';
  el.hidden = !err;
}

function weightedAvg(list) {
  let sum = 0, weight = 0;
  for (const g of list) {
    if (g.cijfer == null || !(g.weging > 0)) continue;
    sum += g.cijfer * g.weging;
    weight += g.weging;
  }
  return { avg: weight ? sum / weight : null, sum, weight };
}

let grades = [];
let averages = {};
let charts = {};

// ---------- Tabs ----------
// Tab wisselen. closest(): ook een klik op het icoontje of het FC-logo in een tab telt
// (eerder moest je soms 2-3 keer klikken). Wisselen gebeurt meteen; laden gebeurt daarna.
$('#tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('[data-tab]')?.dataset.tab;
  if (!tab) return;
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab').forEach((s) => s.classList.toggle('active', s.id === tab));
  requestAnimationFrame(() => {
    if (tab === 'rooster') loadSchedule();
    if (tab === 'huiswerk') loadHomework();
    if (tab === 'ut') { window.renderTeam?.(); window.tmInit?.(); }
    if (tab === 'leermiddelen') window.loadLeermiddelen?.();
  });
});

// ---------- Cijfers ----------
function bySubject() {
  const map = {};
  for (const g of grades) (map[g.vak] ||= []).push(g);
  return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
}

function renderGrades() {
  // Het officiële Somtoday-gemiddelde gaat voor; anders rekenen we het zelf uit.
  const subjects = bySubject().map(([vak, list]) => {
    const own = weightedAvg(list);
    return { vak, ...own, avg: averages[vak] ?? own.avg };
  });
  const withAvg = subjects.filter((s) => s.avg != null);
  const overall = withAvg.length ? withAvg.reduce((t, s) => t + s.avg, 0) / withAvg.length : null;
  const sorted = [...grades].sort((a, b) => new Date(b.datum) - new Date(a.datum));
  const last = sorted[0];

  $('#avg-all').innerHTML = `<span class="${cls(overall)}">${fmt(overall)}</span>`;
  $('#count-all').textContent = grades.length;
  $('#fails-all').innerHTML = `<span class="${withAvg.some((s) => s.avg < 5.5) ? 'bad' : 'good'}">${withAvg.filter((s) => s.avg < 5.5).length}</span>`;
  $('#last-grade').innerHTML = last ? `<span class="${cls(last.cijfer)}">${esc(last.resultaat)}</span>` : '–';
  $('#last-grade-sub').textContent = last ? `${last.vak} · ${last.omschrijving}` : '';

  const gtVak = $('#gt-vak');
  const keepVak = gtVak.value;
  gtVak.innerHTML = '<option value="">Alle vakken</option>' + bySubject().map(([v]) => `<option>${esc(v)}</option>`).join('');
  gtVak.value = [...gtVak.options].some((o) => o.value === keepVak) ? keepVak : '';
  renderGradeTable();

  const css = getComputedStyle(document.documentElement);
  const color = (v) => css.getPropertyValue(v).trim();
  Chart.defaults.color = color('--muted');
  Chart.defaults.borderColor = color('--line');

  renderAverageGrid(subjects);
  window.updatePackButton?.();

  const select = $('#chart-vak');
  const current = select.value;
  select.innerHTML = '<option value="">Alle vakken</option>' +
    subjects.map((s) => `<option>${esc(s.vak)}</option>`).join('');
  select.value = subjects.some((s) => s.vak === current) ? current : '';
  renderTimeChart();
  renderCalcSubjects();
}

// Tabel "Alle cijfers": zoeken, filteren op vak en sorteren door op een kolomkop te klikken.
let gtSort = { key: 'datum', dir: -1 };
function renderGradeTable() {
  const q = $('#gt-search').value.trim().toLowerCase();
  const vak = $('#gt-vak').value;
  const list = grades
    .filter((g) => (!vak || g.vak === vak) && (!q || `${g.omschrijving} ${g.vak}`.toLowerCase().includes(q)))
    .sort((a, b) => {
      const k = gtSort.key;
      const va = k === 'datum' ? new Date(a.datum || 0).getTime() : a[k] ?? -1;
      const vb = k === 'datum' ? new Date(b.datum || 0).getTime() : b[k] ?? -1;
      return (typeof va === 'string' ? va.localeCompare(vb) : va - vb) * gtSort.dir;
    });
  document.querySelectorAll('#grade-table th[data-sort]').forEach((th) => {
    th.classList.toggle('sorted', th.dataset.sort === gtSort.key);
    th.dataset.dir = th.dataset.sort === gtSort.key ? (gtSort.dir > 0 ? '▲' : '▼') : '';
  });
  $('#gt-count').textContent = `${list.length} van ${grades.length}`;
  $('#grade-table tbody').innerHTML = list.map((g) => `
    <tr>
      <td class="nowrap">${g.datum && !g.vorigJaar ? new Date(g.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: '2-digit' }) : '<span class="gt-badge">vorig jaar</span>'}</td>
      <td><span class="gt-vak">${vakIcon(g.vak)} ${esc(g.vak)}</span></td>
      <td>${esc(g.omschrijving)}</td>
      <td class="num">${g.weging > 0 ? `${g.weging}×` : '<span class="hint">telt niet</span>'}</td>
      <td class="num"><span class="gt-grade ${g.cijfer == null ? '' : g.cijfer < 5.5 ? 'bad' : g.cijfer < 6 ? 'warn' : 'good'}">${esc(g.resultaat)}</span></td>
    </tr>`).join('') || '<tr><td colspan="5" class="hint">Geen cijfers gevonden.</td></tr>';
}
$('#grade-table thead').addEventListener('click', (e) => {
  const key = e.target.closest('[data-sort]')?.dataset.sort;
  if (!key) return;
  gtSort = { key, dir: gtSort.key === key ? -gtSort.dir : (key === 'vak' || key === 'omschrijving' ? 1 : -1) };
  renderGradeTable();
});
$('#gt-search').addEventListener('input', renderGradeTable);
$('#gt-vak').addEventListener('change', renderGradeTable);

// Icoon per vak: talen krijgen een vlag, net als het land op een FIFA-kaart.
// Windows kan geen vlag-emoji tonen, dus die vlaggen tekenen we met CSS.
const flag = (code) => `<span class="flag flag-${code}" aria-hidden="true"></span>`;
function vakIcon(vak) {
  const v = vak.toLowerCase();
  const map = [
    [/nederlands/, flag('nl')], [/engels/, flag('gb')], [/duits/, flag('de')], [/frans/, flag('fr')], [/spaans/, flag('es')],
    [/latijn|grieks|klassiek/, '🏺'], [/wiskunde|rekenen/, '📐'], [/natuurkunde/, '⚛️'], [/scheikunde/, '🧪'],
    [/biologie/, '🧬'], [/geschiedenis/, '🏛️'], [/aardrijkskunde/, '🌍'], [/economie/, '💶'],
    [/lichamelijke|gym|sport|^lo\b/, '⚽'], [/ckv|kunst|tekenen|beeldend/, '🎨'], [/muziek/, '🎵'],
    [/drama|dans/, '🎭'], [/maatschappij/, '🗳️'], [/informatica/, '💻'], [/godsdienst|levensbeschouwing/, '🕊️'],
    [/filosofie/, '🤔'], [/coaching|mentor/, '🧭'], [/profielwerkstuk|pws/, '📚'], [/transfer/, '🔄'],
  ];
  return (map.find(([re]) => re.test(v)) || [null, '📘'])[1];
}

// Overzicht in één oogopslag: per vak je gemiddelde, groot en in kleur.
function renderAverageGrid(subjects) {
  const html = subjects.filter((s) => s.avg != null).map((s) => {
    const list = grades.filter((g) => g.vak === s.vak && g.cijfer != null)
      .sort((a, b) => new Date(b.datum) - new Date(a.datum));
    const last = list[0];
    const trend = last && last.weging > 0 ? (last.cijfer > s.avg + 0.05 ? '↑' : last.cijfer < s.avg - 0.05 ? '↓' : '→') : '';
    const level = s.avg < 5.5 ? 'bad' : s.avg < 6 ? 'warn' : 'good';
    const pct = Math.max(0, Math.min(100, ((s.avg - 1) / 9) * 100)).toFixed(1);
    return `<button class="avg-tile ${level}" data-vak="${esc(s.vak)}" title="Bekijk ${esc(s.vak)} in de grafiek">
      <span class="avg-top"><span class="avg-icon">${vakIcon(s.vak)}</span><span class="avg-vak">${esc(s.vak)}</span></span>
      <span class="avg-num">${fmt(s.avg)}</span>
      <span class="avg-bar"><span class="avg-fill" data-pct="${pct}"></span><span class="avg-pass"></span></span>
      <span class="avg-foot">${list.length} ${list.length === 1 ? 'cijfer' : 'cijfers'}${last ? ` · laatst ${esc(last.resultaat)} ${trend}` : ''}</span>
    </button>`;
  }).join('');
  $('#avg-grid').innerHTML = html || '<p class="hint">Nog geen gemiddelden.</p>';
  // Breedte via JS: inline style-attributen worden door de beveiliging (CSP) geblokkeerd.
  document.querySelectorAll('#avg-grid .avg-fill').forEach((el) => { el.style.width = el.dataset.pct + '%'; });
}

$('#avg-grid').addEventListener('click', (e) => {
  const tile = e.target.closest('[data-vak]');
  if (!tile) return;
  $('#chart-vak').value = tile.dataset.vak;
  renderTimeChart();
  $('#time-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// Vaste kleuren per vak voor de grafiek met alle vakken.
const VAK_COLORS = ['#3b6cf6', '#e8590c', '#2f9e44', '#ae3ec9', '#1098ad', '#f08c00', '#d6336c', '#5c7cfa', '#74b816', '#868e96', '#0ca678', '#f03e3e'];

function renderTimeChart() {
  const vak = $('#chart-vak').value;
  const list = grades.filter((g) => g.cijfer != null && g.datum && (!vak || g.vak === vak))
    .map((g) => ({ ...g, t: new Date(g.datum).getTime() }))
    .sort((a, b) => a.t - b.t);
  const css = getComputedStyle(document.documentElement);
  const color = (v) => css.getPropertyValue(v).trim();
  const DAY = 86_400_000;

  // Ingekorte tijdas: x telt in dagen, maar een lange periode zonder cijfers (bijv. de zomervakantie)
  // wordt ingekort tot MAX_GAP dagen, met een onderbreking (⋯) in de grafiek.
  // De gemiddelden van vorig jaar staan als één compact groepje vooraan.
  const MAX_GAP = 10;
  const vjList = list.filter((g) => g.vorigJaar).sort((a, b) => a.vak.localeCompare(b.vak));
  vjList.forEach((g, i) => { g.x = i * 1.2; });
  const cur = list.filter((g) => !g.vorigJaar);
  const days = [...new Set(cur.map((g) => new Date(g.t).toDateString()))].map((d) => new Date(d).getTime());
  const dayX = new Map();
  const breaks = vjList.length && cur.length ? [vjList.at(-1).x + 2.5] : [];
  let x = vjList.length ? vjList.at(-1).x + 5 : 0;
  days.forEach((d, i) => {
    if (i > 0) {
      const gap = Math.round((d - days[i - 1]) / DAY);
      if (gap > MAX_GAP) breaks.push(x + MAX_GAP / 2);
      x += Math.min(gap, MAX_GAP);
    }
    dayX.set(new Date(d).toDateString(), x);
  });
  // Cijfers op dezelfde dag een klein stukje uit elkaar zetten, zodat ze niet over elkaar liggen.
  const perDay = {};
  for (const g of cur) {
    const key = new Date(g.t).toDateString();
    g.x = dayX.get(key) + (perDay[key] = (perDay[key] ?? -1) + 1) * 0.7;
  }
  const dayList = [...dayX.entries()].map(([d, px]) => ({ x: px, t: new Date(d).getTime() }));

  // Lopend gewogen gemiddelde: verspringt alleen bij een cijfer dat meetelt.
  list.sort((a, b) => a.x - b.x);
  const running = [];
  list.forEach((g, i) => {
    if (g.weging > 0) running.push({ x: g.x, y: +weightedAvg(list.slice(0, i + 1)).avg.toFixed(2) });
  });
  const first = list[0]?.x ?? 0;
  const last = list.at(-1)?.x ?? 1;
  const pad = Math.max(2, (last - first) * 0.04);
  if (running.length) running.push({ x: last + pad, y: running.at(-1).y });

  const avg = vak ? (averages[vak] ?? weightedAvg(list).avg) : null;
  $('#chart-avg-label').innerHTML = avg != null ? `Gemiddelde <b class="${cls(avg)}">${fmt(avg)}</b>` : '';

  // Bolletjes: vaste grootte (wisselende groottes lagen over elkaar en flikkerden bij hoveren).
  // Hol bolletje = telt niet mee.
  const pointSet = (label, items, col) => ({
    label,
    data: items.map((g) => ({ x: g.x, y: g.cijfer, g })),
    pointRadius: 6,
    pointHoverRadius: 8,
    pointHitRadius: 8,
    pointBackgroundColor: items.map((g) => (g.weging > 0 ? col(g) : color('--card'))),
    pointBorderColor: items.map((g) => (g.weging > 0 ? color('--card') : col(g))),
    pointHoverBorderColor: items.map(col),
    pointBorderWidth: items.map((g) => (g.weging > 0 ? 2 : 2.5)),
    backgroundColor: col(items[0] || {}),
    borderColor: col(items[0] || {}),
    order: 1,
  });
  // Zachte kleurverloop onder de gemiddelde-lijn.
  const fade = (hex) => (ctx) => {
    const area = ctx.chart.chartArea;
    if (!area) return 'transparent';
    const grad = ctx.chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
    grad.addColorStop(0, hex + '40');
    grad.addColorStop(1, hex + '00');
    return grad;
  };
  // Vorig jaar (gemiddelden) staat links in een eigen vak.
  const vj = list.filter((g) => g.vorigJaar);
  const vjBand = vj.length ? [Math.min(...vj.map((g) => g.x)) - 1.2, Math.max(...vj.map((g) => g.x)) + 1.2] : null;
  const threshold = {
    label: 'Voldoende (5,5)',
    type: 'line',
    data: [{ x: first - pad, y: 5.5 }, { x: last + pad, y: 5.5 }],
    borderColor: color('--bad'),
    backgroundColor: color('--bad'),
    borderDash: [6, 5],
    borderWidth: 1.5,
    pointRadius: 0,
    pointHitRadius: 0,
    order: 3,
  };
  let datasets;
  if (vak) {
    datasets = [
      pointSet('Cijfer', list, (g) => color(g.cijfer < 5.5 ? '--bad' : '--accent')),
      {
        label: 'Gemiddelde',
        type: 'line',
        data: running,
        stepped: 'before',
        borderColor: color('--good'),
        backgroundColor: fade(color('--good').startsWith('#') && color('--good').length === 7 ? color('--good') : '#2f9e44'),
        fill: 'start',
        borderWidth: 3,
        pointRadius: 0,
        pointHitRadius: 0,
        order: 2,
      },
      threshold,
    ];
  } else {
    // Alle vakken: elk vak een eigen kleur, geen gemiddelde-lijn (die zegt over alle vakken samen weinig).
    const vakken = [...new Set(list.map((g) => g.vak))].sort((a, b) => a.localeCompare(b));
    datasets = vakken.map((v, i) => pointSet(v, list.filter((g) => g.vak === v), () => VAK_COLORS[i % VAK_COLORS.length]));
    datasets.push(threshold);
  }

  // Onderbrekingen tekenen: een stippellijntje met ⋯ waar een lange periode is ingekort.
  const breakPlugin = {
    id: 'breaks',
    // Achtergrond: onvoldoende-zone licht rood, vorig jaar licht grijs met een label.
    beforeDatasetsDraw(chart) {
      const { ctx, chartArea: a, scales } = chart;
      ctx.save();
      const y55 = scales.y.getPixelForValue(5.5);
      ctx.fillStyle = color('--bad');
      ctx.globalAlpha = 0.06;
      ctx.fillRect(a.left, y55, a.right - a.left, a.bottom - y55);
      if (vjBand) {
        const x1 = Math.max(a.left, scales.x.getPixelForValue(vjBand[0]));
        const x2 = Math.min(a.right, scales.x.getPixelForValue(vjBand[1]));
        ctx.fillStyle = color('--muted');
        ctx.globalAlpha = 0.09;
        ctx.fillRect(x1, a.top, x2 - x1, a.bottom - a.top);
        ctx.globalAlpha = 0.85;
        ctx.font = '600 11px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('VORIG JAAR', (x1 + x2) / 2, a.top + 14);
      }
      ctx.restore();
    },
    afterDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      ctx.save();
      ctx.strokeStyle = color('--muted');
      ctx.fillStyle = color('--muted');
      ctx.setLineDash([3, 4]);
      ctx.globalAlpha = 0.6;
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      for (const bx of breaks) {
        const px = scales.x.getPixelForValue(bx);
        ctx.beginPath(); ctx.moveTo(px, chartArea.top); ctx.lineTo(px, chartArea.bottom); ctx.stroke();
        ctx.fillText('⋯', px, chartArea.bottom - 6);
      }
      ctx.restore();
    },
  };

  charts.time?.destroy();
  charts.time = new Chart($('#chart-time'), {
    type: 'scatter',
    data: { datasets },
    plugins: [breakPlugin],
    options: {
      maintainAspectRatio: false,
      animation: { duration: 500, easing: 'easeOutQuart' },
      transitions: { active: { animation: { duration: 0 } } },
      interaction: { mode: 'nearest', intersect: true },
      layout: { padding: { top: 6 } },
      scales: {
        y: { min: 1, max: 10, ticks: { stepSize: 1 }, grid: { color: color('--line') }, border: { display: false } },
        x: {
          type: 'linear',
          min: first - pad,
          max: last + pad,
          // Labels alleen op dagen met cijfers (gelijk verdeeld, max. 7), met de echte datum.
          afterBuildTicks: (axis) => {
            const step = Math.max(1, Math.ceil(dayList.length / 7));
            axis.ticks = dayList.filter((_, i) => i % step === 0).map((d) => ({ value: d.x }));
          },
          ticks: {
            autoSkip: false,
            maxRotation: 0,
            callback: (v) => {
              if (vjBand && v >= vjBand[0] && v <= vjBand[1]) return '';
              const d = dayList.reduce((a, b) => (Math.abs(b.x - v) < Math.abs(a.x - v) ? b : a), dayList[0] || { t: 0 });
              return new Date(d.t).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
            },
          },
          grid: { display: false },
        },
      },
      plugins: {
        legend: { labels: { usePointStyle: true, pointStyle: 'circle', boxHeight: 7, padding: 14, font: { size: 11.5 } } },
        tooltip: {
          animation: false,
          padding: 10,
          cornerRadius: 10,
          titleFont: { size: 13, weight: '700' },
          bodyFont: { size: 12 },
          boxPadding: 4,
          filter: (c) => !!c.raw?.g,
          callbacks: {
            title: (items) => items[0].raw.g.omschrijving || 'Toets',
            label: (c) => {
              const g = c.raw.g;
              return [
                `${g.resultaat} · weging ${g.weging}${g.weging > 0 ? '' : ' (telt niet mee)'}`,
                `${vak ? '' : g.vak + ' · '}${g.vorigJaar ? 'gemiddelde vorig jaar' : new Date(g.t).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}`,
              ];
            },
          },
        },
      },
    },
  });
}
$('#chart-vak').addEventListener('change', renderTimeChart);

// Snel opstarten: eerst je laatst bekende cijfers tonen (van dit apparaat), daarna verversen bij Somtoday.
let gradesShownFromCache = false;
function showCachedGrades() {
  try {
    const c = JSON.parse(localStorage.getItem('cache-grades') || 'null');
    if (!c?.grades?.length || grades.length) return;
    grades = c.grades; averages = c.averages || {};
    gradesShownFromCache = true;
    renderGrades();
  } catch {}
}
async function loadGrades() {
  showCachedGrades();
  try {
    const data = await api('/api/grades');
    grades = data.grades;
    if (!data.demo) try { localStorage.setItem('cache-grades', JSON.stringify({ grades: data.grades, averages: data.averages || {} })); } catch {}
    window.applySync?.(); // voortgang van de laptop (via de koppel-QR)
    averages = data.averages || {};
    $('#demo-banner').hidden = !data.demo;
    showError(null);
    renderGrades();
  } catch (err) {
    showError(err);
  }
}

// ---------- Wat moet ik halen ----------
const MANUAL = '__zelf__';
let manualRows = [{ cijfer: 6, weging: 1 }];

function renderCalcSubjects() {
  const select = $('#calc-vak');
  const current = select.value;
  select.innerHTML = bySubject().map(([vak]) => `<option>${esc(vak)}</option>`).join('') +
    `<option value="${MANUAL}">✏️ Zelf cijfers invullen</option>`;
  if ([...select.options].some((o) => o.value === current)) select.value = current;
  calc();
}

function renderManualRows() {
  $('#manual-rows').innerHTML = manualRows.map((r, i) => `
    <div class="manual-row">
      <input type="number" step="0.1" min="1" max="10" value="${r.cijfer}" data-i="${i}" data-k="cijfer" aria-label="Cijfer">
      <input type="number" step="1" min="0" value="${r.weging}" data-i="${i}" data-k="weging" aria-label="Weging">
      <button class="secondary" data-del="${i}" aria-label="Verwijder">✕</button>
    </div>`).join('');
}
$('#manual-rows').addEventListener('input', (e) => {
  const { i, k } = e.target.dataset;
  if (i != null) { manualRows[i][k] = parseFloat(e.target.value); calc(); }
});
$('#manual-rows').addEventListener('click', (e) => {
  if (e.target.dataset.del != null) { manualRows.splice(+e.target.dataset.del, 1); renderManualRows(); calc(); }
});
$('#add-row').addEventListener('click', () => { manualRows.push({ cijfer: 6, weging: 1 }); renderManualRows(); calc(); });

function calc() {
  const vak = $('#calc-vak').value;
  const manual = vak === MANUAL;
  $('#calc-manual').hidden = !manual;
  if (manual && !$('#manual-rows').children.length) renderManualRows();

  const list = manual ? manualRows.filter((r) => Number.isFinite(r.cijfer)) : grades.filter((g) => g.vak === vak);
  const { avg, sum, weight } = weightedAvg(list);
  const target = parseFloat($('#calc-target').value);
  const w = parseFloat($('#calc-weight').value);

  $('#calc-current').innerHTML = avg == null
    ? 'Nog geen cijfers voor dit vak.'
    : `Je staat nu een <b class="${cls(avg)}">${fmt(avg)}</b> (totale weging ${weight}).`;

  const result = $('#calc-result');
  if (!(w > 0) || !Number.isFinite(target)) { result.textContent = 'Vul een doel en weging in.'; $('#whatif').innerHTML = ''; return; }

  const needed = (target * (weight + w) - sum) / w;
  if (needed > 10) {
    result.innerHTML = `<span class="big bad">${fmt(needed)}</span>Helaas, dat lukt niet met één toets. Zelfs een 10 geeft je een ${fmt((sum + 10 * w) / (weight + w))}.`;
  } else if (needed <= 1) {
    result.innerHTML = `<span class="big good">1,0</span>Je haalt je doel hoe dan ook. Lekker bezig! 🎉`;
  } else {
    result.innerHTML = `<span class="big">${fmt(Math.ceil(needed * 10) / 10)}</span>Dat moet je minimaal halen om op een ${fmt(target)} te komen.`;
  }

  $('#whatif').innerHTML = Array.from({ length: 19 }, (_, i) => 1 + i * 0.5).map((c) => {
    const nieuw = (sum + c * w) / (weight + w);
    return `<div>Haal je ${fmt(c)}<b class="${cls(nieuw)}">${fmt(nieuw)}</b></div>`;
  }).join('');
}
['#calc-vak', '#calc-target', '#calc-weight'].forEach((s) => $(s).addEventListener('input', calc));

// ---------- Rooster ----------
// Daglijst in de stijl van Magister: per dag de lesuren onder elkaar, met huiswerk erbij.
let weekOffset = 0;
let dayIndex = null; // 0 = maandag … 4 = vrijdag
let weekCache = { key: null, lessons: [], homework: [] };

function mondayOf(offset) {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7);
  d.setHours(12, 0, 0, 0);
  return d;
}

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return Math.ceil(((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86_400_000 + 1) / 7);
}

const ymdLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Standaard: vandaag. In het weekend: maandag van volgende week.
function goToToday() {
  const wd = (new Date().getDay() + 6) % 7;
  weekOffset = wd > 4 ? 1 : 0;
  dayIndex = wd > 4 ? 0 : wd;
}

function weekDays() {
  const monday = mondayOf(weekOffset);
  return [0, 1, 2, 3, 4].map((n) => { const d = new Date(monday); d.setDate(d.getDate() + n); return d; });
}

async function loadSchedule() {
  if (dayIndex === null) goToToday();
  const days = weekDays();
  const key = ymdLocal(days[0]);
  renderDayTabs(days);
  if (weekCache.key !== key) {
    $('#day-list').innerHTML = '<div class="mgd-empty">Laden…</div>';
    try {
      const [s, hw] = await Promise.all([
        api(`/api/schedule?week=${key}`),
        api(`/api/homework?week=${key}`).catch(() => ({ items: [] })),
      ]);
      weekCache = { key, lessons: s.items, homework: hw.items };
    } catch (err) {
      $('#day-list').innerHTML = `<div class="mgd-empty bad">${esc(err.message)}</div>`;
      return;
    }
    renderDayTabs(days);
  }
  renderDay(days[dayIndex]);
}

const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

function renderDayTabs(days) {
  const today = new Date().toDateString();
  $('#day-tabs').innerHTML = days.map((d, i) => {
    const count = weekCache.key === ymdLocal(days[0])
      ? weekCache.lessons.filter((l) => sameDay(l.begin, d)).length : null;
    return `<button class="mgd-tab ${i === dayIndex ? 'active' : ''} ${d.toDateString() === today ? 'today' : ''}" data-day="${i}">
      <span class="mgd-tab-name">${d.toLocaleDateString('nl-NL', { weekday: 'short' }).replace('.', '')}</span>
      <span class="mgd-tab-date">${d.getDate()}</span>
      ${count ? `<span class="mgd-tab-count">${count} ${count === 1 ? 'les' : 'lessen'}</span>` : '<span class="mgd-tab-count">&nbsp;</span>'}
    </button>`;
  }).join('');
  $('#week-label').textContent = `Week ${isoWeek(days[0])}`;
}

const HW_LABEL = { HUISWERK: ['Huiswerk', 'mgd-hw'], TOETS: ['Toets', 'mgd-toets'], GROTE_TOETS: ['Proefwerk', 'mgd-pw'] };

function renderDay(day) {
  $('#day-title').textContent = day.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  // Op tijd gesorteerd, zodat bijv. een PWS-les om 08:30 ook bovenaan staat.
  const lessons = weekCache.lessons.filter((l) => sameDay(l.begin, day))
    .sort((a, b) => new Date(a.begin) - new Date(b.begin) || (a.uur ?? 99) - (b.uur ?? 99));
  // Huiswerk bij de juiste les zetten: eerst de les van dat vak op precies die tijd, anders de eerste les
  // van dat vak die dag. Huiswerk zonder les (bijv. een inleverdatum) komt apart onderaan.
  const dayHw = weekCache.homework.filter((h) => sameDay(h.datum, day));
  const tasksFor = new Map(lessons.map((l) => [l, []]));
  const loose = [];
  for (const h of dayHw) {
    const sameVak = lessons.filter((l) => l.vak.toLowerCase() === h.vak.toLowerCase());
    const lesson = sameVak.find((l) => Math.abs(new Date(l.begin) - new Date(h.datum)) < 60_000) || sameVak[0];
    lesson ? tasksFor.get(lesson).push(h) : loose.push(h);
  }

  if (!lessons.length && !dayHw.length) {
    $('#day-list').innerHTML = '<div class="mgd-empty">Geen lessen op deze dag. 🎉</div>';
    return;
  }

  const rows = [];
  let prevUur = null;
  for (const l of lessons) {
    // Tussenuren laten zien, zoals in Magister.
    if (prevUur !== null && l.uur && l.uur > prevUur + 1) {
      for (let u = prevUur + 1; u < l.uur; u++) {
        rows.push(`<div class="mgd-row mgd-free"><div class="mgd-uur">${u}</div><div class="mgd-time"></div><div class="mgd-main hint">Tussenuur</div></div>`);
      }
    }
    if (l.uur) prevUur = Math.max(prevUur ?? 0, l.eindUur || l.uur);

    rows.push(lessonRow(l, tasksFor.get(l)));
  }
  if (loose.length) {
    rows.push(`<div class="mgd-row mgd-loose has-hw">
      <div class="mgd-uur">·</div><div class="mgd-time">hele dag</div>
      <div class="mgd-main"><div class="mgd-line"><span class="mgd-vak">Zonder vaste les</span></div>
        <div class="mgd-meta">${esc([...new Set(loose.map((h) => h.vak))].join(' · '))}</div></div>
      ${hwToggle(loose)}
      ${hwPanel(loose, true)}
    </div>`);
  }
  $('#day-list').innerHTML = rows.join('');
}

// Tekst van een huiswerkopdracht (onderwerp en omschrijving; dubbele tekst maar één keer).
function taskText(h) {
  const o = (h.onderwerp || '').trim();
  const b = (h.omschrijving || '').trim();
  if (!o) return b;
  if (!b || b === o || b.startsWith(o)) return b || o;
  return `${o} – ${b}`;
}

function taskHtml(h, metVak) {
  const [label, kind] = HW_LABEL[h.type] || HW_LABEL.HUISWERK;
  return `<div class="mgd-task"><span class="mgd-chip ${kind}">${label}</span>
    ${metVak && h.vak ? `<b>${esc(h.vak)}:</b> ` : ''}<span class="mgd-task-text">${esc(taskText(h))}</span></div>`;
}

// Blauwe knop rechts in de rij; klik = huiswerk uitklappen.
function hwToggle(tasks) {
  const toets = tasks.find((h) => h.type !== 'HUISWERK');
  const label = toets ? (HW_LABEL[toets.type] || HW_LABEL.TOETS)[0] : 'Huiswerk';
  return `<button class="mgd-hw-toggle ${toets ? 'is-toets' : ''}" data-toggle aria-expanded="false">${label}<span class="mgd-caret">▾</span></button>`;
}
function hwPanel(tasks, metVak) {
  return `<div class="mgd-hw-panel" hidden>${tasks.map((h) => taskHtml(h, metVak)).join('')}</div>`;
}

function lessonRow(l, tasks) {
  const uren = l.eindUur && l.eindUur !== l.uur ? `${l.uur}-${l.eindUur}` : (l.uur ?? '·');
  return `<div class="mgd-row ${l.uitval ? 'cancel' : ''} ${tasks.length ? 'has-hw' : ''}">
    <div class="mgd-uur">${uren}</div>
    <div class="mgd-time">${time(l.begin)}<br><span>${time(l.eind)}</span></div>
    <div class="mgd-main">
      <div class="mgd-line">
        <span class="mgd-vak">${esc(l.vak)}</span>
        ${l.uitval ? '<span class="mgd-chip mgd-vervallen">Vervallen</span>' : ''}
      </div>
      <div class="mgd-meta">${[l.locatie, l.docent].filter(Boolean).map(esc).join(' · ')}</div>
    </div>
    ${tasks.length ? hwToggle(tasks) + hwPanel(tasks, false) : ''}
  </div>`;
}

$('#day-list').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-toggle]');
  if (!btn) return;
  const panel = btn.parentElement.querySelector('.mgd-hw-panel');
  const open = panel.hidden;
  panel.hidden = !open;
  btn.setAttribute('aria-expanded', String(open));
  btn.parentElement.classList.toggle('open', open);
});

$('#day-tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('[data-day]');
  if (!tab) return;
  dayIndex = +tab.dataset.day;
  loadSchedule();
});
function stepDay(dir) {
  dayIndex += dir;
  if (dayIndex < 0) { dayIndex = 4; weekOffset--; }
  if (dayIndex > 4) { dayIndex = 0; weekOffset++; }
  loadSchedule();
}
$('#day-prev').addEventListener('click', () => stepDay(-1));
$('#day-next').addEventListener('click', () => stepDay(1));
$('#week-prev').addEventListener('click', () => { weekOffset--; loadSchedule(); });
$('#week-next').addEventListener('click', () => { weekOffset++; loadSchedule(); });
$('#week-today').addEventListener('click', () => { goToToday(); loadSchedule(); });
document.addEventListener('keydown', (e) => {
  if (!$('#rooster').classList.contains('active') || $('#login').open || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  if (e.key === 'ArrowLeft') stepDay(-1);
  if (e.key === 'ArrowRight') stepDay(1);
});

// ---------- Huiswerk ----------
// Afvinken wordt alleen in deze browser onthouden, niet naar Somtoday gestuurd.
function doneSet() {
  try { return new Set(JSON.parse(localStorage.getItem('hw-done') || '[]')); } catch { return new Set(); }
}
function saveDone(set) {
  try { localStorage.setItem('hw-done', JSON.stringify([...set])); } catch {}
  window.cloudSave?.();
}
let homework = [];

function renderHomework() {
  const done = doneSet();
  const hide = $('#hide-done').checked;
  const typeLabel = { TOETS: 'TOETS', GROTE_TOETS: 'GROTE TOETS' };
  const groups = {};
  const today0 = new Date(); today0.setHours(0, 0, 0, 0);
  homework
    .map((h) => ({ ...h, klaar: h.gemaakt || done.has(h.id) }))
    .filter((h) => !(hide && h.klaar))
    .filter((h) => new Date(h.datum) >= today0) // komende weken: niets van vóór vandaag
    .sort((a, b) => new Date(a.datum) - new Date(b.datum))
    .forEach((h) => (groups[new Date(h.datum).toDateString()] ||= []).push(h));

  $('#homework').innerHTML = Object.values(groups).map((list) => `
    <div class="hw-day">
      <h3>${dayName(list[0].datum)}</h3>
      ${list.map((h) => `
        <div class="hw ${h.klaar ? 'done' : ''}">
          <input type="checkbox" data-id="${esc(h.id)}" ${h.klaar ? 'checked' : ''} aria-label="Klaar">
          <div>
            <div class="title">${esc(h.vak)}: ${esc(h.onderwerp)}${typeLabel[h.type] ? `<span class="badge ${h.type}">${typeLabel[h.type]}</span>` : ''}</div>
            <div class="desc">${esc(h.omschrijving)}</div>
          </div>
        </div>`).join('')}
    </div>`).join('') || '<p class="hint">Geen huiswerk gevonden. 😎</p>';
}

async function loadHomework() {
  try {
    homework = (await api('/api/homework')).items;
    renderHomework();
  } catch (err) {
    $('#homework').innerHTML = `<p class="bad">${esc(err.message)}</p>`;
  }
}
$('#homework').addEventListener('change', (e) => {
  const id = e.target.dataset.id;
  if (!id) return;
  const done = doneSet();
  e.target.checked ? done.add(id) : done.delete(id);
  saveDone(done);
  renderHomework();
});
$('#hide-done').addEventListener('change', renderHomework);

// ---------- Login ----------
let school = null; // onthouden school (van de server)
let searchTimer;

function loginView(view, message) {
  $('#login-pick').hidden = view !== 'pick';
  $('#login-go').hidden = view !== 'go';
  $('#login-wait').hidden = view !== 'wait';
  $('#login-msg').hidden = !message;
  $('#login-msg').textContent = message || '';
  if (school) $('#school-name').textContent = school.naam;
}

// Eén klik: is je school bekend, dan gaat het inlogvenster meteen open.
async function openLogin() {
  if (window.WEB_API) return WEB_API.openLogin();
  if (!$('#login').open) $('#login').showModal();
  if (school) startLogin();
  else { loginView('pick'); $('#school-search').focus(); }
}

// Draait het dashboard in zijn eigen app-venster? Dan gebeurt inloggen in dit venster zelf.
const inApp = new URLSearchParams(location.search).has('app');

async function startLogin(newSchool) {
  loginView(inApp ? 'go' : 'wait');
  try {
    const res = await api('/api/login/browser', { ...(newSchool ? { school: newSchool } : {}), inApp });
    if (newSchool) school = newSchool;
    if (res.inApp) return; // het venster gaat nu zelf naar de inlogpagina
    loginView('wait');
    waitForLogin();
  } catch (err) {
    loginView(school ? 'go' : 'pick', err.message);
  }
}

$('#open-login').addEventListener('click', openLogin);
$('#close-login').addEventListener('click', () => { clearInterval(waitTimer); $('#login').close(); });
$('#start-login').addEventListener('click', () => startLogin());
$('#retry-login').addEventListener('click', () => startLogin());
$('#change-school').addEventListener('click', () => { loginView('pick'); $('#school-search').focus(); });

$('#school-search').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    try {
      const list = await api(`/api/schools?q=${encodeURIComponent(e.target.value)}`);
      $('#school-results').innerHTML = list.map((s, i) =>
        `<li data-i="${i}">${esc(s.naam)} <span class="hint">${esc(s.plaats)}</span></li>`).join('') ||
        (e.target.value.trim().length > 2 ? '<li class="hint">Geen school gevonden.</li>' : '');
      $('#school-results').onclick = (ev) => {
        const li = ev.target.closest('li[data-i]');
        if (!li) return;
        $('#school-results').innerHTML = '';
        startLogin(list[li.dataset.i]);
      };
    } catch (err) {
      loginView('pick', err.message);
    }
  }, 250);
});

$('#start-login-tab').addEventListener('click', async () => {
  const { url } = await api('/api/login/start', {});
  window.open(url, '_blank');
});

$('#paste-go').addEventListener('click', async () => {
  try {
    await api('/api/login/callback', { url: $('#paste-url').value });
    loggedIn();
  } catch (err) {
    loginView(school ? 'go' : 'pick', err.message);
  }
});

let waitTimer;
function waitForLogin() {
  clearInterval(waitTimer);
  waitTimer = setInterval(async () => {
    const s = await api('/api/status');
    if (s.loggedIn) return loggedIn();
    if (s.loginError && !s.loginBusy) {
      clearInterval(waitTimer);
      loginView(school ? 'go' : 'pick', s.loginError);
    }
  }, 1000);
}

function loggedIn() {
  clearInterval(waitTimer);
  $('#login').close();
  init();
}

// ---------- Status ----------
async function loadStatus() {
  const s = await api('/api/status');
  school = s.school;
  $('#hello').textContent = s.loggedIn ? `Hoi ${s.naam}! 👋` : 'Je eigen cijfers, rooster en huiswerk';
  $('#account').innerHTML = s.loggedIn
    ? `<span class="me"><span class="me-avatar">${esc((s.naam || '?').charAt(0).toUpperCase())}</span><span class="me-name">${esc(s.naam)}</span></span>
       <button id="logout" class="secondary small">Uitloggen</button>`
    : '';
  $('#logout')?.addEventListener('click', async () => { try { localStorage.removeItem('cache-grades'); localStorage.removeItem('cache-lm'); } catch {} grades = []; await api('/api/logout', {}); init(); });
}

async function init() {
  await loadStatus();
  await loadGrades();
  if ($('#rooster').classList.contains('active')) loadSchedule();
  if ($('#huiswerk').classList.contains('active')) loadHomework();
}

init().then(async () => {
  const params = new URLSearchParams(location.search);
  // Login verlopen? Dan in het app-venster vanzelf opnieuw inloggen (één keer per sessie).
  const s0 = await api('/api/status');
  let tried = false;
  try { tried = sessionStorage.getItem('auto-login') === '1'; } catch {}
  if (inApp && s0.autoLogin && !tried && !params.has('loginfout')) {
    try { sessionStorage.setItem('auto-login', '1'); } catch {}
    $('#login').showModal();
    return startLogin();
  }
  // Terug van een mislukte login in het app-venster: laat zien wat er misging.
  if (params.has('loginfout')) {
    const s = await api('/api/status');
    $('#login').showModal();
    loginView(school ? 'go' : 'pick', s.loginError || 'Inloggen is niet gelukt. Probeer het opnieuw.');
  }
  if (params.has('loginfout')) history.replaceState(null, '', inApp ? '/?app=1' : '/');
});
setInterval(loadStatus, 60_000);
