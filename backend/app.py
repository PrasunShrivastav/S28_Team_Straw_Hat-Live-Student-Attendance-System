import csv
import io
import os
import uuid
from datetime import datetime, timezone

import numpy as np
from bson import ObjectId
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

from database import (
    create_attendance_record,
    create_student,
    create_teacher,
    delete_student,
    get_session_by_session_id,
    get_sessions,
    get_student_by_id,
    get_student_by_email,
    get_student_attendance,
    get_students,
    get_teacher_by_email,
    update_student_photos,
    create_schedule,
    get_schedules,
    update_schedule,
    delete_schedule,
    create_session_definition,
    update_session_definition,
    get_session_definition_by_id,
    get_session_week,
    get_session_month,
    append_skip_date,
    end_session_definition,
    delete_session_definition,
    get_monthly_analytics,
    get_student_streak,
    get_weekly_leaderboard,
    get_absence_streak,
    update_session_student_status,
)
from face_utils import average_encodings, detect_faces_and_match, encode_face

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, os.getenv("UPLOAD_FOLDER", "static/uploads"))
STUDENT_PHOTO_FOLDER = os.path.join(BASE_DIR, os.getenv("STUDENT_PHOTOS_FOLDER", "static/student_photos"))

for folder in [UPLOAD_FOLDER, STUDENT_PHOTO_FOLDER]:
    os.makedirs(folder, exist_ok=True)

app = Flask(__name__, static_url_path="/static", static_folder="static")

CORS(app, 
     resources={r"/*": {"origins": "*"}},
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     supports_credentials=True)

@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        return response

def full_url(path):
    base = os.environ.get("BACKEND_URL", "https://rcn16f04-5000.inc1.devtunnels.ms")
    return f"{base}{path}"

def _absolute_photo_path(path):
    if not path:
        return path
    if path.startswith("http://") or path.startswith("https://"):
        return path
    if path.startswith("/static/"):
        return full_url(path)
    return full_url(f"/static/{path}")

def _collect_photos_from_request():
    photos = request.files.getlist("photos[]")
    if not photos:
        photos = request.files.getlist("photos")
    return [p for p in photos if p and p.filename]


def _process_registration_photos(photos, student_dir: str):
    os.makedirs(student_dir, exist_ok=True)
    encodings = []
    photo_paths = []

    for idx, photo in enumerate(photos):
        filename = secure_filename(f"{idx+1}_{uuid.uuid4().hex}_{photo.filename}")
        photo_abs_path = os.path.join(student_dir, filename)
        photo.save(photo_abs_path)

        try:
            encodings.append(encode_face(photo_abs_path))
        except Exception:
            if os.path.exists(photo_abs_path):
                os.remove(photo_abs_path)
            raise

        student_folder_name = os.path.basename(student_dir)
        photo_paths.append(f"student_photos/{student_folder_name}/{filename}")

    return encodings, photo_paths


DAY_NAME_TO_INDEX = {
    "monday": 0,
    "tuesday": 1,
    "wednesday": 2,
    "thursday": 3,
    "friday": 4,
    "saturday": 5,
    "sunday": 6,
}


def _validate_iso_date(date_value: str | None, field_name: str):
    if date_value in (None, ""):
        return None

    try:
        return datetime.fromisoformat(str(date_value).split("T", 1)[0]).date()
    except ValueError as exc:
        raise ValueError(f"{field_name} must be a valid ISO date") from exc


