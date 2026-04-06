# ==========================================
# Vehicle Service Tracking System - app.py
# Flask JSON API backend for React frontend.
# ==========================================

from flask import Flask, request, jsonify, session, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_socketio import SocketIO
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
import math
import secrets
import filetype
from datetime import datetime, timezone, timedelta
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

# GMT+8 timezone
GMT8 = timezone(timedelta(hours=8))

UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', os.path.join('static', 'uploads'))
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}
ALLOWED_IMAGE_MIME_TYPES = {
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/bmp',
    'image/webp',
}
VALID_STATUSES = {'pending', 'in_progress', 'completed'}
SAFE_METHODS = {'GET', 'HEAD', 'OPTIONS'}
DEV_ALLOWED_ORIGINS = {
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
}
SECRET_KEY_FILE = '.secret_key'
RATELIMIT_STORAGE_URI = os.environ.get('RATELIMIT_STORAGE_URI', '').strip()


def is_production():
    env = (os.environ.get('APP_ENV') or os.environ.get('FLASK_ENV') or os.environ.get('PYTHON_ENV') or '').lower()
    return env == 'production' or bool(os.environ.get('RENDER_EXTERNAL_URL'))


def normalize_origin(origin):
    return origin.rstrip('/')


def get_configured_origins():
    origins = set()
    configured = os.environ.get('ALLOWED_ORIGINS', '')
    for origin in configured.split(','):
        cleaned = origin.strip()
        if cleaned:
            origins.add(normalize_origin(cleaned))

    render_origin = os.environ.get('RENDER_EXTERNAL_URL', '').strip()
    if render_origin:
        origins.add(normalize_origin(render_origin))

    if not is_production():
        origins.update(DEV_ALLOWED_ORIGINS)

    return origins


def load_or_create_secret_key():
    """Load secret key from env in production, or fall back to a local file for dev."""
    env_key = os.environ.get('SECRET_KEY', '').strip()
    if env_key:
        return env_key

    if is_production():
        raise RuntimeError('SECRET_KEY environment variable is required in production.')

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
    """Convert a model instance to a dict (for JSON serialization)."""
    if row is None:
        return None
    d = {}
    for col in row.__table__.columns:
        d[col.name] = getattr(row, col.name)
    return d


def serialize_customer_lookup_record(record):
    return {
        'vehicle_name': record.vehicle_name,
        'license_plate': record.license_plate,
        'service_type': record.service_type,
        'status': record.status,
        'estimated_completion': record.estimated_completion,
        'updated_at': record.updated_at,
    }


def serialize_customer_history_record(record):
    return {
        'id': record.id,
        'vehicle_name': record.vehicle_name,
        'license_plate': record.license_plate,
        'service_type': record.service_type,
        'status': record.status,
        'created_at': record.created_at,
    }


def get_allowed_request_origins():
    origins = get_configured_origins()
    origins.add(normalize_origin(request.host_url))
    return origins


def is_allowed_request_source(source, allowed_origins):
    if not source:
        return False
    normalized = normalize_origin(source)
    if normalized in allowed_origins:
        return True
    return any(source.startswith(f'{origin}/') for origin in allowed_origins)


def validate_request_source():
    if request.method in SAFE_METHODS or not request.path.startswith('/api/'):
        return None

    allowed_origins = get_allowed_request_origins()
    origin = request.headers.get('Origin', '').strip()
    referer = request.headers.get('Referer', '').strip()

    if origin and is_allowed_request_source(origin, allowed_origins):
        return None
    if referer and is_allowed_request_source(referer, allowed_origins):
        return None
    if not origin and not referer and not is_production():
        return None

    return jsonify({'error': 'Cross-origin request blocked.'}), 403


def validate_uploaded_image(file):
    if file is None or file.filename == '':
        return False, 'No file selected.'

    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in ALLOWED_EXTENSIONS:
        return False, f'Invalid file type. Allowed: {", ".join(sorted(ALLOWED_EXTENSIONS))}'

    if file.mimetype and not file.mimetype.startswith('image/'):
        return False, 'Invalid image content type.'

    try:
        file.stream.seek(0)
        signature = file.stream.read(261)
        file.stream.seek(0)
        detected = filetype.guess(signature)
    except Exception:
        try:
            file.stream.seek(0)
        except Exception:
            pass
        return False, 'Invalid image file.'

    if detected is None or detected.mime not in ALLOWED_IMAGE_MIME_TYPES or detected.extension not in ALLOWED_EXTENSIONS:
        return False, 'Invalid image file.'

    return True, ext


