# ==========================================
# Vehicle Service Tracking System - app.py
# This is the main file that runs the app.
# We use Flask for the web server and
# sqlite3 for the database (built into Python).
# ==========================================

from flask import Flask, render_template, request, redirect, url_for, flash, session
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import sqlite3
import os
from datetime import datetime, timezone, timedelta
from werkzeug.security import generate_password_hash, check_password_hash

# GMT+8 timezone
GMT8 = timezone(timedelta(hours=8))


def now_gmt8():
    """Return current datetime string in GMT+8."""
    return datetime.now(GMT8).strftime('%Y-%m-%d %H:%M:%S')

# Create the Flask app

app = Flask(__name__)
app.secret_key = 'vehicle-tracking-secret-key-2026'

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
# ROUTES (Pages of the website)
# ------------------------------------------

# --- LOGIN PAGE ---
@app.route('/', methods=['GET', 'POST'])
@app.route('/login', methods=['GET', 'POST'])
@limiter.limit("10 per minute")
def login():
    # If the form was submitted (POST request)
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        # Look up the technician in the database
        db = get_db()
        technician = db.execute('SELECT * FROM technicians WHERE username = ?',
                                (username,)).fetchone()
        db.close()

        # Check if technician exists and password is correct
        if technician and check_password_hash(technician['password'], password):
            # Save user info in session (like "logging them in")
            session['user_id'] = technician['id']
            session['username'] = technician['username']
            flash('Welcome back, ' + technician['username'] + '!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid username or password.', 'error')
            return redirect(url_for('login'))

    # If just visiting the page (GET request), show the login form
    return render_template('login.html')


# --- CUSTOMER LOOKUP (from login page) ---
@app.route('/customer-lookup', methods=['POST'])
def customer_lookup():
    license_plate = request.form['license_plate'].strip().upper()

    if not license_plate:
        flash('Please enter a license plate number.', 'error')
        return redirect(url_for('login'))

    # Search for the vehicle in the database
    db = get_db()
    record = db.execute('SELECT * FROM service_records WHERE license_plate = ? ORDER BY created_at DESC LIMIT 1',
                        (license_plate,)).fetchone()
    db.close()

    if record:
        return render_template('search.html', record=record)
    else:
        flash('No records found for plate "' + license_plate + '".', 'warning')
        return redirect(url_for('login'))


# --- LOGOUT ---
@app.route('/logout')
def logout():
    session.clear()  # remove all session data
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))


# --- DASHBOARD PAGE ---
@app.route('/dashboard')
def dashboard():
    # Check if user is logged in
    if 'user_id' not in session:
        flash('Please log in first.', 'warning')
        return redirect(url_for('login'))

    user_id = session['user_id']
    db = get_db()

    # Get all service records for this technician
    records = db.execute('SELECT * FROM service_records WHERE technician_id = ? ORDER BY updated_at DESC',
                         (user_id,)).fetchall()

    # Count records by status for the stats cards
    total_count = db.execute('SELECT COUNT(*) FROM service_records WHERE technician_id = ?',
                             (user_id,)).fetchone()[0]
    active_count = db.execute('SELECT COUNT(*) FROM service_records WHERE technician_id = ? AND status = ?',
                              (user_id, 'in_progress')).fetchone()[0]
    completed_count = db.execute('SELECT COUNT(*) FROM service_records WHERE technician_id = ? AND status = ?',
                                 (user_id, 'completed')).fetchone()[0]
    pending_count = db.execute('SELECT COUNT(*) FROM service_records WHERE technician_id = ? AND status = ?',
                               (user_id, 'pending')).fetchone()[0]

    db.close()

    # Put stats in a simple dictionary
    stats = {
        'total': total_count,
        'active': active_count,
        'pending': pending_count,
        'completed': completed_count
    }

    return render_template('dashboard.html', records=records, stats=stats)


