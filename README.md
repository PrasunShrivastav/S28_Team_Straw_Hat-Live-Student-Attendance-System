# 🎓 Face Recognition Attendance Monitoring System

An AI-powered attendance system that detects faces in a class group photo, matches them against a registered student database, and automatically marks attendance.

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.0-000000?logo=flask)
![OpenCV](https://img.shields.io/badge/OpenCV-4.9-5C3EE8?logo=opencv)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)

---

## ✨ Features

- **Student Registration** — Upload a student's name and photo; the system extracts and stores their face encoding
- **Automatic Attendance** — Upload a group photo and the system detects all faces, matches them to registered students, and marks present/absent
- **Annotated Output** — Bounding boxes drawn on the group photo: 🟩 Green = recognized, 🟥 Red = unknown
- **Attendance Report** — Summary stats + detailed table with export to CSV
- **Dark-themed UI** — Modern glassmorphism design with Bootstrap 5

---

## 🛠️ Prerequisites

- **Python 3.10+**
- **CMake** — Required to build `dlib` (the face recognition engine)
  - Windows: `choco install cmake` or download from [cmake.org](https://cmake.org/download/)
  - macOS: `brew install cmake`
  - Linux: `sudo apt install cmake`
- **Visual Studio Build Tools** (Windows only) — C++ compiler for dlib
  - Download: [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
  - Select "Desktop development with C++" workload

---

## 🚀 Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd "Attendance System"
   ```

2. **Create a virtual environment (recommended):**
   ```bash
   python -m venv venv

   # Windows
   venv\Scripts\activate

   # macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

   > ⚠️ **Note:** Installing `dlib` may take several minutes as it compiles from source. Ensure CMake and a C++ compiler are installed.

4. **Run the application:**
   ```bash
   python app.py
   ```

5. **Open your browser:**
   ```
   http://127.0.0.1:5000
   ```

---

## 📖 Usage Guide

### Step 1: Register Students
1. Click **"Register"** in the navbar
2. Enter the student's full name
3. Upload a clear, front-facing photo with **exactly one** face visible
4. Click **"Register Student"**
5. Repeat for all students in the class

### Step 2: Take Attendance
1. Go to **"Take Attendance"** (home page)
2. Upload a group/class photo
3. Click **"Detect Faces & Mark Attendance"**
4. Wait for the AI to process the image

### Step 3: View Results
- The results page shows:
  - **Annotated image** with bounding boxes around detected faces
  - **Attendance table** with Present/Absent status for each student
  - **Summary stats** — total, present, absent, unknown faces
- Click **"Export CSV"** to download the report
- Click **"Take New Attendance"** to start a new session

---

## 📁 Project Structure

```
attendance_system/
├── app.py              # Main Flask application
├── face_utils.py       # Face detection & recognition helpers
├── database.py         # SQLite DB setup and queries
├── requirements.txt    # Python dependencies
├── README.md           # This file
├── templates/
│   ├── base.html       # Base layout with navbar
│   ├── index.html      # Home / take attendance
│   ├── register.html   # Register new student
│   ├── students.html   # List all students
│   └── results.html    # Attendance results
├── static/
│   ├── uploads/        # Uploaded group photos
│   └── student_photos/ # Individual student photos
└── attendance.db       # SQLite database (auto-created)
```

---

## ⚙️ Configuration

| Setting | Default | Location |
|---------|---------|----------|
| Match tolerance | `0.5` | `face_utils.py` → `MATCH_TOLERANCE` |
| Max upload size | `16 MB` | `app.py` → `MAX_CONTENT_LENGTH` |
| Detection model | `hog` | `face_utils.py` (change to `cnn` for GPU) |
| Server port | `5000` | `app.py` → `app.run(port=...)` |

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| `dlib` won't install | Ensure CMake and C++ build tools are installed |
| No faces detected | Use a higher resolution, well-lit photo |
| Wrong matches | Lower `MATCH_TOLERANCE` to `0.4` for stricter matching |
| Slow processing | Use smaller images or switch to `hog` model |

---

## 📝 License

This project is for educational purposes.