def validate_image_batch(files):
    validated = []
    for file in files:
        if not file or not file.filename:
            continue
        is_valid, result = validate_uploaded_image(file)
        if not is_valid:
            return False, result
        validated.append((file, result))
    return True, validated


def require_auth():
    """Return user_id from session, or None if not logged in."""
    if 'user_id' not in session:
        return None
    return session['user_id']


def is_admin():
    """Check if the current session user is an admin."""
    return session.get('role') == 'admin'


def require_admin():
    """Return 403 JSON response if the user is not admin, else None."""
    if not is_admin():
        return jsonify({'error': 'Admin access required.'}), 403
    return None


# Create the Flask app — serve React build in production
app = Flask(__name__, static_folder=None)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
app.secret_key = load_or_create_secret_key()
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10 MB upload limit
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = is_production()

# --- Database Configuration ---
# Use DATABASE_URL env var for PostgreSQL, fallback to SQLite for local dev
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///vehicle_tracking.db')
# Fix Heroku-style postgres:// → postgresql://
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)

# --- Flask-SocketIO for real-time updates ---
SOCKET_ALLOWED_ORIGINS = sorted(get_configured_origins())
socketio = SocketIO(app, cors_allowed_origins=SOCKET_ALLOWED_ORIGINS or None)

# --- Flask-Limiter for basic DDoS protection ---
limiter_options = {
    'default_limits': ["200 per day", "50 per hour"],
}
if RATELIMIT_STORAGE_URI:
    limiter_options['storage_uri'] = RATELIMIT_STORAGE_URI

limiter = Limiter(get_remote_address, app=app, **limiter_options)


@app.before_request
def enforce_request_source():
    return validate_request_source()


# ------------------------------------------
# DATABASE MODELS (SQLAlchemy ORM)
# ------------------------------------------

VALID_ROLES = {'admin', 'technician'}

class Technician(db.Model):
    __tablename__ = 'technicians'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default='technician', nullable=False)
    profile_picture = db.Column(db.String(200), nullable=True)
    display_name = db.Column(db.String(120), nullable=True)
    email = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(30), nullable=True)
    created_at = db.Column(db.String(30), nullable=True)
    records = db.relationship('ServiceRecord', backref='technician', lazy=True)

class ServiceRecord(db.Model):
    __tablename__ = 'service_records'
    id = db.Column(db.Integer, primary_key=True)
    vehicle_name = db.Column(db.String(120), nullable=False)
    license_plate = db.Column(db.String(20), nullable=False)
    service_type = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(20), default='in_progress')
    customer_name = db.Column(db.String(120))
    customer_phone = db.Column(db.String(30))
    notes = db.Column(db.Text)
    estimated_completion = db.Column(db.String(30))
    technician_id = db.Column(db.Integer, db.ForeignKey('technicians.id'))
    created_at = db.Column(db.String(30))
    updated_at = db.Column(db.String(30))
    image_filename = db.Column(db.String(200))
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=True)
    checklist = db.Column(db.Text, nullable=True)  # JSON: [{"item": "...", "checked": true/false}, ...]
    images = db.relationship('ServiceImage', backref='record', lazy=True, cascade='all, delete-orphan')

class ServiceImage(db.Model):
    __tablename__ = 'service_images'
    id = db.Column(db.Integer, primary_key=True)
    record_id = db.Column(db.Integer, db.ForeignKey('service_records.id', ondelete='CASCADE'), nullable=False)
    filename = db.Column(db.String(200), nullable=False)
    original_name = db.Column(db.String(200))
    uploaded_at = db.Column(db.String(30))

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    id = db.Column(db.Integer, primary_key=True)
    action = db.Column(db.String(50), nullable=False)      # create, update, delete, status_change, login, register, etc.
    entity_type = db.Column(db.String(50))                  # record, technician, image
    entity_id = db.Column(db.Integer)
    description = db.Column(db.Text)
    user_id = db.Column(db.Integer, db.ForeignKey('technicians.id'))
    username = db.Column(db.String(80))
    timestamp = db.Column(db.String(30))


class Customer(db.Model):
    __tablename__ = 'customers'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(30))
    email = db.Column(db.String(120))
    address = db.Column(db.Text)
    created_at = db.Column(db.String(30))
    updated_at = db.Column(db.String(30))
    records = db.relationship('ServiceRecord', backref='customer', lazy=True)


def log_audit(action, entity_type=None, entity_id=None, description=None, user_id=None, username=None):
    """Write an entry to the audit log."""
    entry = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        user_id=user_id or session.get('user_id'),
        username=username or session.get('username', 'system'),
        timestamp=now_gmt8(),
    )
    db.session.add(entry)
    db.session.commit()


