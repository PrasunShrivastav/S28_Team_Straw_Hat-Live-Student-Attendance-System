import os
import uuid
from datetime import datetime, timezone
from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "attendance_system")

_client = MongoClient(MONGO_URI)
_db = _client[DB_NAME]

students_col = _db["students"]
attendance_col = _db["attendance_records"]
teachers_col = _db["teachers"]
schedules_col = _db["schedules"]


# ---------------- STUDENTS ---------------- #

def _serialize_student(student: dict) -> dict:
    photo_path = student.get("photo_path", "")
    return {
        "id": str(student.get("_id")),
        "name": student.get("name", ""),
        "email": student.get("email", ""),
        "roll_number": student.get("roll_number", ""),
        "photo_path": photo_path,
        "registration_photos": student.get("registration_photos", [photo_path] if photo_path else []),
        "photo_count": int(student.get("photo_count", 1)),
        "registered_at": student.get("registered_at"),
    }


def create_student(
    name: str,
    email: str,
    roll_number: str,
    photo_path: str,
    face_encoding: list[float],
    registration_photos: list[str],
    photo_count: int,
    student_id: ObjectId | None = None,
) -> str:
    existing = students_col.find_one({"roll_number": roll_number})
    if existing:
        raise ValueError("Roll number already exists")

    payload = {
        "name": name,
        "email": email,
        "roll_number": roll_number,
        "photo_path": photo_path,
        "face_encoding": face_encoding,
        "registration_photos": registration_photos,
        "photo_count": photo_count,
        "registered_at": datetime.now(timezone.utc),
    }

    if student_id is not None:
        payload["_id"] = student_id

    result = students_col.insert_one(payload)
    return str(result.inserted_id)


def get_students(include_encodings: bool = False) -> list[dict]:
    projection = None if include_encodings else {"face_encoding": 0}
    students = list(students_col.find({}, projection).sort("name", 1))

    if include_encodings:
        for student in students:
            student["id"] = str(student.get("_id"))
            student.setdefault("photo_path", "")
            student.setdefault("registration_photos", [student.get("photo_path", "")])
            student.setdefault("photo_count", len(student["registration_photos"]))
    else:
        students = [_serialize_student(s) for s in students]

    return students


def get_student_by_id(student_id: str) -> dict | None:
    return students_col.find_one({"_id": ObjectId(student_id)})


def get_student_by_email(email: str) -> dict | None:
    student = students_col.find_one({"email": email})
    if student:
        student["id"] = str(student.get("_id"))
    return student


def update_student_photos(
    student_id: str,
    averaged_encoding: list[float],
    registration_photos: list[str],
    photo_count: int,
) -> bool:
    result = students_col.update_one(
        {"_id": ObjectId(student_id)},
        {
            "$set": {
                "face_encoding": averaged_encoding,
                "registration_photos": registration_photos,
                "photo_count": photo_count,
            }
        },
    )
    return result.modified_count > 0


def delete_student(student_id: str) -> bool:
    result = students_col.delete_one({"_id": ObjectId(student_id)})
    return result.deleted_count > 0


# ---------------- TEACHERS ---------------- #

def create_teacher(name: str, email: str, password_hash: str) -> str:
    existing = teachers_col.find_one({"email": email})
    if existing:
        raise ValueError("Teacher already exists")

    result = teachers_col.insert_one({
        "name": name,
        "email": email,
        "password_hash": password_hash,
        "registered_at": datetime.now(timezone.utc),
    })
    return str(result.inserted_id)


def get_teacher_by_email(email: str) -> dict | None:
    return teachers_col.find_one({"email": email})


# ---------------- ATTENDANCE ---------------- #

def create_attendance_record(record: dict) -> str:
    if "session_id" not in record:
        record["session_id"] = str(uuid.uuid4())

    record.setdefault("timestamp", datetime.now(timezone.utc))

    result = attendance_col.insert_one(record)
    return str(result.inserted_id)