def _normalize_session_payload(data: dict) -> dict:
    required = ["subject", "type", "room", "time", "duration_minutes", "repeat", "start_date"]
    missing = [field for field in required if data.get(field) in (None, "")]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")

    repeat = data.get("repeat")
    if repeat not in {"one_time", "weekly", "daily"}:
        raise ValueError("repeat must be one of: one_time, weekly, daily")

    start_date = _validate_iso_date(data.get("start_date"), "start_date")
    end_date = _validate_iso_date(data.get("end_date"), "end_date")

    if end_date and start_date and end_date < start_date:
        raise ValueError("end_date cannot be before start_date")

    try:
        duration_minutes = int(data.get("duration_minutes", 60))
    except (TypeError, ValueError) as exc:
        raise ValueError("duration_minutes must be a number") from exc

    if duration_minutes <= 0:
        raise ValueError("duration_minutes must be greater than 0")

    day_of_week = data.get("day_of_week")
    if repeat == "weekly":
        if day_of_week in (None, ""):
            raise ValueError("day_of_week is required for weekly sessions")
        try:
            day_of_week = int(day_of_week)
        except (TypeError, ValueError) as exc:
            raise ValueError("day_of_week must be an integer between 0 and 6") from exc
        if day_of_week < 0 or day_of_week > 6:
            raise ValueError("day_of_week must be an integer between 0 and 6")
    else:
        day_of_week = None

    return {
        "subject": data.get("subject", "").strip(),
        "type": data.get("type", "").strip(),
        "room": data.get("room", "").strip(),
        "time": data.get("time", "").strip(),
        "duration_minutes": duration_minutes,
        "repeat": repeat,
        "start_date": start_date.isoformat() if start_date else None,
        "end_date": end_date.isoformat() if end_date else None,
        "day_of_week": day_of_week,
        "skip_dates": list(data.get("skip_dates", [])),
    }


def _normalize_legacy_schedule_payload(data: dict) -> dict:
    day_name = str(data.get("day_of_week", "")).strip().lower()
    if day_name not in DAY_NAME_TO_INDEX:
        raise ValueError("day_of_week must be a valid weekday")

    return _normalize_session_payload({
        "subject": data.get("subject"),
        "type": data.get("type"),
        "room": data.get("room"),
        "time": data.get("time"),
        "duration_minutes": data.get("duration_minutes", 60),
        "repeat": data.get("repeat", "weekly"),
        "start_date": data.get("start_date") or datetime.now(timezone.utc).date().isoformat(),
        "end_date": data.get("end_date"),
        "day_of_week": DAY_NAME_TO_INDEX[day_name],
        "skip_dates": data.get("skip_dates", []),
    })


def _validate_month_value(month_value: str):
    try:
        return datetime.strptime(month_value, "%Y-%m")
    except ValueError as exc:
        raise ValueError("month must be in YYYY-MM format") from exc


def _shift_month_value(month_value: str, delta: int) -> str:
    parsed = _validate_month_value(month_value)
    year = parsed.year
    month = parsed.month + delta

    while month < 1:
        month += 12
        year -= 1
    while month > 12:
        month -= 12
        year += 1

    return f"{year}-{month:02d}"


@app.route("/api/students/validate", methods=["POST"])
def validate_student_photo():
    photo = request.files.get("photo")
    if not photo:
        return jsonify({"success": False, "message": "Photo is required"}), 400

    filename = secure_filename(f"validate_{uuid.uuid4().hex}_{photo.filename}")
    temp_path = os.path.join(STUDENT_PHOTO_FOLDER, filename)
    photo.save(temp_path)

    try:
        encode_face(temp_path)
        return jsonify({"success": True, "message": "Exactly one face detected"})
    except ValueError as exc:
        return jsonify({"success": False, "message": str(exc)}), 400
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.route("/api/students/register", methods=["POST"])
def register_student():
    name = request.form.get("name", "").strip()
    email = request.form.get("email", "").strip()
    roll_number = request.form.get("roll_number", "").strip()
    photos = _collect_photos_from_request()

    if not name or not roll_number or not email:
        return jsonify({"success": False, "message": "name, email, and roll_number are required"}), 400
    if not email.endswith("@slrtce.in"):
        return jsonify({"success": False, "message": "Email must end with @slrtce.in"}), 400
    if len(photos) == 0:
        return jsonify({"success": False, "message": "At least one photo is required"}), 400
    if len(photos) > 5:
        return jsonify({"success": False, "message": "Maximum 5 photos are allowed"}), 400

    student_oid = ObjectId()
    student_id = str(student_oid)
    student_dir = os.path.join(STUDENT_PHOTO_FOLDER, student_id)

    try:
        encodings, photo_paths = _process_registration_photos(photos, student_dir)
        averaged = average_encodings(encodings).tolist()

        create_student(
            name=name,
            email=email,
            roll_number=roll_number,
            photo_path=photo_paths[0],
            face_encoding=averaged,
            registration_photos=photo_paths,
            photo_count=len(photo_paths),
            student_id=student_oid,
        )

        return jsonify(
            {
                "success": True,
                "student_id": student_id,
                "photo_count": len(photo_paths),
                "message": f"Student registered with {len(photo_paths)} photos",
            }
        ), 201
    except ValueError as exc:
        return jsonify({"success": False, "message": str(exc)}), 400
    except Exception as exc:
        return jsonify({"success": False, "message": f"Registration failed: {str(exc)}"}), 500


