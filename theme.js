// Thema (systeem / licht / donker) meteen bij het laden toepassen, zodat het scherm niet eerst flitst.
(function () {
  let theme = 'system';
  try { theme = localStorage.getItem('theme') || 'system'; } catch {}
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
})();
