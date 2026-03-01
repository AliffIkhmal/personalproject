# Personal Project

## Overview
This is a Python-based web application designed to manage and track vehicle maintenance and repair records. The project features user authentication, a dashboard, search functionality, and a clean interface for both customers and technicians.

## Features
- User registration and login
- Dashboard for managing records
- Search and filter vehicle records
- Password change functionality
- File uploads (e.g., images)
- Responsive UI with HTML, CSS, and JavaScript

## Project Structure
```
app.py                # Main application file
requirements.txt      # Python dependencies
routes/               # Application routes
static/               # Static files (JS, CSS, images)
templates/            # HTML templates
notes/                # Project notes and documentation
instance/             # Instance-specific files (e.g., database)
```

## Setup Instructions
1. Clone the repository:
   ```sh
   git clone https://github.com/AliffIkhmal/personalproject.git
   cd personalproject
   ```
2. Create and activate a virtual environment (optional but recommended):
   ```sh
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```sh
   pip install -r requirements.txt
   ```
4. Run the application:
   ```sh
   python app.py
   ```

## Usage
- Access the app in your browser at `http://localhost:5000` (or the port specified in your app).
- Register a new user or log in with existing credentials.
- Use the dashboard to manage and search vehicle records.

## Contributing
Contributions are welcome! Please fork the repository and submit a pull request.

## License
This project is licensed under the MIT License.
