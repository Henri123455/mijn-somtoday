// ---------- Instellingen ----------
function showSettings() {
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.remove('active'));
  document.querySelectorAll('.tab').forEach((s) => s.classList.toggle('active', s.id === 'instellingen'));
  $('#open-settings').classList.add('active');
  loadSettings();
}

// Terug naar een gewone tab: tandwiel niet meer actief.
$('#tabs').addEventListener('click', () => $('#open-settings').classList.remove('active'));
$('#open-settings').addEventListener('click', showSettings);

function setMsg(text) {
  $('#set-msg').textContent = text;
}

async function loadSettings() {
  const [s, st] = await Promise.all([api('/api/status'), api('/api/settings').catch(() => null)]);
  $('#set-name').textContent = s.loggedIn ? s.naam : 'Niet ingelogd';
  $('#set-avatar').textContent = s.loggedIn ? (s.naam || '?').charAt(0).toUpperCase() : '?';
  $('#set-school').textContent = s.school ? s.school.naam : 'Nog geen school gekozen';
  $('#set-login').textContent = s.loggedIn ? 'Uitloggen' : 'Inloggen';
  $('#set-login').dataset.loggedIn = s.loggedIn ? '1' : '';
  try { $('#set-sound').checked = localStorage.getItem('pack-muted') !== '1'; } catch { $('#set-sound').checked = true; }
  if (st) {
    $('#set-desktop').checked = st.desktop;
    $('#set-autostart').checked = st.autostart;
    $('#set-version').textContent = `versie ${st.versie}`;
  }
}

$('#set-login').addEventListener('click', async (e) => {
  if (e.currentTarget.dataset.loggedIn) {
    try { localStorage.removeItem('cache-grades'); localStorage.removeItem('cache-lm'); } catch {}
    await api('/api/logout', {});
    await init();
    loadSettings();
  } else {
    openLogin();
  }
});

const PIN_HELP = {
  start: ['Klik met rechts op <b>Mijn Somtoday</b> in de Verkenner die net opende.', 'Kies <b>Aan Start vastmaken</b>.', 'Klaar: je vindt hem met het S-logo in je Startmenu.'],
  taskbar: ['Klik met rechts op <b>Mijn Somtoday</b> in de Verkenner die net opende.', 'Kies <b>Meer opties weergeven</b> (alleen in Windows 11).', 'Kies <b>Aan taakbalk vastmaken</b>.'],
};
async function pin(kind) {
  await api('/api/settings/pin', {});
  $('#set-pin-help').innerHTML = PIN_HELP[kind].map((t) => `<li>${t}</li>`).join('');
  $('#set-pin-help').hidden = false;
}
$('#set-pin-start').addEventListener('click', () => pin('start'));

