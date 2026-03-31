# ==========================================
# Vehicle Service Tracking System - app.py
# Flask JSON API backend for React frontend.
# ==========================================

from flask import Flask, request, jsonify, session, send_from_directory
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import sqlite3
import os
import secrets
from datetime import datetime, timezone, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

# GMT+8 timezone
GMT8 = timezone(timedelta(hours=8))

UPLOAD_FOLDER = os.path.join('static', 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}
VALID_STATUSES = {'pending', 'in_progress', 'completed'}
SECRET_KEY_FILE = '.secret_key'


def load_or_create_secret_key():
    """Load secret key from file, or generate a new one."""
    if os.path.exists(SECRET_KEY_FILE):
        with open(SECRET_KEY_FILE, 'r') as f:
            key = f.read().strip()
            if key:
                return key
    key = secrets.token_hex(32)
    with open(SECRET_KEY_FILE, 'w') as f:
        f.write(key)
    return key


def safe_get_json():
    """Safely parse JSON body, return empty dict if invalid/missing."""
    data = request.get_json(silent=True)
    if data is None:
        return {}
    return data


def now_gmt8():
    """Return current datetime string in GMT+8."""
    return datetime.now(GMT8).strftime('%Y-%m-%d %H:%M:%S')


def row_to_dict(row):
    """Convert a sqlite3.Row to a dict."""
    if row is None:
        return None
    return dict(row)


def require_auth():
    """Return user_id from session, or None if not logged in."""
    if 'user_id' not in session:
        return None
    return session['user_id']


# Create the Flask app — serve React build in production
app = Flask(__name__, static_folder='frontend/dist', static_url_path='')
app.secret_key = load_or_create_secret_key()
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10 MB upload limit
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

# --- Flask-Limiter for basic DDoS protection ---
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"]
)



# ------------------------------------------
# DATABASE HELPER FUNCTIONS
# These functions help us talk to the database.
# All SQL queries use parameterized queries to prevent SQL injection.
# ------------------------------------------

def get_db():
    """Connect to the SQLite database file."""
    db = sqlite3.connect('vehicle_tracking.db')
    db.row_factory = sqlite3.Row  # this lets us access columns by name (like row['username'])
    return db


def create_tables():
    """Create the database tables if they don't exist yet."""
    db = get_db()

    # Create the technicians table
    db.execute('''
        CREATE TABLE IF NOT EXISTS technicians (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
        )
    ''')

    # Create the service_records table
    db.execute('''
        CREATE TABLE IF NOT EXISTS service_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicle_name TEXT NOT NULL,
            license_plate TEXT NOT NULL,
            service_type TEXT NOT NULL,
            status TEXT DEFAULT 'in_progress',
            customer_name TEXT,
            customer_phone TEXT,
            notes TEXT,
            estimated_completion TEXT,
            technician_id INTEGER,
            created_at TEXT,
            updated_at TEXT,
            image_filename TEXT
        )
    ''')

    db.commit()
    db.close()


def add_default_technician():
    """Add a default technician account if the database is empty."""
    db = get_db()

    # Check if we already have a technician
    technician = db.execute('SELECT * FROM technicians LIMIT 1').fetchone()

    if technician is None:
        # Create default technician (username: admin, password: admin123)
        hashed_password = generate_password_hash('admin123')
        db.execute('INSERT INTO technicians (username, password) VALUES (?, ?)',
                   ('admin', hashed_password))
        db.commit()
        print('Default technician created: admin / admin123')

    db.close()


# ------------------------------------------
# ROUTES — JSON API
# ------------------------------------------

@app.route('/api/auth/check', methods=['GET'])
def auth_check():
    if 'user_id' in session:
        return jsonify({'authenticated': True, 'user': {'id': session['user_id'], 'username': session['username']}})
    return jsonify({'authenticated': False})


@app.route('/api/login', methods=['POST'])
@limiter.limit("10 per minute")
def api_login():
    data = safe_get_json()
    username = data.get('username', '')
    password = data.get('password', '')

    db = get_db()
    technician = db.execute('SELECT * FROM technicians WHERE username = ?',
                            (username,)).fetchone()
    db.close()

    if technician and check_password_hash(technician['password'], password):
        session['user_id'] = technician['id']
        session['username'] = technician['username']
        return jsonify({'success': True, 'user': {'id': technician['id'], 'username': technician['username']}})

    return jsonify({'success': False, 'error': 'Invalid username or password.'}), 401


