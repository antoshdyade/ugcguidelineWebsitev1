/**
 * SVCOER Accessibility, Live Color Theme Switcher, Web Speech TTS,
 * Multi-Language Translator & Global AJAX Search
 */
(function () {
  const STORAGE_KEY = 'svcoer_php_a11y';
  const prefs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  let fontScale = typeof prefs.fontScale === 'number' ? prefs.fontScale : 1;

  function applyPrefs() {
    const root = document.documentElement;
    root.style.setProperty('--font-scale', String(fontScale));
    if (prefs.primaryColor) root.style.setProperty('--primary-color', prefs.primaryColor);
    if (prefs.secondaryColor) root.style.setProperty('--secondary-color', prefs.secondaryColor);
    root.classList.toggle('dark', Boolean(prefs.dark));
    root.classList.toggle('high-contrast', Boolean(prefs.contrast));
    root.classList.toggle('dyslexia-font', Boolean(prefs.dyslexia));
    root.classList.toggle('highlight-links', Boolean(prefs.highlight));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prefs, fontScale }));
  }

  applyPrefs();

  window.svcoerFont = function (delta) {
    fontScale = delta === 'reset' ? 1 : Math.min(1.25, Math.max(0.85, fontScale + delta));
    applyPrefs();
  };

  window.svcoerToggle = function (key) {
    prefs[key] = !prefs[key];
    applyPrefs();
  };

  window.svcoerPalette = function (primary, secondary) {
    prefs.primaryColor = primary;
    prefs.secondaryColor = secondary;
    const pInput = document.getElementById('picker-primary');
    const sInput = document.getElementById('picker-secondary');
    if (pInput) pInput.value = primary;
    if (sInput) sInput.value = secondary;
    applyPrefs();
  };

  let speaking = false;
  window.svcoerSpeak = function () {
    if (!('speechSynthesis' in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      speaking = false;
      return;
    }
    const sel = window.getSelection()?.toString().trim();
    const main = document.getElementById('main-content');
    const text = sel || (main ? main.innerText.slice(0, 3000) : document.title);
    const utt = new SpeechSynthesisUtterance(text);
    utt.onend = () => { speaking = false; };
    speaking = true;
    window.speechSynthesis.speak(utt);
  };

  // Global AJAX Live Search
  const searchInput = document.getElementById('global-search-input');
  const searchDropdown = document.getElementById('global-search-dropdown');
  if (searchInput && searchDropdown) {
    let timer = null;
    searchInput.addEventListener('input', function () {
      const q = searchInput.value.trim();
      clearTimeout(timer);
      if (q.length < 2) {
        searchDropdown.style.display = 'none';
        return;
      }
      timer = setTimeout(async () => {
        try {
          const resp = await fetch('search.php?ajax=1&q=' + encodeURIComponent(q));
          const items = await resp.json();
          if (!items.length) {
            searchDropdown.innerHTML = '<div style="padding:10px;font-size:13px;">No matching records found.</div>';
          } else {
            searchDropdown.innerHTML = items
              .map((it) => `<a href="${it.url}" style="display:block;padding:8px 12px;border-bottom:1px solid #eee;text-decoration:none;color:inherit;"><strong>${it.title}</strong><br><small>${it.type}</small></a>`)
              .join('');
          }
          searchDropdown.style.display = 'block';
        } catch (err) {
          searchDropdown.style.display = 'none';
        }
      }, 180);
    });
  }
})();
