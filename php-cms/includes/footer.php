</main>
<footer class="site-footer">
  <div class="container grid-4">
    <div>
      <h3 style="color:#fff;margin-top:0;"><?= e($settings['institution_name']) ?></h3>
      <p style="font-size:0.85rem;"><?= e($settings['address']) ?></p>
      <p style="font-size:0.85rem;">Phone: <?= e($settings['phone']) ?> · Email: <?= e($settings['email']) ?></p>
      <p style="font-size:0.85rem;">Anti-Ragging Helpline: <?= e($settings['anti_ragging_helpline']) ?></p>
    </div>
    <div>
      <h4 style="color:#fff;">UGC Mandatory Links</h4>
      <p><a href="page.php?slug=about-overview" style="color:#cbd5e1;">About HEI &amp; Statutes</a></p>
      <p><a href="page.php?slug=prospectus-fee-structure" style="color:#cbd5e1;">FRA Fee Structure</a></p>
      <p><a href="page.php?slug=rti-disclosure" style="color:#cbd5e1;">RTI Disclosure</a></p>
    </div>
    <div>
      <h4 style="color:#fff;">Departments</h4>
      <p><a href="department.php?dept=computer-science" style="color:#cbd5e1;">Computer Science &amp; Engg.</a></p>
      <p><a href="department.php?dept=mechanical" style="color:#cbd5e1;">Mechanical Engineering</a></p>
      <p><a href="department.php?dept=civil" style="color:#cbd5e1;">Civil Engineering</a></p>
      <p><a href="department.php?dept=entc" style="color:#cbd5e1;">E&amp;TC Engineering</a></p>
    </div>
    <div>
      <h4 style="color:#fff;">Repositories &amp; Contact</h4>
      <p><a href="quick-links.php" style="color:#cbd5e1;">Downloadable Repository</a></p>
      <p><a href="gallery.php" style="color:#cbd5e1;">Picture Gallery</a></p>
      <p><a href="contact.php" style="color:#cbd5e1;">Telephone Directory</a></p>
    </div>
  </div>
  <div class="container" style="border-top:1px solid #1e293b;margin-top:1.5rem;padding-top:1rem;font-size:0.8rem;">
    &copy; <?= date('Y') ?> <?= e($settings['institution_name']) ?>. UGC NEP 2020 Public Self-Disclosure Compliant.
  </div>
</footer>
<script src="assets/js/accessibility.js"></script>
<script>
function googleTranslateElementInit() {
  if (window.google && google.translate) {
    new google.translate.TranslateElement({ pageLanguage: 'en', includedLanguages: 'en,hi,mr,kn,ta' }, 'google_translate_element');
  }
}
</script>
<script src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" async></script>
</body>
</html>