@app.route("/api/teachers/register", methods=["POST"])
def register_teacher():
    data = request.json or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({"success": False, "message": "Name, email, and password are required"}), 400
    
    if not email.endswith("@slrtce.in"):
        return jsonify({"success": False, "message": "Teacher email must end with @slrtce.in"}), 400

    pwd_hash = generate_password_hash(password)
    
    try:
        teacher_id = create_teacher(name, email, pwd_hash)
        return jsonify({
            "success": True, 
            "teacher_id": teacher_id, 
            "message": "Teacher registered successfully"
        }), 201
    except ValueError as exc:
        return jsonify({"success": False, "message": str(exc)}), 400
    except Exception as exc:
        return jsonify({"success": False, "message": f"Registration failed: {str(exc)}"}), 500


@app.route("/api/teachers/login", methods=["POST"])
def login_teacher():
    data = request.json or {}
    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"success": False, "message": "Email and password are required"}), 400

    teacher = get_teacher_by_email(email)
    if not teacher:
        return jsonify({"success": False, "message": "Invalid email or password"}), 401

    if not check_password_hash(teacher.get("password_hash"), password):
        return jsonify({"success": False, "message": "Invalid email or password"}), 401

    return jsonify({
        "success": True,
        "message": "Login successful",
        "teacher": {
            "id": str(teacher.get("_id", "")),
            "name": teacher.get("name", ""),
            "email": teacher.get("email", "")
        }
    }), 200


@app.route("/api/students/<student_id>/add-photos", methods=["POST"])
def add_student_photos(student_id):
    try:
        student = get_student_by_id(student_id)
    except Exception:
        return jsonify({"success": False, "message": "Invalid student id"}), 400

    if not student:
        return jsonify({"success": False, "message": "Student not found"}), 404

    photos = _collect_photos_from_request()
    if len(photos) == 0:
        return jsonify({"success": False, "message": "At least one photo is required"}), 400

    existing_paths = student.get("registration_photos", [student.get("photo_path")])
    existing_count = int(student.get("photo_count", len(existing_paths)))

    if existing_count + len(photos) > 5:
        return jsonify({"success": False, "message": f"Cannot exceed 5 photos. Current: {existing_count}"}), 400

    student_dir = os.path.join(STUDENT_PHOTO_FOLDER, student_id)

    try:
        new_encodings, new_photo_paths = _process_registration_photos(photos, student_dir)

        existing_avg = np.array(student["face_encoding"], dtype=np.float64)
        weighted_sum = existing_avg * existing_count
        for enc in new_encodings:
            weighted_sum += enc
        new_count = existing_count + len(new_encodings)
        new_avg = (weighted_sum / new_count).tolist()

        updated_paths = existing_paths + new_photo_paths

        update_student_photos(
            student_id=student_id,
            averaged_encoding=new_avg,
            registration_photos=updated_paths,
            photo_count=new_count,
        )

        return jsonify(
            {
                "success": True,
                "student_id": student_id,
                "photo_count": new_count,
                "message": f"Updated student with {new_count} photos",
            }
        )
    except ValueError as exc:
        return jsonify({"success": False, "message": str(exc)}), 400
    except Exception as exc:
        return jsonify({"success": False, "message": f"Failed to add photos: {str(exc)}"}), 500


@app.route("/api/students", methods=["GET"])
def list_students():
    students = get_students(include_encodings=False)
    for student in students:
        student["photo_path"] = _absolute_photo_path(student.get("photo_path", ""))
        student["registration_photos"] = [
            _absolute_photo_path(path)
            for path in student.get("registration_photos", [])
        ]
    return jsonify(students)