# --- ADD NEW SERVICE RECORD ---
@app.route('/add-record', methods=['POST'])
@limiter.limit("5 per minute")
def add_record():
    # Check if user is logged in
    if 'user_id' not in session:
        return redirect(url_for('login'))

    # Get form data and strip whitespace
    vehicle_name = request.form['vehicle_name'].strip()
    license_plate = request.form['license_plate'].strip().upper()
    service_type = request.form['service_type'].strip()
    status = request.form['status']
    customer_name = request.form.get('customer_name', '').strip()
    customer_phone = request.form.get('customer_phone', '').strip()
    estimated_completion = request.form.get('estimated_completion', '').strip()
    notes = request.form.get('notes', '').strip()

    # Handle image upload
    image_file = request.files.get('image')
    image_filename = None
    if image_file and image_file.filename:
        from werkzeug.utils import secure_filename
        allowed_ext = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}
        ext = image_file.filename.rsplit('.', 1)[-1].lower()
        if ext in allowed_ext:
            filename = secure_filename(f"{license_plate}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{ext}")
            upload_path = os.path.join('static', 'uploads', filename)
            image_file.save(upload_path)
            image_filename = filename
        else:
            flash('Invalid image file type.', 'error')
            return redirect(url_for('dashboard'))

    # Validate required fields
    if not vehicle_name or not license_plate or not service_type:
        flash('Vehicle name, license plate, and service type are required.', 'error')
        return redirect(url_for('dashboard'))

    # Insert into database
    db = get_db()
    timestamp = now_gmt8()
    db.execute('''INSERT INTO service_records
                 (vehicle_name, license_plate, service_type, status,
                  customer_name, customer_phone, notes, estimated_completion, technician_id,
                  created_at, updated_at, image_filename)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
               (vehicle_name, license_plate, service_type, status,
                customer_name, customer_phone, notes, estimated_completion, session['user_id'],
                timestamp, timestamp, image_filename))
    db.commit()
    db.close()

    flash('Record for ' + vehicle_name + ' (' + license_plate + ') created!', 'success')
    return redirect(url_for('dashboard'))


# --- UPDATE RECORD STATUS ---
@app.route('/update-status', methods=['POST'])
def update_status():
    # Check if user is logged in
    if 'user_id' not in session:
        return redirect(url_for('login'))

    record_id = request.form['record_id']
    new_status = request.form['status']
    note = request.form.get('note', '').strip()

    db = get_db()

    # Verify the record belongs to this technician
    record_check = db.execute('SELECT * FROM service_records WHERE id = ? AND technician_id = ?',
                              (record_id, session['user_id'])).fetchone()
    if record_check is None:
        flash('Record not found or access denied.', 'error')
        db.close()
        return redirect(url_for('dashboard'))

    # If there's a note, add it to existing notes
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

    flash('Status updated!', 'success')
    return redirect(url_for('dashboard'))


# --- VIEW A SINGLE RECORD ---
@app.route('/record/<int:record_id>')
def view_record(record_id):
    # Check if user is logged in
    if 'user_id' not in session:
        return redirect(url_for('login'))

    db = get_db()
    # Join with technicians table to get the technician's username
    record = db.execute('''SELECT service_records.*, technicians.username as technician_name
                          FROM service_records
                          LEFT JOIN technicians ON service_records.technician_id = technicians.id
                          WHERE service_records.id = ?''', (record_id,)).fetchone()
    db.close()

    if record is None:
        flash('Record not found.', 'error')
        return redirect(url_for('dashboard'))

    return render_template('search.html', record=record)


# --- SEARCH PAGE ---
@app.route('/search')
def search():
    # Check if user is logged in
    if 'user_id' not in session:
        return redirect(url_for('login'))

    query = request.args.get('q', '').strip()
    results = None

    if query:
        db = get_db()
        # Search by license plate or customer name (scoped to this technician)
        search_term = '%' + query + '%'
        results = db.execute('''SELECT * FROM service_records
                               WHERE technician_id = ? AND (license_plate LIKE ? OR customer_name LIKE ?)
                               ORDER BY updated_at DESC''',
                             (session['user_id'], search_term, search_term)).fetchall()
        db.close()

    return render_template('search.html', results=results, query=query)


# --- EDIT A SERVICE RECORD ---
@app.route('/edit-record', methods=['POST'])
def edit_record():
    # Check if user is logged in
    if 'user_id' not in session:
        return redirect(url_for('login'))

    record_id = request.form['record_id']
    vehicle_name = request.form['vehicle_name'].strip()
    license_plate = request.form['license_plate'].strip().upper()
    service_type = request.form['service_type'].strip()
    status = request.form['status']
    customer_name = request.form.get('customer_name', '').strip()
    customer_phone = request.form.get('customer_phone', '').strip()
    estimated_completion = request.form.get('estimated_completion', '').strip()
    notes = request.form.get('notes', '').strip()

    # Validate required fields
    if not vehicle_name or not license_plate or not service_type:
        flash('Vehicle name, license plate, and service type are required.', 'error')
        return redirect(url_for('dashboard'))

    db = get_db()

    # Verify the record belongs to this technician
    record = db.execute('SELECT * FROM service_records WHERE id = ? AND technician_id = ?',
                        (record_id, session['user_id'])).fetchone()
    if record is None:
        flash('Record not found or access denied.', 'error')
        db.close()
        return redirect(url_for('dashboard'))

    db.execute('''UPDATE service_records
                 SET vehicle_name = ?, license_plate = ?, service_type = ?, status = ?,
                     customer_name = ?, customer_phone = ?, estimated_completion = ?, notes = ?,
                     updated_at = ?
                 WHERE id = ? AND technician_id = ?''',
               (vehicle_name, license_plate, service_type, status,
                customer_name, customer_phone, estimated_completion, notes,
                now_gmt8(), record_id, session['user_id']))
    db.commit()
    db.close()

    flash('Record for ' + vehicle_name + ' updated successfully!', 'success')
    return redirect(url_for('dashboard'))


# --- DELETE A SERVICE RECORD ---
@app.route('/delete-record', methods=['POST'])
def delete_record():
    # Check if user is logged in
    if 'user_id' not in session:
        return redirect(url_for('login'))

    record_id = request.form['record_id']

    db = get_db()

    # Verify the record belongs to this technician
    record = db.execute('SELECT * FROM service_records WHERE id = ? AND technician_id = ?',
                        (record_id, session['user_id'])).fetchone()
    if record is None:
        flash('Record not found or access denied.', 'error')
        db.close()
        return redirect(url_for('dashboard'))

    db.execute('DELETE FROM service_records WHERE id = ? AND technician_id = ?',
               (record_id, session['user_id']))
    db.commit()
    db.close()

    flash('Record deleted successfully.', 'success')
    return redirect(url_for('dashboard'))


# --- REGISTER NEW TECHNICIAN (only logged-in technicians can register new ones) ---
@app.route('/register', methods=['GET', 'POST'])
def register():
    if 'user_id' not in session:
        flash('Please log in first. Only technicians can register new accounts.', 'warning')
        return redirect(url_for('login'))

    if request.method == 'POST':
        username = request.form['username'].strip()
        password = request.form['password']
        confirm_password = request.form['confirm_password']

        # Validation
        if not username or not password:
            flash('Username and password are required.', 'error')
            return redirect(url_for('register'))

        if len(username) < 3:
            flash('Username must be at least 3 characters.', 'error')
            return redirect(url_for('register'))

        if len(password) < 6:
            flash('Password must be at least 6 characters.', 'error')
            return redirect(url_for('register'))

        if password != confirm_password:
            flash('Passwords do not match.', 'error')
            return redirect(url_for('register'))

        db = get_db()

        # Check if username already exists
        existing = db.execute('SELECT * FROM technicians WHERE username = ?', (username,)).fetchone()
        if existing:
            flash('Username "' + username + '" is already taken.', 'error')
            db.close()
            return redirect(url_for('register'))

        # Create the new technician account
        hashed_password = generate_password_hash(password)
        db.execute('INSERT INTO technicians (username, password) VALUES (?, ?)',
                   (username, hashed_password))
        db.commit()
        db.close()

        flash('New technician account created successfully!', 'success')
        return redirect(url_for('dashboard'))

    return render_template('register.html')


# --- CHANGE PASSWORD ---
@app.route('/change-password', methods=['GET', 'POST'])
def change_password():
    # Check if user is logged in
    if 'user_id' not in session:
        flash('Please log in first.', 'warning')
        return redirect(url_for('login'))

    if request.method == 'POST':
        current_password = request.form['current_password']
        new_password = request.form['new_password']
        confirm_password = request.form['confirm_password']

        # Validation
        if not current_password or not new_password:
            flash('All fields are required.', 'error')
            return redirect(url_for('change_password'))

        if len(new_password) < 6:
            flash('New password must be at least 6 characters.', 'error')
            return redirect(url_for('change_password'))

        if new_password != confirm_password:
            flash('New passwords do not match.', 'error')
            return redirect(url_for('change_password'))

        db = get_db()
        technician = db.execute('SELECT * FROM technicians WHERE id = ?',
                                (session['user_id'],)).fetchone()

        if not technician or not check_password_hash(technician['password'], current_password):
            flash('Current password is incorrect.', 'error')
            db.close()
            return redirect(url_for('change_password'))

        # Update the password
        hashed = generate_password_hash(new_password)
        db.execute('UPDATE technicians SET password = ? WHERE id = ?',
                   (hashed, session['user_id']))
        db.commit()
        db.close()

        flash('Password changed successfully!', 'success')
        return redirect(url_for('dashboard'))

    return render_template('change_password.html')


# ------------------------------------------
# ERROR HANDLERS
# ------------------------------------------

@app.errorhandler(404)
def page_not_found(e):
    return render_template('error.html', error_code=404,
                           error_title='Page Not Found',
                           error_message='The page you are looking for does not exist or has been moved.'), 404


@app.errorhandler(500)
def internal_server_error(e):
    return render_template('error.html', error_code=500,
                           error_title='Server Error',
                           error_message='Something went wrong on our end. Please try again later.'), 500


# ------------------------------------------
# START THE APP
# ------------------------------------------
# Create tables and default technician when the app starts
create_tables()
add_default_technician()

# Run the app
if __name__ == '__main__':
    app.run(debug=True)
