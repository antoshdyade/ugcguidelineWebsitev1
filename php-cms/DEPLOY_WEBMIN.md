# Deploying SVCOER UGC CMS on Ubuntu Linux Webmin / Virtualmin

## 1. Upload All Files (Preserve Folder Structure)
Upload everything inside `/php-cms/` into your Virtualmin domain document root (typically `/home/<domain-user>/public_html/`).

Verify these critical files exist:
- `public_html/index.php`
- `public_html/.htaccess` (hidden file — ensure File Manager shows dotfiles or upload directly)
- `public_html/assets/css/style.css`
- `public_html/assets/js/editor.js`
- `public_html/admin/login.php` & `public_html/admin/manage_home_components.php`
- `public_html/uploads/.htaccess` (prevents PHP execution inside `uploads/`)

---

## 2. Fixing Broken Design / Missing Visual HTML Editor on Ubuntu Webmin
If your site design changed or the Admin Visual/HTML Block Editor turned into a plain text box after uploading to Ubuntu Webmin:

1. **Fix File & Folder Permissions (Most Common Cause):**
   Uploading as `root` via Webmin File Manager or SFTP often sets `0600` on `.css`/`.js` files or `0700` on `assets/`, causing Apache to return **403 Forbidden** for `style.css` and `editor.js`. Run via Webmin **Tools → Terminal** or SSH:
   ```bash
   chown -R <domain-user>:<domain-user> /home/<domain-user>/public_html
   find /home/<domain-user>/public_html -type d -exec chmod 755 {} \;
   find /home/<domain-user>/public_html -type f -exec chmod 644 {} \;
   chmod 755 /home/<domain-user>/public_html/uploads
   ```
2. **Verify Apache `AllowOverride All` & Modules on Ubuntu:**
   ```bash
   sudo a2enmod rewrite headers mime
   sudo systemctl reload apache2
   ```
   Ensure your VirtualHost in `/etc/apache2/sites-available/<domain>.conf` allows `.htaccess` overrides (`AllowOverride All`) for `<Directory /home/<domain-user>/public_html>`.
3. **Clear Browser Cache:** Press `Ctrl + Shift + R` after fixing permissions (CSS & JS also carry `?v=2` cache-busters).
4. **Confirm via `setup.php`:** Visit `https://your-domain.com/setup.php` and verify `CSS Stylesheet` and `Visual Block Editor` both show **PASS**.

---

## 3. Create MySQL Database & Import Schema in Webmin
1. Log into Webmin (`https://your-server-ip:10000`).
2. Go to **Servers → MySQL Database Server** (or Virtualmin → **Edit Databases**).
3. Create a database (e.g., `svcoer_ugc_cms`, UTF-8 `utf8mb4_unicode_ci`).
4. Create a MySQL user (e.g., `svcoer_user`) with full privileges on `svcoer_ugc_cms`.
5. Open the database → **Execute SQL** → upload and run `database.sql` (if upgrading an existing DB, visit `setup.php` and click **Auto-Upgrade Database Schema**).

---

## 4. Configure Database Credentials
Copy `config/config.local.php.example` to `config/config.local.php`:
```php
<?php
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'svcoer_ugc_cms');
define('DB_USER', 'svcoer_user');
define('DB_PASS', 'YOUR_STRONG_PASSWORD');
```

---

## 5. Check PHP 8.x Modules & Limits
- Ensure PHP 8.1/8.2/8.3 is active (**Virtualmin → Server Configuration → PHP Options**) with extensions `pdo_mysql`, `fileinfo`, `mbstring`.
- Recommended `php.ini` limits: `upload_max_filesize = 16M`, `post_max_size = 20M`.

---

## 6. Pre-Flight Test & Cleanup
1. Visit `https://your-domain.com/setup.php` and click **Verify & Reset Default RBAC Passwords (5 Accounts)**.
2. Sign in at `https://your-domain.com/admin/login.php`:
   - Super Admin: `admin@svcoer.edu.in` / `Admin@123`
   - Controller of Examinations (CoE): `coe@coe.sveri.ac.in` / `Exam@123`
   - PRO Editor: `pro@svcoer.edu.in` / `Editor@123`
   - CSE Dept Admin: `hod.cse@svcoer.edu.in` / `Dept@123`
   - IQAC Officer: `iqac@svcoer.edu.in` / `Iqac@123`
3. **Delete `setup.php`** once verified.
