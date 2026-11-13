/**
 * Rich Word-Processor + Drag-and-Drop Graphical Block Composer & HTML/CSS Source Editor
 * Compatible with non-technical staff in the PHP CMS Admin Portal
 */
(function () {
  var BLOCKS = [
    {
      id: 'hero-banner',
      label: 'Hero Banner',
      badge: 'Gradient Header + CTA',
      html: '<div class="cms-block cms-banner-navy" data-block="hero-banner"><h2>Program &amp; Institutional Highlights</h2><p>Empowering scholars with outcome-based autonomous curricula, NAAC A+ quality assurance, and complete UGC NEP 2020 transparency.</p><div class="cms-btn-row"><a href="quick-links.php" class="cms-btn cms-btn-amber">Download Prospectus PDF</a><a href="page.php?slug=admission-process" class="cms-btn cms-btn-light">Admission Guidelines</a></div></div><p><br></p>',
    },
    {
      id: 'two-col-cards',
      label: '2-Column Feature Cards',
      badge: 'Colorful Split',
      html: '<div class="cms-block cms-grid-2" data-block="two-col-cards"><div class="cms-card cms-card-navy"><h3>Undergraduate Programs</h3><p>Outcome-based 160-credit curriculum with Multidisciplinary Minors, Skill Courses, and Semester VIII Internship.</p></div><div class="cms-card cms-card-amber"><h3>Research &amp; Innovation</h3><p>Sponsored DST-SERB, AICTE-MODROBS laboratories, patent filing cell, and student incubation support.</p></div></div><p><br></p>',
    },
    {
      id: 'three-col-stats',
      label: '3-Column KPI Stat Cards',
      badge: 'Metrics Row',
      html: '<div class="cms-block cms-grid-3" data-block="three-col-stats"><div class="cms-stat-box cms-accent-navy"><span class="cms-stat-value">A+ (3.46)</span><span class="cms-stat-label">NAAC Accreditation Grade</span></div><div class="cms-stat-box cms-accent-teal"><span class="cms-stat-value">250+</span><span class="cms-stat-label">Recruiting Companies</span></div><div class="cms-stat-box cms-accent-emerald"><span class="cms-stat-value">100%</span><span class="cms-stat-label">UGC Public Disclosure</span></div></div><p><br></p>',
    },
    {
      id: 'callout-info',
      label: 'Info Notice Box',
      badge: 'Blue Callout',
      html: '<div class="cms-block cms-callout cms-callout-info" data-block="callout-info"><strong>Public Self-Disclosure Notice:</strong> All statutory documents, approved fee schedules, and ordinances are accessible publicly without login under UGC NEP 2020 Guidelines.</div><p><br></p>',
    },
    {
      id: 'callout-success',
      label: 'Success Callout Box',
      badge: 'Emerald Callout',
      html: '<div class="cms-block cms-callout cms-callout-success" data-block="callout-success"><strong>Verified Accreditation &amp; Grants:</strong> Compliant with AICTE norms, PAHSUS Autonomous Ordinances, and Academic Bank of Credits (ABC / DigiLocker NAD).</div><p><br></p>',
    },
    {
      id: 'callout-warning',
      label: 'Important Deadline Alert',
      badge: 'Amber Warning',
      html: '<div class="cms-block cms-callout cms-callout-warning" data-block="callout-warning"><strong>Attention Students &amp; Parents:</strong> Verify your APAAR / ABC ID on the Autonomous Examination Portal prior to form submission.</div><p><br></p>',
    },
    {
      id: 'profile-card',
      label: 'Officer / Coordinator Card',
      badge: 'Committee Contact',
      html: '<div class="cms-block cms-profile-card" data-block="profile-card"><div class="cms-profile-avatar">👤</div><div><h4>Prof. / Dr. Coordinator Name</h4><p class="cms-profile-role">Statutory Role &amp; Department Designation</p><p class="cms-profile-meta">Email: office@coe.sveri.ac.in · Tel: +91-02186-216063 · Office: Admin Block</p></div></div><p><br></p>',
    },
    {
      id: 'faq-accordion',
      label: 'Expandable FAQ Accordion',
      badge: 'Interactive Collapse',
      html: '<details class="cms-block cms-accordion" data-block="faq-accordion" open><summary>Frequently Asked Question / Statutory Ordinance Detail</summary><div class="cms-accordion-body"><p>Write your expandable ordinance explanation, scholarship rule, or examination FAQ answer here.</p></div></details><p><br></p>',
    },
    {
      id: 'checklist-box',
      label: 'Checkmark Highlight List',
      badge: 'Structured Bullets',
      html: '<ul class="cms-block cms-checklist" data-block="checklist-box"><li>NBA Accredited Engineering Programs &amp; Autonomous Curricula</li><li>Mandatory 6-Month Industry Internship / Research Project</li><li>Digital Grievance Redressal &amp; 24x7 Anti-Ragging Compliance</li></ul><p><br></p>',
    },
    {
      id: 'btn-row',
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
    var rCount = Math.max(1, Math.min(10, rows));
    var cCount = Math.max(1, Math.min(8, cols));
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

  function mountEditor(textarea) {
    if (textarea.dataset.mounted === '1') return;
    textarea.dataset.mounted = '1';

    var csrf = textarea.getAttribute('data-csrf') || '';
    var wrapper = document.createElement('div');
    wrapper.style.border = '1px solid var(--border-color, #d6d3d1)';
    wrapper.style.borderRadius = '10px';
    wrapper.style.overflow = 'hidden';
    wrapper.style.background = '#fff';
    wrapper.style.marginBottom = '0.85rem';

    var toolbar = document.createElement('div');
    toolbar.style.display = 'flex';
    toolbar.style.flexWrap = 'wrap';
    toolbar.style.alignItems = 'center';
    toolbar.style.gap = '6px';
    toolbar.style.padding = '8px 10px';
    toolbar.style.background = '#f5f5f4';
    toolbar.style.borderBottom = '1px solid #e7e5e4';

    var workspace = document.createElement('div');
    workspace.style.display = 'flex';
    workspace.style.flexWrap = 'wrap';

    var editorPane = document.createElement('div');
    editorPane.style.flex = '1 1 520px';
    editorPane.style.minWidth = '0';

    var visual = document.createElement('div');
    visual.className = 'cms-prose cms-editor-canvas';
    visual.contentEditable = 'true';
    visual.innerHTML = textarea.value || '<p>Enter institutional content here or drag/click graphical blocks from the side panel...</p>';
    visual.style.minHeight = '320px';
    visual.style.padding = '16px';
    visual.style.outline = 'none';
    visual.style.lineHeight = '1.65';
    visual.style.color = '#1c1917';
    visual.style.background = '#fff';

    textarea.style.display = 'none';
    textarea.style.width = '100%';
    textarea.style.minHeight = '320px';
    textarea.style.border = '0';
    textarea.style.padding = '14px';
    textarea.style.background = '#0f172a';
    textarea.style.color = '#e2e8f0';
    textarea.style.fontFamily = 'monospace';
    textarea.style.fontSize = '12px';

    var isHtmlMode = false;

    function syncToTextarea() {
      if (!isHtmlMode) {
        textarea.value = visual.innerHTML;
      }
    }
    visual.addEventListener('input', syncToTextarea);

    function insertHtmlAtFocus(html) {
      if (isHtmlMode) {
        textarea.value += '\n' + html + '\n';
        return;
      }
      visual.focus();
      document.execCommand('insertHTML', false, html);
      syncToTextarea();
    }

    function addSelect(options, onChange, title) {
      var sel = document.createElement('select');
      sel.title = title;
      sel.style.padding = '4px 6px';
      sel.style.fontSize = '12px';
      sel.style.border = '1px solid #d6d3d1';
      sel.style.borderRadius = '5px';
      sel.style.background = '#fff';
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

    function addBtn(label, onClick, title) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.title = title || label;
      btn.style.padding = '4px 8px';
      btn.style.fontSize = '12px';
      btn.style.fontWeight = '600';
      btn.style.border = '1px solid #d6d3d1';
      btn.style.borderRadius = '5px';
      btn.style.background = '#fff';
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', function () {
        if (isHtmlMode) return;
        visual.focus();
        onClick();
        syncToTextarea();
      });
      toolbar.appendChild(btn);
      return btn;
    }

    addBtn('↶', function () { document.execCommand('undo'); }, 'Undo');
    addBtn('↷', function () { document.execCommand('redo'); }, 'Redo');

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
        { value: '', label: 'Font…' },
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

    addBtn('B', function () { document.execCommand('bold'); }, 'Bold');
    addBtn('I', function () { document.execCommand('italic'); }, 'Italic');
    addBtn('U', function () { document.execCommand('underline'); }, 'Underline');
    addBtn('S', function () { document.execCommand('strikeThrough'); }, 'Strikethrough');

    // Text Color Picker
    var textColorWrap = document.createElement('label');
    textColorWrap.title = 'Text Color';
    textColorWrap.style.display = 'inline-flex';
    textColorWrap.style.alignItems = 'center';
    textColorWrap.style.gap = '4px';
    textColorWrap.style.padding = '3px 7px';
    textColorWrap.style.fontSize = '12px';
    textColorWrap.style.fontWeight = '700';
    textColorWrap.style.border = '1px solid #d6d3d1';
    textColorWrap.style.borderRadius = '5px';
    textColorWrap.style.background = '#fff';
    textColorWrap.style.cursor = 'pointer';
    textColorWrap.textContent = 'A';
    var textColorInput = document.createElement('input');
    textColorInput.type = 'color';
    textColorInput.value = '#0F294A';
    textColorInput.style.width = '18px';
    textColorInput.style.height = '18px';
    textColorInput.style.border = '0';
    textColorInput.style.padding = '0';
    textColorInput.style.background = 'transparent';
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
    bgColorWrap.style.display = 'inline-flex';
    bgColorWrap.style.alignItems = 'center';
    bgColorWrap.style.gap = '4px';
    bgColorWrap.style.padding = '3px 7px';
    bgColorWrap.style.fontSize = '12px';
    bgColorWrap.style.fontWeight = '700';
    bgColorWrap.style.border = '1px solid #d6d3d1';
    bgColorWrap.style.borderRadius = '5px';
    bgColorWrap.style.background = '#fff';
    bgColorWrap.style.cursor = 'pointer';
    bgColorWrap.textContent = 'HL';
    var bgColorInput = document.createElement('input');
    bgColorInput.type = 'color';
    bgColorInput.value = '#FEF3C7';
    bgColorInput.style.width = '18px';
    bgColorInput.style.height = '18px';
    bgColorInput.style.border = '0';
    bgColorInput.style.padding = '0';
    bgColorInput.style.background = 'transparent';
    bgColorInput.addEventListener('change', function () {
      if (isHtmlMode) return;
      visual.focus();
      document.execCommand('hiliteColor', false, bgColorInput.value);
      syncToTextarea();
    });
    bgColorWrap.appendChild(bgColorInput);
    toolbar.appendChild(bgColorWrap);

    addBtn('• List', function () { document.execCommand('insertUnorderedList'); });
    addBtn('1. List', function () { document.execCommand('insertOrderedList'); });
    addBtn('⇇', function () { document.execCommand('justifyLeft'); }, 'Align Left');
    addBtn('⇔', function () { document.execCommand('justifyCenter'); }, 'Align Center');
    addBtn('⇉', function () { document.execCommand('justifyRight'); }, 'Align Right');
    addBtn('— HR', function () { document.execCommand('insertHorizontalRule'); }, 'Divider Line');

    // Table Designer Dropdown
    addSelect(
      [
        { value: '', label: '⊞ Insert Table Theme…' },
        { value: 'navy', label: 'Navy Academic Table (3×3)' },
        { value: 'amber', label: 'Saffron Gold Table (3×3)' },
        { value: 'teal', label: 'Ocean Teal Table (3×3)' },
        { value: 'emerald', label: 'Emerald STEM Table (3×3)' },
        { value: 'slate', label: 'Executive Slate Table (3×3)' },
        { value: 'minimal', label: 'Clean Border Table (3×3)' },
      ],
      function (theme) {
        var r = parseInt(window.prompt('Number of data rows (1-10):', '3') || '3', 10) || 3;
        var c = parseInt(window.prompt('Number of columns (1-8):', '3') || '3', 10) || 3;
        insertHtmlAtFocus(buildTableHtml(r, c, theme));
      },
      'Insert Styled Table'
    );

    addBtn('+ Link / Button', function () {
      var url = window.prompt('Enter PDF or web URL:', 'uploads/');
      if (!url) return;
      var txt = window.prompt('Enter clickable text:', 'View Document') || url;
      var asBtn = window.confirm('Style as a colorful Primary Button? (Cancel = regular text link)');
      var cls = asBtn ? ' class="cms-btn cms-btn-primary"' : '';
      insertHtmlAtFocus('<a href="' + url + '"' + cls + ' target="_blank">' + txt + '</a>');
    });

    // Inline photo uploader
    var imgLabel = document.createElement('label');
    imgLabel.textContent = '+ Upload Photo';
    imgLabel.style.padding = '4px 8px';
    imgLabel.style.fontSize = '12px';
    imgLabel.style.fontWeight = '600';
    imgLabel.style.border = '1px solid #d6d3d1';
    imgLabel.style.borderRadius = '5px';
    imgLabel.style.background = '#fff';
    imgLabel.style.cursor = 'pointer';

    var statusBanner = document.createElement('div');
    statusBanner.style.display = 'none';
    statusBanner.style.padding = '6px 10px';
    statusBanner.style.fontSize = '12px';
    statusBanner.style.fontWeight = '600';
    statusBanner.style.background = '#fffbeb';
    statusBanner.style.color = '#92400e';
    statusBanner.style.borderBottom = '1px solid #fde68a';

    function showEditorNotice(msg, isError) {
      statusBanner.textContent = msg;
      statusBanner.style.background = isError ? '#fef2f2' : '#ecfdf5';
      statusBanner.style.color = isError ? '#991b1b' : '#065f46';
      statusBanner.style.borderBottomColor = isError ? '#fecaca' : '#a7f3d0';
      statusBanner.style.display = 'block';
      setTimeout(function () { statusBanner.style.display = 'none'; }, 4000);
    }

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
      var uploadUrl = textarea.getAttribute('data-upload-url') || 'upload_handler.php';
      fetch(uploadUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.ok && data.file_url) {
            var previewUrl = '../' + data.file_url.replace(/^\/+/, '');
            insertHtmlAtFocus('<img src="' + data.file_url + '" data-admin-preview="' + previewUrl + '" alt="' + file.name + '" style="max-width:100%;border-radius:10px;margin:8px 0;">');
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

    // Visual <-> HTML Source Switch
    var modeBtn = document.createElement('button');
    modeBtn.type = 'button';
    modeBtn.textContent = '<> HTML Source';
    modeBtn.style.marginLeft = 'auto';
    modeBtn.style.padding = '5px 11px';
    modeBtn.style.fontSize = '12px';
    modeBtn.style.fontWeight = '700';
    modeBtn.style.border = '1px solid #0f294a';
    modeBtn.style.borderRadius = '5px';
    modeBtn.style.background = '#0f294a';
    modeBtn.style.color = '#fff';
    modeBtn.style.cursor = 'pointer';
    modeBtn.addEventListener('click', function () {
      if (!isHtmlMode) {
        textarea.value = visual.innerHTML;
        visual.style.display = 'none';
        textarea.style.display = 'block';
        modeBtn.textContent = 'Visual Word Processor';
        isHtmlMode = true;
      } else {
        visual.innerHTML = textarea.value;
        textarea.style.display = 'none';
        visual.style.display = 'block';
        modeBtn.textContent = '<> HTML Source';
        isHtmlMode = false;
      }
    });
    toolbar.appendChild(modeBtn);

    // Graphical Blocks Drag & Click Drawer
    var drawer = document.createElement('aside');
    drawer.style.width = '240px';
    drawer.style.flex = '0 0 240px';
    drawer.style.borderLeft = '1px solid #e7e5e4';
    drawer.style.background = '#fafaf9';
    drawer.style.padding = '10px';
    drawer.style.maxHeight = '420px';
    drawer.style.overflowY = 'auto';

    var drawerTitle = document.createElement('div');
    drawerTitle.textContent = 'DRAG OR CLICK BLOCKS';
    drawerTitle.style.fontSize = '11px';
    drawerTitle.style.fontWeight = '800';
    drawerTitle.style.letterSpacing = '0.06em';
    drawerTitle.style.color = '#0F294A';
    drawerTitle.style.marginBottom = '8px';
    drawer.appendChild(drawerTitle);

    BLOCKS.forEach(function (blk) {
      var card = document.createElement('div');
      card.draggable = true;
      card.style.padding = '8px 9px';
      card.style.marginBottom = '7px';
      card.style.border = '1px solid #e7e5e4';
      card.style.borderRadius = '7px';
      card.style.background = '#fff';
      card.style.cursor = 'grab';
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
      drawer.appendChild(card);
    });

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
})();