@app.route("/api/students/<student_id>", methods=["DELETE"])
def remove_student(student_id):
    try:
        deleted = delete_student(student_id)
    except Exception:
        return jsonify({"success": False, "message": "Invalid student id"}), 400

    if not deleted:
        return jsonify({"success": False, "message": "Student not found"}), 404
    return jsonify({"success": True, "message": "Student deleted"})


@app.route("/api/attendance/take", methods=["POST"])
def take_attendance():
    group_photo = request.files.get("group_photo")
    if not group_photo:
        return jsonify({"success": False, "message": "group_photo is required"}), 400

    group_name = secure_filename(f"group_{uuid.uuid4().hex}_{group_photo.filename}")
    group_abs_path = os.path.join(UPLOAD_FOLDER, group_name)
    group_photo.save(group_abs_path)

    known_students = get_students(include_encodings=True)
    recognition_results, annotated_path = detect_faces_and_match(group_abs_path, known_students, UPLOAD_FOLDER)

    present_ids = {str(r["student_id"]) for r in recognition_results if r["student_id"] is not None}

    present_students = [
        {"student_id": sid, "name": s["name"], "roll_number": s["roll_number"]}
        for s in known_students
        if (sid := str(s["_id"])) in present_ids
    ]
    absent_students = [
        {"student_id": str(s["_id"]), "name": s["name"], "roll_number": s["roll_number"]}
        for s in known_students
        if str(s["_id"]) not in present_ids
    ]

    schedule_id = request.form.get("session_id") or request.form.get("schedule_id")
    session_date = request.form.get("session_date")
    if session_date:
        try:
            session_date = _validate_iso_date(session_date, "session_date").isoformat()
        except ValueError as exc:
            return jsonify({"success": False, "message": str(exc)}), 400

    session_definition = None
    if schedule_id:
        session_definition = get_session_definition_by_id(schedule_id)

    session_id = uuid.uuid4().hex
    record = {
        "session_id": session_id,
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "timestamp": datetime.now(timezone.utc),
        "annotated_image_path": f"uploads/{os.path.basename(annotated_path)}",
        "results": recognition_results,
        "absent_students": absent_students,
    }
    if schedule_id:
        record["schedule_id"] = schedule_id
    if session_date:
        record["session_date"] = session_date
    if session_definition:
        record["subject"] = session_definition.get("subject")
        record["type"] = session_definition.get("type")
        record["room"] = session_definition.get("room")
        record["time"] = session_definition.get("time")
        
    create_attendance_record(record)

    return jsonify(
        {
            "session_id": session_id,
            "present": present_students,
            "absent": absent_students,
            "unknown_count": sum(1 for r in recognition_results if r["status"] == "unknown"),
            "results": [
                {
                    "student_id": result.get("student_id"),
                    "name": result.get("name"),
                    "status": result.get("status"),
                    "confidence": result.get("confidence"),
                    "bbox": result.get("bbox", []),
                }
                for result in recognition_results
            ],
            "annotated_image_url": full_url(f"/static/{record['annotated_image_path']}"),
        }
    )


@app.route("/api/attendance/sessions", methods=["GET"])
def attendance_sessions():
    sessions = get_sessions()
    summaries = []

    for s in sessions:
        present_count = sum(
            1 for r in s.get("results", [])
            if r.get("status") == "present"
        )

        unknown_count = sum(
            1 for r in s.get("results", [])
            if r.get("status") == "unknown"
        )

        timestamp = s.get("timestamp")

        # ✅ Handle BOTH string and datetime
        if isinstance(timestamp, str):
            date_value = timestamp[:10]  # "YYYY-MM-DD"
        elif timestamp:
            date_value = timestamp.strftime("%Y-%m-%d")
        else:
            date_value = None

        summaries.append({
            "session_id": s.get("session_id", str(s.get("_id"))),
            "date": s.get("date") or date_value,
            "timestamp": timestamp,
            "present_count": present_count,
            "unknown_count": unknown_count,
            "absent_count": len(s.get("absent_students", [])),
            "schedule_id": s.get("schedule_id"),
        })

    return jsonify(summaries)