def emit_update(event='records_updated', data=None):
    """Emit a real-time event to all connected clients."""
    socketio.emit(event, data or {}, namespace='/')


def bootstrap_admin_from_env():
    """Create the first admin only when explicit bootstrap credentials are provided."""
    username = os.environ.get('BOOTSTRAP_ADMIN_USERNAME', '').strip()
    password = os.environ.get('BOOTSTRAP_ADMIN_PASSWORD', '')

    try:
        if Technician.query.first() is not None or not username or not password:
            return

        if len(password) < 12:
            raise RuntimeError('BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters long.')

        tech = Technician(username=username, password=generate_password_hash(password), role='admin', created_at=now_gmt8())
        db.session.add(tech)
        db.session.commit()
        print(f'Bootstrapped admin account from environment: {username}')
    except Exception:
        db.session.rollback()
        raise


# ------------------------------------------
# ROUTES — JSON API
# ------------------------------------------

@app.route('/api/health', methods=['GET'])
def api_health():
    return jsonify({'status': 'ok'})


@app.route('/api/auth/check', methods=['GET'])
def auth_check():
    if 'user_id' in session:
        tech = Technician.query.get(session['user_id'])
        profile_picture = tech.profile_picture if tech else None
        return jsonify({'authenticated': True, 'user': {'id': session['user_id'], 'username': session['username'], 'role': session.get('role', 'technician'), 'profile_picture': profile_picture, 'display_name': tech.display_name if tech else None, 'email': tech.email if tech else None, 'phone': tech.phone if tech else None, 'created_at': tech.created_at if tech else None}})
    return jsonify({'authenticated': False})


@app.route('/api/login', methods=['POST'])
@limiter.limit("10 per minute")
def api_login():
    data = safe_get_json()
    username = data.get('username', '')
    password = data.get('password', '')

    technician = Technician.query.filter_by(username=username).first()

    if technician and check_password_hash(technician.password, password):
        session['user_id'] = technician.id
        session['username'] = technician.username
        session['role'] = technician.role
        log_audit('login', 'technician', technician.id, f'User "{username}" logged in.',
                  user_id=technician.id, username=technician.username)
        return jsonify({'success': True, 'user': {'id': technician.id, 'username': technician.username, 'role': technician.role, 'profile_picture': technician.profile_picture, 'display_name': technician.display_name, 'email': technician.email, 'phone': technician.phone, 'created_at': technician.created_at}})

    return jsonify({'success': False, 'error': 'Invalid username or password.'}), 401


@app.route('/api/customer-lookup', methods=['POST'])
@limiter.limit("10 per minute")
def api_customer_lookup():
    data = safe_get_json()
    license_plate = data.get('license_plate', '').strip().upper()

    if not license_plate:
        return jsonify({'error': 'Please enter a license plate number.'}), 400

    record = ServiceRecord.query.filter_by(license_plate=license_plate).order_by(ServiceRecord.created_at.desc()).first()

    if record:
        return jsonify({'record': serialize_customer_lookup_record(record)})
    return jsonify({'error': f'No records found for plate "{license_plate}".'}), 404


@app.route('/api/logout', methods=['POST'])
def api_logout():
    log_audit('logout', 'technician', session.get('user_id'), f'User "{session.get("username")}" logged out.')
    session.clear()
    return jsonify({'success': True})


