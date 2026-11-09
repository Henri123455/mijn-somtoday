// ---------- Somtoday Ultimate Team-account: je voortgang op al je apparaten ----------
// Met een account (e-mail + wachtwoord) staat je Ultimate Team online in je eigen Firebase-project:
// geopende packs, munten, team, wedstrijden en transfers. Log op pc, telefoon en extensie in met hetzelfde account
// en alles is overal hetzelfde. Je Somtoday-login en cijfers gaan er NIET heen.
// Geen extra bibliotheken: alleen de openbare REST-adressen van Firebase.

(function () {
  const CFG = window.UT_CLOUD || {};
  const ready = !!(CFG.apiKey && CFG.projectId);
  const KEY = 'ut-cloud';
  const STAMP = 'ut-cloud-stamp';
  const KEYS = ['pack-opened', 'ut-team', 'ut-form', 'ut-coins', 'ut-paid', 'ut-sold', 'ut-bought', 'ut-buys', 'ut-matches', 'ut-econ', 'hw-done'];
  const rd = (k, fb) => { try { const v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); } catch { return fb; } };
  const wr = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  let auth = rd(KEY, null);
  let applying = false;

  async function post(url, body, form) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json' },
      body: form ? new URLSearchParams(body) : JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(niceError(j.error?.message || String(res.status)));
    return j;
  }
  function niceError(code) {
    if (/EMAIL_EXISTS/.test(code)) return 'Er bestaat al een account met dit e-mailadres. Log in.';
    if (/INVALID_LOGIN|INVALID_PASSWORD|EMAIL_NOT_FOUND|INVALID_EMAIL/.test(code)) return 'E-mail of wachtwoord klopt niet.';
    if (/WEAK_PASSWORD/.test(code)) return 'Kies een wachtwoord van minstens 6 tekens.';
    if (/TOO_MANY/.test(code)) return 'Te veel pogingen. Probeer het over een paar minuten opnieuw.';
    return 'Het account werkt even niet (' + code + ').';
  }
  const saveAuth = (j, email) => {
    auth = { email: email || auth?.email, uid: j.localId || j.user_id, id: j.idToken || j.id_token, refresh: j.refreshToken || j.refresh_token,
      exp: Date.now() + (Number(j.expiresIn || j.expires_in) || 3600) * 1000 };
    wr(KEY, auth);
  };
  async function idToken() {
    if (!auth) throw new Error('Niet ingelogd.');
    if (Date.now() < auth.exp - 60000) return auth.id;
    const j = await post(`https://securetoken.googleapis.com/v1/token?key=${CFG.apiKey}`, { grant_type: 'refresh_token', refresh_token: auth.refresh }, true);
    saveAuth(j);
    return auth.id;
  }
  const docUrl = () => `https://firestore.googleapis.com/v1/projects/${CFG.projectId}/databases/(default)/documents/ut/${auth.uid}`;

  async function pull() {
    const res = await fetch(docUrl(), { headers: { Authorization: 'Bearer ' + await idToken() } });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Online voortgang ophalen lukte niet (' + res.status + ').');
    const j = await res.json();
    return { data: JSON.parse(j.fields?.data?.stringValue || '{}'), stamp: Number(j.fields?.stamp?.integerValue || 0) };
  }
  async function push() {
    const data = Object.fromEntries(KEYS.map((k) => [k, rd(k, null)]).filter(([, v]) => v != null));
    const stamp = Date.now();
    const res = await fetch(docUrl(), {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + await idToken(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { data: { stringValue: JSON.stringify(data) }, stamp: { integerValue: String(stamp) }, naam: { stringValue: auth.email || '' } } }),
    });
    if (!res.ok) throw new Error('Online opslaan lukte niet (' + res.status + ').');
    wr(STAMP, stamp);
    status('Opgeslagen ' + new Date(stamp).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }));
  }
  function apply(remote) {
    applying = true;
    for (const k of KEYS) wr(k, remote.data[k] ?? null);
    wr(STAMP, remote.stamp);
    applying = false;
    try { window.updatePackButton?.(); window.tmInit?.(); if (!$('#ut').hidden) window.renderTeam?.(); } catch {}
  }
  // Bij het opstarten (en na inloggen): is de online versie nieuwer, neem die over; anders de eigen versie online zetten.
  async function sync(fromLogin) {
    if (!ready || !auth) return;
    try {
      const remote = await pull();
      if (remote && (fromLogin || remote.stamp > (rd(STAMP, 0) || 0))) apply(remote);
      else if (!remote || (rd(STAMP, 0) || 0) > remote.stamp) await push();
      status('Gesynchroniseerd');
    } catch (err) { status(err.message); }
  }
  let timer = null;
  window.cloudSave = () => {
    if (!ready || !auth || applying) return;
    clearTimeout(timer);
    timer = setTimeout(() => push().catch((e) => status(e.message)), 2500);
  };

  // ---------- Instellingen ----------
  const el = (id) => document.getElementById(id);
  function status(t) { const s = el('cloud-status'); if (s) s.textContent = t; }
  function render() {
    const box = el('cloud-box'); if (!box) return;
    if (!ready) {
      box.innerHTML = '<p class="hint">Het online account is nog niet ingesteld in deze versie van de app.</p>';
      return;
    }
    box.innerHTML = auth
      ? `<div class="set-row"><span><b>Ingelogd als ${esc(auth.email || '')}</b><small id="cloud-status">Je Ultimate Team synchroniseert vanzelf.</small></span>
           <span class="cloud-btns"><button id="cloud-sync" class="secondary">Nu synchroniseren</button><button id="cloud-out" class="secondary">Uitloggen</button></span></div>`
      : `<div class="cloud-form"><input id="cloud-mail" type="email" placeholder="E-mailadres" autocomplete="username">
           <input id="cloud-pw" type="password" placeholder="Wachtwoord (min. 6 tekens)" autocomplete="current-password">
           <span class="cloud-btns"><button id="cloud-in">Inloggen</button><button id="cloud-new" class="secondary">Account maken</button></span></div>
         <p id="cloud-status" class="hint">Maak een account op één apparaat en log met dezelfde gegevens in op je andere apparaten.</p>`;
    el('cloud-sync')?.addEventListener('click', () => sync(false));
    el('cloud-out')?.addEventListener('click', () => { auth = null; wr(KEY, null); render(); });
    const go = (mode) => async () => {
      const email = el('cloud-mail').value.trim(), password = el('cloud-pw').value;
      if (!email || !password) return status('Vul je e-mail en wachtwoord in.');
      status(mode === 'new' ? 'Account maken…' : 'Inloggen…');
      try {
        const j = await post(`https://identitytoolkit.googleapis.com/v1/accounts:${mode === 'new' ? 'signUp' : 'signInWithPassword'}?key=${CFG.apiKey}`, { email, password, returnSecureToken: true });
        saveAuth(j, email);
        render();
        await sync(mode !== 'new');
      } catch (err) { status(err.message); }
    };
    el('cloud-in')?.addEventListener('click', go('in'));
    el('cloud-new')?.addEventListener('click', go('new'));
  }
  window.addEventListener('DOMContentLoaded', render);
  if (document.readyState !== 'loading') render();
  // Kort na het opstarten één keer synchroniseren (niet meteen: eerst de app laten verschijnen).
  setTimeout(() => sync(false), 1500);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(false); });
})();
