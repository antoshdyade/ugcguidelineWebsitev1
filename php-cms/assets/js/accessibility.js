/**
 * SVCOER Accessibility, Live Color Theme Switcher, Web Speech Audio Listener,
 * Hero Slider, Notice Ticker Controls, Mobile Navigation & Global AJAX Search
 */
(function () {
  var BASE_URL = (typeof window.SVCOER_BASE_URL === 'string') ? window.SVCOER_BASE_URL : '';
  function buildUrl(path) {
    if (!path) return BASE_URL || '/';
    if (/^(https?:)?\/\//i.test(path) || path.indexOf('data:') === 0) return path;
    if (BASE_URL && (path === BASE_URL || path.indexOf(BASE_URL + '/') === 0)) return path;
    var clean = String(path).replace(/^\/+/, '');
    return (BASE_URL ? BASE_URL : '') + '/' + clean;
  }
  function escHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var STORAGE_KEY = 'svcoer_php_a11y';
  var prefs = {};
  try {
    prefs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
  } catch (e) {
    prefs = {};
  }
  var fontScale = typeof prefs.fontScale === 'number' ? prefs.fontScale : 1;

  function applyPrefs() {
    var root = document.documentElement;
    root.style.setProperty('--font-scale', String(fontScale));
    if (prefs.primaryColor) root.style.setProperty('--primary-color', prefs.primaryColor);
    if (prefs.secondaryColor) root.style.setProperty('--secondary-color', prefs.secondaryColor);
    root.classList.toggle('dark', Boolean(prefs.dark));
    root.classList.toggle('high-contrast', Boolean(prefs.contrast));
    root.classList.toggle('dyslexia-font', Boolean(prefs.dyslexia));
    root.classList.toggle('highlight-links', Boolean(prefs.highlight));

    var map = {
      'a11y-contrast-btn': Boolean(prefs.contrast),
      'a11y-dark-btn': Boolean(prefs.dark),
      'a11y-dyslexia-btn': Boolean(prefs.dyslexia),
      'a11y-highlight-btn': Boolean(prefs.highlight),
    };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.toggle('is-active', map[id]);
    });

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.assign({}, prefs, { fontScale: fontScale })));
    } catch (e) {}
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
    var pInput = document.getElementById('picker-primary');
    var sInput = document.getElementById('picker-secondary');
    if (pInput) pInput.value = primary;
    if (sInput) sInput.value = secondary;
    applyPrefs();
  };

  window.svcoerThemeSelect = function (val) {
    if (!val || val.indexOf('|') === -1) return;
    var parts = val.split('|');
    window.svcoerPalette(parts[0], parts[1]);
  };

  window.svcoerLanguage = function (lang) {
    document.documentElement.lang = lang || 'en';
    var labels = {
      en: { notices: 'Latest Notices', listen: 'Listen' },
      hi: { notices: 'नवीनतम सूचनाएं', listen: 'सुनें' },
      mr: { notices: 'ताज्या सूचना', listen: 'ऐका' },
      kn: { notices: 'ಇತ್ತೀಚಿನ ಸೂಚನೆಗಳು', listen: 'ಕೇಳಿ' },
      ta: { notices: 'சமீபத்திய அறிவிப்புகள்', listen: 'கேளுங்கள்' },
    };
    var cfg = labels[lang] || labels.en;
    var badge = document.getElementById('ticker-badge-label');
    if (badge) badge.textContent = cfg.notices;
    var listenBtn = document.getElementById('a11y-listen-btn');
    if (listenBtn && !speaking) listenBtn.textContent = cfg.listen;
  };

  var speaking = false;
  window.svcoerSpeak = function () {
    var btn = document.getElementById('a11y-listen-btn');
    if (!('speechSynthesis' in window)) {
      if (btn) btn.textContent = 'Audio Unsupported';
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      speaking = false;
      if (btn) {
        btn.classList.remove('is-speaking');
        btn.textContent = 'Listen';
      }
      return;
    }
    var selObj = window.getSelection ? window.getSelection() : null;
    var sel = selObj ? selObj.toString().trim() : '';
    var main = document.getElementById('main-content');
    var text = sel || (main ? main.innerText.slice(0, 3000) : document.title);
    var utt = new SpeechSynthesisUtterance(text);
    utt.onend = function () {
      speaking = false;
      if (btn) {
        btn.classList.remove('is-speaking');
        btn.textContent = 'Listen';
      }
    };
    utt.onerror = function () {
      speaking = false;
      if (btn) {
        btn.classList.remove('is-speaking');
        btn.textContent = 'Listen';
      }
    };
    speaking = true;
    if (btn) {
      btn.classList.add('is-speaking');
      btn.textContent = 'Stop Audio';
    }
    window.speechSynthesis.speak(utt);
  };

  window.svcoerToggleMobileNav = function () {
    var list = document.getElementById('main-nav-list');
    if (list) list.classList.toggle('is-open');
  };

  // Interactive Hero Slider
  var slides = document.querySelectorAll('.hero-slide');
  var currentSlide = 0;
  function showSlide(idx) {
    if (!slides.length) return;
    currentSlide = (idx + slides.length) % slides.length;
    slides.forEach(function (el, i) {
      el.classList.toggle('is-active', i === currentSlide);
    });
    var counter = document.getElementById('hero-slide-counter');
    if (counter) counter.textContent = (currentSlide + 1) + ' / ' + slides.length;
  }
  window.svcoerSlidePrev = function () { showSlide(currentSlide - 1); };
  window.svcoerSlideNext = function () { showSlide(currentSlide + 1); };
  if (slides.length > 1) {
    setInterval(function () { showSlide(currentSlide + 1); }, 6500);
  }

  // Ticker Play/Pause & Prev/Next
  var tickerPaused = false;
  var tickerTrack = document.getElementById('php-ticker-track');
  window.svcoerTickerToggle = function () {
    tickerPaused = !tickerPaused;
    if (tickerTrack) tickerTrack.classList.toggle('is-paused', tickerPaused);
    var btn = document.getElementById('ticker-pause-btn');
    if (btn) btn.textContent = tickerPaused ? 'Play' : 'Pause';
  };
  window.svcoerTickerStep = function (dir) {
    var vp = document.getElementById('php-ticker-viewport');
    if (!vp) return;
    tickerPaused = true;
    if (tickerTrack) tickerTrack.classList.add('is-paused');
    var btn = document.getElementById('ticker-pause-btn');
    if (btn) btn.textContent = 'Play';
    vp.scrollBy({ left: dir * 240, behavior: 'smooth' });
  };

  // Global AJAX Live Search
  var searchInput = document.getElementById('global-search-input');
  var searchDropdown = document.getElementById('global-search-dropdown');
  if (searchInput && searchDropdown) {
    var timer = null;
    searchInput.addEventListener('input', function () {
      var q = searchInput.value.trim();
      clearTimeout(timer);
      if (q.length < 2) {
        searchDropdown.style.display = 'none';
        return;
      }
      timer = setTimeout(function () {
        fetch(buildUrl('search.php?ajax=1&q=' + encodeURIComponent(q)))
          .then(function (resp) { return resp.json(); })
          .then(function (items) {
            if (!items || !items.length) {
              searchDropdown.innerHTML = '<div style="padding:10px;font-size:13px;color:var(--text-muted);">No matching records found.</div>';
            } else {
              searchDropdown.innerHTML = items.map(function (it) {
                return '<a href="' + escHtml(buildUrl(it.url)) + '" style="display:block;padding:8px 12px;border-bottom:1px solid var(--border-color);text-decoration:none;color:inherit;">' +
                  '<strong>' + escHtml(it.title) + '</strong><br><small style="color:var(--text-muted);">' + escHtml(it.type) + '</small></a>';
              }).join('');
            }
            searchDropdown.style.display = 'block';
          })
          .catch(function () {
            searchDropdown.style.display = 'none';
          });
      }, 180);
    });
    document.addEventListener('click', function (ev) {
      if (!searchInput.contains(ev.target) && !searchDropdown.contains(ev.target)) {
        searchDropdown.style.display = 'none';
      }
    });
  }

  // Interactive Custom Image Slider Component (.cms-prose .cms-slider)
  function initCmsSliders() {
    var sliders = document.querySelectorAll('.cms-prose .cms-slider');
    for (var sIdx = 0; sIdx < sliders.length; sIdx++) {
      (function (slider) {
        if (slider.dataset.sliderBound === '1') return;
        slider.dataset.sliderBound = '1';
        var slides = slider.querySelectorAll('.cms-slide');
        var dots = slider.querySelectorAll('.cms-slider-dot');
        if (!slides.length) return;
        var current = 0;
        var timer = null;
        var paused = false;
        var autoplaySec = Math.max(0, parseInt(slider.getAttribute('data-autoplay') || '5', 10) || 0);

        function show(idx) {
          current = ((idx % slides.length) + slides.length) % slides.length;
          for (var i = 0; i < slides.length; i++) {
            slides[i].classList.toggle('is-active', i === current);
          }
          for (var j = 0; j < dots.length; j++) {
            dots[j].classList.toggle('is-active', j === current);
          }
        }
        function resetTimer() {
          if (timer) { clearInterval(timer); timer = null; }
          if (slides.length > 1 && autoplaySec > 0) {
            timer = setInterval(function () { if (!paused) show(current + 1); }, autoplaySec * 1000);
          }
        }
        var prevBtn = slider.querySelector('.cms-slider-prev');
        var nextBtn = slider.querySelector('.cms-slider-next');
        if (prevBtn) prevBtn.addEventListener('click', function () { show(current - 1); resetTimer(); });
        if (nextBtn) nextBtn.addEventListener('click', function () { show(current + 1); resetTimer(); });
        for (var dIdx = 0; dIdx < dots.length; dIdx++) {
          (function (idxVal) {
            dots[dIdx].addEventListener('click', function () { show(idxVal); resetTimer(); });
          })(dIdx);
        }
        slider.addEventListener('mouseenter', function () { paused = true; });
        slider.addEventListener('mouseleave', function () { paused = false; });
        show(0);
        resetTimer();
      })(sliders[sIdx]);
    }
  }
  initCmsSliders();
  window.svcoerInitCmsSliders = initCmsSliders;
})();