@app.route('/api/dashboard', methods=['GET'])
def api_dashboard():
    user_id = require_auth()
    if user_id is None:
        return jsonify({'error': 'Authentication required.'}), 401

    # Pagination params
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    per_page = min(max(per_page, 1), 100)  # clamp to 1-100
    page = max(page, 1)
    offset = (page - 1) * per_page

    base_query = ServiceRecord.query if is_admin() else ServiceRecord.query.filter_by(technician_id=user_id)
    total_count = base_query.count()
    active_count = base_query.filter_by(status='in_progress').count()
    completed_count = base_query.filter_by(status='completed').count()
    pending_count = base_query.filter_by(status='pending').count()

    records = base_query.order_by(ServiceRecord.updated_at.desc()).offset(offset).limit(per_page).all()

    total_pages = math.ceil(total_count / per_page) if per_page else 1

    # Include technician name for admin view
    records_list = []
    for r in records:
        rd = row_to_dict(r)
        if is_admin() and r.technician:
            rd['technician_name'] = r.technician.username
        records_list.append(rd)

    return jsonify({
        'records': records_list,
        'stats': {
            'total': total_count,
            'active': active_count,
            'pending': pending_count,
            'completed': completed_count
        },
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total_count,
            'total_pages': total_pages,
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
        checklist = request.form.get('checklist', '').strip() or None
        image_file = request.files.get('image')
        image_files = request.files.getlist('images')
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
        checklist = data.get('checklist', '').strip() if isinstance(data.get('checklist'), str) else None
        image_file = None
        image_files = []

    if not vehicle_name or not license_plate or not service_type:
        return jsonify({'error': 'Vehicle name, license plate, and service type are required.'}), 400

    # Validate status
    if status not in VALID_STATUSES:
        return jsonify({'error': f'Invalid status. Must be one of: {VALID_STATUSES}'}), 400

    all_files = list(image_files) if image_files else []
    if image_file and image_file.filename:
        all_files.insert(0, image_file)

    is_valid_batch, validated_files_or_error = validate_image_batch(all_files)
    if not is_valid_batch:
        return jsonify({'error': validated_files_or_error}), 400

    validated_files = validated_files_or_error

    image_filename = None
    if image_file and image_file.filename:
        primary_ext = validated_files[0][1]
        image_filename = secure_filename(f"{license_plate}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{primary_ext}")
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        image_file.save(os.path.join(UPLOAD_FOLDER, image_filename))

    timestamp = now_gmt8()
    record = ServiceRecord(
        vehicle_name=vehicle_name,
        license_plate=license_plate,
        service_type=service_type,
        status=status,
        customer_name=customer_name,
        customer_phone=customer_phone,
        notes=notes,
        estimated_completion=estimated_completion,
        technician_id=user_id,
        created_at=timestamp,
        updated_at=timestamp,
        image_filename=image_filename,
        checklist=checklist,
    )
    db.session.add(record)
    db.session.flush()  # get record.id

    # Save multiple images into service_images table
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    for f, ext in validated_files:
        safe_name = secure_filename(f"{license_plate}_{datetime.now().strftime('%Y%m%d%H%M%S%f')}.{ext}")
        f.save(os.path.join(UPLOAD_FOLDER, safe_name))
        img = ServiceImage(record_id=record.id, filename=safe_name, original_name=f.filename, uploaded_at=timestamp)
        db.session.add(img)

    db.session.commit()
    log_audit('create', 'record', record.id, f'Created record for {vehicle_name} ({license_plate}).')
    emit_update('records_updated', {'action': 'create', 'record_id': record.id})

    return jsonify({'success': True, 'record_id': record.id}), 201


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

    record = ServiceRecord.query.get(record_id) if is_admin() else ServiceRecord.query.filter_by(id=record_id, technician_id=user_id).first()
    if record is None:
        return jsonify({'error': 'Record not found or access denied.'}), 404

    old_status = record.status
    if note:
        old_notes = record.notes or ''
        record.notes = (old_notes + '\n' + note).strip()
    record.status = new_status
    record.updated_at = now_gmt8()
    db.session.commit()

    log_audit('status_change', 'record', record_id,
              f'Status changed from "{old_status}" to "{new_status}" for record #{record_id}.')
    emit_update('records_updated', {'action': 'status_change', 'record_id': record_id})
    return jsonify({'success': True})


@app.route('/api/records/<int:record_id>', methods=['GET'])
def api_view_record(record_id):
    user_id = require_auth()
    if user_id is None:
        return jsonify({'error': 'Authentication required.'}), 401

    record = ServiceRecord.query.get(record_id) if is_admin() else ServiceRecord.query.filter_by(id=record_id, technician_id=user_id).first()

    if record is None:
        return jsonify({'error': 'Record not found.'}), 404

    record_dict = row_to_dict(record)
    # Add technician name
    tech = Technician.query.get(record.technician_id)
    record_dict['technician_name'] = tech.username if tech else None

    # Attach images for this record
    images = ServiceImage.query.filter_by(record_id=record_id).order_by(ServiceImage.uploaded_at.asc()).all()
    record_dict['images'] = [row_to_dict(img) for img in images]

    return jsonify({'record': record_dict})


@app.route('/api/records/<int:record_id>/images', methods=['POST'])
@limiter.limit("10 per minute")
def api_upload_images(record_id):
    user_id = require_auth()
    if user_id is None:
        return jsonify({'error': 'Authentication required.'}), 401

    record = ServiceRecord.query.get(record_id) if is_admin() else ServiceRecord.query.filter_by(id=record_id, technician_id=user_id).first()
    if record is None:
        return jsonify({'error': 'Record not found or access denied.'}), 404

    files = request.files.getlist('images')
    if not files or all(f.filename == '' for f in files):
        return jsonify({'error': 'No images provided.'}), 400

    is_valid_batch, validated_files_or_error = validate_image_batch(files)
    if not is_valid_batch:
        return jsonify({'error': validated_files_or_error}), 400

    saved = []
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    timestamp = now_gmt8()

    for f, ext in validated_files_or_error:
        safe_name = secure_filename(f"{record.license_plate}_{datetime.now().strftime('%Y%m%d%H%M%S%f')}.{ext}")
        f.save(os.path.join(UPLOAD_FOLDER, safe_name))
        img = ServiceImage(record_id=record_id, filename=safe_name, original_name=f.filename, uploaded_at=timestamp)
        db.session.add(img)
        db.session.flush()
        saved.append({'id': img.id, 'filename': safe_name, 'original_name': f.filename, 'uploaded_at': timestamp})

    db.session.commit()

    if not saved:
        return jsonify({'error': 'No valid image files provided.'}), 400

    log_audit('upload_image', 'record', record_id,
              f'Uploaded {len(saved)} image(s) to record #{record_id}.')
    return jsonify({'success': True, 'images': saved}), 201


@app.route('/api/records/<int:record_id>/images/<int:image_id>', methods=['DELETE'])
def api_delete_image(record_id, image_id):
    user_id = require_auth()
    if user_id is None:
        return jsonify({'error': 'Authentication required.'}), 401

    record = ServiceRecord.query.get(record_id) if is_admin() else ServiceRecord.query.filter_by(id=record_id, technician_id=user_id).first()
    if record is None:
        return jsonify({'error': 'Record not found or access denied.'}), 404

    image = ServiceImage.query.filter_by(id=image_id, record_id=record_id).first()
    if image is None:
        return jsonify({'error': 'Image not found.'}), 404

    # Delete file from disk
    filepath = os.path.join(UPLOAD_FOLDER, image.filename)
    if os.path.isfile(filepath):
        os.remove(filepath)

    db.session.delete(image)
    db.session.commit()

    log_audit('delete_image', 'record', record_id,
              f'Deleted image "{image.original_name}" from record #{record_id}.')
    return jsonify({'success': True})


@app.route('/api/search', methods=['GET'])
def api_search():
    user_id = require_auth()
    if user_id is None:
        return jsonify({'error': 'Authentication required.'}), 401

    query = request.args.get('q', '').strip()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 12, type=int)
    per_page = min(max(per_page, 1), 100)
    page = max(page, 1)
    offset = (page - 1) * per_page

    # Advanced filters
    status_filter = request.args.get('status', '').strip()
    service_type_filter = request.args.get('service_type', '').strip()
    date_from = request.args.get('date_from', '').strip()
    date_to = request.args.get('date_to', '').strip()

    base = ServiceRecord.query if is_admin() else ServiceRecord.query.filter(ServiceRecord.technician_id == user_id)

    # Text search (license plate, customer name, vehicle name, notes)
    if query:
        search_term = f'%{query}%'
        base = base.filter(db.or_(
            ServiceRecord.license_plate.ilike(search_term),
            ServiceRecord.customer_name.ilike(search_term),
            ServiceRecord.vehicle_name.ilike(search_term),
            ServiceRecord.notes.ilike(search_term),
        ))

    # Status filter
    if status_filter and status_filter in VALID_STATUSES:
        base = base.filter(ServiceRecord.status == status_filter)

    # Service type filter
    if service_type_filter:
        base = base.filter(ServiceRecord.service_type == service_type_filter)

    # Date range filters (based on created_at string YYYY-MM-DD HH:MM:SS)
    if date_from:
        base = base.filter(ServiceRecord.created_at >= date_from)
    if date_to:
        base = base.filter(ServiceRecord.created_at <= date_to + ' 23:59:59')

    total = base.count()
    records = base.order_by(ServiceRecord.updated_at.desc()).offset(offset).limit(per_page).all()
    results = []
    for r in records:
        rd = row_to_dict(r)
        if is_admin() and r.technician:
            rd['technician_name'] = r.technician.username
        results.append(rd)

    total_pages = math.ceil(total / per_page) if per_page and total else 1

    return jsonify({
        'results': results,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'total_pages': total_pages,
        }
    })


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

    record = ServiceRecord.query.get(record_id) if is_admin() else ServiceRecord.query.filter_by(id=record_id, technician_id=user_id).first()
    if record is None:
        return jsonify({'error': 'Record not found or access denied.'}), 404

    record.vehicle_name = vehicle_name
    record.license_plate = license_plate
    record.service_type = service_type
    record.status = status
    record.customer_name = customer_name
    record.customer_phone = customer_phone
    record.estimated_completion = estimated_completion
    record.notes = notes
    checklist = data.get('checklist')
    if checklist is not None:
        record.checklist = checklist if isinstance(checklist, str) else None
    record.updated_at = now_gmt8()
    db.session.commit()

    log_audit('update', 'record', record_id,
              f'Updated record #{record_id} ({vehicle_name}, {license_plate}).')
    emit_update('records_updated', {'action': 'update', 'record_id': record_id})
    return jsonify({'success': True})


