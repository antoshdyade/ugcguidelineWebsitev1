  </main>
</div>
<script src="<?= e(assetUrl('assets/js/upload_guard.js')) ?>"></script>
<script>
  if (typeof window.svcoerInitUploadGuards !== 'function') {
    <?php
    $__guardJsFile = __DIR__ . '/../assets/js/upload_guard.js';
    if (is_readable($__guardJsFile)) {
        $__rawGuardJs = (string)file_get_contents($__guardJsFile);
        echo str_ireplace('</script>', '<\/script>', $__rawGuardJs);
    }
    ?>
  }
  if (typeof window.svcoerInitUploadGuards === 'function') {
    window.svcoerInitUploadGuards();
  }
</script>
<script src="<?= e(assetUrl('assets/js/editor.js')) ?>"></script>
<script>
  if (typeof window.svcoerMountRichEditors !== 'function') {
    <?php
    $__editorJsFile = __DIR__ . '/../assets/js/editor.js';
    if (is_readable($__editorJsFile)) {
        $__rawJs = (string)file_get_contents($__editorJsFile);
        echo str_ireplace('</script>', '<\/script>', $__rawJs);
    }
    ?>
  }
  if (typeof window.svcoerMountRichEditors === 'function') {
    window.svcoerMountRichEditors();
  }
</script>
</body>
</html>
