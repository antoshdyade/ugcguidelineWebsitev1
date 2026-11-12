# Deploying SVCOER UGC CMS on Linux Webmin / Virtualmin

## 1. Upload Files
Upload everything inside `/php-cms/` into your Virtualmin domain document root (typically `/home/<domain-user>/public_html/`).

Verify:
- `public_html/index.php` exists directly in `public_html`
- `public_html/admin/login.php` exists
- `public_html/uploads/.htaccess` exists (prevents PHP execution inside `uploads/`)

## 2. Create MySQL Database & User in Webmin
1. Log into Webmin (`https://your-server-ip:10000`).
2. Go to **Servers → MySQL Database Server** (or Virtualmin → **Edit Databases**).
3. Create a database (e.g., `svcoer_ugc_cms`, UTF-8 `utf8mb4_unicode_ci`).
4. Create a MySQL user (e.g., `svcoer_user`) with full privileges on `svcoer_ugc_cms`.
5. Open the database → **Execute SQL** → upload and run `database.sql`.

## 3. Configure Database Credentials
Copy `config/config.local.php.example` to `config/config.local.php`:
```php
<?php
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'svcoer_ugc_cms');
define('DB_USER', 'svcoer_user');
define('DB_PASS', 'YOUR_STRONG_PASSWORD');
```

## 4. Check PHP 8.x Modules & Permissions
- Ensure PHP 8.1/8.2/8.3 is active (**Virtualmin → Server Configuration → PHP Options**) with extensions `pdo_mysql`, `fileinfo`, `mbstring`.
- Set permissions in Webmin File Manager or SSH:
  ```bash
  chown -R <domain-user>:<domain-user> /home/<domain-user>/public_html
  chmod 755 /home/<domain-user>/public_html/uploads
  ```
- Recommended `php.ini` limits: `upload_max_filesize = 16M`, `post_max_size = 20M`.

## 5. SSL & Apache `.htaccess`
- Enable Let's Encrypt SSL under **Virtualmin → Server Configuration → SSL Certificate**.
- Ensure `AllowOverride All` is enabled in Apache VirtualHost so `uploads/.htaccess` blocks `.php` execution.

## 6. Pre-Flight Test & Cleanup
1. Visit `https://your-domain.com/setup.php` to verify all checks show `PASS`.
2. Sign in at `https://your-domain.com/admin/login.php` (`admin@svcoer.edu.in` / `Admin@123`).
3. **Delete `setup.php`** once verified.
