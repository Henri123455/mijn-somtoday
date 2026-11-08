// ---------- Voortgang meenemen naar je telefoon of andere laptop ----------
// De koppel-QR krijgt een klein stukje mee: welke packs je nog NIET geopend hebt, je munten, je opstelling
// en wat je verkocht/gekocht hebt. Cijfers worden aangeduid met een korte vingerafdruk (geen cijfers zelf),
// zodat de code klein blijft. Op het nieuwe apparaat wordt het toegepast zodra de cijfers geladen zijn.

(function () {
  const SYNC_KEY = 'som-sync';
  const rd = (k, fb) => { try { const v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); } catch { return fb; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  // FNV-1a, 32 bit, als base36: max 7 tekens per cijfer.
  const fp = (s) => {
    let h = 0x811c9dc5;
    for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(36);
  };
  const b64 = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64 = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

  // Laptop: maak de code.
  window.makeSync = () => {
    if (!grades.length) return '';
    const opened = window.packOpened?.() || new Set();
    const known = new Set(grades.map((g) => g.id));
    const ref = (id) => (known.has(id) ? '~' + fp(id) : id); // cijfer → vingerafdruk, gekochte speler blijft zoals hij is
    const team = rd('ut-team', {});
    const data = {
      v: 1,
      u: grades.filter((g) => !opened.has(g.id)).map((g) => fp(g.id)),
      c: rd('ut-coins', null),
      t: Object.fromEntries(Object.entries(team).map(([slot, id]) => [slot, ref(id)])),
      s: rd('ut-sold', []).map(ref),
      b: rd('ut-bought', []),
    };
    return b64(JSON.stringify(data));
  };

  // Telefoon/andere laptop: pas de code één keer toe.
  window.applySync = () => {
    let raw = rd(SYNC_KEY, null);
    if (!raw || !grades.length) return;
    try {
      const d = JSON.parse(unb64(raw));
      const byFp = new Map(grades.map((g) => [fp(g.id), g.id]));
      const back = (r) => (typeof r === 'string' && r[0] === '~' ? byFp.get(r.slice(1)) : r);
      const unopened = new Set(d.u || []);
      const opened = grades.filter((g) => !unopened.has(fp(g.id))).map((g) => g.id);
      wr('pack-opened', opened);
      wr('ut-paid', opened); // munten voor deze packs heb je al gehad
      if (typeof d.c === 'number') wr('ut-coins', d.c);
      wr('ut-econ', 2);
      wr('ut-team', Object.fromEntries(Object.entries(d.t || {}).map(([s, r]) => [s, back(r)]).filter(([, id]) => id)));
      wr('ut-sold', (d.s || []).map(back).filter(Boolean));
      wr('ut-bought', Array.isArray(d.b) ? d.b : []);
    } catch {}
    try { localStorage.removeItem(SYNC_KEY); } catch {}
  };
})();
