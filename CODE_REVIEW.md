# Vehicle Service Tracking System - Code Review & Production Readiness Report

**Date:** March 12, 2026  
**Assessment Level:** Critical Issues Found

---

## Summary

The application has **8 critical security/deployment issues** and **7 important improvements** needed before production deployment. Below is a detailed breakdown.

---

## 🔴 CRITICAL ISSUES

### 1. **Hardcoded Secret Key (CRITICAL SECURITY)**
**File:** `app.py`, Line 28
```python
app.secret_key = 'vehicle-tracking-secret-key-2026'
```
**Problem:**
- Secret key is exposed in source code and Git history
- Anyone with repo access can forge session cookies
- No randomization between deployments

**Fix:**
```python
import secrets
app.secret_key = os.environ.get('SECRET_KEY') or secrets.token_urlsafe(32)
```
**Action:** Set `SECRET_KEY` environment variable in production.

---

### 2. **Default Credentials Hardcoded (CRITICAL SECURITY)**
**File:** `app.py`, Lines 93-94
```python
hashed_password = generate_password_hash('admin123')
db.execute('INSERT INTO technicians (username, password) VALUES (?, ?)',
           ('admin', hashed_password))
print('Default technician created: admin / admin123')
```
**Problem:**
- Default admin password is visible in code and console logs
- Prints credentials to logs that could be exposed

**Fix:**
```python
def add_default_technician():
    """Add a default technician account if the database is empty."""
    db = get_db()
    technician = db.execute('SELECT * FROM technicians LIMIT 1').fetchone()
    
    if technician is None:
        # Generate a secure random password for the default account
        default_password = os.environ.get('DEFAULT_ADMIN_PASSWORD') or secrets.token_urlsafe(16)
        hashed_password = generate_password_hash(default_password)
        db.execute('INSERT INTO technicians (username, password) VALUES (?, ?)',
                   ('admin', hashed_password))
        db.commit()
        # Log to file (not stdout) or only show to admin during deployment
        with open('initial_admin_password.txt', 'w') as f:
            f.write(f'Default technician created. Password: {default_password}\n')
            f.write('Please delete this file after login and change the password.\n')
    db.close()
```
**Action:** Add `DEFAULT_ADMIN_PASSWORD` to environment variables, delete `initial_admin_password.txt` after first use.

---

### 3. **Debug Mode Enabled in Production (CRITICAL)**
**File:** `app.py`, Line 638
```python
if __name__ == '__main__':
    app.run(debug=True)
```
**Problem:**
- Debug mode enables the interactive debugger (exposes code execution!)
- Detailed error pages leak sensitive information
- Auto-reloading not suitable for production

**Fix:**
```python
if __name__ == '__main__':
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(debug=debug_mode, host='127.0.0.1', port=5000)
```
**Action:** Never set `FLASK_DEBUG=true` in production.

---

### 4. **Missing Flask-Limiter in Requirements.txt (DEPLOYMENT FAILURE)**
**File:** `requirements.txt`
**Problem:**
- App imports `Limiter` from `flask_limiter` but package not listed
- Deployment will fail with `ModuleNotFoundError`

**Fix:**
Add to `requirements.txt`:
```
Flask-Limiter==4.1.1
```

---

### 5. **Hardcoded Database Path (PORTABILITY ISSUE)**
**File:** `app.py`, Line 47
```python
db = sqlite3.connect('vehicle_tracking.db')
```
**Problem:**
- Relative path: behavior depends on where `python app.py` is run
- Not portable across environments
- Risk of multiple database instances

**Fix:**
```python
import sys
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vehicle_tracking.db')

def get_db():
    """Connect to the SQLite database file."""
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db
```
**Use:** Absolute path from application root directory.

---

### 6. **Missing CSRF Protection (SECURITY)**
**File:** `app.py`, routes with POST methods
**Problem:**
- No CSRF tokens on forms (lines 150+, 360+, 415+, etc.)
- Vulnerable to Cross-Site Request Forgery attacks
- Malicious sites can submit forms on behalf of logged-in users

**Fix:**
```python
# In app.py, after app creation:
from flask_wtf.csrf import CSRFProtect
csrf = CSRFProtect(app)
```
In templates (e.g., `templates/dashboard.html`):
```html
<form method="POST" action="{{ url_for('add_record') }}">
    {{ csrf_token() }}
    <!-- form fields -->
</form>
```
**Update requirements.txt:**
```
Flask-WTF==1.2.1
```

---

### 7. **Upload Directory Not Created at Runtime (CRASH RISK)**
**File:** `app.py`, Lines 130-138
```python
upload_path = os.path.join('static', 'uploads', filename)
image_file.save(upload_path)  # Will crash if directory doesn't exist
```
**Problem:**
- If `static/uploads/` doesn't exist, app crashes on image upload
- No validation that directory is writable

