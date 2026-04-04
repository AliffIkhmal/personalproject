# Vehicle Service Tracking System

A full-stack web application for managing and tracking vehicle maintenance and service records. Built with a **React SPA** frontend and **Flask JSON API** backend.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS v4, React Router v7, Socket.IO Client |
| Backend | Flask 3.1, Flask-SQLAlchemy, Flask-Migrate (Alembic), Flask-SocketIO, Flask-Limiter |
| Database | SQLite (dev) / PostgreSQL (production via `DATABASE_URL`) |
| Real-Time | WebSockets via Flask-SocketIO + Socket.IO Client |

## Features

- **Authentication** — Session-based login/logout, technician registration, password change
- **User Profiles** — Profile picture upload, display name, email, phone, account stats
- **Dashboard** — Service records table with sorting, filtering, pagination, and stat cards
- **Record Management** — Full CRUD for service records with status workflow (Queued → In Progress → Completed)
- **Image Gallery** — Multi-image upload per record with lightbox preview
- **Customer Management** — Dedicated customer profiles with linked service history
- **Advanced Search** — Text search with filters by status, service type, and date range
- **Real-Time Updates** — WebSocket-powered live dashboard refresh across all connected clients
- **Activity Log** — Full audit trail of all actions (create, update, delete, status changes, logins)
- **Dark Mode** — Theme toggle with localStorage persistence and WCAG AA contrast ratios
- **Security** — Rate limiting, CSRF protection, HTTP-only session cookies, input validation
- **Responsive UI** — Steel blue (#7DAACB) and warm beige (#E8DBB3) color scheme with floating label inputs, password visibility toggles, and caps lock detection

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
python app.py
```
The API runs on `http://localhost:5000`. A default technician account (`admin` / `admin123`) is created on first run.

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

## Default Login
| Username | Password |
|----------|----------|
| admin    | admin123 |

## License
This project is licensed under the MIT License.
