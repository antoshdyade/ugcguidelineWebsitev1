/**
 * SVCOER CMS — Auto-Crop, Aspect Ratio Preservation & Upload Size Policy Guard
 * Applies uniformly across all PHP Admin forms and rich-text photo uploads.
 */
(function () {
  'use strict';

  var ASPECT_OPTIONS = [
    { key: '16:9', label: '16:9', ratio: 16 / 9, maxOutW: 1920 },
    { key: '4:3',  label: '4:3',  ratio: 4 / 3,  maxOutW: 1600 },
    { key: '3:2',  label: '3:2',  ratio: 3 / 2,  maxOutW: 1600 },
    { key: '1:1',  label: '1:1',  ratio: 1,      maxOutW: 1200 },
    { key: 'original', label: 'Original', ratio: null, maxOutW: 1920 }
  ];

  function getPolicy() {
    var p = window.SVCOER_UPLOAD_POLICY || {};
    var maxPhotoMb = parseFloat(p.maxPhotoMb);
    if (!isFinite(maxPhotoMb) || maxPhotoMb <= 0) maxPhotoMb = 2;
    var maxDocMb = parseFloat(p.maxDocMb);
    if (!isFinite(maxDocMb) || maxDocMb <= 0) maxDocMb = 10;
    return {
      maxPhotoMb: Math.max(0.25, Math.min(25, maxPhotoMb)),
      maxDocMb: Math.max(0.5, Math.min(50, maxDocMb)),
      autoCrop: p.autoCrop !== false
    };
  }

  function getAspectOption(key) {
    for (var i = 0; i < ASPECT_OPTIONS.length; i++) {
      if (ASPECT_OPTIONS[i].key === key) return ASPECT_OPTIONS[i];
    }
    return ASPECT_OPTIONS[1]; // default 4:3
  }

  function formatSize(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function computeAutoCropRect(imgW, imgH, targetRatio, zoom, offsetX, offsetY) {
    var z = Math.max(1, Math.min(4, zoom || 1));
    var ratio = (targetRatio && targetRatio > 0) ? targetRatio : (imgW / Math.max(1, imgH));
    var baseW, baseH;
    if (imgW / imgH > ratio) {
      baseH = imgH;
      baseW = baseH * ratio;
    } else {
      baseW = imgW;
      baseH = baseW / ratio;
    }
    var sw = baseW / z;
    var sh = baseH / z;
    var maxOffsetX = Math.max(0, (imgW - sw) / 2);
    var maxOffsetY = Math.max(0, (imgH - sh) / 2);
    var ox = Math.max(-1, Math.min(1, offsetX || 0));
    var oy = Math.max(-1, Math.min(1, offsetY || 0));
    var sx = Math.max(0, Math.min(imgW - sw, (imgW - sw) / 2 + ox * maxOffsetX));
    var sy = Math.max(0, Math.min(imgH - sh, (imgH - sh) / 2 + oy * maxOffsetY));
    return {
      sx: Math.round(sx),
      sy: Math.round(sy),
      sw: Math.max(1, Math.round(sw)),
      sh: Math.max(1, Math.round(sh))
    };
  }

  function computeOutputDims(sw, sh, maxOutW) {
    var cap = Math.max(200, maxOutW || 1600);
    if (sw <= cap) {
      return { width: Math.max(1, Math.round(sw)), height: Math.max(1, Math.round(sh)) };
    }
    var scale = cap / sw;
    return { width: Math.round(sw * scale), height: Math.max(1, Math.round(sh * scale)) };
  }

  function canvasToBlobPromise(canvas, mime, quality) {
    return new Promise(function (resolve) {
      canvas.toBlob(function (b) { resolve(b); }, mime, quality);
    });
  }

  function exportCompliantImageFile(sourceImg, originalFile, cropRect, outDims, maxBytes) {
    var outCanvas = document.createElement('canvas');
    outCanvas.width = outDims.width;
    outCanvas.height = outDims.height;
    var ctx = outCanvas.getContext('2d');
    if (!ctx) return Promise.reject(new Error('Canvas context unavailable.'));
    ctx.drawImage(sourceImg, cropRect.sx, cropRect.sy, cropRect.sw, cropRect.sh, 0, 0, outDims.width, outDims.height);

    var baseName = (originalFile.name || 'image').replace(/\.[^.]+$/, '') || 'cropped-image';
    var origType = (originalFile.type || '').toLowerCase();
    var outMime = (origType === 'image/png' || origType === 'image/webp') ? origType : 'image/jpeg';
    var ext = outMime === 'image/png' ? 'png' : (outMime === 'image/webp' ? 'webp' : 'jpg');

    function attempt(qualities, mime, extension) {
      var idx = 0;
      function next() {
        var q = qualities[idx];
        return canvasToBlobPromise(outCanvas, mime, q).then(function (blob) {
          if (!blob) return null;
          if (blob.size <= maxBytes || idx >= qualities.length - 1) {
            return { blob: blob, mime: mime, ext: extension };
          }
          idx++;
          return next();
        });
      }
      return next();
    }

    var primaryPromise = (outMime === 'image/png')
      ? canvasToBlobPromise(outCanvas, 'image/png', 1).then(function (b) { return b ? { blob: b, mime: 'image/png', ext: 'png' } : null; })
      : attempt([0.9, 0.82, 0.72, 0.6, 0.48, 0.36], outMime, ext);

    return primaryPromise.then(function (res) {
      if (res && res.blob.size <= maxBytes) return res;
      if (outMime === 'image/png') {
        return attempt([0.86, 0.74, 0.62, 0.48, 0.36], 'image/jpeg', 'jpg');
      }
      return res;
    }).then(function (res) {
      if (!res || !res.blob) throw new Error('Unable to generate cropped image.');
      if (res.blob.size > maxBytes) {
        throw new Error('Cropped image (' + formatSize(res.blob.size) + ') still exceeds max limit of ' + formatSize(maxBytes) + '. Try zooming in or choosing a smaller photo.');
      }
      return new File([res.blob], baseName + '.' + res.ext, { type: res.mime, lastModified: Date.now() });
    });
  }

  function openCropModal(file, opts, onConfirm, onCancel) {
    var policy = getPolicy();
    var maxPhotoMb = (opts && opts.maxPhotoMb) ? opts.maxPhotoMb : policy.maxPhotoMb;
    var maxBytes = Math.round(maxPhotoMb * 1024 * 1024);
    var activeAspectKey = (opts && opts.aspectRatio) || '4:3';
    var zoom = 1;
    var offsetX = 0;
    var offsetY = 0;
    var imgObj = new Image();
    var objectUrl = URL.createObjectURL(file);

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,0.75);display:flex;align-items:center;justify-content:center;padding:16px;';

    var dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.style.cssText = 'background:#fff;border-radius:12px;max-width:740px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,0.28);overflow:hidden;border:1px solid #E7E5E4;font-family:"Plus Jakarta Sans",system-ui,sans-serif;';

    var header = document.createElement('div');
    header.style.cssText = 'padding:12px 18px;border-bottom:1px solid #E7E5E4;display:flex;justify-content:space-between;align-items:center;background:#F8FAFC;';
    var titleEl = document.createElement('div');
    titleEl.innerHTML = '<strong style="font-size:15px;color:#0F294A;">Auto-Crop &amp; Aspect Ratio Adjuster</strong><div style="font-size:12px;color:#78716C;">Drag image to reposition · Max Photo Size: ' + maxPhotoMb + ' MB</div>';
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = '×';
    closeBtn.style.cssText = 'border:1px solid #D6D3D1;background:#fff;color:#44403C;border-radius:6px;width:30px;height:30px;font-size:18px;cursor:pointer;line-height:1;';
    header.appendChild(titleEl);
    header.appendChild(closeBtn);
    dialog.appendChild(header);

    var body = document.createElement('div');
    body.style.cssText = 'padding:16px 18px;';

    var aspectBar = document.createElement('div');
    aspectBar.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:12px;';
    var aspectLabel = document.createElement('span');
    aspectLabel.textContent = 'Aspect Ratio:';
    aspectLabel.style.cssText = 'font-size:12px;font-weight:700;color:#57534E;margin-right:4px;';
    aspectBar.appendChild(aspectLabel);

    var aspectButtons = {};
    ASPECT_OPTIONS.forEach(function (opt) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = opt.label;
      btn.style.cssText = 'padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid #D6D3D1;background:#fff;color:#44403C;';
      btn.addEventListener('click', function () {
        activeAspectKey = opt.key;
        offsetX = 0;
        offsetY = 0;
        refreshAspectButtons();
        redraw();
      });
      aspectButtons[opt.key] = btn;
      aspectBar.appendChild(btn);
    });
    body.appendChild(aspectBar);

    function refreshAspectButtons() {
      Object.keys(aspectButtons).forEach(function (k) {
        var b = aspectButtons[k];
        if (k === activeAspectKey) {
          b.style.background = '#0F294A';
          b.style.color = '#fff';
          b.style.borderColor = '#0F294A';
        } else {
          b.style.background = '#fff';
          b.style.color = '#44403C';
          b.style.borderColor = '#D6D3D1';
        }
      });
    }

    var stage = document.createElement('div');
    stage.style.cssText = 'background:#1C1917;border-radius:10px;padding:12px;display:flex;justify-content:center;align-items:center;min-height:240px;';
    var canvas = document.createElement('canvas');
    canvas.width = 560;
    canvas.height = 315;
    canvas.style.cssText = 'max-width:100%;max-height:340px;cursor:grab;border-radius:6px;border:2px solid #F59E0B;touch-action:none;';
    stage.appendChild(canvas);
    body.appendChild(stage);

    var controlsRow = document.createElement('div');
    controlsRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-top:12px;';

    var zoomWrap = document.createElement('label');
    zoomWrap.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:#44403C;flex:1;min-width:200px;';
    var zoomText = document.createElement('span');
    zoomText.textContent = 'Zoom: 1.00x';
    var zoomInput = document.createElement('input');
    zoomInput.type = 'range';
    zoomInput.min = '1';
    zoomInput.max = '3';
    zoomInput.step = '0.05';
    zoomInput.value = '1';
    zoomInput.style.flex = '1';
    zoomInput.addEventListener('input', function () {
      zoom = parseFloat(zoomInput.value) || 1;
      zoomText.textContent = 'Zoom: ' + zoom.toFixed(2) + 'x';
      redraw();
    });
    zoomWrap.appendChild(zoomText);
    zoomWrap.appendChild(zoomInput);

    var infoText = document.createElement('span');
    infoText.style.cssText = 'font-size:12px;color:#57534E;';

    var recenterBtn = document.createElement('button');
    recenterBtn.type = 'button';
    recenterBtn.textContent = 'Re-Center';
    recenterBtn.style.cssText = 'padding:5px 10px;border-radius:6px;border:1px solid #D6D3D1;background:#fff;font-size:12px;font-weight:600;cursor:pointer;';
    recenterBtn.addEventListener('click', function () {
      zoom = 1;
      offsetX = 0;
      offsetY = 0;
      zoomInput.value = '1';
      zoomText.textContent = 'Zoom: 1.00x';
      redraw();
    });

    controlsRow.appendChild(zoomWrap);
    controlsRow.appendChild(infoText);
    controlsRow.appendChild(recenterBtn);
    body.appendChild(controlsRow);

    var errBanner = document.createElement('div');
    errBanner.style.cssText = 'display:none;margin-top:10px;padding:8px 12px;border-radius:8px;background:#FEF2F2;border:1px solid #FECACA;color:#B91C1C;font-size:12px;font-weight:600;';
    body.appendChild(errBanner);

    var footer = document.createElement('div');
    footer.style.cssText = 'padding:12px 18px;border-top:1px solid #E7E5E4;background:#F8FAFC;display:flex;justify-content:flex-end;gap:8px;';
    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:8px 14px;border-radius:8px;border:1px solid #D6D3D1;background:#fff;color:#44403C;font-size:13px;font-weight:600;cursor:pointer;';

    var applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.textContent = 'Apply Auto-Crop';
    applyBtn.style.cssText = 'padding:8px 16px;border-radius:8px;border:none;background:#0F294A;color:#fff;font-size:13px;font-weight:700;cursor:pointer;';

    footer.appendChild(cancelBtn);
    footer.appendChild(applyBtn);

    dialog.appendChild(body);
    dialog.appendChild(footer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    var dragging = false;
    var lastX = 0;
    var lastY = 0;

    canvas.addEventListener('pointerdown', function (ev) {
      dragging = true;
      lastX = ev.clientX;
      lastY = ev.clientY;
      canvas.style.cursor = 'grabbing';
      if (canvas.setPointerCapture) {
        try { canvas.setPointerCapture(ev.pointerId); } catch (e) {}
      }
    });
    canvas.addEventListener('pointermove', function (ev) {
      if (!dragging) return;
      var dx = ev.clientX - lastX;
      var dy = ev.clientY - lastY;
      lastX = ev.clientX;
      lastY = ev.clientY;
      offsetX = Math.max(-1, Math.min(1, offsetX - dx / 130));
      offsetY = Math.max(-1, Math.min(1, offsetY - dy / 130));
      redraw();
    });
    function stopDrag() {
      dragging = false;
      canvas.style.cursor = 'grab';
    }
    canvas.addEventListener('pointerup', stopDrag);
    canvas.addEventListener('pointercancel', stopDrag);

    function cleanup() {
      URL.revokeObjectURL(objectUrl);
      document.removeEventListener('keydown', onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    function cancelFlow() {
      cleanup();
      if (typeof onCancel === 'function') onCancel();
    }

    function onKeyDown(ev) {
      if (ev.key === 'Escape') cancelFlow();
    }
    document.addEventListener('keydown', onKeyDown);
    closeBtn.addEventListener('click', cancelFlow);
    cancelBtn.addEventListener('click', cancelFlow);

    function redraw() {
      if (!imgObj.naturalWidth) return;
      var opt = getAspectOption(activeAspectKey);
      var ratio = opt.ratio || (imgObj.naturalWidth / Math.max(1, imgObj.naturalHeight));
      var previewW = 540;
      var previewH = Math.round(previewW / ratio);
      if (previewH > 320) {
        previewH = 320;
        previewW = Math.round(previewH * ratio);
      }
      canvas.width = Math.max(160, previewW);
      canvas.height = Math.max(120, previewH);
      var rect = computeAutoCropRect(imgObj.naturalWidth, imgObj.naturalHeight, opt.ratio, zoom, offsetX, offsetY);
      var outDims = computeOutputDims(rect.sw, rect.sh, opt.maxOutW);
      var ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imgObj, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        for (var i = 1; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo((canvas.width * i) / 3, 0);
          ctx.lineTo((canvas.width * i) / 3, canvas.height);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, (canvas.height * i) / 3);
          ctx.lineTo(canvas.width, (canvas.height * i) / 3);
          ctx.stroke();
        }
      }
      infoText.textContent = 'Output: ' + outDims.width + '×' + outDims.height + ' px · Source: ' + formatSize(file.size);
    }

    imgObj.onload = function () {
      refreshAspectButtons();
      redraw();
    };
    imgObj.onerror = function () {
      errBanner.textContent = 'Could not decode image file.';
      errBanner.style.display = 'block';
    };
    imgObj.src = objectUrl;

    applyBtn.addEventListener('click', function () {
      if (!imgObj.naturalWidth) return;
      errBanner.style.display = 'none';
      applyBtn.disabled = true;
      applyBtn.textContent = 'Processing...';
      var opt = getAspectOption(activeAspectKey);
      var rect = computeAutoCropRect(imgObj.naturalWidth, imgObj.naturalHeight, opt.ratio, zoom, offsetX, offsetY);
      var outDims = computeOutputDims(rect.sw, rect.sh, opt.maxOutW);
      exportCompliantImageFile(imgObj, file, rect, outDims, maxBytes).then(function (croppedFile) {
        cleanup();
        onConfirm(croppedFile);
      }).catch(function (err) {
        applyBtn.disabled = false;
        applyBtn.textContent = 'Apply Auto-Crop';
        errBanner.textContent = (err && err.message) ? err.message : 'Auto-crop failed.';
        errBanner.style.display = 'block';
      });
    });
  }

  function detectSlotConfig(input) {
    var name = (input.getAttribute('name') || '').toLowerCase();
    var accept = (input.getAttribute('accept') || '').toLowerCase();
    if (name === 'backup_file' || accept.indexOf('.json') !== -1) {
      return null; // ignore JSON backup imports
    }
    if (name === 'pdf_file' || name === 'doc_file' || name === 'item_file') {
      return { kind: 'document', aspectRatio: null };
    }
    var customRatio = input.getAttribute('data-aspect');
    if (customRatio) {
      return { kind: 'photo', aspectRatio: customRatio };
    }
    if (name === 'slide_image' || name === 'hero_image') {
      return { kind: 'photo', aspectRatio: '16:9' };
    }
    if (name === 'logo_file') {
      return { kind: 'photo', aspectRatio: '1:1' };
    }
    if (name === 'photo') {
      var isGalleryPage = (window.location.pathname || '').indexOf('manage_gallery') !== -1;
      return { kind: 'photo', aspectRatio: isGalleryPage ? '4:3' : '1:1' };
    }
    if (name === 'event_image') {
      return { kind: 'photo', aspectRatio: '3:2' };
    }
    if (
      name === 'cover_image' || name === 'gallery_photo' || name === 'library_photo' ||
      name === 'lab_photo' || name === 'about_image_file' || name === 'item_photo' ||
      accept.indexOf('image/') !== -1
    ) {
      return { kind: 'photo', aspectRatio: '4:3' };
    }
    return { kind: 'document', aspectRatio: null };
  }

  function attachInputGuard(input) {
    if (input.dataset.svcoerGuardBound === '1') return;
    if (input.closest && input.closest('.rte-toolbar')) return; // handled cleanly by editor.js

    var cfg = detectSlotConfig(input);
    if (!cfg) return;
    input.dataset.svcoerGuardBound = '1';

    var policy = getPolicy();
    var badge = document.createElement('div');
    badge.style.cssText = 'font-size:11px;font-weight:600;color:#475569;margin-top:4px;display:flex;align-items:center;flex-wrap:wrap;gap:6px;';
    if (cfg.kind === 'photo') {
      badge.innerHTML =
        '<span style="background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE;padding:1px 7px;border-radius:4px;">' +
        (policy.autoCrop ? 'Auto-Crop ' + cfg.aspectRatio : 'Aspect ' + cfg.aspectRatio) +
        ' · Max ' + policy.maxPhotoMb + ' MB</span>';
    } else {
      badge.innerHTML =
        '<span style="background:#FFFBEB;color:#B45309;border:1px solid #FDE68A;padding:1px 7px;border-radius:4px;">Max Document: ' +
        policy.maxDocMb + ' MB</span>';
    }

    var statusEl = document.createElement('div');
    statusEl.style.cssText = 'font-size:11px;margin-top:4px;display:none;';

    if (input.parentNode) {
      input.parentNode.insertBefore(badge, input.nextSibling);
      input.parentNode.insertBefore(statusEl, badge.nextSibling);
    }

    var skipSyntheticChange = false;
    input.addEventListener('change', function () {
      if (skipSyntheticChange) {
        skipSyntheticChange = false;
        return;
      }
      var file = input.files && input.files[0];
      if (!file) {
        statusEl.style.display = 'none';
        return;
      }
      var currentPolicy = getPolicy();

      if (cfg.kind === 'document') {
        var maxDocBytes = Math.round(currentPolicy.maxDocMb * 1024 * 1024);
        if (file.size > maxDocBytes) {
          input.value = '';
          statusEl.style.display = 'block';
          statusEl.style.color = '#B91C1C';
          statusEl.textContent = 'File "' + file.name + '" (' + formatSize(file.size) + ') exceeds the ' + currentPolicy.maxDocMb + ' MB document limit.';
          return;
        }
        statusEl.style.display = 'block';
        statusEl.style.color = '#047857';
        statusEl.textContent = 'Ready: ' + file.name + ' (' + formatSize(file.size) + ')';
        return;
      }

      // Photo flow
      var maxPhotoBytes = Math.round(currentPolicy.maxPhotoMb * 1024 * 1024);
      var ext = (file.name || '').split('.').pop().toLowerCase();
      if (['jpg', 'jpeg', 'png', 'webp'].indexOf(ext) === -1) {
        input.value = '';
        statusEl.style.display = 'block';
        statusEl.style.color = '#B91C1C';
        statusEl.textContent = 'Only JPG, PNG, or WEBP images are allowed here.';
        return;
      }

      if (!currentPolicy.autoCrop) {
        if (file.size > maxPhotoBytes) {
          input.value = '';
          statusEl.style.display = 'block';
          statusEl.style.color = '#B91C1C';
          statusEl.textContent = 'Photo "' + file.name + '" (' + formatSize(file.size) + ') exceeds the ' + currentPolicy.maxPhotoMb + ' MB photo limit.';
          return;
        }
        statusEl.style.display = 'block';
        statusEl.style.color = '#047857';
        statusEl.textContent = 'Ready: ' + file.name + ' (' + formatSize(file.size) + ')';
        return;
      }

      openCropModal(
        file,
        { aspectRatio: cfg.aspectRatio, maxPhotoMb: currentPolicy.maxPhotoMb },
        function (croppedFile) {
          if (typeof DataTransfer !== 'undefined') {
            var dt = new DataTransfer();
            dt.items.add(croppedFile);
            skipSyntheticChange = true;
            input.files = dt.files;
          }
          var thumbUrl = URL.createObjectURL(croppedFile);
          statusEl.style.display = 'flex';
          statusEl.style.alignItems = 'center';
          statusEl.style.gap = '8px';
          statusEl.style.color = '#047857';
          statusEl.innerHTML = '<img src="' + thumbUrl + '" alt="Cropped preview" style="width:44px;height:32px;object-fit:cover;border-radius:4px;border:1px solid #D6D3D1;">' +
            '<span>Auto-cropped (' + cfg.aspectRatio + '): ' + croppedFile.name + ' (' + formatSize(croppedFile.size) + ')</span>';
        },
        function () {
          input.value = '';
          statusEl.style.display = 'none';
        }
      );
    });
  }

  function initUploadGuards() {
    var inputs = document.querySelectorAll('input[type="file"]');
    for (var i = 0; i < inputs.length; i++) {
      attachInputGuard(inputs[i]);
    }
  }

  window.svcoerOpenCropModal = openCropModal;
  window.svcoerInitUploadGuards = initUploadGuards;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUploadGuards);
  } else {
    initUploadGuards();
  }
})();
