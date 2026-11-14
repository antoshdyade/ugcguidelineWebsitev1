  </main>
</div>
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