**Fix:**
```python
def save_uploaded_image_handler(license_plate, image_file):
    if not image_file or not image_file.filename:
        return None, None
    
    allowed_ext = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}
    ext = image_file.filename.rsplit('.', 1)[-1].lower()
    if ext not in allowed_ext:
        return None, 'Invalid image file type.'
    
    # Ensure upload directory exists
    uploads_dir = os.path.join('static', 'uploads')
    os.makedirs(uploads_dir, exist_ok=True)
    
    from werkzeug.utils import secure_filename
    filename = secure_filename(f"{license_plate}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{ext}")
    upload_path = os.path.join(uploads_dir, filename)
    
    try:
        image_file.save(upload_path)
        return filename, None
    except (OSError, IOError) as e:
        return None, f'Failed to save image: {str(e)}'
```

---

### 8. **No Session Security Headers (SECURITY)**
**File:** `app.py`, configuration section
**Problem:**
- NO `SESSION_COOKIE_HTTPONLY` flag (cookies can be stolen via JavaScript)
- NO `SESSION_COOKIE_SECURE` flag (cookies sent over HTTP, not HTTPS-only)
- NO `SAMESITE` protection (vulnerable to CSRF)

**Fix:**
```python
# Add after app.secret_key assignment:
app.config.update(
    SESSION_COOKIE_SECURE=True,           # HTTPS only
    SESSION_COOKIE_HTTPONLY=True,         # No JavaScript access
    SESSION_COOKIE_SAMESITE='Lax',        # CSRF protection
    PERMANENT_SESSION_LIFETIME=timedelta(hours=24)
)
```

---

## 🟡 IMPORTANT IMPROVEMENTS

### 9. **No Error Logging or Monitoring**
**File:** Throughout `app.py`
**Problem:**
- No logging setup - can't debug production issues
- No exception handlers for database errors
- Silent failures possible

**Fix:**
```python
import logging
from logging.handlers import RotatingFileHandler

# Setup logging
if not app.debug:
    if not os.path.exists('logs'):
        os.mkdir('logs')
    file_handler = RotatingFileHandler('logs/vehicle_tracking.log', 
                                       maxBytes=10240000, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
```

### 10. **No Error Handling for Database Connection Failures**
**Problem:**
- If SQLite database is locked or corrupted, app crashes silently
- No connection retry logic

**Fix:**
```python
def get_db():
    """Connect to the SQLite database file with error handling."""
    try:
        db = sqlite3.connect(DB_PATH, timeout=5.0)
        db.row_factory = sqlite3.Row
        # Enable foreign keys if needed
        db.execute('PRAGMA foreign_keys = ON')
        return db
    except sqlite3.OperationalError as e:
        app.logger.error(f'Database connection failed: {str(e)}')
        raise RuntimeError('Database connection failed. Please contact administrator.')
```

### 11. **Input Validation Too Minimal**
**Problem:**
- Phone numbers not validated
- License plate format not validated (varies by country)
- Customer name could contain SQL-like input (though parameterized query protects)

**Fix:**
```python
import re

def validate_license_plate(plate):
    """Validate license plate format (basic)."""
    if not plate or len(plate) > 20:
        return False, "License plate must be less than 20 characters"
    # Allow alphanumeric, hyphens, spaces
    if not re.match(r'^[A-Z0-9\s\-]{2,}$', plate.upper()):
        return False, "License plate contains invalid characters"
    return True, None

def validate_phone(phone):
    """Basic phone validation."""
    if not phone:
        return True, None  # Optional field
    # Remove common separators
    digits = re.sub(r'[\s\-\(\)\.]+', '', phone)
    if not digits.isdigit() or len(digits) < 7:
        return False, "Phone must be at least 7 digits"
    return True, None

# Use in add_record:
valid, msg = validate_phone(customer_phone)
if not valid:
    flash(msg, 'error')
    return redirect(url_for('dashboard'))
```

### 12. **No Usage of Transaction Context Managers**
**Problem:**
- Manual `db.commit()` and `db.close()` calls risk data corruption if errors occur between them

**Fix:**
```python
class Database:
    def __enter__(self):
        self.db = sqlite3.connect(DB_PATH, timeout=5.0)
        self.db.row_factory = sqlite3.Row
        return self.db
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.db.rollback()
        else:
            self.db.commit()
        self.db.close()

# Usage:
with Database() as db:
    db.execute('UPDATE ...', params)
    # Auto-commits on success, rolls back on error
```

### 13. **No Security Headers (X-Frame-Options, CSP, etc.)**
**Problem:**
- App vulnerable to clickjacking (no X-Frame-Options)
- No Content Security Policy

**Fix:**
```python
@app.after_request
def set_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Content-Security-Policy'] = "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com"
    return response
```