// Thema: systeem / licht / donker.
function currentTheme() { try { return localStorage.getItem('theme') || 'system'; } catch { return 'system'; } }
function showTheme() {
  document.querySelectorAll('#set-theme [data-theme-choice]').forEach((b) => b.classList.toggle('active', b.dataset.themeChoice === currentTheme()));
}
$('#set-theme').addEventListener('click', (e) => {
  const choice = e.target.closest('[data-theme-choice]')?.dataset.themeChoice;
  if (!choice) return;
  try { localStorage.setItem('theme', choice); } catch {}
  if (choice === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = choice;
  showTheme();
  // Grafieken opnieuw tekenen in de nieuwe kleuren.
  if (typeof renderGrades === 'function' && grades.length) renderGrades();
});
showTheme();

// Eenmalige tip in het app-venster: vastmaken aan de taakbalk.
(function pinTip() {
  let seen = false;
  try { seen = localStorage.getItem('tip-pin') === '1'; } catch {}
  if (seen || !new URLSearchParams(location.search).has('app')) return;
  const tip = document.createElement('div');
  tip.className = 'pin-tip';
  tip.innerHTML = `<img src="logo.svg" alt="">
    <span><b>Tip:</b> klik met rechts op het S-logo onderin je taakbalk en kies <b>Aan taakbalk vastmaken</b>. Dan open je de app voortaan met één klik.</span>
    <button class="link" data-tip="meer">Meer uitleg</button>
    <button class="pin-tip-close" data-tip="sluit" aria-label="Tip sluiten">×</button>`;
  $('main').prepend(tip);
  tip.addEventListener('click', (e) => {
    const act = e.target.closest('[data-tip]')?.dataset.tip;
    if (!act) return;
    try { localStorage.setItem('tip-pin', '1'); } catch {}
    tip.remove();
    if (act === 'meer') showSettings();
  });
})();

async function toggleShortcut(where, el) {
  el.disabled = true;
  try {
    const st = await api('/api/settings/shortcut', { where, on: el.checked });
    el.checked = where === 'desktop' ? st.desktop : st.autostart;
    setMsg(where === 'desktop'
      ? (el.checked ? 'Het icoon staat op je bureaublad.' : 'Het icoon is van je bureaublad gehaald.')
      : (el.checked ? 'De app start voortaan met Windows.' : 'De app start niet meer vanzelf met Windows.'));
  } catch (err) {
    el.checked = !el.checked;
    setMsg(err.message);
  } finally {
    el.disabled = false;
  }
}
$('#set-desktop').addEventListener('change', (e) => toggleShortcut('desktop', e.target));
$('#set-autostart').addEventListener('change', (e) => toggleShortcut('autostart', e.target));

$('#set-sound').addEventListener('change', (e) => {
  try { localStorage.setItem('pack-muted', e.target.checked ? '0' : '1'); } catch {}
  setMsg(e.target.checked ? 'Geluid bij packs staat aan.' : 'Geluid bij packs staat uit.');
});

// Knoppen die iets wissen vragen eerst om een tweede klik.
function confirmClick(btn, action) {
  btn.addEventListener('click', () => {
    if (!btn.dataset.armed) {
      btn.dataset.armed = '1';
      btn.dataset.label = btn.textContent;
      btn.textContent = btn.dataset.confirm;
      btn.classList.add('danger');
      setTimeout(() => {
        if (!btn.dataset.armed) return;
        delete btn.dataset.armed;
        btn.textContent = btn.dataset.label;
        btn.classList.remove('danger');
      }, 4000);
      return;
    }
    delete btn.dataset.armed;
    btn.textContent = btn.dataset.label;
    btn.classList.remove('danger');
    action();
  });
}
confirmClick($('#set-reset-packs'), () => {
  try { localStorage.setItem('pack-opened', '[]'); } catch {}
  window.updatePackButton?.();
  setMsg('Al je cijfers zijn weer nieuwe packs. Open ze bij Cijfers.');
});
confirmClick($('#set-clear-team'), () => {
  try { localStorage.setItem('ut-team', '{}'); } catch {}
  setMsg('Je opstelling is leeggemaakt.');
});

// ---------- Telefoon koppelen ----------
// Je logt nog een keer in; die login gaat via een QR-code naar je telefoon (de laptop bewaart hem niet).
const PHONE_URL = 'https://henri123455.github.io/mijn-somtoday/';
function phoneUrl() { try { return localStorage.getItem('phone-url') || PHONE_URL; } catch { return PHONE_URL; } }
$('#set-phone-url').value = phoneUrl();
$('#set-phone-url').addEventListener('change', (e) => {
  let v = e.target.value.trim().replace(/^\w+:\/\//, '').replace(/[#?].*$/, '');
  if (v) v = 'https://' + v.replace(/\/?$/, '/');
  e.target.value = v;
  try { localStorage.setItem('phone-url', v); } catch {}
  setMsg(v ? 'Het adres van je telefoon-app is opgeslagen.' : '');
});

let pairTimer, pairClear, pairLink = '';
function pairView(view, message) {
  $('#pair-wait').hidden = view !== 'wait';
  $('#pair-done').hidden = view !== 'done';
  $('#pair-msg').hidden = !message;
  $('#pair-msg').textContent = message || '';
}

async function startPair() {
  if (!phoneUrl()) {
    setMsg('Vul eerst het adres van je telefoon-app in.');
    return $('#set-phone-url').focus();
  }
  $('#pair').showModal();
  pairView('wait');
  try {
    const res = await api('/api/pair/start', { inApp });
    if (!res.inApp) pollPair(); // anders gaat dit venster zelf naar de inlogpagina
  } catch (err) {
    pairView('error', err.message);
  }
}

function pollPair() {
  clearInterval(pairTimer);
  pairTimer = setInterval(async () => {
    const p = await api('/api/pair').catch(() => ({}));
    if (p.code) { clearInterval(pairTimer); showPairQR(p.code); }
    else if (p.error) { clearInterval(pairTimer); pairView('error', p.error); }
  }, 1000);
}

// Zo kort mogelijk, dan is de QR-code makkelijker te scannen. De login staat achter #: die gaat nooit naar de website zelf.
function showPairQR(code) {
  const extra = new URLSearchParams();
  if (code.u && code.u !== 'https://api.somtoday.nl') extra.set('api', code.u);
  if (code.s) extra.set('school', code.s);
  const sync = window.makeSync?.();
  if (sync) extra.set('d', sync); // je geopende packs, munten en team gaan mee
  const qr = qrcode(0, 'L');
  pairLink = `${phoneUrl()}#koppel=${code.r}${extra.size ? '&' + extra : ''}`;
  qr.addData(pairLink);
  qr.make();
  $('#pair-qr').src = qr.createDataURL(4, 4);
  pairView('done');
  clearTimeout(pairClear);
  pairClear = setTimeout(() => $('#pair').close(), 10 * 60_000);
}

$('#set-pair').addEventListener('click', startPair);
$('#pair-close').addEventListener('click', () => $('#pair').close());
// Zelfde koppeling als de QR, maar als link: open hem op je andere laptop (stuur hem alleen naar jezelf).
$('#pair-copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(pairLink); $('#pair-copy').textContent = 'Gekopieerd. Open hem op je andere laptop'; }
  catch { prompt('Kopieer deze link:', pairLink); }
});
// Dicht = code weg, hier en in de app.
$('#pair').addEventListener('close', () => {
  clearInterval(pairTimer);
  clearTimeout(pairClear);
  $('#pair-qr').removeAttribute('src');
  pairLink = '';
  $('#pair-copy').textContent = 'Kopieer link voor je andere laptop';
  api('/api/pair/clear', {}).catch(() => {});
});
// Terug van de login in het app-venster.
if (new URLSearchParams(location.search).has('koppel')) {
  history.replaceState(null, '', '/?app=1');
  showSettings();
  $('#pair').showModal();
  pairView('wait');
  pollPair();
}

$('#set-open-folder').addEventListener('click', () => api('/api/settings/open-folder', {}));
$('#set-uninstall').addEventListener('click', () => api('/api/settings/open-folder', { select: 'verwijder' }));
