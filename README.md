# Face Recognition Attendance Monitoring System

A full-stack attendance system using Flask, MongoDB, and React. Register student faces, upload a group photo, and automatically mark present/absent with unknown face detection.

## Tech Stack

- Backend: Python 3.10+, Flask, flask-cors, face_recognition, OpenCV, pymongo, Pillow, python-dotenv
- Frontend: React 18 + Vite, Tailwind CSS v3, React Router v6, Axios, React Hot Toast, Lucide React
- Database: MongoDB (`students`, `attendance_records`)

## Project Structure

```text
attendance-system/
├── backend/
│   ├── app.py
│   ├── database.py
│   ├── face_utils.py
│   ├── requirements.txt
│   ├── .env.example
│   └── static/
│       ├── uploads/
│       └── student_photos/
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api/index.js
        ├── components/
        └── pages/
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB running locally or MongoDB Atlas URI
- Build tools needed by `dlib/face_recognition` (CMake + compiler)

## Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env`:

```env
MONGO_URI=mongodb://localhost:27017
DB_NAME=attendance_system
UPLOAD_FOLDER=static/uploads
STUDENT_PHOTO_FOLDER=static/student_photos
```

Run backend:

```bash
python app.py
```

Backend URL: `http://localhost:5000`

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## Usage Flow

1. Register students first (`/register`)
2. Open **Take Attendance** and upload a group photo
3. View results with present / absent / unknown statuses
4. Export attendance CSV for any session

## API Routes

- `POST /api/students/validate`
- `POST /api/students/register`
- `GET /api/students`
- `DELETE /api/students/:id`
- `POST /api/attendance/take`
- `GET /api/attendance/sessions`
- `GET /api/attendance/session/:session_id`
- `GET /api/attendance/export/:session_id`