@app.route('/api/customer-lookup', methods=['POST'])
def api_customer_lookup():
    data = safe_get_json()
    license_plate = data.get('license_plate', '').strip().upper()

    if not license_plate:
        return jsonify({'error': 'Please enter a license plate number.'}), 400

    db = get_db()
    record = db.execute('SELECT * FROM service_records WHERE license_plate = ? ORDER BY created_at DESC LIMIT 1',
                        (license_plate,)).fetchone()
    db.close()

    if record:
        return jsonify({'record': row_to_dict(record)})
    return jsonify({'error': f'No records found for plate "{license_plate}".'}), 404


@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({'success': True})


@app.route('/api/dashboard', methods=['GET'])
def api_dashboard():
    user_id = require_auth()
    if user_id is None:
        return jsonify({'error': 'Authentication required.'}), 401

    db = get_db()
    records = db.execute('SELECT * FROM service_records WHERE technician_id = ? ORDER BY updated_at DESC',
                         (user_id,)).fetchall()

    total_count = db.execute('SELECT COUNT(*) FROM service_records WHERE technician_id = ?',
                             (user_id,)).fetchone()[0]
    active_count = db.execute('SELECT COUNT(*) FROM service_records WHERE technician_id = ? AND status = ?',
                              (user_id, 'in_progress')).fetchone()[0]
    completed_count = db.execute('SELECT COUNT(*) FROM service_records WHERE technician_id = ? AND status = ?',
                                 (user_id, 'completed')).fetchone()[0]
    pending_count = db.execute('SELECT COUNT(*) FROM service_records WHERE technician_id = ? AND status = ?',
                               (user_id, 'pending')).fetchone()[0]
    db.close()

    return jsonify({
        'records': [row_to_dict(r) for r in records],
        'stats': {
            'total': total_count,
            'active': active_count,
            'pending': pending_count,
            'completed': completed_count
        }
    })


