/**
 * Shared Visual WYSIWYG + HTML Source Toggle Editor & Image Uploader for Non-Technical Staff
 */
(function () {
  function mountEditor(textarea) {
    if (textarea.dataset.mounted === '1') return;
    textarea.dataset.mounted = '1';

    var csrf = textarea.getAttribute('data-csrf') || '';
    var wrapper = document.createElement('div');
    wrapper.style.border = '1px solid var(--border-color, #d6d3d1)';
    wrapper.style.borderRadius = '8px';
    wrapper.style.overflow = 'hidden';
    wrapper.style.background = '#fff';
    wrapper.style.marginBottom = '0.75rem';

    var toolbar = document.createElement('div');
    toolbar.style.display = 'flex';
    toolbar.style.flexWrap = 'wrap';
    toolbar.style.alignItems = 'center';
    toolbar.style.gap = '6px';
    toolbar.style.padding = '8px';
    toolbar.style.background = '#f5f5f4';
    toolbar.style.borderBottom = '1px solid #e7e5e4';

    var visual = document.createElement('div');
    visual.contentEditable = 'true';
    visual.innerHTML = textarea.value || '<p>Enter institutional content here...</p>';
    visual.style.minHeight = '220px';
    visual.style.padding = '12px';
    visual.style.outline = 'none';
    visual.style.lineHeight = '1.6';
    visual.style.color = '#1c1917';

    textarea.style.display = 'none';
    textarea.style.width = '100%';
    textarea.style.border = '0';
    textarea.style.padding = '12px';
    textarea.style.fontFamily = 'monospace';
    textarea.style.fontSize = '12px';

    var isHtmlMode = false;

    function syncToTextarea() {
      if (!isHtmlMode) {
        textarea.value = visual.innerHTML;
      }
    }
    visual.addEventListener('input', syncToTextarea);

    function addBtn(label, onClick) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.style.padding = '4px 8px';
      btn.style.fontSize = '12px';
      btn.style.fontWeight = '600';
      btn.style.border = '1px solid #d6d3d1';
      btn.style.borderRadius = '4px';
      btn.style.background = '#fff';
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', function () {
        if (isHtmlMode) return;
        visual.focus();
        onClick();
        syncToTextarea();
      });
      toolbar.appendChild(btn);
    }

    addBtn('B', function () { document.execCommand('bold'); });
    addBtn('I', function () { document.execCommand('italic'); });
    addBtn('U', function () { document.execCommand('underline'); });
    addBtn('H2', function () { document.execCommand('formatBlock', false, 'h2'); });
    addBtn('H3', function () { document.execCommand('formatBlock', false, 'h3'); });
    addBtn('P', function () { document.execCommand('formatBlock', false, 'p'); });
    addBtn('• List', function () { document.execCommand('insertUnorderedList'); });
    addBtn('1. List', function () { document.execCommand('insertOrderedList'); });
    addBtn('+ Table', function () {
      document.execCommand(
        'insertHTML',
        false,
        '<table><thead><tr><th>Column 1</th><th>Column 2</th></tr></thead><tbody><tr><td>Value 1</td><td>Value 2</td></tr></tbody></table><p></p>'
      );
    });
    addBtn('+ Link', function () {
      var url = window.prompt('Enter PDF or web URL:', 'uploads/');
      if (!url) return;
      var txt = window.prompt('Enter clickable link text:', 'View Document') || url;
      document.execCommand('insertHTML', false, '<a href="' + url + '" target="_blank">' + txt + '</a>');
    });

    // Inline photo uploader
    var imgLabel = document.createElement('label');
    imgLabel.textContent = '+ Upload Photo';
    imgLabel.style.padding = '4px 8px';
    imgLabel.style.fontSize = '12px';
    imgLabel.style.fontWeight = '600';
    imgLabel.style.border = '1px solid #d6d3d1';
    imgLabel.style.borderRadius = '4px';
    imgLabel.style.background = '#fff';
    imgLabel.style.cursor = 'pointer';

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
      fetch('upload_handler.php', { method: 'POST', body: fd })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.ok && data.file_url) {
            if (isHtmlMode) {
              textarea.value += '\n<img src="' + data.file_url + '" alt="' + file.name + '" style="max-width:100%;border-radius:8px;">\n';
            } else {
              visual.focus();
              document.execCommand('insertHTML', false, '<img src="' + data.file_url + '" alt="' + file.name + '" style="max-width:100%;border-radius:8px;margin:8px 0;">');
              syncToTextarea();
            }
          } else {
            window.alert((data && data.error) || 'Image upload failed.');
          }
        })
        .catch(function () { window.alert('Upload request failed.'); })
        .finally(function () { imgInput.value = ''; });
    });
    imgLabel.appendChild(imgInput);
    toolbar.appendChild(imgLabel);

    // Visual <-> HTML Source Switch
    var modeBtn = document.createElement('button');
    modeBtn.type = 'button';
    modeBtn.textContent = 'HTML Source';
    modeBtn.style.marginLeft = 'auto';
    modeBtn.style.padding = '4px 10px';
    modeBtn.style.fontSize = '12px';
    modeBtn.style.fontWeight = '700';
    modeBtn.style.border = '1px solid #0f294a';
    modeBtn.style.borderRadius = '4px';
    modeBtn.style.background = '#0f294a';
    modeBtn.style.color = '#fff';
    modeBtn.style.cursor = 'pointer';
    modeBtn.addEventListener('click', function () {
      if (!isHtmlMode) {
        textarea.value = visual.innerHTML;
        visual.style.display = 'none';
        textarea.style.display = 'block';
        modeBtn.textContent = 'Visual Editor';
        isHtmlMode = true;
      } else {
        visual.innerHTML = textarea.value;
        textarea.style.display = 'none';
        visual.style.display = 'block';
        modeBtn.textContent = 'HTML Source';
        isHtmlMode = false;
      }
    });
    toolbar.appendChild(modeBtn);

    textarea.parentNode.insertBefore(wrapper, textarea);
    wrapper.appendChild(toolbar);
    wrapper.appendChild(visual);
    wrapper.appendChild(textarea);

    if (textarea.form) {
      textarea.form.addEventListener('submit', syncToTextarea);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('textarea.rich-editor').forEach(mountEditor);
  });
})();