@app.route('/api/records/<int:record_id>', methods=['DELETE'])
def api_delete_record(record_id):
    user_id = require_auth()
    if user_id is None:
        return jsonify({'error': 'Authentication required.'}), 401

    record = ServiceRecord.query.get(record_id) if is_admin() else ServiceRecord.query.filter_by(id=record_id, technician_id=user_id).first()
    if record is None:
        return jsonify({'error': 'Record not found or access denied.'}), 404

    desc = f'Deleted record #{record_id} ({record.vehicle_name}, {record.license_plate}).'

    # Delete associated image files from disk
    for img in record.images:
        filepath = os.path.join(UPLOAD_FOLDER, img.filename)
        if os.path.isfile(filepath):
            os.remove(filepath)

    db.session.delete(record)
    db.session.commit()

    log_audit('delete', 'record', record_id, desc)
    emit_update('records_updated', {'action': 'delete', 'record_id': record_id})
    return jsonify({'success': True})


@app.route('/api/register', methods=['POST'])
def api_register():
    user_id = require_auth()
    if user_id is None:
        return jsonify({'error': 'Authentication required.'}), 401

    admin_check = require_admin()
    if admin_check:
        return admin_check

    data = safe_get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    confirm_password = data.get('confirm_password', '')
    role = data.get('role', 'technician').strip()

    if not username or not password:
        return jsonify({'error': 'Username and password are required.'}), 400
    if len(username) < 3:
        return jsonify({'error': 'Username must be at least 3 characters.'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters.'}), 400
    if password != confirm_password:
        return jsonify({'error': 'Passwords do not match.'}), 400
    if role not in VALID_ROLES:
        return jsonify({'error': f'Invalid role. Must be one of: {VALID_ROLES}'}), 400

    existing = Technician.query.filter_by(username=username).first()
    if existing:
        return jsonify({'error': f'Username "{username}" is already taken.'}), 409

    hashed_password = generate_password_hash(password)
    tech = Technician(username=username, password=hashed_password, role=role, created_at=now_gmt8())
    db.session.add(tech)
    db.session.commit()

    log_audit('register', 'technician', tech.id, f'Registered new {role} "{username}".')
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

    technician = Technician.query.get(user_id)

    if not technician or not check_password_hash(technician.password, current_password):
        return jsonify({'error': 'Current password is incorrect.'}), 403

    technician.password = generate_password_hash(new_password)
    db.session.commit()

    log_audit('password_change', 'technician', user_id, f'User "{session.get("username")}" changed password.')
    return jsonify({'success': True})


@app.route('/api/user/profile-picture', methods=['POST'])
def api_upload_profile_picture():
    user_id = require_auth()
    if user_id is None:
        return jsonify({'error': 'Authentication required.'}), 401

    if 'image' not in request.files:
        return jsonify({'error': 'No image provided.'}), 400

    file = request.files['image']
    is_valid_file, validated_ext_or_error = validate_uploaded_image(file)
    if not is_valid_file:
        return jsonify({'error': validated_ext_or_error}), 400

    ext = validated_ext_or_error

    technician = Technician.query.get(user_id)
    if not technician:
        return jsonify({'error': 'User not found.'}), 404

    # Delete old profile picture file if it exists
    if technician.profile_picture:
        old_path = os.path.join(UPLOAD_FOLDER, technician.profile_picture)
        if os.path.exists(old_path):
            os.remove(old_path)

    filename = secure_filename(f"pfp_{user_id}_{int(__import__('time').time())}.{ext}")
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    file.save(os.path.join(UPLOAD_FOLDER, filename))

    technician.profile_picture = filename
    db.session.commit()

    log_audit('update', 'technician', user_id, f'User "{session.get("username")}" updated profile picture.')
    return jsonify({'success': True, 'profile_picture': filename})


@app.route('/api/user/profile-picture', methods=['DELETE'])
def api_delete_profile_picture():
    user_id = require_auth()
    if user_id is None:
        return jsonify({'error': 'Authentication required.'}), 401

    technician = Technician.query.get(user_id)
    if not technician:
        return jsonify({'error': 'User not found.'}), 404

    if technician.profile_picture:
        old_path = os.path.join(UPLOAD_FOLDER, technician.profile_picture)
        if os.path.exists(old_path):
            os.remove(old_path)
        technician.profile_picture = None
        db.session.commit()
        log_audit('update', 'technician', user_id, f'User "{session.get("username")}" removed profile picture.')

    return jsonify({'success': True})


@app.route('/api/user/profile', methods=['GET'])
def api_get_profile():
    user_id = require_auth()
    if user_id is None:
        return jsonify({'error': 'Authentication required.'}), 401

    technician = Technician.query.get(user_id)
    if not technician:
        return jsonify({'error': 'User not found.'}), 404

    records_count = ServiceRecord.query.filter_by(technician_id=user_id).count()

    return jsonify({
        'display_name': technician.display_name,
        'email': technician.email,
        'phone': technician.phone,
        'created_at': technician.created_at,
        'records_count': records_count,
    })


@app.route('/api/user/profile', methods=['PUT'])
def api_update_profile():
    user_id = require_auth()
    if user_id is None:
        return jsonify({'error': 'Authentication required.'}), 401

    technician = Technician.query.get(user_id)
    if not technician:
        return jsonify({'error': 'User not found.'}), 404

    data = safe_get_json()
    display_name = data.get('display_name', '').strip()
    email = data.get('email', '').strip()
    phone = data.get('phone', '').strip()

    if email and '@' not in email:
        return jsonify({'error': 'Invalid email address.'}), 400
    if phone and len(phone) > 30:
        return jsonify({'error': 'Phone number too long.'}), 400
    if display_name and len(display_name) > 120:
        return jsonify({'error': 'Display name too long.'}), 400

    technician.display_name = display_name or None
    technician.email = email or None
    technician.phone = phone or None
    db.session.commit()

    log_audit('update', 'technician', user_id, f'User "{session.get("username")}" updated profile info.')
    return jsonify({
        'success': True,
        'display_name': technician.display_name,
        'email': technician.email,
        'phone': technician.phone,
    })


@app.route('/api/audit-logs', methods=['GET'])
def api_audit_logs():
    user_id = require_auth()
    if user_id is None:
        return jsonify({'error': 'Authentication required.'}), 401

    admin_check = require_admin()
    if admin_check:
        return admin_check

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    per_page = min(max(per_page, 1), 100)
    page = max(page, 1)
    offset = (page - 1) * per_page

    action_filter = request.args.get('action', '').strip()

    base = AuditLog.query
    if action_filter:
        base = base.filter_by(action=action_filter)

    total = base.count()
    logs = base.order_by(AuditLog.id.desc()).offset(offset).limit(per_page).all()
    total_pages = math.ceil(total / per_page) if per_page and total else 1

    return jsonify({
        'logs': [row_to_dict(l) for l in logs],
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'total_pages': total_pages,
        }
    })


# ------------------------------------------
# CUSTOMER MANAGEMENT API
# ------------------------------------------

@app.route('/api/customers', methods=['GET'])
def api_list_customers():
    user_id = require_auth()
    if user_id is None:
        return jsonify({'error': 'Authentication required.'}), 401

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    per_page = min(max(per_page, 1), 100)
    page = max(page, 1)
    offset = (page - 1) * per_page
    q = request.args.get('q', '').strip()

    base = Customer.query
    if q:
        search_term = f'%{q}%'
        base = base.filter(db.or_(
            Customer.name.ilike(search_term),
            Customer.phone.ilike(search_term),
            Customer.email.ilike(search_term),
        ))

    total = base.count()
    customers = base.order_by(Customer.updated_at.desc()).offset(offset).limit(per_page).all()
    total_pages = math.ceil(total / per_page) if per_page and total else 1

    return jsonify({
        'customers': [row_to_dict(c) for c in customers],
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'total_pages': total_pages,
        }
    })