@app.route("/api/attendance/session/<session_id>", methods=["GET"])
def attendance_session(session_id):
    session = get_session_by_session_id(session_id)
    if not session:
        return jsonify({"success": False, "message": "Session not found"}), 404

    for result in session.get("results", []):
        if isinstance(result.get("student_id"), ObjectId):
            result["student_id"] = str(result["student_id"])

    return jsonify(
        {
            "session_id": session["session_id"],
            "date": session["date"],
            "timestamp": session["timestamp"],
            "schedule_id": session.get("schedule_id"),
            "annotated_image_url": full_url(f"/static/{session['annotated_image_path']}"),
            "results": session.get("results", []),
            "absent_students": session.get("absent_students", []),
        }
    )

@app.route("/api/attendance/session/<session_id>/update-student", methods=["POST"])
def update_student_status(session_id):
    data = request.json or {}
    student_id = data.get("student_id")
    status = data.get("status")
    if not student_id or not status:
        return jsonify({"success": False, "message": "student_id and status are required"}), 400

    student_info = {
        "name": data.get("name", ""),
        "roll_number": data.get("roll_number", "")
    }

    try:
        updated = update_session_student_status(session_id, student_id, status, student_info)
        if updated:
            return jsonify({"success": True}), 200
        else:
            return jsonify({"success": False, "message": "Session not found or update failed"}), 404
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/attendance/export/<session_id>", methods=["GET"])
def export_attendance_csv(session_id):
    session = get_session_by_session_id(session_id)
    if not session:
        return jsonify({"success": False, "message": "Session not found"}), 404

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Roll Number", "Status", "BBox"])

    present_lookup = {}
    for result in session.get("results", []):
        if result.get("status") == "present":
            present_lookup[result["name"]] = result

    for result in session.get("results", []):
        if result["status"] == "unknown":
            writer.writerow(["Unknown", "-", "unknown", result["bbox"]])

    for student in session.get("absent_students", []):
        writer.writerow([student["name"], student["roll_number"], "absent", "-"])

    for result in session.get("results", []):
        if result["status"] == "present":
            writer.writerow([result["name"], "-", "present", result["bbox"]])

    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode("utf-8")),
        mimetype="text/csv",
        as_attachment=True,
        download_name=f"attendance_{session_id}.csv",
    )


@app.route("/api/students/login", methods=["POST"])
def student_login():
    data = request.json or {}
    email = data.get("email", "").strip()

    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400

    student = get_student_by_email(email)
    if not student:
        return jsonify({"success": False, "message": "No student found with this email"}), 404

    return jsonify({
        "success": True,
        "student": {
            "id": student["id"],
            "name": student["name"],
            "email": student.get("email"),
            "roll_number": student["roll_number"],
            "photo_path": _absolute_photo_path(student.get("photo_path", "")),
            "registration_photos": [
                _absolute_photo_path(path)
                for path in student.get("registration_photos", [])
            ],
            "photo_count": int(student.get("photo_count", 1)),
            "registered_at": student.get("registered_at"),
        }
    })


@app.route("/api/students/<student_id>/attendance", methods=["GET"])
def student_attendance(student_id):
    try:
        student = get_student_by_id(student_id)
    except Exception:
        return jsonify({"success": False, "message": "Invalid student id"}), 400

    if not student:
        return jsonify({"success": False, "message": "Student not found"}), 404

    records = get_student_attendance(student_id)
    total = len(records)
    present = sum(1 for r in records if r["status"] == "present")
    absent = total - present
    percentage = round((present / total) * 100, 1) if total > 0 else 0

    return jsonify({
        "student_id": student_id,
        "total_sessions": total,
        "present_count": present,
        "absent_count": absent,
        "attendance_percentage": percentage,
        "records": records,
    })


