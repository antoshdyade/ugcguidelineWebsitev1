/**
 * Rich Word-Processor + Drag-and-Drop Graphical Block Composer & HTML/CSS Source Editor
 * Compatible with non-technical staff in the PHP CMS Admin Portal (Webmin & XAMPP safe)
 */
(function () {
  var BASE_URL = (typeof window.SVCOER_BASE_URL === 'string') ? window.SVCOER_BASE_URL : '';

  function resolveUrl(rel) {
    if (!rel) return '';
    if (/^(https?:)?\/\//i.test(rel) || rel.indexOf('data:') === 0) return rel;
    var clean = String(rel).replace(/^\/+/, '');
    return (BASE_URL ? BASE_URL : '') + '/' + clean;
  }

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
      badge: 'Colorful Split',
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
      id: 'faq-accordion',
      category: 'Interactive',
      label: 'Collapsible FAQ / Ordinance',
      badge: 'Expandable Collapse',
      html: '<details class="cms-block cms-accordion" data-block="faq-accordion" open><summary>Frequently Asked Question / Statutory Ordinance Detail</summary><div class="cms-accordion-body"><p>Write your expandable ordinance explanation, scholarship rule, or examination FAQ answer here.</p></div></details><p><br></p>',
    },
    {
      id: 'checklist-box',
      category: 'Academic',
      label: 'Checkmark Highlight List',
      badge: 'Structured Bullets',
      html: '<ul class="cms-block cms-checklist" data-block="checklist-box"><li>NBA Accredited Engineering Programs &amp; Autonomous Curricula</li><li>Mandatory 6-Month Industry Internship / Research Project</li><li>Digital Grievance Redressal &amp; 24x7 Anti-Ragging Compliance</li></ul><p><br></p>',
    },
    {
      id: 'btn-row',
      category: 'Interactive',
      label: 'Button Action Strip',
      badge: 'CTA Buttons',
      html: '<div class="cms-block cms-btn-row" data-block="btn-row"><a href="quick-links.php" class="cms-btn cms-btn-primary">Download Circular (PDF)</a><a href="contact.php" class="cms-btn cms-btn-outline">Contact Helpdesk</a></div><p><br></p>',
    },
  ];

  var TABLE_THEMES = {
    navy: 'Navy Academic',
    amber: 'Saffron Gold',
    teal: 'Ocean Teal',
    emerald: 'Emerald STEM',
    slate: 'Executive Slate',
    minimal: 'Clean Border',
  };

  function buildTableHtml(rows, cols, themeKey) {
    var rCount = Math.max(1, Math.min(12, rows));
    var cCount = Math.max(1, Math.min(10, cols));
    var ths = [];
    for (var c = 1; c <= cCount; c++) {
      ths.push('<th>Column ' + c + '</th>');
    }
    var trs = [];
    for (var r = 1; r <= rCount; r++) {
      var tds = [];
      for (var k = 1; k <= cCount; k++) {
        tds.push('<td>Sample Entry ' + r + '.' + k + '</td>');
      }
      trs.push('<tr>' + tds.join('') + '</tr>');
    }
    return '<table class="cms-table cms-table-' + themeKey + '"><thead><tr>' + ths.join('') + '</tr></thead><tbody>' + trs.join('') + '</tbody></table><p><br></p>';
  }

  function makeBtn(label, title, extraStyle) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.title = title || label;
    btn.style.cssText = 'padding:4px 8px;font-size:12px;font-weight:600;border:1px solid #d6d3d1;border-radius:5px;background:#fff;color:#1c1917;cursor:pointer;' + (extraStyle || '');
    return btn;
  }

  function mountEditor(textarea) {
    if (!textarea || textarea.dataset.mounted === '1') return;
    textarea.dataset.mounted = '1';

    var csrf = textarea.getAttribute('data-csrf') || '';
    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'border:1px solid var(--border-color, #d6d3d1);border-radius:10px;overflow:hidden;background:#fff;margin-bottom:0.85rem;';

    var toolbar = document.createElement('div');
    toolbar.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:8px 10px;background:#f5f5f4;border-bottom:1px solid #e7e5e4;';

    var popoverBar = document.createElement('div');
    popoverBar.style.cssText = 'display:none;padding:10px 12px;background:#fffbeb;border-bottom:1px solid #fde68a;font-size:12px;';

    var statusBanner = document.createElement('div');
    statusBanner.style.cssText = 'display:none;padding:6px 10px;font-size:12px;font-weight:600;background:#fffbeb;color:#92400e;border-bottom:1px solid #fde68a;';

    var workspace = document.createElement('div');
    workspace.style.cssText = 'display:flex;flex-wrap:wrap;';

    var editorPane = document.createElement('div');
    editorPane.style.cssText = 'flex:1 1 500px;min-width:0;';

    var visual = document.createElement('div');
    visual.className = 'cms-prose cms-editor-canvas';
    visual.contentEditable = 'true';
    visual.innerHTML = textarea.value || '<p>Enter institutional content here or drag/click graphical blocks from the side panel...</p>';
    visual.style.cssText = 'min-height:330px;padding:16px;outline:none;line-height:1.65;color:#1c1917;background:#fff;';

    textarea.style.cssText = 'display:none;width:100%;min-height:330px;border:0;padding:14px;background:#0f172a;color:#e2e8f0;font-family:monospace;font-size:12px;';

    var isHtmlMode = false;
    var activePopover = null;

    function syncToTextarea() {
      if (!isHtmlMode) {
        textarea.value = visual.innerHTML;
      }
    }
    visual.addEventListener('input', syncToTextarea);

    function showEditorNotice(msg, isError) {
      statusBanner.textContent = msg;
      statusBanner.style.background = isError ? '#fef2f2' : '#ecfdf5';
      statusBanner.style.color = isError ? '#991b1b' : '#065f46';
      statusBanner.style.borderBottomColor = isError ? '#fecaca' : '#a7f3d0';
      statusBanner.style.display = 'block';
      setTimeout(function () { statusBanner.style.display = 'none'; }, 4000);
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
        visual.innerHTML += html;
      }
      syncToTextarea();
    }

    function addSelect(options, onChange, title) {
      var sel = document.createElement('select');
      sel.title = title;
      sel.style.cssText = 'padding:4px 6px;font-size:12px;border:1px solid #d6d3d1;border-radius:5px;background:#fff;color:#1c1917;';
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

    function addToolBtn(label, onClick, title) {
      var btn = makeBtn(label, title);
      btn.addEventListener('click', function () {
        if (isHtmlMode) return;
        visual.focus();
        onClick();
        syncToTextarea();
      });
      toolbar.appendChild(btn);
      return btn;
    }

    addToolBtn('↶', function () { document.execCommand('undo'); }, 'Undo');
    addToolBtn('↷', function () { document.execCommand('redo'); }, 'Redo');

    addSelect(
      [
        { value: '', label: 'Block Style…' },
        { value: 'p', label: 'Paragraph' },
        { value: 'h1', label: 'Title H1' },
        { value: 'h2', label: 'Heading H2' },
        { value: 'h3', label: 'Sub-Heading H3' },
        { value: 'blockquote', label: 'Blockquote' },
      ],
      function (val) { document.execCommand('formatBlock', false, val); },
      'Heading / Paragraph style'
    );

    addSelect(
      [
        { value: '', label: 'Font Family…' },
        { value: 'Plus Jakarta Sans, system-ui, sans-serif', label: 'Modern Sans' },
        { value: 'Playfair Display, Georgia, serif', label: 'Editorial Serif' },
        { value: 'ui-monospace, monospace', label: 'Code Monospace' },
      ],
      function (val) { document.execCommand('fontName', false, val); },
      'Font Family'
    );

    addSelect(
      [
        { value: '', label: 'Size…' },
        { value: '2', label: 'Small' },
        { value: '3', label: 'Normal' },
        { value: '4', label: 'Medium' },
        { value: '5', label: 'Large' },
        { value: '6', label: 'Headline' },
      ],
      function (val) { document.execCommand('fontSize', false, val); },
      'Font Size'
    );

    addToolBtn('B', function () { document.execCommand('bold'); }, 'Bold');
    addToolBtn('I', function () { document.execCommand('italic'); }, 'Italic');
    addToolBtn('U', function () { document.execCommand('underline'); }, 'Underline');
    addToolBtn('S', function () { document.execCommand('strikeThrough'); }, 'Strikethrough');

    // Text Color Picker
    var textColorWrap = document.createElement('label');
    textColorWrap.title = 'Text Color';
    textColorWrap.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:3px 7px;font-size:12px;font-weight:700;border:1px solid #d6d3d1;border-radius:5px;background:#fff;color:#1c1917;cursor:pointer;';
    textColorWrap.textContent = 'A';
    var textColorInput = document.createElement('input');
    textColorInput.type = 'color';
    textColorInput.value = '#0F294A';
    textColorInput.style.cssText = 'width:18px;height:18px;border:0;padding:0;background:transparent;';
    textColorInput.addEventListener('change', function () {
      if (isHtmlMode) return;
      visual.focus();
      document.execCommand('foreColor', false, textColorInput.value);
      syncToTextarea();
    });
    textColorWrap.appendChild(textColorInput);
    toolbar.appendChild(textColorWrap);

    // Highlight Background Picker
    var bgColorWrap = document.createElement('label');
    bgColorWrap.title = 'Highlight Color';
    bgColorWrap.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:3px 7px;font-size:12px;font-weight:700;border:1px solid #d6d3d1;border-radius:5px;background:#fff;color:#1c1917;cursor:pointer;';
    bgColorWrap.textContent = 'HL';
    var bgColorInput = document.createElement('input');
    bgColorInput.type = 'color';
    bgColorInput.value = '#FEF3C7';
    bgColorInput.style.cssText = 'width:18px;height:18px;border:0;padding:0;background:transparent;';
    bgColorInput.addEventListener('change', function () {
      if (isHtmlMode) return;
      visual.focus();
      document.execCommand('hiliteColor', false, bgColorInput.value);
      syncToTextarea();
    });
    bgColorWrap.appendChild(bgColorInput);
    toolbar.appendChild(bgColorWrap);

    addToolBtn('• List', function () { document.execCommand('insertUnorderedList'); }, 'Bullet List');
    addToolBtn('1. List', function () { document.execCommand('insertOrderedList'); }, 'Numbered List');
    addToolBtn('⇇', function () { document.execCommand('justifyLeft'); }, 'Align Left');
    addToolBtn('⇔', function () { document.execCommand('justifyCenter'); }, 'Align Center');
    addToolBtn('⇉', function () { document.execCommand('justifyRight'); }, 'Align Right');
    addToolBtn('— HR', function () { document.execCommand('insertHorizontalRule'); }, 'Divider Line');
    addToolBtn('Tx', function () { document.execCommand('removeFormat'); }, 'Clear Formatting');

    // Inline Styled Table Designer Popover (no browser prompt)
    var tableDesignerBtn = makeBtn('⊞ Table Designer', 'Insert Custom Styled Table');
    tableDesignerBtn.addEventListener('click', function () {
      if (activePopover === 'table') {
        popoverBar.style.display = 'none';
        activePopover = null;
        return;
      }
      activePopover = 'table';
      popoverBar.innerHTML = '';
      popoverBar.style.display = 'flex';
      popoverBar.style.flexWrap = 'wrap';
      popoverBar.style.alignItems = 'center';
      popoverBar.style.gap = '8px';

      var rowInp = document.createElement('input');
      rowInp.type = 'number'; rowInp.min = '1'; rowInp.max = '12'; rowInp.value = '3';
      rowInp.style.cssText = 'width:58px;padding:4px 6px;border:1px solid #d6d3d1;border-radius:5px;';

      var colInp = document.createElement('input');
      colInp.type = 'number'; colInp.min = '1'; colInp.max = '10'; colInp.value = '3';
      colInp.style.cssText = 'width:58px;padding:4px 6px;border:1px solid #d6d3d1;border-radius:5px;';

      var themeSel = document.createElement('select');
      themeSel.style.cssText = 'padding:4px 6px;border:1px solid #d6d3d1;border-radius:5px;background:#fff;';
      Object.keys(TABLE_THEMES).forEach(function (k) {
        var o = document.createElement('option');
        o.value = k; o.textContent = TABLE_THEMES[k];
        themeSel.appendChild(o);
      });

      var insertTBtn = makeBtn('Insert Table', 'Insert Styled Table', 'background:#0F294A;color:#fff;border-color:#0F294A;');
      insertTBtn.addEventListener('click', function () {
        insertHtmlAtFocus(buildTableHtml(parseInt(rowInp.value, 10) || 3, parseInt(colInp.value, 10) || 3, themeSel.value || 'navy'));
        popoverBar.style.display = 'none';
        activePopover = null;
      });
      var closeTBtn = makeBtn('Close', 'Close');
      closeTBtn.addEventListener('click', function () {
        popoverBar.style.display = 'none';
        activePopover = null;
      });

      var lbl = document.createElement('strong');
      lbl.textContent = 'Table Builder:';
      popoverBar.appendChild(lbl);
      popoverBar.appendChild(document.createTextNode(' Rows:'));
      popoverBar.appendChild(rowInp);
      popoverBar.appendChild(document.createTextNode(' Cols:'));
      popoverBar.appendChild(colInp);
      popoverBar.appendChild(document.createTextNode(' Theme:'));
      popoverBar.appendChild(themeSel);
      popoverBar.appendChild(insertTBtn);
      popoverBar.appendChild(closeTBtn);
    });
    toolbar.appendChild(tableDesignerBtn);

    // Inline Link / Button Popover (no browser prompt)
    var linkDesignerBtn = makeBtn('+ Link / PDF', 'Insert Link or Action Button');
    linkDesignerBtn.addEventListener('click', function () {
      if (activePopover === 'link') {
        popoverBar.style.display = 'none';
        activePopover = null;
        return;
      }
      activePopover = 'link';
      popoverBar.innerHTML = '';
      popoverBar.style.display = 'flex';
      popoverBar.style.flexWrap = 'wrap';
      popoverBar.style.alignItems = 'center';
      popoverBar.style.gap = '8px';

      var urlInp = document.createElement('input');
      urlInp.type = 'text'; urlInp.placeholder = 'https://... or uploads/file.pdf';
      urlInp.style.cssText = 'min-width:210px;padding:4px 8px;border:1px solid #d6d3d1;border-radius:5px;';

      var txtInp = document.createElement('input');
      txtInp.type = 'text'; txtInp.placeholder = 'Link / Button Label';
      txtInp.style.cssText = 'min-width:150px;padding:4px 8px;border:1px solid #d6d3d1;border-radius:5px;';

      var asBtnLbl = document.createElement('label');
      asBtnLbl.style.cssText = 'display:inline-flex;align-items:center;gap:4px;cursor:pointer;';
      var asBtnChk = document.createElement('input');
      asBtnChk.type = 'checkbox'; asBtnChk.checked = true;
      asBtnLbl.appendChild(asBtnChk);
      asBtnLbl.appendChild(document.createTextNode('Style as Button'));

      var addLBtn = makeBtn('Insert', 'Insert Link', 'background:#B45309;color:#fff;border-color:#B45309;');
      addLBtn.addEventListener('click', function () {
        var u = urlInp.value.trim();
        if (!u) return;
        var t = txtInp.value.trim() || u;
        var cls = asBtnChk.checked ? ' class="cms-btn cms-btn-primary"' : '';
        insertHtmlAtFocus('<a href="' + u + '"' + cls + ' target="_blank" rel="noopener noreferrer">' + t + '</a>');
        popoverBar.style.display = 'none';
        activePopover = null;
      });
      var closeLBtn = makeBtn('Close', 'Close');
      closeLBtn.addEventListener('click', function () {
        popoverBar.style.display = 'none';
        activePopover = null;
      });

      popoverBar.appendChild(urlInp);
      popoverBar.appendChild(txtInp);
      popoverBar.appendChild(asBtnLbl);
      popoverBar.appendChild(addLBtn);
      popoverBar.appendChild(closeLBtn);
    });
    toolbar.appendChild(linkDesignerBtn);

    // Inline photo uploader
    var imgLabel = document.createElement('label');
    imgLabel.textContent = '+ Upload Photo';
    imgLabel.style.cssText = 'padding:4px 8px;font-size:12px;font-weight:600;border:1px solid #d6d3d1;border-radius:5px;background:#fff;color:#1c1917;cursor:pointer;';

    var imgInput = document.createElement('input');
    imgInput.type = 'file';
    imgInput.accept = 'image/jpeg,image/png,image/webp';
    imgInput.style.display = 'none';
    imgInput.addEventListener('change', function () {
      var file = imgInput.files && imgInput.files[0];
      if (!file) return;
      var fd = new FormData();
      fd.append('csrf_token', csrf);
      fd.append('file', file);
      var uploadUrl = textarea.getAttribute('data-upload-url') || resolveUrl('admin/upload_handler.php');
      fetch(uploadUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.ok && data.file_url) {
            var srcUrl = resolveUrl(data.file_url);
            insertHtmlAtFocus('<img src="' + srcUrl + '" alt="' + file.name + '" style="max-width:100%;border-radius:10px;margin:8px 0;">');
            showEditorNotice('Image uploaded: ' + data.file_url, false);
          } else {
            showEditorNotice((data && data.error) || 'Image upload failed.', true);
          }
        })
        .catch(function () { showEditorNotice('Upload request failed. Check uploads/ folder permissions.', true); })
        .finally(function () { imgInput.value = ''; });
    });
    imgLabel.appendChild(imgInput);
    toolbar.appendChild(imgLabel);

    // Visual <-> HTML & CSS Source Switch
    var modeBtn = makeBtn('</> HTML & CSS Source', 'Switch between Visual Word Editor and HTML/CSS Source', 'margin-left:auto;background:#0F294A;color:#fff;border-color:#0F294A;padding:5px 11px;');
    modeBtn.addEventListener('click', function () {
      if (!isHtmlMode) {
        textarea.value = visual.innerHTML;
        visual.style.display = 'none';
        textarea.style.display = 'block';
        modeBtn.textContent = 'Visual Word Editor';
        isHtmlMode = true;
      } else {
        visual.innerHTML = textarea.value;
        textarea.style.display = 'none';
        visual.style.display = 'block';
        modeBtn.textContent = '</> HTML & CSS Source';
        isHtmlMode = false;
      }
    });
    toolbar.appendChild(modeBtn);

    // Graphical Blocks Drag & Click Drawer with Category Filter Tabs
    var drawer = document.createElement('aside');
    drawer.style.cssText = 'width:265px;flex:0 0 265px;border-left:1px solid #e7e5e4;background:#fafaf9;padding:10px;max-height:430px;overflow-y:auto;';

    var drawerTitle = document.createElement('div');
    drawerTitle.textContent = 'DRAG OR CLICK HTML BLOCKS';
    drawerTitle.style.cssText = 'font-size:11px;font-weight:800;letter-spacing:0.06em;color:#0F294A;margin-bottom:6px;';
    drawer.appendChild(drawerTitle);

    var catBar = document.createElement('div');
    catBar.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;';
    var cardsContainer = document.createElement('div');
    var activeCat = 'All';

    function renderDrawerBlocks() {
      cardsContainer.innerHTML = '';
      BLOCKS.filter(function (b) { return activeCat === 'All' || b.category === activeCat; }).forEach(function (blk) {
        var card = document.createElement('div');
        card.draggable = true;
        card.style.cssText = 'padding:8px 9px;margin-bottom:7px;border:1px solid #e7e5e4;border-radius:7px;background:#fff;cursor:grab;';
        card.innerHTML =
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:4px;">' +
          '<strong style="font-size:12px;color:#1c1917;">' + blk.label + '</strong>' +
          '<span style="font-size:10px;color:#b45309;font-weight:700;">+ Add</span>' +
          '</div>' +
          '<div style="font-size:10.5px;color:#78716c;margin-top:2px;">' + blk.badge + '</div>';
        card.addEventListener('dragstart', function (ev) {
          if (ev.dataTransfer) {
            ev.dataTransfer.setData('application/x-php-cms-block', blk.id);
            ev.dataTransfer.effectAllowed = 'copy';
          }
        });
        card.addEventListener('click', function () {
          insertHtmlAtFocus(blk.html);
        });
        cardsContainer.appendChild(card);
      });
    }

    ['All', 'Callouts', 'Layouts', 'Academic', 'Interactive'].forEach(function (cat) {
      var cBtn = document.createElement('button');
      cBtn.type = 'button';
      cBtn.textContent = cat;
      cBtn.style.cssText = 'font-size:10.5px;font-weight:700;padding:3px 7px;border-radius:4px;border:1px solid #d6d3d1;cursor:pointer;' +
        (cat === activeCat ? 'background:#0F294A;color:#fff;border-color:#0F294A;' : 'background:#fff;color:#44403c;');
      cBtn.addEventListener('click', function () {
        activeCat = cat;
        Array.prototype.forEach.call(catBar.children, function (el) {
          var sel = el.textContent === activeCat;
          el.style.background = sel ? '#0F294A' : '#fff';
          el.style.color = sel ? '#fff' : '#44403c';
          el.style.borderColor = sel ? '#0F294A' : '#d6d3d1';
        });
        renderDrawerBlocks();
      });
      catBar.appendChild(cBtn);
    });

    drawer.appendChild(catBar);
    renderDrawerBlocks();
    drawer.appendChild(cardsContainer);

    visual.addEventListener('dragover', function (ev) {
      ev.preventDefault();
    });
    visual.addEventListener('drop', function (ev) {
      var id = ev.dataTransfer && ev.dataTransfer.getData('application/x-php-cms-block');
      if (!id) return;
      ev.preventDefault();
      var found = BLOCKS.find(function (b) { return b.id === id; });
      if (found) {
        insertHtmlAtFocus(found.html);
      }
    });

    editorPane.appendChild(visual);
    editorPane.appendChild(textarea);
    workspace.appendChild(editorPane);
    workspace.appendChild(drawer);

    textarea.parentNode.insertBefore(wrapper, textarea);
    wrapper.appendChild(toolbar);
    wrapper.appendChild(popoverBar);
    wrapper.appendChild(statusBanner);
    wrapper.appendChild(workspace);

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
