// ---------- Meldingen (staan standaard uit) ----------
// Aan te zetten bij Instellingen. Zolang de app open staat (ook op de achtergrond) kijkt hij elke 10 minuten
// of er iets nieuws is: een nieuw cijfer, een les die uitvalt of verandert, huiswerk voor morgen en je dagelijkse wedstrijd.
(function () {
  const rd = (k, fb) => { try { const v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); } catch { return fb; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const KINDS = { cijfers: 'Nieuwe cijfers', rooster: 'Roosterwijzigingen', huiswerk: 'Huiswerk voor morgen (om 18:00)', wedstrijd: 'Dagelijkse wedstrijd staat klaar' };
  const prefs = () => ({ on: false, cijfers: true, rooster: true, huiswerk: true, wedstrijd: true, ...rd('notify', {}) });
  const supported = () => 'Notification' in window;
  const active = (kind) => { const p = prefs(); return p.on && p[kind] && supported() && Notification.permission === 'granted'; };
  const today = () => new Date().toDateString();

  async function show(title, body, tab, tag) {
    const opts = { body, icon: 'icon.png', badge: 'icon.png', tag: tag || title, data: { tab } };
    try {
      const reg = await navigator.serviceWorker?.getRegistration?.();
      if (reg) return reg.showNotification(title, opts);
    } catch {}
    try {
      const n = new Notification(title, opts);
      n.onclick = () => { window.focus(); if (tab) document.querySelector(`#tabs [data-tab="${tab}"]`)?.click(); n.close(); };
    } catch {}
  }

  // Wat is er nieuw sinds de vorige keer? De eerste keer onthouden we alleen wat er al is (geen stortvloed).
  const seen = rd('notify-seen', {});
  const saveSeen = () => wr('notify-seen', seen);

  function checkGrades(list) {
    const ids = list.filter((g) => g.cijfer != null || g.resultaat).map((g) => String(g.id));
    const known = seen.grades ? new Set(seen.grades) : null;
    seen.grades = ids.slice(-400);
    saveSeen();
    if (!known || !active('cijfers')) return;
    const fresh = list.filter((g) => !known.has(String(g.id)) && (g.cijfer != null || g.resultaat));
    if (!fresh.length) return;
    if (fresh.length > 3) return show(`${fresh.length} nieuwe cijfers`, fresh.map((g) => `${g.vak}: ${g.resultaat ?? g.cijfer}`).join(' · '), 'cijfers', 'cijfers');
    for (const g of fresh) show(`Nieuw cijfer voor ${g.vak}`, `Je hebt een ${g.resultaat ?? String(g.cijfer).replace('.', ',')}${g.omschrijving ? ` voor ${g.omschrijving}` : ''}. Er staat een nieuw pack voor je klaar.`, 'cijfers', 'cijfer-' + g.id);
  }

  // Alleen lessen van vandaag en morgen: valt er een uit, of verandert het lokaal of de tijd?
  function checkSchedule(week) {
    const now = new Date();
    const end = new Date(now); end.setDate(end.getDate() + 2); end.setHours(0, 0, 0, 0);
    const soon = (week.lessons || []).filter((l) => new Date(l.eind) > now && new Date(l.begin) < end);
    const sig = Object.fromEntries(soon.map((l) => [`${l.vak}|${l.begin}`, `${l.uitval ? 'X' : ''}|${l.locatie}`]));
    const before = seen.rooster;
    seen.rooster = sig;
    saveSeen();
    if (!before || !active('rooster')) return;
    for (const l of soon) {
      const k = `${l.vak}|${l.begin}`;
      const was = before[k];
      if (was == null) continue;
      const tijd = new Date(l.begin).toLocaleString('nl-NL', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
      if (l.uitval && !was.startsWith('X')) show(`${l.vak} valt uit`, `Je les ${tijd} gaat niet door.`, 'rooster', 'uitval-' + k);
      else if (!l.uitval && was.split('|')[1] !== l.locatie && l.locatie) show(`${l.vak}: ander lokaal`, `${tijd} in ${l.locatie}.`, 'rooster', 'lokaal-' + k);
    }
  }

  async function checkHomework() {
    if (!active('huiswerk') || new Date().getHours() < 18 || seen.hwDay === today()) return;
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    try {
      const done = new Set(rd('hw-done', []));
      const { items } = await api('/api/homework');
      const open = (items || []).filter((h) => new Date(h.datum).toDateString() === tomorrow.toDateString() && !done.has(h.id) && h.type !== 'LESSTOF');
      seen.hwDay = today();
      saveSeen();
      if (open.length) show(`Huiswerk voor morgen (${open.length})`, open.slice(0, 4).map((h) => `${h.vak}: ${h.onderwerp || 'huiswerk'}`).join(' · '), 'huiswerk', 'hw');
    } catch {}
  }

  function checkMatch() {
    if (!active('wedstrijd') || seen.matchDay === today() || new Date().getHours() < 15) return;
    const played = window.utPlayedToday ? window.utPlayedToday() : false;
    seen.matchDay = today();
    saveSeen();
    if (!played) show('Je dagelijkse wedstrijd staat klaar', 'Speel vandaag je wedstrijd en verdien munten voor de transfermarkt.', 'ut', 'match');
  }

  navigator.serviceWorker?.addEventListener('message', (e) => { if (e.data?.openTab) document.querySelector(`#tabs [data-tab="${e.data.openTab}"]`)?.click(); });

  window.notifyCheck = (kind, data) => {
    try {
      if (kind === 'cijfers') checkGrades(data || []);
      if (kind === 'rooster') checkSchedule(data || {});
    } catch {}
  };

  // Elke 10 minuten zelf kijken (alleen als meldingen aan staan).
  async function poll() {
    if (!prefs().on) return;
    try {
      const g = await api('/api/grades');
      if (!g.demo) window.notifyCheck('cijfers', g.grades);
    } catch {}
    try {
      const d = new Date(); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const s = await api(`/api/schedule?week=${key}`);
      if (!s.demo) window.notifyCheck('rooster', { lessons: s.items });
    } catch {}
    checkHomework();
    checkMatch();
  }
  setInterval(poll, 10 * 60_000);
  setTimeout(() => { checkHomework(); checkMatch(); }, 8000);

  // ---------- Instellingen ----------
  function render() {
    const box = document.getElementById('notify-box');
    if (!box) return;
    const p = prefs();
    const blocked = supported() && Notification.permission === 'denied';
    box.innerHTML = `<label class="set-row"><span><b>Meldingen aan</b><small>${!supported() ? 'Dit apparaat ondersteunt geen meldingen in deze app. Op een iPhone werkt het alleen als de app op je beginscherm staat.'
        : blocked ? 'Meldingen zijn geblokkeerd. Sta ze toe in de instellingen van je browser of telefoon.' : 'Een melding als er iets nieuws is, ook als de app op de achtergrond open staat.'}</small></span>
        <input type="checkbox" id="notify-on" class="switch" ${p.on && !blocked ? 'checked' : ''} ${supported() ? '' : 'disabled'}></label>
      ${p.on ? Object.entries(KINDS).map(([k, label]) => `<label class="set-row sub"><span><b>${label}</b></span><input type="checkbox" class="switch" data-notify="${k}" ${p[k] ? 'checked' : ''}></label>`).join('') : ''}
      <p id="notify-msg" class="hint" aria-live="polite"></p>`;
  }
  document.addEventListener('change', async (e) => {
    const t = e.target;
    if (t.id === 'notify-on') {
      const p = prefs();
      if (t.checked) {
        let perm = Notification.permission;
        if (perm === 'default') perm = await Notification.requestPermission().catch(() => 'denied');
        if (perm !== 'granted') { t.checked = false; render(); document.getElementById('notify-msg').textContent = 'Je hebt meldingen niet toegestaan.'; return; }
        wr('notify', { ...p, on: true });
        render();
        show('Meldingen staan aan', 'Je krijgt nu een melding bij nieuwe cijfers en roosterwijzigingen.', null, 'test');
        poll();
      } else { wr('notify', { ...p, on: false }); render(); }
    }
    if (t.dataset?.notify) { wr('notify', { ...prefs(), [t.dataset.notify]: t.checked }); }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
})();