@app.route("/api/students/attendance-stats", methods=["GET"])
def all_student_attendance_stats():
    sessions = get_sessions()
    if not sessions:
        return jsonify([])

    students = get_students(include_encodings=False)
    if not students:
        return jsonify([])

    total_sessions = len(sessions)
    stats = []

    for s in students:
        sid = str(s.get("id") or s.get("_id", ""))
        present = 0

        for session in sessions:
            present_ids = {
                str(result.get("student_id", ""))
                for result in session.get("results", [])
                if result.get("status") == "present"
            }
            if sid in present_ids:
                present += 1

        percentage = round((present / total_sessions) * 100, 1) if total_sessions > 0 else 0

        stats.append({
            "student_id": sid,
            "name": s["name"],
            "roll_number": s["roll_number"],
            "present_count": present,
            "total_sessions": total_sessions,
            "percentage": percentage
        })

    return jsonify(stats)


@app.route("/api/schedules", methods=["GET"])
def list_schedules():
    return jsonify(get_schedules()), 200


@app.route("/api/sessions/create", methods=["POST"])
def create_session():
    data = request.json or {}
    try:
        session_id = create_session_definition(_normalize_session_payload(data))
        return jsonify({"success": True, "session_id": session_id}), 201
    except ValueError as exc:
        return jsonify({"success": False, "message": str(exc)}), 400
    except Exception as exc:
        return jsonify({"success": False, "message": str(exc)}), 500


@app.route("/api/sessions/<session_id>/skip", methods=["POST"])
def skip_session(session_id):
    data = request.json or {}
    try:
        skip_date = _validate_iso_date(data.get("skip_date"), "skip_date")
        if skip_date is None:
            return jsonify({"success": False, "message": "skip_date is required"}), 400

        updated = append_skip_date(session_id, skip_date.isoformat())
        if not updated:
            return jsonify({"success": False, "message": "Session not found"}), 404

        return jsonify({"success": True}), 200
    except ValueError as exc:
        return jsonify({"success": False, "message": str(exc)}), 400
    except Exception as exc:
        return jsonify({"success": False, "message": str(exc)}), 500


@app.route("/api/sessions/<session_id>", methods=["PUT"])
def edit_session_definition(session_id):
    data = request.json or {}
    try:
        updated = update_session_definition(session_id, _normalize_session_payload(data))
        if not updated:
            return jsonify({"success": False, "message": "Session not found or unchanged"}), 404
        return jsonify({"success": True}), 200
    except ValueError as exc:
        return jsonify({"success": False, "message": str(exc)}), 400
    except Exception as exc:
        return jsonify({"success": False, "message": str(exc)}), 500


@app.route("/api/sessions/<session_id>/end", methods=["POST"])
def end_session(session_id):
    data = request.json or {}
    try:
        end_date = _validate_iso_date(data.get("end_date"), "end_date")
        if end_date is None:
            return jsonify({"success": False, "message": "end_date is required"}), 400

        updated = end_session_definition(session_id, end_date.isoformat())
        if not updated:
            return jsonify({"success": False, "message": "Session not found"}), 404

        return jsonify({"success": True}), 200
    except ValueError as exc:
        return jsonify({"success": False, "message": str(exc)}), 400
    except Exception as exc:
        return jsonify({"success": False, "message": str(exc)}), 500


@app.route("/api/sessions/<session_id>", methods=["DELETE"])
def remove_session(session_id):
    try:
        deleted = delete_session_definition(session_id)
        if not deleted:
            return jsonify({"success": False, "message": "Session not found"}), 404
        return jsonify({"success": True}), 200
    except Exception as exc:
        return jsonify({"success": False, "message": str(exc)}), 500


@app.route("/api/sessions/week", methods=["GET"])
def list_sessions_for_week():
    date_value = request.args.get("date") or datetime.now(timezone.utc).date().isoformat()
    try:
        _validate_iso_date(date_value, "date")
        return jsonify(get_session_week(date_value)), 200
    except ValueError as exc:
        return jsonify({"success": False, "message": str(exc)}), 400
    except Exception as exc:
        return jsonify({"success": False, "message": str(exc)}), 500


