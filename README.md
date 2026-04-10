# Vehicle Service Tracking System

A full-stack web application for managing and tracking vehicle maintenance and service records. Built with a **React SPA** frontend and **Flask JSON API** backend.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS v4, React Router v7, Socket.IO Client |
| Backend | Flask 3.1, Flask-SQLAlchemy, Flask-Migrate (Alembic), Flask-SocketIO, Flask-Limiter, requests (Telegram Bot API) |
| Database | SQLite (dev) / PostgreSQL (production via `DATABASE_URL`) |
| Real-Time | WebSockets via Flask-SocketIO + Socket.IO Client |
| Integrations | Telegram Bot API (reminders, chat ID auto-reply) |

## Features

- **Authentication** — Session-based login/logout, technician registration, password change
- **User Profiles** — Profile picture upload, display name, email, phone, account stats
- **Dashboard** — Service records table with sorting, filtering, pagination, and stat cards
- **Record Management** — Full CRUD for service records with status workflow (Queued → In Progress → Completed)
- **Image Gallery** — Multi-image upload per record with lightbox preview
- **Customer Management** — Dedicated customer profiles with linked service history and Telegram Chat ID
- **Reminders** — Set next service dates, urgency badges, and send Telegram reminders to customers
- **Appointments** — Full CRUD for appointments, status workflow, and Telegram notify
- **Advanced Search** — Text search with filters by status, service type, and date range
- **Real-Time Updates** — WebSocket-powered live dashboard refresh across all connected clients
- **Activity Log** — Full audit trail of all actions (create, update, delete, status changes, logins)
- **Dark Mode** — Theme toggle with localStorage persistence and WCAG AA contrast ratios
- **Security** — Rate limiting, CSRF protection, HTTP-only session cookies, input validation
- **Responsive UI** — Modern color scheme, floating label inputs, password visibility toggles, and caps lock detection
## Telegram Reminders & Chat ID Setup

This app integrates with Telegram to send service reminders and appointment notifications to customers.

**How it works:**

1. Customer messages your Telegram bot (find it via @BotFather, press Start, or send any message)
2. The bot auto-replies with their Chat ID
3. Admin copies this Chat ID and pastes it into the customer's profile in the app (Customer Detail → Edit → Telegram Chat ID)
4. Once set, the "Remind" button on the Reminders page will send Telegram notifications directly to the customer

**Reminders Page:**
- Two tabs: "Scheduled" (records with next service date) and "No Date Set"
- Set next service date inline, urgency badges (Overdue, Due Soon, Upcoming)
- Send Telegram reminders with one click

**Appointments Page:**
- Create, edit, delete appointments for customers
- Appointment status workflow: requested → confirmed → completed/cancelled
- Send Telegram notifications for appointments

**Environment variable required:**
- `TELEGRAM_BOT_TOKEN` — your Telegram bot token (set via env var, never hardcoded)

## Project Structure

```
app.py                          # Flask JSON API backend (routes, models, auth)
requirements.txt                # Python dependencies
migrations/                     # Alembic database migrations
instance/                       # SQLite database file
static/uploads/                 # Uploaded images (profile pictures, service photos)
frontend/
├── src/
│   ├── App.jsx                 # Router and app shell
│   ├── api.js                  # API client (fetch wrapper)
│   ├── contexts/
│   │   ├── AuthContext.jsx     # Authentication state
│   │   ├── SocketContext.jsx   # WebSocket connection
│   │   ├── ThemeContext.jsx    # Dark/light theme state
│   │   └── ToastContext.jsx    # Toast notifications
│   ├── components/
│   │   ├── layout/             # Sidebar, TopAppBar, DashboardLayout
│   │   └── ui/                 # Modal, StatCard, StatusBadge, FloatingInput
│   └── pages/
│       ├── DashboardPage.jsx   # Main dashboard with records table
│       ├── SearchPage.jsx      # Search with advanced filters
│       ├── CustomersPage.jsx   # Customer list and management
│       ├── CustomerDetailPage.jsx  # Customer profile and service history
│       ├── RecordDetailPage.jsx    # Record detail with image gallery
│       ├── AuditLogPage.jsx    # Activity/audit log viewer
│       ├── ProfilePage.jsx     # Profile picture, info, and account stats
│       ├── ChangePasswordPage.jsx  # Password change
│       ├── RegisterPage.jsx    # Technician registration (admin)
│       ├── LoginPage.jsx       # Login with customer status lookup
│       └── ErrorPage.jsx       # 404 page
└── vite.config.js              # Vite config with API/WebSocket proxy
```

## Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+

### Backend
```sh
git clone https://github.com/AliffIkhmal/personalproject.git
cd personalproject
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
# Optional on a fresh database: bootstrap the first admin once
# Windows PowerShell:
# $env:BOOTSTRAP_ADMIN_USERNAME="admin"
# $env:BOOTSTRAP_ADMIN_PASSWORD="choose-a-strong-password"
python app.py
```
The API runs on `http://localhost:5000`. A default admin is no longer created automatically. On a fresh database, set `BOOTSTRAP_ADMIN_USERNAME` and `BOOTSTRAP_ADMIN_PASSWORD` once before first startup, then remove them after the admin account is created.

### Frontend
```sh
cd frontend
npm install
npm run dev
```
The dev server runs on `http://localhost:5173` and proxies API requests to the Flask backend.

### Production Build
```sh
cd frontend
npm run build
```
Flask serves the built React app from `frontend/dist/` automatically.

## Docker & Render

This repo now includes a Docker-based deployment path for Render.

### Required environment variables
- `SECRET_KEY` — required in production
- `DATABASE_URL` — PostgreSQL connection string
- `UPLOAD_FOLDER` — recommended for persistent uploads, e.g. `/var/data/uploads`
- `TELEGRAM_BOT_TOKEN` — Telegram Bot API token for sending reminders

### One-time environment variables for a fresh database
- `BOOTSTRAP_ADMIN_USERNAME`
- `BOOTSTRAP_ADMIN_PASSWORD`

Set these only for the first deploy to create the initial admin account. Remove them after the admin is created.

### Optional environment variables
- `ALLOWED_ORIGINS` — comma-separated allowed origins for cross-origin protection
- `RATELIMIT_STORAGE_URI` — Redis/Valkey URI for shared rate limit storage
- `HOST` — defaults to `0.0.0.0`
- `PORT` — defaults to `5000` locally, Render provides this automatically

### Render notes
- The app exposes `GET /api/health` for Render health checks
- Attach a persistent disk for uploads or move uploads to object storage
- Use PostgreSQL in production; SQLite is for local development only
- Flask serves the built React frontend and the API from the same origin, which keeps cookie auth simple

## License
This project is licensed under the MIT License.
