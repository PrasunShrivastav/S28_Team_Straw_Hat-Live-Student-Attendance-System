# 👤 Face Recognition Attendance Monitoring System

A modern, full-stack attendance management system powered by facial recognition technology. Upload group photos to automatically identify and mark student attendance with real-time detection of registered and unknown faces.

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![OpenCV](https://img.shields.io/badge/OpenCV-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

---

## 📑 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Demo](#demo)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Screenshots](#screenshots)
- [Troubleshooting](#troubleshooting)
- [Future Enhancements](#future-enhancements)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

---

## 🎯 Overview

The **Face Recognition Attendance Monitoring System** revolutionizes traditional attendance tracking by leveraging computer vision and machine learning. Simply upload a group photo, and the system automatically identifies registered students, marks their attendance, and flags unknown individuals.

### Key Highlights

- 🚀 **Automated Attendance**: No manual roll calls - just upload a photo
- 👥 **Multi-Face Detection**: Process multiple students simultaneously
- 🔍 **Unknown Face Detection**: Identify unauthorized individuals
- 📊 **Session Management**: Track attendance across multiple sessions
- 📥 **CSV Export**: Download attendance reports instantly
- 🎨 **Modern UI**: Clean, responsive interface built with React
- 🔐 **Secure**: Face encoding ensures student privacy

---

## ✨ Features

### Core Functionality

- ✅ **Student Registration**
  - Upload student photos with roll number and name
  - Automatic face encoding and storage
  - Duplicate roll number validation
  - Student management (view, delete)

- ✅ **Attendance Taking**
  - Upload group photos (classroom, event, etc.)
  - Automatic face detection and matching
  - Real-time processing with progress indicators
  - Identifies present, absent, and unknown individuals

- ✅ **Session Management**
  - Create unique attendance sessions
  - View attendance history
  - Filter by date and session
  - Session-based reporting

- ✅ **Export & Reporting**
  - CSV export for each session
  - Download attendance records
  - Summary statistics (present/absent/unknown counts)

### Technical Features

- 🔄 **RESTful API**: Clean backend architecture
- 🎨 **Responsive Design**: Mobile-friendly interface
- ⚡ **Fast Processing**: Optimized face recognition pipeline
- 💾 **Persistent Storage**: MongoDB for scalability
- 🔔 **Toast Notifications**: Real-time user feedback
- 📱 **Progressive Web App**: Modern web technologies

---

## 🎬 Demo

### Workflow

```
1. Register Students → Upload individual photos with details
2. Take Attendance → Upload group photo
3. View Results → See present/absent/unknown status
4. Export Data → Download CSV report
```

**Live Demo:** [Coming Soon]

---

## 🛠️ Tech Stack

### Backend

| Technology           | Purpose                   | Version |
| -------------------- | ------------------------- | ------- |
| **Python**           | Core language             | 3.10+   |
| **Flask**            | Web framework             | Latest  |
| **face_recognition** | Face detection & encoding | Latest  |
| **OpenCV (cv2)**     | Image processing          | Latest  |
| **pymongo**          | MongoDB driver            | Latest  |
| **Pillow (PIL)**     | Image manipulation        | Latest  |
| **flask-cors**       | CORS handling             | Latest  |
| **python-dotenv**    | Environment variables     | Latest  |

### Frontend

| Technology          | Purpose       | Version |
| ------------------- | ------------- | ------- |
| **React**           | UI framework  | 18.x    |
| **Vite**            | Build tool    | Latest  |
| **Tailwind CSS**    | Styling       | 3.x     |
| **React Router**    | Navigation    | 6.x     |
| **Axios**           | HTTP client   | Latest  |
| **React Hot Toast** | Notifications | Latest  |
| **Lucide React**    | Icons         | Latest  |

### Database

| Technology  | Purpose        |
| ----------- | -------------- |
| **MongoDB** | NoSQL database |

**Collections:**

- `students`: Stores student data and face encodings
- `attendance_records`: Stores attendance session data

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Register   │  │   Attendance │  │   History    │     │
│  │   Students   │  │    Taking    │  │   & Export   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ (HTTP/REST API)
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Flask)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Face Recognition Pipeline                           │  │
│  │  • face_recognition library                          │  │
│  │  • OpenCV for image processing                       │  │
│  │  • Face encoding & matching algorithms              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     MongoDB Database                         │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │    students      │         │ attendance_records│         │
│  │  • roll_number   │         │  • session_id     │         │
│  │  • name          │         │  • timestamp      │         │
│  │  • face_encoding │         │  • present_list   │         │
│  │  • photo_path    │         │  • absent_list    │         │
│  └──────────────────┘         │  • unknown_count  │         │
│                               └──────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Student Registration:**

   ```
   User uploads photo → Flask validates → face_recognition extracts encoding
   → MongoDB stores student data → Success response
   ```

2. **Attendance Taking:**
   ```
   User uploads group photo → Flask detects all faces → Compare with stored encodings
   → Match/identify students → Mark present/absent/unknown → Store session → Return results
   ```

---

## 📂 Project Structure

```
attendance-system/
│
├── backend/
│   ├── app.py                      # Main Flask application
│   ├── database.py                 # MongoDB connection & operations
│   ├── face_utils.py               # Face recognition utilities
│   ├── requirements.txt            # Python dependencies
│   ├── .env.example               # Environment variables template
│   ├── .env                       # Environment variables (create this)
│   ├── .gitignore                 # Git ignore file
│   │
│   └── static/
│       ├── uploads/               # Temporary group photo uploads
│       └── student_photos/        # Permanent student photo storage
│
└── frontend/
    ├── index.html                 # HTML entry point
    ├── vite.config.js            # Vite configuration
    ├── tailwind.config.js        # Tailwind CSS configuration
    ├── postcss.config.js         # PostCSS configuration
    ├── package.json              # Node dependencies
    ├── package-lock.json         # Locked dependencies
    ├── .gitignore               # Git ignore file
    │
    └── src/
        ├── main.jsx              # React entry point
        ├── App.jsx               # Main App component
        ├── index.css             # Global styles
        │
        ├── api/
        │   └── index.js          # Axios API client
        │
        ├── components/
        │   ├── Navbar.jsx        # Navigation component
        │   ├── StudentCard.jsx   # Student display card
        │   └── ...               # Other components
        │
        └── pages/
            ├── Home.jsx          # Landing page
            ├── Register.jsx      # Student registration
            ├── TakeAttendance.jsx # Attendance taking
            ├── History.jsx       # Attendance history
            └── ...               # Other pages
```

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

| Software         | Minimum Version | Purpose                             |
| ---------------- | --------------- | ----------------------------------- |
| **Python**       | 3.10+           | Backend runtime                     |
| **Node.js**      | 18+             | Frontend development                |
| **npm**          | 8+              | Package manager                     |
| **MongoDB**      | 4.4+            | Database                            |
| **CMake**        | 3.10+           | Build face_recognition dependencies |
| **C++ Compiler** | -               | Build dlib library                  |

### Operating System Specific

**Windows:**

- Visual Studio Build Tools (for C++ compilation)
- CMake (download from cmake.org)

**macOS:**

```bash
brew install cmake
xcode-select --install
```

**Linux (Ubuntu/Debian):**

```bash
sudo apt-get update
sudo apt-get install build-essential cmake
sudo apt-get install python3-dev
```

### MongoDB Setup

**Option 1: Local Installation**

- Download from [mongodb.com](https://www.mongodb.com/try/download/community)
- Start MongoDB service

**Option 2: MongoDB Atlas (Cloud)**

- Create free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
- Get connection URI

---

## 🚀 Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/CODERGURU26/face-recognition-attendance.git
cd face-recognition-attendance
```

### Step 2: Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

**Note:** Installing `face_recognition` may take 5-10 minutes as it builds `dlib` from source.

### Step 3: Frontend Setup

```bash
cd ../frontend

# Install Node dependencies
npm install
```

---

## ⚙️ Configuration

### Backend Configuration

1. **Create Environment File**

```bash
cd backend
cp .env.example .env
```

2. **Edit `.env` File**

```env
# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017
DB_NAME=attendance_system

# File Upload Paths
UPLOAD_FOLDER=static/uploads
STUDENT_PHOTO_FOLDER=static/student_photos

# Flask Configuration
FLASK_ENV=development
FLASK_DEBUG=True

# Optional: MongoDB Atlas
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
```

### Frontend Configuration

**Update API URL (if needed):**

Edit `frontend/src/api/index.js`:

```javascript
const API_BASE_URL = "http://localhost:5000/api";
```

---

## 🚀 Deployment

### Deploying Frontend to Vercel

1. Push your project to GitHub
2. Go to vercel.com → New Project → Import your repo
3. Set Root Directory to: `frontend`
4. Framework Preset: `Vite` (auto-detected)
5. Add Environment Variable:
   - Key: `VITE_API_URL`
   - Value: `https://rcn16f04-5000.inc1.devtunnels.ms`
6. Click Deploy
7. After deploy, copy your Vercel URL (e.g. `https://your-app.vercel.app`)
8. Update `backend/app.py` CORS origins to your Vercel URL
9. Restart the backend

### Running Backend (Port Forwarding)

- Backend runs locally: `python app.py`
- Port forwarded at: `https://rcn16f04-5000.inc1.devtunnels.ms`
- Make sure port forwarding is active before using the app
- MongoDB must be running locally or Atlas URI must be set in `.env`

### Local Development

- Backend: `cd backend && python app.py`
- Frontend: `cd frontend && npm run dev`
- Frontend dev calls backend at `http://localhost:5000` via `.env.development`

### Create Required Directories

```bash
# Backend directories
mkdir -p backend/static/uploads
mkdir -p backend/static/student_photos

# Verify structure
ls -la backend/static/
```

---

## 💻 Usage

### Starting the Application

**Terminal 1 - Backend:**

```bash
cd backend
source .venv/bin/activate  # Windows: .venv\Scripts\activate
python app.py
```

Expected output:

```
 * Running on http://127.0.0.1:5000
 * Debug mode: on
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

Expected output:

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**Access Application:**

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`

---

## 📖 User Guide

### 1. Register Students

**Step-by-step:**

1. Navigate to **Register Student** page
2. Fill in student details:
   - **Roll Number**: Unique identifier (e.g., CS001)
   - **Name**: Student's full name
   - **Photo**: Clear face photo (JPG/PNG)
3. Click **Register Student**
4. Success notification appears

**Photo Requirements:**

- Clear, well-lit face
- Face looking at camera
- No sunglasses or masks
- Single person per photo
- Minimum resolution: 640x480px

**Example:**

```
Roll Number: CS101
Name: John Doe
Photo: john_doe.jpg
```

### 2. Take Attendance

**Step-by-step:**

1. Navigate to **Take Attendance** page
2. Upload group photo (classroom, event, etc.)
3. System processes the image
4. View results:
   - **Present**: Matched students (green)
   - **Absent**: Registered but not found (red)
   - **Unknown**: Unregistered faces detected (yellow)
5. Review and confirm

**Photo Tips:**

- Good lighting
- Clear faces (front-facing)
- Minimum 800x600px resolution
- Multiple students visible

### 3. View Attendance History

1. Navigate to **History** page
2. Browse attendance sessions by date
3. View detailed session reports
4. Export CSV for specific sessions

### 4. Export Attendance

1. Go to session details
2. Click **Export CSV**
3. File downloads automatically

**CSV Format:**

```csv
Roll Number,Name,Status,Timestamp
CS101,John Doe,Present,2024-02-15 10:30:00
CS102,Jane Smith,Absent,2024-02-15 10:30:00
Unknown,Unknown Person,Unknown,2024-02-15 10:30:00
```

---

## 📡 API Documentation

### Base URL

```
http://localhost:5000/api
```

### Authentication

Currently no authentication required (add JWT in production).

### Endpoints

#### **Student Management**

##### Validate Student

Check if roll number already exists.

```http
POST /api/students/validate
Content-Type: application/json

{
  "roll_number": "CS101"
}
```

**Response:**

```json
{
  "exists": false,
  "message": "Roll number is available"
}
```

---

##### Register Student

Register a new student with face photo.

```http
POST /api/students/register
Content-Type: multipart/form-data

roll_number: CS101
name: John Doe
photo: <file>
```

**Response:**

```json
{
  "message": "Student registered successfully",
  "student": {
    "_id": "...",
    "roll_number": "CS101",
    "name": "John Doe",
    "photo_path": "static/student_photos/CS101.jpg"
  }
}
```

**Error Codes:**

- `400`: No photo uploaded / No face detected / Multiple faces
- `409`: Roll number already exists
- `500`: Server error

---

##### Get All Students

Retrieve list of all registered students.

```http
GET /api/students
```

**Response:**

```json
{
  "students": [
    {
      "_id": "...",
      "roll_number": "CS101",
      "name": "John Doe",
      "photo_path": "static/student_photos/CS101.jpg"
    }
  ],
  "count": 1
}
```

---

##### Delete Student

Delete a student by ID.

```http
DELETE /api/students/:id
```

**Response:**

```json
{
  "message": "Student deleted successfully"
}
```

---

#### **Attendance Management**

##### Take Attendance

Process group photo and mark attendance.

```http
POST /api/attendance/take
Content-Type: multipart/form-data

photo: <file>
```

**Response:**

```json
{
  "session_id": "ATT_20240215_103000",
  "timestamp": "2024-02-15T10:30:00",
  "present": [
    {
      "roll_number": "CS101",
      "name": "John Doe",
      "confidence": 0.95
    }
  ],
  "absent": [
    {
      "roll_number": "CS102",
      "name": "Jane Smith"
    }
  ],
  "unknown_faces": 2,
  "summary": {
    "total_registered": 50,
    "present_count": 48,
    "absent_count": 2,
    "unknown_count": 2
  }
}
```

---

##### Get All Sessions

Retrieve attendance session history.

```http
GET /api/attendance/sessions
```

**Response:**

```json
{
  "sessions": [
    {
      "_id": "...",
      "session_id": "ATT_20240215_103000",
      "timestamp": "2024-02-15T10:30:00",
      "summary": {
        "present_count": 48,
        "absent_count": 2,
        "unknown_count": 2
      }
    }
  ]
}
```

---

##### Get Session Details

Retrieve specific session data.

```http
GET /api/attendance/session/:session_id
```

**Response:**

```json
{
  "_id": "...",
  "session_id": "ATT_20240215_103000",
  "timestamp": "2024-02-15T10:30:00",
  "present": [...],
  "absent": [...],
  "unknown_faces": 2
}
```

---

##### Export Session CSV

Download attendance CSV.

```http
GET /api/attendance/export/:session_id
```

**Response:**

```csv
Roll Number,Name,Status,Timestamp
CS101,John Doe,Present,2024-02-15 10:30:00
CS102,Jane Smith,Absent,2024-02-15 10:30:00
```

**Headers:**

```
Content-Type: text/csv
Content-Disposition: attachment; filename=attendance_ATT_20240215_103000.csv
```

---

## 📸 Screenshots

### Student Registration

![Register Student](https://via.placeholder.com/800x400?text=Student+Registration+Page)

### Take Attendance

![Take Attendance](https://via.placeholder.com/800x400?text=Take+Attendance+Page)

### Attendance Results

![Results](https://via.placeholder.com/800x400?text=Attendance+Results)

### History & Export

![History](https://via.placeholder.com/800x400?text=Attendance+History)

---

## 🐛 Troubleshooting

### Common Issues

#### Issue 1: `dlib` Installation Fails

**Problem:** Error during `pip install face_recognition`

**Solution:**

**Windows:**

```bash
# Install Visual Studio Build Tools
# Download from: https://visualstudio.microsoft.com/downloads/
# Select "Desktop development with C++"

# Install CMake
# Download from: https://cmake.org/download/

# Retry installation
pip install dlib
pip install face_recognition
```

**macOS:**

```bash
brew install cmake
xcode-select --install
pip install face_recognition
```

**Linux:**

```bash
sudo apt-get install build-essential cmake
sudo apt-get install python3-dev
pip install face_recognition
```

---

#### Issue 2: MongoDB Connection Error

**Problem:** `pymongo.errors.ServerSelectionTimeoutError`

**Solution:**

1. **Check MongoDB is running:**

   ```bash
   # macOS/Linux
   sudo systemctl status mongod

   # Windows (PowerShell as Admin)
   net start MongoDB
   ```

2. **Verify connection URI in `.env`:**

   ```env
   MONGO_URI=mongodb://localhost:27017
   ```

3. **Test connection:**
   ```python
   from pymongo import MongoClient
   client = MongoClient('mongodb://localhost:27017')
   print(client.list_database_names())
   ```

---

#### Issue 3: CORS Error in Frontend

**Problem:** `Access-Control-Allow-Origin` error

**Solution:**

1. **Verify `flask-cors` is installed:**

   ```bash
   pip install flask-cors
   ```

2. **Check `app.py` has CORS enabled:**

   ```python
   from flask_cors import CORS
   app = Flask(__name__)
   CORS(app)
   ```

3. **Restart Flask server**

---

#### Issue 4: Face Not Detected

**Problem:** "No face detected in photo"

**Solution:**

- Ensure photo has clear, front-facing face
- Check lighting is adequate
- Remove sunglasses, masks
- Use higher resolution image (>640x480)
- Try different photo

---

#### Issue 5: Port Already in Use

**Problem:** `Address already in use: Port 5000`

**Solution:**

**Find and kill process:**

```bash
# macOS/Linux
lsof -ti:5000 | xargs kill -9

# Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process
```

**Or change port in `app.py`:**

```python
if __name__ == '__main__':
    app.run(debug=True, port=5001)  # Use different port
```

---

#### Issue 6: Student Photo Not Loading

**Problem:** Broken image in UI

**Solution:**

1. **Check file paths in database:**

   ```python
   # Should be relative path
   photo_path: "static/student_photos/CS101.jpg"
   ```

2. **Verify Flask serves static files:**

   ```python
   app = Flask(__name__, static_folder='static')
   ```

3. **Check file permissions:**
   ```bash
   chmod -R 755 backend/static/
   ```

---

## 🔮 Future Enhancements

### Planned Features

- [ ] **User Authentication**
  - Admin and teacher login
  - Role-based access control
  - JWT token authentication

- [ ] **Real-time Attendance**
  - Live camera feed integration
  - Real-time face detection
  - Instant attendance marking

- [ ] **Advanced Analytics**
  - Attendance trends and graphs
  - Student attendance percentage
  - Automated reports generation
  - Email notifications for low attendance

- [ ] **Mobile Application**
  - React Native mobile app
  - Push notifications
  - Mobile-optimized camera

- [ ] **Multi-Class Support**
  - Multiple courses/classes
  - Section management
  - Timetable integration

- [ ] **Face Recognition Improvements**
  - Mask detection support
  - Multi-angle face recognition
  - Improved accuracy with deep learning
  - Age and emotion detection

- [ ] **Export Options**
  - PDF reports
  - Excel export with charts
  - Google Sheets integration
  - Automated email reports

- [ ] **Cloud Deployment**
  - Docker containerization
  - AWS/Azure deployment
  - Cloud storage for photos
  - CDN for faster loading

- [ ] **Attendance Rules**
  - Late arrival tracking
  - Partial attendance
  - Leave management
  - Holiday calendar

- [ ] **Audit Trail**
  - System logs
  - Admin activity tracking
  - Photo modification history

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

### How to Contribute

1. **Fork the repository**

   ```bash
   git clone https://github.com/CODERGURU26/face-recognition-attendance.git
   ```

2. **Create a feature branch**

   ```bash
   git checkout -b feature/AmazingFeature
   ```

3. **Make your changes**
   - Follow existing code style
   - Add comments for complex logic
   - Update documentation

4. **Test your changes**

   ```bash
   # Backend tests
   pytest

   # Frontend tests
   npm test
   ```

5. **Commit your changes**

   ```bash
   git commit -m 'Add: Amazing new feature'
   ```

6. **Push to branch**

   ```bash
   git push origin feature/AmazingFeature
   ```

7. **Open a Pull Request**
   - Describe changes clearly
   - Link related issues
   - Add screenshots if UI changes

### Development Guidelines

**Code Style:**

- Python: Follow PEP 8
- JavaScript: Use ESLint configuration
- Comments: Write clear, concise comments

**Commit Messages:**

- Use conventional commits
- Examples: `Add:`, `Fix:`, `Update:`, `Remove:`

**Testing:**

- Add unit tests for new features
- Ensure existing tests pass
- Test on multiple browsers

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2024 Gururaj Krishna Sharma

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 👨‍💻 Author

**Gururaj Krishna Sharma**

- 📧 Email: [guruuu2468@gmail.com](mailto:guruuu2468@gmail.com)
- 💼 LinkedIn: [Gururaj Krishna Sharma](https://www.linkedin.com/in/gururaj-krishna-sharma)
- 💻 GitHub: [@CODERGURU26](https://github.com/CODERGURU26)
- 🌐 Portfolio: [Coming Soon]

---

## 🌟 Acknowledgments

### Technologies & Libraries

- **face_recognition** - [ageitgey/face_recognition](https://github.com/ageitgey/face_recognition)
- **dlib** - [davisking/dlib](https://github.com/davisking/dlib)
- **Flask** - [pallets/flask](https://github.com/pallets/flask)
- **React** - [facebook/react](https://github.com/facebook/react)
- **MongoDB** - [mongodb/mongo](https://github.com/mongodb/mongo)
- **Tailwind CSS** - [tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss)

### Inspiration

- Modern attendance systems
- Computer vision research
- Open-source community

### Special Thanks

- Face recognition research community
- Open-source contributors
- Beta testers and early adopters

---

## 📚 Additional Resources

### Documentation

- [face_recognition Documentation](https://face-recognition.readthedocs.io/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [React Documentation](https://react.dev/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Tutorials

- [Face Recognition Tutorial](https://www.pyimagesearch.com/2018/06/18/face-recognition-with-opencv-python-and-deep-learning/)
- [Flask REST API Tutorial](https://blog.miguelgrinberg.com/post/designing-a-restful-api-with-python-and-flask)
- [React + Vite Guide](https://vitejs.dev/guide/)

### Research Papers

- "FaceNet: A Unified Embedding for Face Recognition and Clustering"
- "Deep Face Recognition: A Survey"
- "Face Recognition: From Traditional to Deep Learning Methods"

---

## 🎯 Use Cases

### Educational Institutions

- **Schools & Colleges**: Automate daily attendance
- **Training Centers**: Track participant attendance
- **Online Classes**: Virtual attendance via screenshots

### Corporate

- **Offices**: Employee attendance tracking
- **Events**: Conference/seminar attendance
- **Access Control**: Secure entry systems

### Other Applications

- **Gyms**: Member check-in
- **Libraries**: Visitor tracking
- **Hospitals**: Staff attendance

---

## 🔒 Security Considerations

### Current Implementation

- Face encodings stored securely in MongoDB
- Photos stored locally (not in database)
- No authentication (development only)

### Production Recommendations

1. **Add Authentication**
   - JWT tokens for API
   - Bcrypt for password hashing
   - Role-based access control

2. **Secure File Storage**
   - Cloud storage (AWS S3, Azure Blob)
   - Encrypted file storage
   - Access control policies

3. **Data Privacy**
   - GDPR compliance
   - Face data encryption
   - User consent management
   - Data retention policies

4. **API Security**
   - Rate limiting
   - Input validation
   - SQL injection prevention
   - HTTPS only

5. **Monitoring**
   - Audit logs
   - Error tracking (Sentry)
   - Performance monitoring

---

## 📊 Performance

### System Requirements

**Minimum:**

- CPU: Dual-core 2.0 GHz
- RAM: 4 GB
- Storage: 5 GB free space
- Internet: 10 Mbps

**Recommended:**

- CPU: Quad-core 3.0 GHz
- RAM: 8 GB
- Storage: 20 GB SSD
- Internet: 50 Mbps

### Processing Times

| Operation               | Average Time |
| ----------------------- | ------------ |
| Student Registration    | 2-3 seconds  |
| Face Detection (single) | <1 second    |
| Face Detection (group)  | 3-5 seconds  |
| Attendance Processing   | 5-10 seconds |
| CSV Export              | <1 second    |

**Note:** Times vary based on:

- Image resolution
- Number of faces
- Hardware specifications
- Database size

---

## 🚦 Status

**Current Version:** 1.0.0

**Status:** ✅ Active Development

**Last Updated:** February 2024

---

## ❓ FAQ

**Q: Can I use this for production?**
A: Current version is suitable for development/testing. Add authentication and security features for production.

**Q: How accurate is face recognition?**
A: Accuracy is typically 95-99% with good quality photos and proper lighting.

**Q: What photo formats are supported?**
A: JPG, JPEG, PNG. Recommended: JPG with minimum 640x480 resolution.

**Q: Can it detect faces with masks?**
A: Current version works best with unmasked faces. Mask detection is a planned feature.

**Q: How many students can be registered?**
A: No hard limit. MongoDB can scale to millions of records. Performance depends on hardware.

**Q: Can I run this offline?**
A: Yes, if using local MongoDB. Internet needed only for MongoDB Atlas.

**Q: Is it free to use?**
A: Yes, completely open-source under MIT License.

---

**⭐ If you find this project helpful, please give it a star!**

**🔔 Watch this repository for updates!**

---

_Last Updated: April 2026_

**Built with ❤️ for educational institutions and organizations worldwide**