@app.route("/api/sessions/month", methods=["GET"])
def list_sessions_for_month():
    month_value = request.args.get("month")
    if not month_value:
        return jsonify({"success": False, "message": "month is required"}), 400

    try:
        _validate_month_value(month_value)
        sessions_in_month = get_session_month(month_value)
        
        attendance_records = [
            record for record in get_sessions()
            if str(record.get("session_date") or record.get("date", "")).startswith(month_value)
        ]

        for occurrence in sessions_in_month:
            occurrence_date = occurrence.get("date")
            occurrence_subject = occurrence.get("subject")
            occurrence_session_id = str(occurrence.get("session_id", ""))

            matching_record = next(
                (
                    record for record in attendance_records
                    if (record.get("session_date") or record.get("date")) == occurrence_date
                    and (
                        str(record.get("schedule_id", "")) == occurrence_session_id
                        or record.get("subject") == occurrence_subject
                    )
                ),
                None,
            )

            if matching_record:
                occurrence["attendance_taken"] = True
                occurrence["attendance_session_id"] = str(matching_record.get("session_id"))
            else:
                occurrence["attendance_taken"] = False
                occurrence["attendance_session_id"] = None

        return jsonify(sessions_in_month), 200
    except ValueError as exc:
        return jsonify({"success": False, "message": str(exc)}), 400
    except Exception as exc:
        return jsonify({"success": False, "message": str(exc)}), 500


@app.route("/api/attendance/student/<student_id>/month", methods=["GET"])
def student_month_attendance(student_id):
    month_value = request.args.get("month")
    if not month_value:
        return jsonify({"success": False, "message": "month is required"}), 400

    try:
        _validate_month_value(month_value)
        scheduled_sessions = get_session_month(month_value)
        attendance_records = [
            record for record in get_sessions()
            if str(record.get("date", "")).startswith(month_value)
        ]

        results = []
        for occurrence in scheduled_sessions:
            occurrence_date = occurrence.get("date")
            occurrence_subject = occurrence.get("subject")
            occurrence_session_id = str(occurrence.get("session_id", ""))

            matching_record = next(
                (
                    record for record in attendance_records
                    if (record.get("session_date") or record.get("date")) == occurrence_date
                    and (
                        str(record.get("schedule_id", "")) == occurrence_session_id
                        or record.get("subject") == occurrence_subject
                    )
                ),
                None,
            )

            status = "not_marked"
            if matching_record:
                present_ids = {
                    str(result.get("student_id", ""))
                    for result in matching_record.get("results", [])
                    if result.get("status") == "present"
                }
                absent_ids = {
                    str(student.get("student_id", ""))
                    for student in matching_record.get("absent_students", [])
                }

                if student_id in present_ids:
                    status = "present"
                elif student_id in absent_ids:
                    status = "absent"

            results.append({
                "session_id": occurrence_session_id,
                "subject": occurrence_subject,
                "date": occurrence_date,
                "status": status,
            })

        return jsonify(results), 200
    except ValueError as exc:
        return jsonify({"success": False, "message": str(exc)}), 400
    except Exception as exc:
        return jsonify({"success": False, "message": str(exc)}), 500


@app.route("/api/sessions/upcoming", methods=["GET"])
def upcoming_sessions():
    limit_raw = request.args.get("limit", "5")

    try:
        limit = max(1, int(limit_raw))
    except ValueError:
        return jsonify({"success": False, "message": "limit must be a number"}), 400

    try:
        today = datetime.now(timezone.utc).date().isoformat()
        month_value = today[:7]
        collected = []
        seen = set()

        for _ in range(12):
            for occurrence in get_session_month(month_value):
                if occurrence.get("date") < today:
                    continue

                key = (
                    occurrence.get("session_id"),
                    occurrence.get("date"),
                    occurrence.get("time"),
                )
                if key in seen:
                    continue
                seen.add(key)

                collected.append({
                    "session_id": occurrence.get("session_id"),
                    "subject": occurrence.get("subject"),
                    "type": occurrence.get("type"),
                    "room": occurrence.get("room"),
                    "time": occurrence.get("time"),
                    "duration_minutes": occurrence.get("duration_minutes", 60),
                    "date": occurrence.get("date"),
                    "day_of_week": occurrence.get("day_of_week"),
                })

                if len(collected) >= limit:
                    return jsonify(collected[:limit]), 200

            month_value = _shift_month_value(month_value, 1)

        return jsonify(collected[:limit]), 200
    except ValueError as exc:
        return jsonify({"success": False, "message": str(exc)}), 400
    except Exception as exc:
        return jsonify({"success": False, "message": str(exc)}), 500