@app.route('/api/customers', methods=['POST'])
@limiter.limit("10 per minute")
def api_create_customer():
    user_id = require_auth()
    if user_id is None:
        return jsonify({'error': 'Authentication required.'}), 401

    data = safe_get_json()
    name = data.get('name', '').strip()
    phone = data.get('phone', '').strip()
    email = data.get('email', '').strip()
    address = data.get('address', '').strip()

    if not name:
        return jsonify({'error': 'Customer name is required.'}), 400

    timestamp = now_gmt8()
    customer = Customer(name=name, phone=phone, email=email, address=address,
                        created_at=timestamp, updated_at=timestamp)
    db.session.add(customer)
    db.session.commit()

    log_audit('create', 'customer', customer.id, f'Created customer "{name}".')
    return jsonify({'success': True, 'customer': row_to_dict(customer)}), 201


@app.route('/api/customers/<int:customer_id>', methods=['GET'])
def api_get_customer(customer_id):
    user_id = require_auth()
    if user_id is None:
        return jsonify({'error': 'Authentication required.'}), 401

    customer = Customer.query.get(customer_id)
    if customer is None:
        return jsonify({'error': 'Customer not found.'}), 404

    customer_dict = row_to_dict(customer)
    # Attach service records linked to this customer
    records_query = ServiceRecord.query.filter_by(customer_id=customer_id)
    if not is_admin():
        records_query = records_query.filter_by(technician_id=user_id)
    records = records_query.order_by(ServiceRecord.updated_at.desc()).all()
    customer_dict['records'] = [serialize_customer_history_record(r) for r in records]

    return jsonify({'customer': customer_dict})


