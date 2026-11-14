/**
 * SVCOER Visual Word-Processor + Drag-and-Drop Graphical Block Composer & HTML/CSS Source Editor
 * Full parity with the Google AI Studio RichTextEditor (Webmin & XAMPP resilient)
 */
(function () {
  var BASE_URL = (typeof window.SVCOER_BASE_URL === 'string') ? window.SVCOER_BASE_URL : '';

  function resolveUrl(rel) {
    if (!rel) return '';
    if (/^(https?:)?\/\//i.test(rel) || rel.indexOf('data:') === 0) return rel;
    if (BASE_URL && (rel === BASE_URL || rel.indexOf(BASE_URL + '/') === 0)) return rel;
    var clean = String(rel).replace(/^\/+/, '');
    return (BASE_URL ? BASE_URL : '') + '/' + clean;
  }

  function svgIcon(pathMarkup, size) {
    var s = size || 14;
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + pathMarkup + '</svg>';
  }

  var ICONS = {
    eye: svgIcon('<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'),
    code: svgIcon('<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'),
    blocks: svgIcon('<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>'),
    undo: svgIcon('<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>'),
    redo: svgIcon('<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>'),
    bold: svgIcon('<path d="M14 12a4 4 0 0 0 0-8H6v8"/><path d="M15 20a4 4 0 0 0 0-8H6v8Z"/>'),
    italic: svgIcon('<line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/>'),
    underline: svgIcon('<path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" x2="20" y1="20" y2="20"/>'),
    strike: svgIcon('<path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" x2="20" y1="12" y2="12"/>'),
    palette: svgIcon('<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>'),
    hilite: svgIcon('<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>'),
    ul: svgIcon('<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>'),
    ol: svgIcon('<line x1="10" x2="21" y1="6" y2="6"/><line x1="10" x2="21" y1="12" y2="12"/><line x1="10" x2="21" y1="18" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>'),
    indent: svgIcon('<polyline points="3 8 7 12 3 16"/><line x1="21" x2="11" y1="12" y2="12"/><line x1="21" x2="11" y1="6" y2="6"/><line x1="21" x2="11" y1="18" y2="18"/>'),
    outdent: svgIcon('<polyline points="7 8 3 12 7 16"/><line x1="21" x2="11" y1="12" y2="12"/><line x1="21" x2="11" y1="6" y2="6"/><line x1="21" x2="11" y1="18" y2="18"/>'),
    left: svgIcon('<line x1="21" x2="3" y1="6" y2="6"/><line x1="15" x2="3" y1="12" y2="12"/><line x1="17" x2="3" y1="18" y2="18"/>'),
    center: svgIcon('<line x1="21" x2="3" y1="6" y2="6"/><line x1="17" x2="7" y1="12" y2="12"/><line x1="19" x2="5" y1="18" y2="18"/>'),
    right: svgIcon('<line x1="21" x2="3" y1="6" y2="6"/><line x1="21" x2="9" y1="12" y2="12"/><line x1="21" x2="7" y1="18" y2="18"/>'),
    justify: svgIcon('<line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/>'),
    minus: svgIcon('<line x1="5" x2="19" y1="12" y2="12"/>'),
    clear: svgIcon('<path d="M4 7V4h16v3"/><path d="M5 20h6"/><path d="M13 4 8 20"/><path d="m15 15 5 5"/><path d="m20 15-5 5"/>'),
    table: svgIcon('<path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/>'),
    link: svgIcon('<path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/>'),
    image: svgIcon('<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>'),
    grip: svgIcon('<circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>', 13),
    up: svgIcon('<path d="m18 15-6-6-6 6"/>', 13),
    down: svgIcon('<path d="m6 9 6 6 6-6"/>', 13),
    copy: svgIcon('<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>', 13),
    trash: svgIcon('<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>', 13),
  };

  var TEXT_SWATCHES = [
    { label: 'Navy Primary', value: '#0F294A' },
    { label: 'Amber Gold', value: '#B45309' },
    { label: 'Deep Emerald', value: '#047857' },
    { label: 'Ocean Teal', value: '#0F766E' },
    { label: 'Royal Blue', value: '#1D4ED8' },
    { label: 'Crimson Red', value: '#B91C1C' },
    { label: 'Charcoal', value: '#1C1917' },
    { label: 'Slate Muted', value: '#475569' },
    { label: 'White', value: '#FFFFFF' },
  ];

  var HIGHLIGHT_SWATCHES = [
    { label: 'None', value: 'transparent' },
    { label: 'Warm Amber', value: '#FEF3C7' },
    { label: 'Sky Blue', value: '#E0F2FE' },
    { label: 'Mint Green', value: '#D1FAE5' },
    { label: 'Soft Rose', value: '#FFE4E6' },
    { label: 'Lavender', value: '#EDE9FE' },
    { label: 'Soft Slate', value: '#F1F5F9' },
  ];

  var TABLE_THEMES = [
    { id: 'navy', label: 'Navy Academic', color: '#0F294A' },
    { id: 'amber', label: 'Saffron Gold', color: '#B45309' },
    { id: 'teal', label: 'Ocean Teal', color: '#0F766E' },
    { id: 'emerald', label: 'Emerald STEM', color: '#047857' },
    { id: 'slate', label: 'Executive Slate', color: '#334155' },
    { id: 'minimal', label: 'Clean Border', color: '#78716C' },
  ];

  var BLOCKS = [
    {
      id: 'hero-banner',
      category: 'Callouts',
      label: 'Colorful Hero Banner',
      badge: 'Gradient Header + CTA',
      html: '<div class="cms-block cms-banner-navy" data-block="hero-banner"><p class="cms-kicker">Autonomous · NAAC A+ (3.46)</p><h2>Program &amp; Institutional Highlights</h2><p>Empowering scholars with outcome-based autonomous curricula, NAAC A+ quality assurance, and complete UGC NEP 2020 transparency.</p><div class="cms-btn-row"><a href="quick-links.php" class="cms-btn cms-btn-amber">Download Prospectus PDF</a><a href="page.php?slug=admission-process" class="cms-btn cms-btn-light">Admission Guidelines</a></div></div><p><br></p>',
    },
    {
      id: 'two-col-cards',
      category: 'Layouts',
      label: '2-Column Feature Cards',
      badge: 'Colorful Split Cards',
      html: '<div class="cms-block cms-grid-2" data-block="two-col-cards"><div class="cms-card cms-card-navy"><h3>Undergraduate Programs</h3><p>Outcome-based 160-credit curriculum with Multidisciplinary Minors, Skill Courses, and Semester VIII Internship.</p></div><div class="cms-card cms-card-amber"><h3>Research &amp; Innovation</h3><p>Sponsored DST-SERB, AICTE-MODROBS laboratories, patent filing cell, and student incubation support.</p></div></div><p><br></p>',
    },
    {
      id: 'three-col-stats',
      category: 'Layouts',
      label: '3-Column KPI Stat Cards',
      badge: 'Metrics Row',
      html: '<div class="cms-block cms-grid-3" data-block="three-col-stats"><div class="cms-stat-box cms-accent-navy"><span class="cms-stat-value">A+ (3.46)</span><span class="cms-stat-label">NAAC Accreditation Grade</span></div><div class="cms-stat-box cms-accent-teal"><span class="cms-stat-value">250+</span><span class="cms-stat-label">Recruiting Companies</span></div><div class="cms-stat-box cms-accent-emerald"><span class="cms-stat-value">100%</span><span class="cms-stat-label">UGC Public Disclosure</span></div></div><p><br></p>',
    },
    {
      id: 'callout-info',
      category: 'Callouts',
      label: 'Blue Notice Callout',
      badge: 'Info Notice Box',
      html: '<div class="cms-block cms-callout cms-callout-info" data-block="callout-info"><strong>Public Self-Disclosure Notice:</strong> All statutory documents, approved fee schedules, and ordinances are accessible publicly without login under UGC NEP 2020 Guidelines.</div><p><br></p>',
    },
    {
      id: 'callout-success',
      category: 'Callouts',
      label: 'Emerald Highlight Box',
      badge: 'Verified Green Callout',
      html: '<div class="cms-block cms-callout cms-callout-success" data-block="callout-success"><strong>Verified Accreditation &amp; Grants:</strong> Compliant with AICTE norms, PAHSUS Autonomous Ordinances, and Academic Bank of Credits (ABC / DigiLocker NAD).</div><p><br></p>',
    },
    {
      id: 'callout-warning',
      category: 'Callouts',
      label: 'Amber Deadline / Alert Box',
      badge: 'Important Notice',
      html: '<div class="cms-block cms-callout cms-callout-warning" data-block="callout-warning"><strong>Attention Students &amp; Parents:</strong> Verify your APAAR / ABC ID on the Autonomous Examination Portal prior to form submission.</div><p><br></p>',
    },
    {
      id: 'image-split',
      category: 'Layouts',
      label: 'Image + Text Split Feature',
      badge: 'Media Showcase',
      html: '<div class="cms-block cms-split" data-block="image-split"><div class="cms-split-media"><img src="' + resolveUrl('assets/images/hero_campus.jpg') + '" alt="Campus Highlight"></div><div><h3>State-of-the-Art Campus &amp; Research Labs</h3><p>Modern laboratories, central reading atrium, and green energy campus supporting engineering excellence.</p></div></div><p><br></p>',
    },
    {
      id: 'profile-card',
      category: 'Academic',
      label: 'Officer / Coordinator Card',
      badge: 'Committee Contact',
      html: '<div class="cms-block cms-profile-card" data-block="profile-card"><div class="cms-profile-avatar">SV</div><div><h4>Prof. / Dr. Coordinator Name</h4><p class="cms-profile-role">Statutory Role &amp; Department Designation</p><p class="cms-profile-meta">Email: office@coe.sveri.ac.in · Tel: +91-02186-216063 · Office: Admin Block</p></div></div><p><br></p>',
    },
    {
      id: 'checklist-box',
      category: 'Academic',
      label: 'Checkmark Highlight List',
      badge: 'Structured Bullets',
      html: '<ul class="cms-block cms-checklist" data-block="checklist-box"><li>NBA Accredited Engineering Programs &amp; Autonomous Curricula</li><li>Mandatory 6-Month Industry Internship / Research Project</li><li>Digital Grievance Redressal &amp; 24x7 Anti-Ragging Compliance</li></ul><p><br></p>',
    },
    {
      id: 'faq-accordion',
      category: 'Interactive',
      label: 'Collapsible FAQ / Ordinance',
      badge: 'Expandable Collapse',
      html: '<details class="cms-block cms-accordion" data-block="faq-accordion" open><summary>Frequently Asked Question / Statutory Ordinance Detail</summary><div class="cms-accordion-body"><p>Write your expandable ordinance explanation, scholarship rule, or examination FAQ answer here.</p></div></details><p><br></p>',
    },
    {
      id: 'btn-row',
      category: 'Interactive',
      label: 'Button Action Strip',
      badge: 'CTA Buttons',
      html: '<div class="cms-block cms-btn-row" data-block="btn-row"><a href="quick-links.php" class="cms-btn cms-btn-primary">Download Circular (PDF)</a><a href="contact.php" class="cms-btn cms-btn-outline">Contact Helpdesk</a></div><p><br></p>',
    },
  ];

  function buildTableHtml(rows, cols, themeKey, withHeader) {
    var rCount = Math.max(1, Math.min(12, rows));
    var cCount = Math.max(1, Math.min(10, cols));
    var thead = '';
    if (withHeader) {
      var ths = [];
      for (var c = 1; c <= cCount; c++) {
        ths.push('<th>Column ' + c + '</th>');
      }
      thead = '<thead><tr>' + ths.join('') + '</tr></thead>';
    }
    var trs = [];
    for (var r = 1; r <= rCount; r++) {
      var tds = [];
      for (var k = 1; k <= cCount; k++) {
        tds.push('<td>Entry ' + r + '.' + k + '</td>');
      }
      trs.push('<tr>' + tds.join('') + '</tr>');
    }
    return '<table class="cms-block cms-table cms-table-' + themeKey + '" data-block="table">' + thead + '<tbody>' + trs.join('') + '</tbody></table><p><br></p>';
  }

  function makeToolBtn(htmlContent, title, outlined) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = htmlContent;
    btn.title = title || '';
    btn.className = 'rte-tool-btn' + (outlined ? ' is-outlined' : '');
    return btn;
  }

  function mountEditor(textarea) {
    if (!textarea || textarea.dataset.mounted === '1') return;
    textarea.dataset.mounted = '1';

    var csrf = textarea.getAttribute('data-csrf') || '';
    var root = document.createElement('div');
    root.className = 'rte-root';

    // Top Header Bar (matching RichTextEditor.tsx)
    var topbar = document.createElement('div');
    topbar.className = 'rte-topbar';
    var topLabel = document.createElement('span');
    topLabel.className = 'rte-topbar-label';
    topLabel.textContent = 'Visual Word-Style Editor & Graphical HTML Block Composer';

    var topActions = document.createElement('div');
    topActions.className = 'rte-topbar-actions';

    var blocksVisible = true;
    var toggleBlocksBtn = document.createElement('button');
    toggleBlocksBtn.type = 'button';
    toggleBlocksBtn.className = 'rte-blocks-toggle';
    toggleBlocksBtn.innerHTML = ICONS.blocks + ' <span>Hide Component Blocks</span>';

    var modeTabs = document.createElement('div');
    modeTabs.className = 'rte-mode-tabs';

    var visualModeBtn = document.createElement('button');
    visualModeBtn.type = 'button';
    visualModeBtn.className = 'rte-mode-btn is-active';
    visualModeBtn.innerHTML = ICONS.eye + ' <span>Visual Word Editor</span>';

    var htmlModeBtn = document.createElement('button');
    htmlModeBtn.type = 'button';
    htmlModeBtn.className = 'rte-mode-btn';
    htmlModeBtn.innerHTML = ICONS.code + ' <span>HTML &amp; CSS Source</span>';

    modeTabs.appendChild(visualModeBtn);
    modeTabs.appendChild(htmlModeBtn);
    topActions.appendChild(toggleBlocksBtn);
    topActions.appendChild(modeTabs);
    topbar.appendChild(topLabel);
    topbar.appendChild(topActions);

    var frame = document.createElement('div');
    frame.className = 'rte-frame';

    var toolbar = document.createElement('div');
    toolbar.className = 'rte-toolbar';

    var ctxBar = document.createElement('div');
    ctxBar.className = 'rte-ctx-bar';

    var popoverBar = document.createElement('div');
    popoverBar.className = 'rte-popover';

    var statusBanner = document.createElement('div');
    statusBanner.className = 'rte-notice';

    var workspace = document.createElement('div');
    workspace.className = 'rte-workspace';

    var editorPane = document.createElement('div');
    editorPane.className = 'rte-editor-pane';

    var visual = document.createElement('div');
    visual.className = 'cms-prose rte-canvas';
    visual.contentEditable = 'true';
    visual.innerHTML = textarea.value || '<p>Enter institutional content here or drag/click graphical blocks from the side panel...</p>';

    textarea.className = 'rte-raw-textarea';

    var isHtmlMode = false;
    var activePopover = null;
    var selectedBlockEl = null;
    var activeTableEl = null;
    var activeCellEl = null;

    function syncToTextarea() {
      if (!isHtmlMode) {
        var clone = visual.cloneNode(true);
        clone.querySelectorAll('.cms-selected-block').forEach(function (el) {
          el.classList.remove('cms-selected-block');
        });
        textarea.value = clone.innerHTML;
      }
    }

    function showNotice(msg, isError) {
      statusBanner.textContent = msg;
      statusBanner.style.background = isError ? '#FEF2F2' : '#ECFDF5';
      statusBanner.style.color = isError ? '#991B1B' : '#065F46';
      statusBanner.style.borderBottomColor = isError ? '#FECACA' : '#A7F3D0';
      statusBanner.style.display = 'block';
      setTimeout(function () { statusBanner.style.display = 'none'; }, 4200);
    }

    function insertHtmlAtFocus(html) {
      if (isHtmlMode) {
        textarea.value += '\n' + html + '\n';
        return;
      }
      visual.focus();
      try {
        document.execCommand('insertHTML', false, html);
      } catch (e) {
        visual.insertAdjacentHTML('beforeend', html);
      }
      syncToTextarea();
    }

    function inspectContext(target) {
      var node = target || null;
      if (!node && window.getSelection) {
        var sel = window.getSelection();
        node = sel && sel.rangeCount ? sel.anchorNode : null;
      }
      var el = node && node.nodeType === 1 ? node : (node && node.parentElement ? node.parentElement : null);

      visual.querySelectorAll('.cms-selected-block').forEach(function (b) {
        b.classList.remove('cms-selected-block');
      });

      selectedBlockEl = el && el.closest ? el.closest('[data-block]') : null;
      if (selectedBlockEl && visual.contains(selectedBlockEl)) {
        selectedBlockEl.classList.add('cms-selected-block');
      } else {
        selectedBlockEl = null;
      }

      activeCellEl = el && el.closest ? el.closest('td, th') : null;
      activeTableEl = el && el.closest ? el.closest('table') : null;
      if (!activeTableEl || !visual.contains(activeTableEl)) {
        activeTableEl = null;
        activeCellEl = null;
      }
      renderCtxBar();
    }

    function renderCtxBar() {
      ctxBar.innerHTML = '';
      if ((!selectedBlockEl && !activeTableEl) || isHtmlMode) {
        ctxBar.style.display = 'none';
        return;
      }
      ctxBar.style.display = 'flex';

      var left = document.createElement('div');
      left.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;';
      var tag = document.createElement('strong');
      tag.textContent = activeTableEl ? 'Table Tools:' : ('Selected Block (' + (selectedBlockEl.getAttribute('data-block') || 'component') + '):');
      left.appendChild(tag);

      if (activeTableEl) {
        var addRowBtn = makeToolBtn('+ Row', 'Add Table Row', true);
        addRowBtn.addEventListener('click', function () {
          var tbody = activeTableEl.querySelector('tbody') || activeTableEl;
          var refRow = (activeCellEl && activeCellEl.parentElement) || tbody.rows[tbody.rows.length - 1];
          var cols = refRow ? refRow.cells.length : 3;
          var tr = document.createElement('tr');
          for (var i = 0; i < cols; i++) {
            var td = document.createElement('td');
            td.textContent = 'New Entry';
            tr.appendChild(td);
          }
          tbody.appendChild(tr);
          syncToTextarea();
        });
        var addColBtn = makeToolBtn('+ Col', 'Add Table Column', true);
        addColBtn.addEventListener('click', function () {
          Array.prototype.forEach.call(activeTableEl.rows, function (row, idx) {
            var cell = document.createElement(idx === 0 && row.parentElement && row.parentElement.tagName === 'THEAD' ? 'th' : 'td');
            cell.textContent = cell.tagName === 'TH' ? 'New Col' : 'Data';
            row.appendChild(cell);
          });
          syncToTextarea();
        });
        var delRowBtn = makeToolBtn('- Row', 'Delete Current Row', true);
        delRowBtn.addEventListener('click', function () {
          if (activeCellEl && activeCellEl.parentElement && activeTableEl.rows.length > 1) {
            activeCellEl.parentElement.remove();
            syncToTextarea();
            inspectContext(null);
          }
        });
        var themeSel = document.createElement('select');
        themeSel.className = 'rte-tool-select';
        TABLE_THEMES.forEach(function (t) {
          var o = document.createElement('option');
          o.value = t.id;
          o.textContent = 'Theme: ' + t.label;
          if (activeTableEl.classList.contains('cms-table-' + t.id)) o.selected = true;
          themeSel.appendChild(o);
        });
        themeSel.addEventListener('change', function () {
          TABLE_THEMES.forEach(function (t) { activeTableEl.classList.remove('cms-table-' + t.id); });
          activeTableEl.classList.add('cms-table-' + themeSel.value);
          syncToTextarea();
        });
        left.appendChild(addRowBtn);
        left.appendChild(addColBtn);
        left.appendChild(delRowBtn);
        left.appendChild(themeSel);
      }

      var right = document.createElement('div');
      right.style.cssText = 'display:flex;align-items:center;gap:4px;';
      var targetEl = selectedBlockEl || activeTableEl;
      if (targetEl) {
        var upBtn = makeToolBtn(ICONS.up + ' Up', 'Move Block Up', true);
        upBtn.addEventListener('click', function () {
          if (targetEl.previousElementSibling) {
            targetEl.parentNode.insertBefore(targetEl, targetEl.previousElementSibling);
            syncToTextarea();
          }
        });
        var dnBtn = makeToolBtn(ICONS.down + ' Down', 'Move Block Down', true);
        dnBtn.addEventListener('click', function () {
          if (targetEl.nextElementSibling) {
            targetEl.parentNode.insertBefore(targetEl.nextElementSibling, targetEl);
            syncToTextarea();
          }
        });
        var dupBtn = makeToolBtn(ICONS.copy + ' Duplicate', 'Duplicate Block', true);
        dupBtn.addEventListener('click', function () {
          var copy = targetEl.cloneNode(true);
          copy.classList.remove('cms-selected-block');
          targetEl.parentNode.insertBefore(copy, targetEl.nextSibling);
          syncToTextarea();
        });
        var delBtn = makeToolBtn(ICONS.trash + ' Delete', 'Delete Selected Block', true);
        delBtn.style.color = '#B91C1C';
        delBtn.addEventListener('click', function () {
          targetEl.remove();
          selectedBlockEl = null;
          activeTableEl = null;
          syncToTextarea();
          renderCtxBar();
        });
        right.appendChild(upBtn);
        right.appendChild(dnBtn);
        right.appendChild(dupBtn);
        right.appendChild(delBtn);
      }
      ctxBar.appendChild(left);
      ctxBar.appendChild(right);
    }

    visual.addEventListener('input', syncToTextarea);
    visual.addEventListener('click', function (ev) { inspectContext(ev.target); });
    visual.addEventListener('keyup', function () { inspectContext(null); });

    function addSelect(options, onChange, title) {
      var sel = document.createElement('select');
      sel.title = title;
      sel.className = 'rte-tool-select';
      options.forEach(function (opt) {
        var o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        sel.appendChild(o);
      });
      sel.addEventListener('change', function () {
        if (!isHtmlMode && sel.value) {
          visual.focus();
          onChange(sel.value);
          syncToTextarea();
        }
        sel.selectedIndex = 0;
      });
      toolbar.appendChild(sel);
    }

    function addBtn(iconMarkup, title, onClick, outlined) {
      var b = makeToolBtn(iconMarkup, title, outlined);
      b.addEventListener('click', function () {
        if (isHtmlMode) return;
        visual.focus();
        onClick();
        syncToTextarea();
      });
      toolbar.appendChild(b);
      return b;
    }

    function addSep() {
      var s = document.createElement('span');
      s.className = 'rte-tool-sep';
      toolbar.appendChild(s);
    }

    addBtn(ICONS.undo, 'Undo', function () { document.execCommand('undo'); });
    addBtn(ICONS.redo, 'Redo', function () { document.execCommand('redo'); });
    addSep();

    addSelect(
      [
        { value: '', label: 'Block Style…' },
        { value: 'p', label: 'Paragraph' },
        { value: 'h1', label: 'Title (H1)' },
        { value: 'h2', label: 'Heading 2' },
        { value: 'h3', label: 'Heading 3' },
        { value: 'h4', label: 'Subheading 4' },
        { value: 'blockquote', label: 'Quote Box' },
      ],
      function (val) { document.execCommand('formatBlock', false, '<' + val + '>'); },
      'Text Block Format'
    );

    addSelect(
      [
        { value: '', label: 'Font Family…' },
        { value: 'Plus Jakarta Sans, system-ui, sans-serif', label: 'Modern Sans' },
        { value: 'Playfair Display, Georgia, serif', label: 'Editorial Serif' },
        { value: 'Atkinson Hyperlegible, sans-serif', label: 'Accessible Font' },
        { value: 'ui-monospace, monospace', label: 'Code Monospace' },
      ],
      function (val) { document.execCommand('fontName', false, val); },
      'Font Family'
    );

    addSelect(
      [
        { value: '', label: 'Size…' },
        { value: '2', label: '12px Small' },
        { value: '3', label: '14px Normal' },
        { value: '4', label: '16px Medium' },
        { value: '5', label: '20px Large' },
        { value: '6', label: '24px Title' },
      ],
      function (val) { document.execCommand('fontSize', false, val); },
      'Font Size'
    );
    addSep();

    addBtn(ICONS.bold, 'Bold', function () { document.execCommand('bold'); });
    addBtn(ICONS.italic, 'Italic', function () { document.execCommand('italic'); });
    addBtn(ICONS.underline, 'Underline', function () { document.execCommand('underline'); });
    addBtn(ICONS.strike, 'Strikethrough', function () { document.execCommand('strikeThrough'); });
    addBtn('<span style="font-size:11px;font-weight:700;">X<sup>2</sup></span>', 'Superscript', function () { document.execCommand('superscript'); });
    addBtn('<span style="font-size:11px;font-weight:700;">X<sub>2</sub></span>', 'Subscript', function () { document.execCommand('subscript'); });

    // Text Color Swatch Popover
    var textColorBtn = makeToolBtn(ICONS.palette + ' <span style="width:10px;height:10px;border-radius:2px;background:#0F294A;border:1px solid #78716C;display:inline-block;"></span>', 'Text Color');
    textColorBtn.addEventListener('click', function () {
      if (isHtmlMode) return;
      if (activePopover === 'tcolor') { popoverBar.style.display = 'none'; activePopover = null; return; }
      activePopover = 'tcolor';
      popoverBar.innerHTML = '<strong>Text Color:</strong>';
      popoverBar.style.display = 'flex';
      var grid = document.createElement('div');
      grid.className = 'rte-swatch-grid';
      TEXT_SWATCHES.forEach(function (sw) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'rte-swatch';
        btn.title = sw.label;
        btn.style.backgroundColor = sw.value;
        btn.addEventListener('click', function () {
          visual.focus();
          document.execCommand('foreColor', false, sw.value);
          syncToTextarea();
          popoverBar.style.display = 'none';
          activePopover = null;
        });
        grid.appendChild(btn);
      });
      var custom = document.createElement('input');
      custom.type = 'color'; custom.value = '#0F294A';
      custom.style.cssText = 'width:28px;height:24px;border:0;padding:0;background:transparent;cursor:pointer;';
      custom.addEventListener('change', function () {
        visual.focus();
        document.execCommand('foreColor', false, custom.value);
        syncToTextarea();
      });
      grid.appendChild(custom);
      popoverBar.appendChild(grid);
    });
    toolbar.appendChild(textColorBtn);

    // Highlight Color Swatch Popover
    var bgColorBtn = makeToolBtn(ICONS.hilite + ' <span style="width:10px;height:10px;border-radius:2px;background:#FEF3C7;border:1px solid #78716C;display:inline-block;"></span>', 'Highlight Color');
    bgColorBtn.addEventListener('click', function () {
      if (isHtmlMode) return;
      if (activePopover === 'bgcolor') { popoverBar.style.display = 'none'; activePopover = null; return; }
      activePopover = 'bgcolor';
      popoverBar.innerHTML = '<strong>Highlight Fill:</strong>';
      popoverBar.style.display = 'flex';
      var grid = document.createElement('div');
      grid.className = 'rte-swatch-grid';
      HIGHLIGHT_SWATCHES.forEach(function (sw) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'rte-swatch';
        btn.title = sw.label;
        btn.style.backgroundColor = sw.value;
        if (sw.value === 'transparent') btn.textContent = 'Ø';
        btn.addEventListener('click', function () {
          visual.focus();
          document.execCommand('hiliteColor', false, sw.value);
          syncToTextarea();
          popoverBar.style.display = 'none';
          activePopover = null;
        });
        grid.appendChild(btn);
      });
      var custom = document.createElement('input');
      custom.type = 'color'; custom.value = '#FEF3C7';
      custom.style.cssText = 'width:28px;height:24px;border:0;padding:0;background:transparent;cursor:pointer;';
      custom.addEventListener('change', function () {
        visual.focus();
        document.execCommand('hiliteColor', false, custom.value);
        syncToTextarea();
      });
      grid.appendChild(custom);
      popoverBar.appendChild(grid);
    });
    toolbar.appendChild(bgColorBtn);
    addSep();

    addBtn(ICONS.ul, 'Bullet List', function () { document.execCommand('insertUnorderedList'); });
    addBtn(ICONS.ol, 'Numbered List', function () { document.execCommand('insertOrderedList'); });
    addBtn(ICONS.indent, 'Indent', function () { document.execCommand('indent'); });
    addBtn(ICONS.outdent, 'Outdent', function () { document.execCommand('outdent'); });
    addSep();

    addBtn(ICONS.left, 'Align Left', function () { document.execCommand('justifyLeft'); });
    addBtn(ICONS.center, 'Align Center', function () { document.execCommand('justifyCenter'); });
    addBtn(ICONS.right, 'Align Right', function () { document.execCommand('justifyRight'); });
    addBtn(ICONS.justify, 'Justify', function () { document.execCommand('justifyFull'); });
    addBtn(ICONS.minus, 'Horizontal Divider', function () { document.execCommand('insertHorizontalRule'); });
    addBtn(ICONS.clear, 'Clear Formatting', function () { document.execCommand('removeFormat'); });
    addSep();

    // Styled Table Designer Popover
    var tableDesignerBtn = makeToolBtn(ICONS.table + ' <span>Table Designer</span>', 'Insert Styled Table', true);
    tableDesignerBtn.addEventListener('click', function () {
      if (activePopover === 'table') { popoverBar.style.display = 'none'; activePopover = null; return; }
      activePopover = 'table';
      popoverBar.innerHTML = '';
      popoverBar.style.display = 'flex';

      var rowInp = document.createElement('input');
      rowInp.type = 'number'; rowInp.min = '1'; rowInp.max = '12'; rowInp.value = '4';
      rowInp.style.cssText = 'width:56px;padding:4px 6px;border:1px solid #D6D3D1;border-radius:6px;background:#fff;';

      var colInp = document.createElement('input');
      colInp.type = 'number'; colInp.min = '1'; colInp.max = '10'; colInp.value = '3';
      colInp.style.cssText = 'width:56px;padding:4px 6px;border:1px solid #D6D3D1;border-radius:6px;background:#fff;';

      var hdrChk = document.createElement('input');
      hdrChk.type = 'checkbox'; hdrChk.checked = true;
      var hdrLbl = document.createElement('label');
      hdrLbl.style.cssText = 'display:inline-flex;align-items:center;gap:4px;cursor:pointer;';
      hdrLbl.appendChild(hdrChk);
      hdrLbl.appendChild(document.createTextNode('Header Row'));

      var chosenTheme = 'navy';
      var themeWrap = document.createElement('div');
      themeWrap.style.cssText = 'display:inline-flex;flex-wrap:wrap;gap:4px;';
      TABLE_THEMES.forEach(function (t) {
        var tb = document.createElement('button');
        tb.type = 'button';
        tb.textContent = t.label;
        tb.style.cssText = 'padding:3px 8px;font-size:11px;font-weight:700;border-radius:5px;border:1px solid #D6D3D1;cursor:pointer;' +
          (t.id === chosenTheme ? 'background:' + t.color + ';color:#fff;border-color:' + t.color + ';' : 'background:#fff;color:#1C1917;');
        tb.addEventListener('click', function () {
          chosenTheme = t.id;
          Array.prototype.forEach.call(themeWrap.children, function (el, idx) {
            var th = TABLE_THEMES[idx];
            var on = th.id === chosenTheme;
            el.style.background = on ? th.color : '#fff';
            el.style.color = on ? '#fff' : '#1C1917';
            el.style.borderColor = on ? th.color : '#D6D3D1';
          });
        });
        themeWrap.appendChild(tb);
      });

      var insertTBtn = makeToolBtn('Insert Table', 'Insert Table', true);
      insertTBtn.style.cssText = 'background:#0F294A;color:#fff;border-color:#0F294A;padding:0 10px;';
      insertTBtn.addEventListener('click', function () {
        insertHtmlAtFocus(buildTableHtml(parseInt(rowInp.value, 10) || 4, parseInt(colInp.value, 10) || 3, chosenTheme, hdrChk.checked));
        popoverBar.style.display = 'none';
        activePopover = null;
      });
      var closeTBtn = makeToolBtn('Close', 'Close', true);
      closeTBtn.addEventListener('click', function () { popoverBar.style.display = 'none'; activePopover = null; });

      var lbl = document.createElement('strong'); lbl.textContent = 'Table Builder:';
      popoverBar.appendChild(lbl);
      popoverBar.appendChild(document.createTextNode(' Rows:'));
      popoverBar.appendChild(rowInp);
      popoverBar.appendChild(document.createTextNode(' Cols:'));
      popoverBar.appendChild(colInp);
      popoverBar.appendChild(hdrLbl);
      popoverBar.appendChild(themeWrap);
      popoverBar.appendChild(insertTBtn);
      popoverBar.appendChild(closeTBtn);
    });
    toolbar.appendChild(tableDesignerBtn);

    // Inline Link / Button Popover
    var linkBtn = makeToolBtn(ICONS.link + ' <span>Link / PDF</span>', 'Insert Link or Button', true);
    linkBtn.addEventListener('click', function () {
      if (activePopover === 'link') { popoverBar.style.display = 'none'; activePopover = null; return; }
      activePopover = 'link';
      popoverBar.innerHTML = '';
      popoverBar.style.display = 'flex';

      var urlInp = document.createElement('input');
      urlInp.type = 'text'; urlInp.placeholder = 'https://... or uploads/file.pdf';
      urlInp.style.cssText = 'min-width:210px;padding:4px 8px;border:1px solid #D6D3D1;border-radius:6px;background:#fff;';
      var txtInp = document.createElement('input');
      txtInp.type = 'text'; txtInp.placeholder = 'Link / Button Label';
      txtInp.style.cssText = 'min-width:150px;padding:4px 8px;border:1px solid #D6D3D1;border-radius:6px;background:#fff;';
      var asBtnLbl = document.createElement('label');
      asBtnLbl.style.cssText = 'display:inline-flex;align-items:center;gap:4px;cursor:pointer;';
      var asBtnChk = document.createElement('input'); asBtnChk.type = 'checkbox'; asBtnChk.checked = true;
      asBtnLbl.appendChild(asBtnChk);
      asBtnLbl.appendChild(document.createTextNode('Style as Button'));

      var addLBtn = makeToolBtn('Insert Link', 'Insert Link', true);
      addLBtn.style.cssText = 'background:#B45309;color:#fff;border-color:#B45309;padding:0 10px;';
      addLBtn.addEventListener('click', function () {
        var u = urlInp.value.trim();
        if (!u) return;
        var t = txtInp.value.trim() || u;
        var cls = asBtnChk.checked ? ' class="cms-btn cms-btn-primary"' : '';
        insertHtmlAtFocus('<a href="' + u + '"' + cls + ' target="_blank" rel="noopener noreferrer">' + t + '</a>');
        popoverBar.style.display = 'none';
        activePopover = null;
      });
      var closeLBtn = makeToolBtn('Close', 'Close', true);
      closeLBtn.addEventListener('click', function () { popoverBar.style.display = 'none'; activePopover = null; });

      popoverBar.appendChild(urlInp);
      popoverBar.appendChild(txtInp);
      popoverBar.appendChild(asBtnLbl);
      popoverBar.appendChild(addLBtn);
      popoverBar.appendChild(closeLBtn);
    });
    toolbar.appendChild(linkBtn);

    // Inline Photo Uploader (with Auto-Crop & Max Photo Size Policy)
    var imgLabel = document.createElement('label');
    imgLabel.className = 'rte-tool-btn is-outlined';
    imgLabel.innerHTML = ICONS.image + ' <span>Upload Photo</span>';
    imgLabel.style.cursor = 'pointer';
    var imgInput = document.createElement('input');
    imgInput.type = 'file';
    imgInput.accept = 'image/jpeg,image/png,image/webp';
    imgInput.style.display = 'none';

    function uploadEditorImageFile(targetFile) {
      var policy = window.SVCOER_UPLOAD_POLICY || {};
      var maxPhotoMb = parseFloat(policy.maxPhotoMb) || 2;
      var maxBytes = Math.round(maxPhotoMb * 1024 * 1024);
      if (targetFile.size > maxBytes) {
        showNotice('Photo "' + targetFile.name + '" exceeds configured ' + maxPhotoMb + ' MB upload limit.', true);
        imgInput.value = '';
        return;
      }
      var fd = new FormData();
      fd.append('csrf_token', csrf);
      fd.append('file', targetFile);
      var uploadUrl = textarea.getAttribute('data-upload-url') || resolveUrl('admin/upload_handler.php');
      fetch(uploadUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.ok && data.file_url) {
            var srcUrl = resolveUrl(data.file_url);
            insertHtmlAtFocus('<figure class="cms-block" data-block="image" style="margin:1rem 0;"><img src="' + srcUrl + '" alt="' + targetFile.name + '" style="max-width:100%;border-radius:10px;"><figcaption style="font-size:0.8rem;color:#57534E;margin-top:4px;">' + targetFile.name + '</figcaption></figure><p><br></p>');
            showNotice('Photo uploaded & inserted: ' + data.file_url, false);
          } else {
            showNotice((data && data.error) || 'Image upload failed.', true);
          }
        })
        .catch(function () { showNotice('Upload failed. Check uploads/ folder permissions.', true); })
        .finally(function () { imgInput.value = ''; });
    }

    imgInput.addEventListener('change', function () {
      var file = imgInput.files && imgInput.files[0];
      if (!file) return;
      var policy = window.SVCOER_UPLOAD_POLICY || {};
      var maxPhotoMb = parseFloat(policy.maxPhotoMb) || 2;
      var autoCrop = policy.autoCrop !== false;
      if (autoCrop && typeof window.svcoerOpenCropModal === 'function') {
        window.svcoerOpenCropModal(
          file,
          { aspectRatio: '4:3', maxPhotoMb: maxPhotoMb },
          function (croppedFile) { uploadEditorImageFile(croppedFile); },
          function () { imgInput.value = ''; }
        );
      } else {
        uploadEditorImageFile(file);
      }
    });
    imgLabel.appendChild(imgInput);
    toolbar.appendChild(imgLabel);

    // Mode Switching (Visual Word Editor <-> HTML & CSS Source)
    function setMode(nextMode) {
      if (nextMode === 'html' && !isHtmlMode) {
        syncToTextarea();
        visual.style.display = 'none';
        textarea.style.display = 'block';
        isHtmlMode = true;
      } else if (nextMode === 'visual' && isHtmlMode) {
        visual.innerHTML = textarea.value;
        textarea.style.display = 'none';
        visual.style.display = 'block';
        isHtmlMode = false;
      }
      visualModeBtn.classList.toggle('is-active', !isHtmlMode);
      htmlModeBtn.classList.toggle('is-active', isHtmlMode);
      renderCtxBar();
    }
    visualModeBtn.addEventListener('click', function () { setMode('visual'); });
    htmlModeBtn.addEventListener('click', function () { setMode('html'); });

    // Graphical Component Blocks Sidebar
    var drawer = document.createElement('aside');
    drawer.className = 'rte-drawer';

    toggleBlocksBtn.addEventListener('click', function () {
      blocksVisible = !blocksVisible;
      drawer.style.display = blocksVisible ? 'block' : 'none';
      toggleBlocksBtn.querySelector('span').textContent = blocksVisible ? 'Hide Component Blocks' : 'Show Component Blocks';
    });

    var drawerTitle = document.createElement('div');
    drawerTitle.className = 'rte-drawer-title';
    drawerTitle.textContent = 'Drag or Click HTML Blocks';
    drawer.appendChild(drawerTitle);

    var catBar = document.createElement('div');
    catBar.className = 'rte-cat-tabs';
    var cardsContainer = document.createElement('div');
    var activeCat = 'All';

    function renderDrawerBlocks() {
      cardsContainer.innerHTML = '';
      BLOCKS.filter(function (b) { return activeCat === 'All' || b.category === activeCat; }).forEach(function (blk) {
        var card = document.createElement('div');
        card.draggable = true;
        card.className = 'rte-block-card';
        card.innerHTML =
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">' +
          '<span style="display:inline-flex;align-items:center;gap:5px;color:#78716C;">' + ICONS.grip + '<strong style="font-size:12px;color:#1C1917;">' + blk.label + '</strong></span>' +
          '<span style="font-size:10px;color:#B45309;font-weight:700;">+ Add</span>' +
          '</div>' +
          '<div style="font-size:10.5px;color:#78716C;margin-top:3px;padding-left:18px;">' + blk.badge + '</div>';
        card.addEventListener('dragstart', function (ev) {
          if (ev.dataTransfer) {
            ev.dataTransfer.setData('application/x-php-cms-block', blk.id);
            ev.dataTransfer.effectAllowed = 'copy';
          }
        });
        card.addEventListener('click', function () { insertHtmlAtFocus(blk.html); });
        cardsContainer.appendChild(card);
      });
    }

    ['All', 'Callouts', 'Layouts', 'Academic', 'Interactive'].forEach(function (cat) {
      var cBtn = document.createElement('button');
      cBtn.type = 'button';
      cBtn.textContent = cat;
      cBtn.className = 'rte-cat-tab' + (cat === activeCat ? ' is-active' : '');
      cBtn.addEventListener('click', function () {
        activeCat = cat;
        Array.prototype.forEach.call(catBar.children, function (el) {
          el.classList.toggle('is-active', el.textContent === activeCat);
        });
        renderDrawerBlocks();
      });
      catBar.appendChild(cBtn);
    });

    drawer.appendChild(catBar);
    renderDrawerBlocks();
    drawer.appendChild(cardsContainer);

    visual.addEventListener('dragover', function (ev) { ev.preventDefault(); });
    visual.addEventListener('drop', function (ev) {
      var id = ev.dataTransfer && ev.dataTransfer.getData('application/x-php-cms-block');
      if (!id) return;
      ev.preventDefault();
      var found = BLOCKS.find(function (b) { return b.id === id; });
      if (found) insertHtmlAtFocus(found.html);
    });

    var parent = textarea.parentNode;
    parent.insertBefore(root, textarea);
    root.appendChild(topbar);
    root.appendChild(frame);
    frame.appendChild(toolbar);
    frame.appendChild(ctxBar);
    frame.appendChild(popoverBar);
    frame.appendChild(statusBanner);
    frame.appendChild(workspace);
    workspace.appendChild(editorPane);
    editorPane.appendChild(visual);
    editorPane.appendChild(textarea);
    workspace.appendChild(drawer);

    if (textarea.form) {
      textarea.form.addEventListener('submit', syncToTextarea);
    }
  }

  function initAllEditors() {
    document.querySelectorAll('textarea.rich-editor').forEach(mountEditor);
  }

  window.svcoerMountRichEditors = initAllEditors;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllEditors);
  } else {
    initAllEditors();
  }
  window.addEventListener('load', initAllEditors);
})();