@app.route('/api/records', methods=['POST'])
@limiter.limit("5 per minute")
def api_add_record():
    user_id = require_auth()
    if user_id is None:
        return jsonify({'error': 'Authentication required.'}), 401

    # Support both JSON and FormData (for image upload)
    if request.content_type and 'multipart/form-data' in request.content_type:
        vehicle_name = request.form.get('vehicle_name', '').strip()
        license_plate = request.form.get('license_plate', '').strip().upper()
        service_type = request.form.get('service_type', '').strip()
        status = request.form.get('status', 'pending')
        customer_name = request.form.get('customer_name', '').strip()
        customer_phone = request.form.get('customer_phone', '').strip()
        estimated_completion = request.form.get('estimated_completion', '').strip()
        notes = request.form.get('notes', '').strip()
        image_file = request.files.get('image')
    else:
        data = safe_get_json()
        vehicle_name = data.get('vehicle_name', '').strip()
        license_plate = data.get('license_plate', '').strip().upper()
        service_type = data.get('service_type', '').strip()
        status = data.get('status', 'pending')
        customer_name = data.get('customer_name', '').strip()
        customer_phone = data.get('customer_phone', '').strip()
        estimated_completion = data.get('estimated_completion', '').strip()
        notes = data.get('notes', '').strip()
        image_file = None

    # Validate status
    if status not in VALID_STATUSES:
        return jsonify({'error': f'Invalid status. Must be one of: {VALID_STATUSES}'}), 400

    # Handle image upload
    image_filename = None
    if image_file and image_file.filename:
        ext = image_file.filename.rsplit('.', 1)[-1].lower()
        if ext in ALLOWED_EXTENSIONS:
            filename = secure_filename(f"{license_plate}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{ext}")
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            image_file.save(os.path.join(UPLOAD_FOLDER, filename))
            image_filename = filename
        else:
            return jsonify({'error': 'Invalid image file type.'}), 400

    if not vehicle_name or not license_plate or not service_type:
        return jsonify({'error': 'Vehicle name, license plate, and service type are required.'}), 400

    db = get_db()
    timestamp = now_gmt8()
    cursor = db.execute('''INSERT INTO service_records
                 (vehicle_name, license_plate, service_type, status,
                  customer_name, customer_phone, notes, estimated_completion, technician_id,
                  created_at, updated_at, image_filename)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
               (vehicle_name, license_plate, service_type, status,
                customer_name, customer_phone, notes, estimated_completion, user_id,
                timestamp, timestamp, image_filename))
    db.commit()
    record_id = cursor.lastrowid
    db.close()

    return jsonify({'success': True, 'record_id': record_id}), 201


@app.route('/api/records/<int:record_id>/status', methods=['PATCH'])
def api_update_status(record_id):
    user_id = require_auth()
    if user_id is None:
        return jsonify({'error': 'Authentication required.'}), 401

    data = safe_get_json()
    new_status = data.get('status')
    note = data.get('note', '').strip()

    if not new_status or new_status not in VALID_STATUSES:
        return jsonify({'error': f'Invalid status. Must be one of: {VALID_STATUSES}'}), 400

    db = get_db()
    record_check = db.execute('SELECT * FROM service_records WHERE id = ? AND technician_id = ?',
                              (record_id, user_id)).fetchone()
    if record_check is None:
        db.close()
        return jsonify({'error': 'Record not found or access denied.'}), 404

    if note:
        record = db.execute('SELECT notes FROM service_records WHERE id = ?', (record_id,)).fetchone()
        old_notes = record['notes'] if record['notes'] else ''
        new_notes = old_notes + '\n' + note
        db.execute('UPDATE service_records SET status = ?, notes = ?, updated_at = ? WHERE id = ?',
                   (new_status, new_notes.strip(), now_gmt8(), record_id))
    else:
        db.execute('UPDATE service_records SET status = ?, updated_at = ? WHERE id = ?',
                   (new_status, now_gmt8(), record_id))

    db.commit()
    db.close()
    return jsonify({'success': True})


@app.route('/api/records/<int:record_id>', methods=['GET'])
def api_view_record(record_id):
    user_id = require_auth()
    if user_id is None:
        return jsonify({'error': 'Authentication required.'}), 401

    db = get_db()
    record = db.execute('''SELECT service_records.*, technicians.username as technician_name
                          FROM service_records
                          LEFT JOIN technicians ON service_records.technician_id = technicians.id
                          WHERE service_records.id = ? AND service_records.technician_id = ?''',
                        (record_id, user_id)).fetchone()
    db.close()

    if record is None:
        return jsonify({'error': 'Record not found.'}), 404

    return jsonify({'record': row_to_dict(record)})


@app.route('/api/search', methods=['GET'])
def api_search():
    user_id = require_auth()
    if user_id is None:
        return jsonify({'error': 'Authentication required.'}), 401

    query = request.args.get('q', '').strip()
    results = []

    if query:
        db = get_db()
        search_term = '%' + query + '%'
        results = db.execute('''SELECT * FROM service_records
                               WHERE technician_id = ? AND (license_plate LIKE ? OR customer_name LIKE ?)
                               ORDER BY updated_at DESC''',
                             (user_id, search_term, search_term)).fetchall()
        db.close()
        results = [row_to_dict(r) for r in results]

    return jsonify({'results': results})


@app.route('/api/records/<int:record_id>', methods=['PUT'])
def api_edit_record(record_id):
    user_id = require_auth()
    if user_id is None:
        return jsonify({'error': 'Authentication required.'}), 401

    data = safe_get_json()
    vehicle_name = data.get('vehicle_name', '').strip()
    license_plate = data.get('license_plate', '').strip().upper()
    service_type = data.get('service_type', '').strip()
    status = data.get('status', '')
    customer_name = data.get('customer_name', '').strip()
    customer_phone = data.get('customer_phone', '').strip()
    estimated_completion = data.get('estimated_completion', '').strip()
    notes = data.get('notes', '').strip()

    if not vehicle_name or not license_plate or not service_type:
        return jsonify({'error': 'Vehicle name, license plate, and service type are required.'}), 400

    if status and status not in VALID_STATUSES:
        return jsonify({'error': f'Invalid status. Must be one of: {VALID_STATUSES}'}), 400

    db = get_db()
    record = db.execute('SELECT * FROM service_records WHERE id = ? AND technician_id = ?',
                        (record_id, user_id)).fetchone()
    if record is None:
        db.close()
        return jsonify({'error': 'Record not found or access denied.'}), 404

    db.execute('''UPDATE service_records
                 SET vehicle_name = ?, license_plate = ?, service_type = ?, status = ?,
                     customer_name = ?, customer_phone = ?, estimated_completion = ?, notes = ?,
                     updated_at = ?
                 WHERE id = ? AND technician_id = ?''',
               (vehicle_name, license_plate, service_type, status,
                customer_name, customer_phone, estimated_completion, notes,
                now_gmt8(), record_id, user_id))
    db.commit()
    db.close()
    return jsonify({'success': True})


@app.route('/api/records/<int:record_id>', methods=['DELETE'])
def api_delete_record(record_id):
    user_id = require_auth()
    if user_id is None:
        return jsonify({'error': 'Authentication required.'}), 401

    db = get_db()
    record = db.execute('SELECT * FROM service_records WHERE id = ? AND technician_id = ?',
                        (record_id, user_id)).fetchone()
    if record is None:
        db.close()
        return jsonify({'error': 'Record not found or access denied.'}), 404

    db.execute('DELETE FROM service_records WHERE id = ? AND technician_id = ?',
               (record_id, user_id))
    db.commit()
    db.close()
    return jsonify({'success': True})


@app.route('/api/register', methods=['POST'])
def api_register():
    user_id = require_auth()
    if user_id is None:
        return jsonify({'error': 'Authentication required.'}), 401

    data = safe_get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    confirm_password = data.get('confirm_password', '')

    if not username or not password:
        return jsonify({'error': 'Username and password are required.'}), 400
    if len(username) < 3:
        return jsonify({'error': 'Username must be at least 3 characters.'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters.'}), 400
    if password != confirm_password:
        return jsonify({'error': 'Passwords do not match.'}), 400

    db = get_db()
    existing = db.execute('SELECT * FROM technicians WHERE username = ?', (username,)).fetchone()
    if existing:
        db.close()
        return jsonify({'error': f'Username "{username}" is already taken.'}), 409

    hashed_password = generate_password_hash(password)
    db.execute('INSERT INTO technicians (username, password) VALUES (?, ?)',
               (username, hashed_password))
    db.commit()
    db.close()
    return jsonify({'success': True}), 201


@app.route('/api/change-password', methods=['POST'])
def api_change_password():
    user_id = require_auth()
    if user_id is None:
        return jsonify({'error': 'Authentication required.'}), 401

    data = safe_get_json()
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')
    confirm_password = data.get('confirm_password', '')

    if not current_password or not new_password:
        return jsonify({'error': 'All fields are required.'}), 400
    if len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters.'}), 400
    if new_password != confirm_password:
        return jsonify({'error': 'New passwords do not match.'}), 400

    db = get_db()
    technician = db.execute('SELECT * FROM technicians WHERE id = ?',
                            (user_id,)).fetchone()

    if not technician or not check_password_hash(technician['password'], current_password):
        db.close()
        return jsonify({'error': 'Current password is incorrect.'}), 403

    hashed = generate_password_hash(new_password)
    db.execute('UPDATE technicians SET password = ? WHERE id = ?',
               (hashed, user_id))
    db.commit()
    db.close()
    return jsonify({'success': True})


# ------------------------------------------
# SERVE UPLOADED IMAGES
# ------------------------------------------
@app.route('/static/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


# ------------------------------------------
# SERVE REACT SPA (catch-all for client-side routing)
# ------------------------------------------
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    if path.startswith('api/'):
        return jsonify({'error': 'Not found.'}), 404

    build_dir = os.path.join(os.path.dirname(__file__), 'frontend', 'dist')
    file_path = os.path.join(build_dir, path)
    if path and os.path.isfile(file_path):
        return send_from_directory(build_dir, path)

    index_path = os.path.join(build_dir, 'index.html')
    if os.path.isfile(index_path):
        return send_from_directory(build_dir, 'index.html')

    return jsonify({'message': 'React frontend not built yet. Run npm run build in frontend/ or use the Vite dev server.'}), 200


# ------------------------------------------
# ERROR HANDLERS
# ------------------------------------------
@app.errorhandler(404)
def page_not_found(e):
    if request.path.startswith('/api/'):
        return jsonify({'error': 'Not found.'}), 404
    return serve_react(request.path.lstrip('/'))


@app.errorhandler(500)
def internal_server_error(e):
    return jsonify({'error': 'Internal server error.'}), 500


# ------------------------------------------
# START THE APP
# ------------------------------------------
# Create tables and default technician when the app starts
create_tables()
add_default_technician()

# Run the app
if __name__ == '__main__':
    app.run(debug=False)
