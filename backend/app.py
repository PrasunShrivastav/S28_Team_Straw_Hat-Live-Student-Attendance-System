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
    get_students,
    update_student_photos,
)
from face_utils import average_encodings, detect_faces_and_match, encode_face

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, os.getenv("UPLOAD_FOLDER", "static/uploads"))
STUDENT_PHOTO_FOLDER = os.path.join(BASE_DIR, os.getenv("STUDENT_PHOTO_FOLDER", "static/student_photos"))

for folder in [UPLOAD_FOLDER, STUDENT_PHOTO_FOLDER]:
    os.makedirs(folder, exist_ok=True)

app = Flask(__name__, static_url_path="/static", static_folder="static")
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"]}})

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
    return jsonify(get_students(include_encodings=False))


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

    session_id = uuid.uuid4().hex
    record = {
        "session_id": session_id,
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "timestamp": datetime.now(timezone.utc),
        "annotated_image_path": f"uploads/{os.path.basename(annotated_path)}",
        "results": recognition_results,
        "absent_students": absent_students,
    }
    create_attendance_record(record)

    return jsonify(
        {
            "session_id": session_id,
            "present": present_students,
            "absent": absent_students,
            "unknown_count": sum(1 for r in recognition_results if r["status"] == "unknown"),
            "annotated_image_url": f"/static/{record['annotated_image_path']}",
        }
    )


@app.route("/api/attendance/sessions", methods=["GET"])
def attendance_sessions():
    sessions = get_sessions()
    summaries = []
    for s in sessions:
        present_count = sum(1 for r in s.get("results", []) if r.get("status") == "present")
        unknown_count = sum(1 for r in s.get("results", []) if r.get("status") == "unknown")
        summaries.append(
            {
                "session_id": s["session_id"],
                "date": s["date"],
                "timestamp": s["timestamp"],
                "present_count": present_count,
                "unknown_count": unknown_count,
                "absent_count": len(s.get("absent_students", [])),
            }
        )
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
            "annotated_image_url": f"/static/{session['annotated_image_path']}",
            "results": session.get("results", []),
            "absent_students": session.get("absent_students", []),
        }
    )


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


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