@app.route('/api/customers/<int:customer_id>', methods=['PUT'])
def api_update_customer(customer_id):
    user_id = require_auth()
    if user_id is None:
        return jsonify({'error': 'Authentication required.'}), 401

    customer = Customer.query.get(customer_id)
    if customer is None:
        return jsonify({'error': 'Customer not found.'}), 404

    data = safe_get_json()
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Customer name is required.'}), 400

    customer.name = name
    customer.phone = data.get('phone', '').strip()
    customer.email = data.get('email', '').strip()
    customer.address = data.get('address', '').strip()
    customer.updated_at = now_gmt8()
    db.session.commit()

    log_audit('update', 'customer', customer_id, f'Updated customer "{name}".')
    return jsonify({'success': True, 'customer': row_to_dict(customer)})


@app.route('/api/customers/<int:customer_id>', methods=['DELETE'])
def api_delete_customer(customer_id):
    user_id = require_auth()
    if user_id is None:
        return jsonify({'error': 'Authentication required.'}), 401

    admin_check = require_admin()
    if admin_check:
        return admin_check

    customer = Customer.query.get(customer_id)
    if customer is None:
        return jsonify({'error': 'Customer not found.'}), 404

    # Unlink service records (set customer_id to NULL, don't delete them)
    ServiceRecord.query.filter_by(customer_id=customer_id).update({'customer_id': None})
    desc = f'Deleted customer "{customer.name}" (ID #{customer_id}).'
    db.session.delete(customer)
    db.session.commit()

    log_audit('delete', 'customer', customer_id, desc)
    return jsonify({'success': True})


