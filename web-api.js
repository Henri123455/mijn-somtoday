// Telefoonversie. Hier draait geen server op je laptop: de app praat zelf met Somtoday,
// en je login staat alleen op deze telefoon. app.js stuurt zijn /api/...-verzoeken hierheen.
(function () {
  document.documentElement.classList.add('web');
  const AUTH = 'https://inloggen.somtoday.nl';
  const CLIENT_ID = 'somtoday-leerling-native';
  const KEY = 'som-login';
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const write = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  let login = read(KEY); // { refresh, access, expires, api, school, account: { id, naam } }

  // ---------- Login ----------
  async function tokenRequest(fields) {
    const res = await fetch(`${AUTH}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ client_id: CLIENT_ID, scope: 'openid', ...fields }),
    });
    if (!res.ok) throw Object.assign(new Error(`Somtoday-login mislukt (${res.status}).`), { status: res.status });
    return res.json();
  }

  let refreshing = null;
  async function token() {
    if (!login) throw new Error('Niet ingelogd.');
    if (login.access && Date.now() < login.expires - 60_000) return login;
    // Een refresh-token werkt maar één keer, dus nooit twee vernieuwingen tegelijk.
    refreshing ||= (async () => {
      const cur = read(KEY) || login; // misschien heeft een ander tabblad al vernieuwd
      if (cur.access && Date.now() < cur.expires - 60_000) { login = cur; return; }
      try {
        const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: cur.refresh });
        login = { ...cur, refresh: t.refresh_token, access: t.access_token, api: t.somtoday_api_url || cur.api,
          expires: Date.now() + (Number(t.expires_in) || 3600) * 1000 };
        write(KEY, login);
      } catch (err) {
        if (err.status === 400 || err.status === 401) {
          login = null;
          write(KEY, null);
          throw new Error('Je login op deze telefoon is verlopen. Koppel je telefoon opnieuw via de laptop-app.');
        }
        throw new Error('Somtoday is even niet bereikbaar. Probeer het zo opnieuw.');
      }
    })().finally(() => { refreshing = null; });
    await refreshing;
    return login;
  }

  async function api(pathAndQuery, range) {
    const t = await token();
    const headers = { Authorization: `Bearer ${t.access}`, Accept: 'application/json' };
    if (range) headers.Range = range;
    const res = await fetch(t.api + pathAndQuery, { headers });
    if (!res.ok && res.status !== 206) throw new Error(`Somtoday gaf fout ${res.status} bij ${pathAndQuery.split('?')[0]}`);
    const json = await res.json();
    json._range = res.headers.get('content-range');
    return json;
  }

  // De koppelcode uit de QR-code: "koppel=<refresh-token>&school=<naam>" (en soms &api=<adres>).
  async function pairWith(code) {
    const c = new URLSearchParams(String(code).trim().replace(/^[^#]*#/, '').replace(/^(?!koppel=)/, 'koppel='));
    const refresh = c.get('koppel');
    const apiUrl = c.get('api') || 'https://api.somtoday.nl';
    if (!/^[\w.-]{20,}$/.test(refresh || '') || !/^https:\/\/[\w.-]+\.somtoday\.nl$/.test(apiUrl)) {
      write('som-koppel', null);
      throw new Error('Deze koppelcode klopt niet. Maak een nieuwe QR-code op je laptop.');
    }
    login = { refresh, api: apiUrl, school: c.get('school') ? { naam: c.get('school') } : null };
    try {
      await token(); // eerste vernieuwing: vanaf nu heeft deze telefoon zijn eigen login
      login.account = await SomData.getAccount(api);
      write(KEY, login);
      if (c.get('d')) write('som-sync', c.get('d')); // voortgang van de laptop, toegepast zodra de cijfers er zijn
    } catch (err) {
      login = null;
      write(KEY, null);
      if (!/verlopen/.test(err.message)) throw err; // bijv. geen internet: later opnieuw proberen
      write('som-koppel', null);
      throw new Error('Deze koppelcode is al gebruikt of verlopen. Maak een nieuwe QR-code op je laptop.');
    }
    write('som-koppel', null);
  }

  // Binnengekomen via de QR-code? Haal de code meteen uit de adresbalk.
  const fromLink = location.hash.includes('koppel=') ? location.hash.slice(1) : null;
  if (fromLink) {
    history.replaceState(null, '', location.pathname);
    write('som-koppel', fromLink);
  }
  let pairError = null;
  // Als app op je beginscherm: koppelen gaat vanzelf. In de browser vragen we eerst wat je wilt.
  let ready = Promise.resolve();
  const pending = read('som-koppel');
  if (pending && (standalone || !isIOS && !fromLink)) {
    ready = pairWith(pending).catch((err) => { pairError = err; });
  }

  // ---------- Bewaarde gegevens, voor als je even geen internet hebt ----------
  async function cached(key, fn) {
    try {
      const v = await fn();
      write('som-cache-' + key, v);
      return v;
    } catch (err) {
      const v = read('som-cache-' + key);
      if (v && login) return v;
      throw err;
    }
  }

  function monday(dateStr) {
    const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
  }
  const ymd = (d) => d.toISOString().slice(0, 10);
  const addDays = (d, n) => { const c = new Date(d); c.setDate(c.getDate() + n); return c; };

  const routes = {
    'GET /api/status': async () => ({
      loggedIn: !!login?.account, naam: login?.account?.naam || null, loginBusy: false, loginError: null,
      school: login?.school || null, autoLogin: false, web: true,
    }),
    'GET /api/grades': async () => (login?.account
      ? cached('grades', async () => ({ demo: false, ...(await SomData.getGrades(api, login.account.id)) }))
      : { demo: true, grades: SomDemo.grades(), averages: {} }),
    'GET /api/schedule': async (q) => {
      const begin = monday(q.get('week'));
      if (!login?.account) return { demo: true, week: ymd(begin), items: SomDemo.schedule(ymd(begin)) };
      return cached('schedule-' + ymd(begin), async () => ({
        demo: false, week: ymd(begin), items: await SomData.getSchedule(api, ymd(begin), ymd(addDays(begin, 7))),
      }));
    },
    'GET /api/homework': async (q) => {
      const begin = monday(q.get('week'));
      const until = addDays(begin, 21);
      const items = login?.account
        ? await cached('homework-' + ymd(begin), () => SomData.getHomework(api, login.account.id, ymd(begin)))
        : SomDemo.homework(q.get('week') ? ymd(begin) : ymd(new Date()));
      return { demo: !login?.account, items: items.filter((h) => new Date(h.datum) < until) };
    },
    'GET /api/leermiddelen': async () => (login?.account
      ? { items: await cached('leermiddelen', () => SomData.getLeermiddelen(api, login.account.id)) }
      : { items: [], demo: true }),
    'POST /api/logout': async () => {
      login = null;
      write(KEY, null);
      Object.keys(localStorage).filter((k) => k.startsWith('som-cache-')).forEach((k) => localStorage.removeItem(k));
      return { ok: true };
    },
    'POST /api/open-url': async (q, body) => { window.open(body.url, '_blank', 'noopener'); return { ok: true }; },
  };

  async function handle(path, body) {
    await ready;
    const url = new URL(path, location.href);
    const route = routes[`${body ? 'POST' : 'GET'} ${url.pathname.replace(/^.*\/api\//, '/api/')}`];
    if (!route) throw new Error('Dit kan alleen in de laptop-app.');
    return route(url.searchParams, body || {});
  }

  // ---------- Koppelen (in plaats van inloggen) ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const INSTALL = isIOS
    ? 'Tik onderin Safari op <b>Deel</b> <span class="pp-ico">⬆︎</span> en kies <b>Zet op beginscherm</b>.'
    : 'Tik in Chrome rechtsboven op <b>⋮</b> en kies <b>App installeren</b> of <b>Toevoegen aan startscherm</b>.';

  function dialog() {
    let d = document.getElementById('phone-pair');
    if (!d) {
      d = document.createElement('dialog');
      d.id = 'phone-pair';
      d.className = 'phone-pair';
      document.body.append(d);
      d.addEventListener('click', onClick);
    }
    return d;
  }

  function show(html) {
    const d = dialog();
    d.innerHTML = html + '<div class="row-end"><button data-pp="close" class="secondary">Sluiten</button></div>';
    if (!d.open) d.showModal();
  }

  function showPair(message) {
    show(`<h2>Koppel je telefoon</h2>
      ${message ? `<p class="login-msg">${esc(message)}</p>` : ''}
      <ol class="pp-steps">
        <li>Open <b>Mijn Somtoday</b> op je laptop en ga naar <b>Instellingen</b> (het tandwiel).</li>
        <li>Klik bij <b>Op je telefoon</b> op <b>Telefoon koppelen</b> en log in.</li>
        <li>Scan de QR-code met de camera van je telefoon.</li>
      </ol>
      <details class="fallback"${standalone ? ' open' : ''}>
        <summary>Heb je een koppelcode gekopieerd?</summary>
        <textarea id="pp-code" rows="3" placeholder="Plak hier je koppelcode" autocomplete="off"></textarea>
        <button data-pp="paste">Koppelen</button>
      </details>
      <p class="hint">Je login komt alleen op deze telefoon te staan. Deze app is niet van Somtoday.</p>`);
  }

  // Net de QR-code gescand in de browser: uitleggen hoe hij op je beginscherm komt.
  function showInstall() {
    show(`<h2>Bijna klaar 📱</h2>
      <ol class="pp-steps">
        <li>${INSTALL}</li>
        <li>Open <b>Mijn Somtoday</b> via het nieuwe icoon op je beginscherm.</li>
        ${isIOS ? '<li>Vraagt de app om een koppelcode? Tik dan eerst hieronder op <b>Kopieer koppelcode</b> en plak hem in de app.</li>' : ''}
      </ol>
      <div class="pp-actions">
        ${isIOS ? '<button data-pp="copy">📋 Kopieer koppelcode</button>' : ''}
        <button data-pp="here" class="secondary">Gewoon hier in de browser gebruiken</button>
      </div>
      <p id="pp-msg" class="hint" aria-live="polite"></p>`);
  }

  async function busy(promise) {
    const d = dialog();
    d.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    try {
      await promise;
      d.close();
      init();
    } catch (err) {
      showPair(err.message);
    }
  }

  async function onClick(e) {
    const act = e.target.closest('[data-pp]')?.dataset.pp;
    if (act === 'close') dialog().close();
    if (act === 'paste') busy(pairWith(document.getElementById('pp-code').value));
    if (act === 'here') busy(pairWith(read('som-koppel') || ''));
    if (act === 'copy') {
      try {
        await navigator.clipboard.writeText(read('som-koppel') || '');
        document.getElementById('pp-msg').textContent = 'Gekopieerd! Zet de app nu op je beginscherm.';
      } catch {
        document.getElementById('pp-msg').textContent = 'Kopiëren lukte niet. Gebruik de app dan hier in de browser.';
      }
    }
  }

  window.addEventListener('load', async () => {
    await ready;
    if (pairError) showPair(pairError.message);
    else if (fromLink && !login?.account) showInstall();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  });

  window.WEB_API = { handle, openLogin: () => showPair() };
})();