def get_sessions() -> list[dict]:
    sessions = list(attendance_col.find({}).sort("timestamp", -1))

    for session in sessions:
        session["id"] = str(session.get("_id"))
        session["session_id"] = session.get("session_id", session["id"])

    return sessions


def get_session_by_session_id(session_id: str) -> dict | None:
    query = {"$or": [{"session_id": session_id}]}

    if ObjectId.is_valid(session_id):
        query["$or"].append({"_id": ObjectId(session_id)})

    session = attendance_col.find_one(query)

    if session:
        session["id"] = str(session.get("_id"))
        session["session_id"] = session.get("session_id", session["id"])

    return session


def get_student_attendance(student_id: str) -> list[dict]:
    sessions = list(attendance_col.find({}).sort("timestamp", -1))
    result = []

    for session in sessions:
        present_ids = {
            str(r.get("student_id", ""))
            for r in session.get("results", [])
            if r.get("status") == "present"
        }

        absent_ids = {
            str(a.get("student_id", ""))
            for a in session.get("absent_students", [])
        }

        if student_id in present_ids:
            status = "present"
        elif student_id in absent_ids:
            status = "absent"
        else:
            continue

        result.append({
            "session_id": session.get("session_id", str(session.get("_id"))),
            "date": session.get("date"),
            "timestamp": session.get("timestamp"),
            "status": status,
            "total_present": len(present_ids),
            "total_absent": len(absent_ids),
        })

    return result


# ---------------- SCHEDULES ---------------- #

def create_schedule(data: dict) -> str:
    data["created_at"] = datetime.now(timezone.utc)
    result = schedules_col.insert_one(data)
    return str(result.inserted_id)


def get_schedules() -> list[dict]:
    schedules = list(schedules_col.find({}).sort([("day_of_week", 1), ("time", 1)]))

    for schedule in schedules:
        schedule["id"] = str(schedule.get("_id"))
        schedule.pop("_id", None)

    return schedules


def update_schedule(schedule_id: str, data: dict) -> bool:
    data["updated_at"] = datetime.now(timezone.utc)
    result = schedules_col.update_one(
        {"_id": ObjectId(schedule_id)},
        {"$set": data}
    )
    return result.modified_count > 0


def delete_schedule(schedule_id: str) -> bool:
    result = schedules_col.delete_one({"_id": ObjectId(schedule_id)})
    return result.deleted_count > 0


# ---------------- ANALYTICS ---------------- #

def get_student_streak(student_id: str) -> int:
    records = get_student_attendance(student_id)
    streak = 0

    for r in records:
        if r["status"] == "present":
            streak += 1
        else:
            break

    return streak


def get_absence_streak(student_id: str) -> dict:
    records = get_student_attendance(student_id)
    streak = 0
    dates = []

    for r in records:
        if r["status"] == "absent":
            streak += 1
            dates.append(r.get("timestamp"))
        else:
            break

    return {"streak": streak, "dates": dates}


def get_weekly_leaderboard() -> list[dict]:
    from datetime import timedelta

    now = datetime.now(timezone.utc)
    start_of_week = now - timedelta(days=now.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)

    sessions = list(attendance_col.find({"timestamp": {"$gte": start_of_week}}))
    students = list(students_col.find({}, {"name": 1}))

    leaderboard = []

    for s in students:
        sid = str(s.get("_id"))
        total = 0
        present = 0

        for sess in sessions:
            present_ids = {str(r.get("student_id")) for r in sess.get("results", []) if r.get("status") == "present"}
            absent_ids = {str(a.get("student_id")) for a in sess.get("absent_students", [])}

            if sid in present_ids:
                total += 1
                present += 1
            elif sid in absent_ids:
                total += 1

        if total > 0:
            leaderboard.append({
                "name": s.get("name"),
                "percentage": round((present / total) * 100, 1),
                "present": present,
                "total": total
            })

    leaderboard.sort(key=lambda x: (x["percentage"], x["present"]), reverse=True)
    return leaderboard[:5]