### 14. **Type Casting Missing for Record ID**
**File:** `app.py`, Line 348 (`update_status`), Line 383 (`edit_record`), etc.
**Problem:**
```python
record_id = request.form['record_id']  # String, not int
```
While parameterized queries protect, better to type-cast early:
```python
try:
    record_id = int(request.form['record_id'])
except (ValueError, KeyError):
    flash('Invalid record ID.', 'error')
    return redirect(url_for('dashboard'))
```

### 15. **Missing .gitignore for Secrets**
**File:** No `.gitignore` present
**Problem:**
- Database file committed to Git (contains all user data)
- Secret key files could be committed
- Logs exposed

**Create `.gitignore`:**
```
venv/
__pycache__/
*.pyc
*.db
*.db-journal
instance/
logs/
.env
.secret_key
initial_admin_password.txt
static/uploads/
```

### 16. **No Rate Limiting on Sensitive Operations**
**File:** `app.py`, change_password (line 565)
**Problem:**
- Password change not rate-limited (brute force possible with reset loop)
- Login IS limited (good)

**Fix:**
```python
@app.route('/change-password', methods=['GET', 'POST'])
@limiter.limit("3 per hour")  # Add this
def change_password():
    # ... rest of function
```

---

## ⚙️ Configuration Issues

### 17. **Missing requirements.txt Dependencies**

Current `requirements.txt`:
```
blinker==1.9.0
click==8.3.1
colorama==0.4.6
Flask==3.1.2
itsdangerous==2.2.0
Jinja2==3.1.6
MarkupSafe==3.0.3
Werkzeug==3.1.5
```

**Missing:**
```
Flask-Limiter==4.1.1  # REQUIRED - app crashes without it
Flask-WTF==1.2.1      # For CSRF protection (optional but recommended)
```

**Updated requirements.txt:**
```
blinker==1.9.0
click==8.3.1
colorama==0.4.6
Flask==3.1.2
Flask-Limiter==4.1.1
Flask-WTF==1.2.1
itsdangerous==2.2.0
Jinja2==3.1.6
MarkupSafe==3.0.3
Werkzeug==3.1.5
```

---

## 📋 Production Deployment Checklist

- [ ] **Set `SECRET_KEY` environment variable** (not hardcoded)
- [ ] **Set `DEFAULT_ADMIN_PASSWORD` environment variable**
- [ ] **Disable `FLASK_DEBUG`** (not set or set to `False`)
- [ ] **Update `requirements.txt`** with Flask-Limiter and Flask-WTF
- [ ] **Create `.gitignore`** (protects secrets)
- [ ] **Setup logging** (RotatingFileHandler)
- [ ] **Add CSRF protection** (Flask-WTF tokens in forms)
- [ ] **Add security headers** (X-Frame-Options, CSP, etc.)
- [ ] **Validate all file uploads** (already done - good!)
- [ ] **Test database connectivity** before deployment
- [ ] **Use absolute paths** for database (not relative)
- [ ] **Setup monitoring/alerts** (optional but recommended)
- [ ] **Enable HTTPS** (for SESSION_COOKIE_SECURE to work)
- [ ] **Run with production WSGI server** (Gunicorn, not Flask dev server)

---

## 🚀 Recommended Deployment Stack

For production, use:
```bash
pip install gunicorn
gunicorn --workers 4 --bind 0.0.0.0:8000 app:app
```

This replaces `app.run(debug=True)` with a production-grade WSGI server.

---

## Summary Table of Issues

| Issue | Severity | Impact | Fix Complexity |
|-------|----------|--------|-----------------|
| Hardcoded secret key | CRITICAL | Session hijacking possible | Low |
| Hardcoded admin password | CRITICAL | Unauthorized access | Low |
| Debug mode enabled | CRITICAL | Code exposure, RCE | Very Low |
| Missing Flask-Limiter | CRITICAL | App won't start | Very Low |
| No CSRF protection | CRITICAL | Form forgery attacks | Medium |
| Hardcoded DB path | HIGH | Portability issues | Low |
| Missing error logging | HIGH | Can't debug issues | Medium |
| No security headers | MEDIUM | Multiple attack vectors | Low |
| Missing input validation | MEDIUM | Type confusion | Medium |
| No DB error handling | MEDIUM | Silent failures | Medium |
| Missing .gitignore | MEDIUM | Secrets in Git history | Very Low |
| Auth not rate-limited | MEDIUM | Brute force possible | Low |

---

## Next Steps

1. **Immediately (Before Any Deployment):**
   - Fix hardcoded secrets (items 1, 2)
   - Fix debug mode (item 3)
   - Update requirements.txt (item 4)

2. **Before Production:**
   - Add CSRF protection (item 6)
   - Add security headers (item 12)
   - Setup logging (item 9)
   - Create .gitignore (item 15)

3. **Nice-to-Have Improvements:**
   - Context managers for DB (item 12)
   - Enhanced input validation (item 11)
   - Rate limiting on all auth routes (item 16)