@app.route("/api/analytics/monthly", methods=["GET"])
def monthly_analytics():
    month_value = request.args.get("month")
    if not month_value:
        month_value = datetime.now(timezone.utc).strftime("%Y-%m")

    try:
        _validate_month_value(month_value)
        return jsonify(get_monthly_analytics(month_value)), 200
    except ValueError as exc:
        return jsonify({"success": False, "message": str(exc)}), 400
    except Exception as exc:
        return jsonify({"success": False, "message": str(exc)}), 500


@app.route("/api/schedules", methods=["POST"])
def add_schedule():
    data = request.json or {}
    try:
        sid = create_schedule(_normalize_legacy_schedule_payload(data))
        return jsonify({"success": True, "schedule_id": sid}), 201
    except ValueError as exc:
        return jsonify({"success": False, "message": str(exc)}), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/schedules/<schedule_id>", methods=["PUT"])
def edit_schedule(schedule_id):
    data = request.json or {}
    try:
        updated = update_schedule(schedule_id, _normalize_legacy_schedule_payload(data))
        if updated:
            return jsonify({"success": True}), 200
        else:
            return jsonify({"success": False, "message": "Schedule not found or unchanged"}), 404
    except ValueError as exc:
        return jsonify({"success": False, "message": str(exc)}), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/schedules/<schedule_id>", methods=["DELETE"])
def remove_schedule(schedule_id):
    try:
        deleted = delete_schedule(schedule_id)
        if deleted:
            return jsonify({"success": True}), 200
        return jsonify({"success": False, "message": "Schedule not found"}), 404
    except Exception as exc:
        return jsonify({"success": False, "message": str(exc)}), 500


@app.route("/api/gamification/leaderboard", methods=["GET"])
def leaderboard():
    return jsonify(get_weekly_leaderboard()), 200


@app.route("/api/students/<student_id>/gamification", methods=["GET"])
def student_gamification(student_id):
    try:
        student = get_student_by_id(student_id)
        if not student:
            return jsonify({"success": False, "message": "Student not found"}), 404
        
        streak = get_student_streak(student_id)
        
        # Get overall percentage for badges
        records = get_student_attendance(student_id)
        total = len(records)
        present = sum(1 for r in records if r["status"] == "present")
        percentage = round((present / total) * 100, 1) if total > 0 else 0
        
        badge = "None"
        next_threshold = 50
        if percentage >= 90:
            badge = "Gold"
            next_threshold = 100
        elif percentage >= 75:
            badge = "Silver"
            next_threshold = 90
        elif percentage >= 50:
            badge = "Bronze"
            next_threshold = 75
            
        # Get absence streak for warnings
        absence_res = get_absence_streak(student_id)
        absence_streak = absence_res["streak"]
            
        return jsonify({
            "streak": streak,
            "absence_streak": absence_streak,
            "badge": badge,
            "percentage": percentage,
            "next_threshold": next_threshold
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/api/alerts/escalation", methods=["GET"])
def escalation_alerts():
    try:
        students = get_students()
        alerts = []
        for s in students:
            sid = s.get("id") or str(s.get("_id"))
            res = get_absence_streak(sid)
            streak = res["streak"]
            if streak >= 1:
                level = "Email"
                color = "yellow"
                action = "Day 1 Intervention (Email)"
                
                if streak >= 5:
                    level = "Call Required"
                    color = "red"
                    action = "Day 5 Critical (Phone Call)"
                elif streak >= 3:
                    level = "SMS"
                    color = "orange"
                    action = "Day 3 Escalation (SMS)"
                
                alerts.append({
                    "student_id": sid,
                    "name": s["name"],
                    "roll_number": s["roll_number"],
                    "streak": streak,
                    "level": level,
                    "color": color,
                    "action": action,
                    "history": res["dates"]
                })
        
        # Sort by streak desc
        alerts.sort(key=lambda x: x["streak"], reverse=True)
        return jsonify(alerts), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
