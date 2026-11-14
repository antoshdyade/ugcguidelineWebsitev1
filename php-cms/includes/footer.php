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
      <h4 style="color:#fff;">Mandatory Self-Disclosure</h4>
      <p><a href="<?= e(baseUrl('page.php?slug=about-overview')) ?>" style="color:#cbd5e1;">About HEI &amp; Statutes</a></p>
      <p><a href="<?= e(baseUrl('page.php?slug=prospectus-fee-structure')) ?>" style="color:#cbd5e1;">FRA Fee Structure</a></p>
      <p><a href="<?= e(baseUrl('page.php?slug=rti-disclosure')) ?>" style="color:#cbd5e1;">RTI Disclosure</a></p>
      <p><a href="<?= e(baseUrl('page.php?slug=statutory-officers')) ?>" style="color:#cbd5e1;">Statutory Officers</a></p>
    </div>
    <div>
      <h4 style="color:#fff;">Academics &amp; Departments</h4>
      <p><a href="<?= e(baseUrl('page.php?cat=examination')) ?>" style="color:#cbd5e1;">Examination Cell &amp; CoE</a></p>
      <p><a href="<?= e(baseUrl('department.php?dept=computer-science')) ?>" style="color:#cbd5e1;">Computer Science &amp; Engg.</a></p>
      <p><a href="<?= e(baseUrl('department.php?dept=mechanical')) ?>" style="color:#cbd5e1;">Mechanical Engineering</a></p>
      <p><a href="<?= e(baseUrl('department.php?dept=civil')) ?>" style="color:#cbd5e1;">Civil &amp; E&amp;TC Engg.</a></p>
    </div>
    <div>
      <h4 style="color:#fff;">Repositories &amp; Contact</h4>
      <p><a href="<?= e(baseUrl('quick-links.php')) ?>" style="color:#cbd5e1;">Downloadable Repository</a></p>
      <p><a href="<?= e(baseUrl('gallery.php')) ?>" style="color:#cbd5e1;">Picture Gallery</a></p>
      <p><a href="<?= e(baseUrl('contact.php')) ?>" style="color:#cbd5e1;">Telephone Directory</a></p>
      <p><a href="<?= e(baseUrl('admin/login.php')) ?>" style="color:#fde68a;">Staff CMS Login</a></p>
    </div>
  </div>
  <div class="container" style="border-top:1px solid #1e293b;margin-top:1.5rem;padding-top:1rem;font-size:0.8rem;display:flex;flex-wrap:wrap;justify-content:space-between;gap:0.5rem;">
    <span>&copy; <?= date('Y') ?> <?= e($settings['institution_name']) ?>. UGC NEP 2020 Public Self-Disclosure Compliant.</span>
    <span><a href="<?= e(baseUrl('page.php?slug=rti-disclosure')) ?>" style="color:#cbd5e1;">RTI Cell</a> · <a href="<?= e(baseUrl('page.php?slug=grievance-redressal')) ?>" style="color:#cbd5e1;">Grievance Redressal</a></span>
  </div>
</footer>
<script src="<?= e(assetUrl('assets/js/accessibility.js')) ?>"></script>
</body>
</html>
