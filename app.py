"""
app.py — Main Flask application for the Face Recognition Attendance System.
"""

import os
import io
import csv
from datetime import datetime
from werkzeug.utils import secure_filename
from flask import (
    Flask, render_template, request, redirect,
    url_for, flash, send_file, jsonify,
)

from database import init_db, add_student, get_all_students, student_name_exists, save_attendance, delete_student
from face_utils import get_face_encoding, detect_and_match, validate_image

# ── App configuration ────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = "face-attendance-secret-key-change-in-production"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "static", "uploads")
STUDENT_PHOTO_FOLDER = os.path.join(BASE_DIR, "static", "student_photos")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["STUDENT_PHOTO_FOLDER"] = STUDENT_PHOTO_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB max

# Ensure directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(STUDENT_PHOTO_FOLDER, exist_ok=True)


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# ── Routes ───────────────────────────────────────────────────────

@app.route("/")
def index():
    """Home page — upload a group photo to take attendance."""
    students = get_all_students()
    return render_template("index.html", student_count=len(students))


@app.route("/register", methods=["GET", "POST"])
def register():
    """Register a new student with name + photo."""
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        photo = request.files.get("photo")

        # ── Validation ──
        if not name:
            flash("Please enter the student's name.", "danger")
            return redirect(url_for("register"))

        if not photo or photo.filename == "":
            flash("Please upload a photo.", "danger")
            return redirect(url_for("register"))

        if not allowed_file(photo.filename):
            flash("Invalid file type. Allowed: PNG, JPG, JPEG, WEBP.", "danger")
            return redirect(url_for("register"))

        if student_name_exists(name):
            flash(f"A student named '{name}' already exists. Use a different name.", "warning")
            return redirect(url_for("register"))

        # Save photo
        filename = secure_filename(f"{name}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{photo.filename.rsplit('.', 1)[1].lower()}")
        photo_path = os.path.join(app.config["STUDENT_PHOTO_FOLDER"], filename)
        photo.save(photo_path)

        # Validate image
        if not validate_image(photo_path):
            os.remove(photo_path)
            flash("The uploaded image appears to be corrupted. Please try another.", "danger")
            return redirect(url_for("register"))

        # Extract face encoding
        try:
            encoding = get_face_encoding(photo_path)
        except ValueError as e:
            os.remove(photo_path)
            flash(str(e), "danger")
            return redirect(url_for("register"))

        # Store in DB
        add_student(name, f"student_photos/{filename}", encoding)
        flash(f"Student '{name}' registered successfully!", "success")
        return redirect(url_for("students"))

    return render_template("register.html")


@app.route("/students")
def students():
    """List all registered students."""
    all_students = get_all_students()
    return render_template("students.html", students=all_students)


@app.route("/delete_student/<int:student_id>", methods=["POST"])
def remove_student(student_id):
    """Delete a student from the database."""
    delete_student(student_id)
    flash("Student removed successfully.", "info")
    return redirect(url_for("students"))


@app.route("/take_attendance", methods=["POST"])
def take_attendance():
    """Process a group photo and mark attendance."""
    photo = request.files.get("group_photo")

    if not photo or photo.filename == "":
        flash("Please upload a group photo.", "danger")
        return redirect(url_for("index"))

    if not allowed_file(photo.filename):
        flash("Invalid file type. Allowed: PNG, JPG, JPEG, WEBP.", "danger")
        return redirect(url_for("index"))

    # Save uploaded group photo
    filename = secure_filename(f"group_{datetime.now().strftime('%Y%m%d%H%M%S')}.{photo.filename.rsplit('.', 1)[1].lower()}")
    group_photo_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    photo.save(group_photo_path)

    if not validate_image(group_photo_path):
        os.remove(group_photo_path)
        flash("The uploaded image appears to be corrupted. Please try another.", "danger")
        return redirect(url_for("index"))

    # Load all registered students
    all_students = get_all_students()
    if not all_students:
        flash("No students registered yet! Please register students first.", "warning")
        return redirect(url_for("register"))

    known_encodings = [s["face_encoding"] for s in all_students]
    known_names = [s["name"] for s in all_students]

    # Detect & match faces
    matched_names, face_locations, annotated_path = detect_and_match(
        group_photo_path, known_encodings, known_names
    )

    if not face_locations:
        flash("No faces were detected in the uploaded photo. Please try a clearer image.", "warning")
        return redirect(url_for("index"))

    # Build attendance report
    present_names = set(n for n in matched_names if n != "Unknown")
    unknown_count = matched_names.count("Unknown")

    attendance = []
    records_to_save = []
    for student in all_students:
        status = "Present" if student["name"] in present_names else "Absent"
        attendance.append({
            "name": student["name"],
            "status": status,
        })
        records_to_save.append({
            "student_id": student["id"],
            "status": status,
        })

    # Save to DB
    timestamp = save_attendance(records_to_save)

    # Build annotated image relative path for display
    annotated_relative = None
    if annotated_path:
        annotated_relative = "uploads/" + os.path.basename(annotated_path)

    summary = {
        "total_students": len(all_students),
        "present": len(present_names),
        "absent": len(all_students) - len(present_names),
        "unknown_faces": unknown_count,
        "total_faces_detected": len(face_locations),
        "timestamp": timestamp,
    }

    return render_template(
        "results.html",
        attendance=attendance,
        summary=summary,
        annotated_image=annotated_relative,
    )


@app.route("/export_csv")
def export_csv():
    """Export the latest attendance as CSV."""
    # Get data from query params
    data = request.args.get("data", "")
    timestamp = request.args.get("timestamp", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["#", "Student Name", "Status", "Timestamp"])

    if data:
        entries = data.split("|")
        for i, entry in enumerate(entries, 1):
            parts = entry.split(":")
            if len(parts) == 2:
                writer.writerow([i, parts[0], parts[1], timestamp])

    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode("utf-8")),
        mimetype="text/csv",
        as_attachment=True,
        download_name=f"attendance_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
    )


# ── Main ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    init_db()
    print("\n[*] Face Recognition Attendance System")
    print("    -> http://127.0.0.1:5000\n")
    app.run(debug=True, host="0.0.0.0", port=5000)