# ------------------------------------------
# SERVE UPLOADED IMAGES
# ------------------------------------------
@app.route('/static/uploads/<path:filename>')
def serve_upload(filename):
    user_id = require_auth()
    if user_id is None:
        return jsonify({'error': 'Authentication required.'}), 401

    safe_filename = secure_filename(filename)
    if safe_filename != filename:
        return jsonify({'error': 'Not found.'}), 404

    image = ServiceImage.query.filter_by(filename=filename).first()
    if image:
        record = ServiceRecord.query.get(image.record_id)
        if record is None or (not is_admin() and record.technician_id != user_id):
            return jsonify({'error': 'Not found.'}), 404
        return send_from_directory(UPLOAD_FOLDER, filename)

    legacy_image = ServiceRecord.query.filter_by(image_filename=filename).first()
    if legacy_image:
        if not is_admin() and legacy_image.technician_id != user_id:
            return jsonify({'error': 'Not found.'}), 404
        return send_from_directory(UPLOAD_FOLDER, filename)

    profile_picture_owner = Technician.query.filter_by(profile_picture=filename).first()
    if profile_picture_owner:
        if not is_admin() and profile_picture_owner.id != user_id:
            return jsonify({'error': 'Not found.'}), 404
        return send_from_directory(UPLOAD_FOLDER, filename)

    return jsonify({'error': 'Not found.'}), 404


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
def initialize_runtime_state():
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    with app.app_context():
        db.create_all()
        bootstrap_admin_from_env()

# Run the app
if __name__ == '__main__':
    initialize_runtime_state()
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', '5000'))
    socketio.run(app, host=host, port=port, debug=False)
