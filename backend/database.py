import os
import uuid
from datetime import date, datetime, timedelta, timezone
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
sessions_col = _db["sessions"]
schedules_col = _db["schedules"]

DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


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


def update_session_student_status(session_id: str, student_id: str, new_status: str, student_info: dict) -> bool:
    session = get_session_by_session_id(session_id)
    if not session:
        return False

    new_results = [r for r in session.get("results", []) if str(r.get("student_id")) != student_id]
    new_absent = [a for a in session.get("absent_students", []) if str(a.get("student_id")) != student_id]

    if new_status == "present":
        new_results.append({
            "student_id": student_id,
            "name": student_info.get("name", ""),
            "roll_number": student_info.get("roll_number", ""),
            "status": "present",
            "confidence": None,
            "matched": False,
            "bbox": []
        })
    elif new_status == "absent":
        new_absent.append({
            "student_id": student_id,
            "name": student_info.get("name", ""),
            "roll_number": student_info.get("roll_number", "")
        })
    
    result = attendance_col.update_one(
        {"_id": ObjectId(session["id"])},
        {"$set": {"results": new_results, "absent_students": new_absent}}
    )
    return result.modified_count > 0


# ---------------- SCHEDULES ---------------- #

def _parse_date_only(value) -> date | None:
    if value in (None, ""):
        return None

    if isinstance(value, date) and not isinstance(value, datetime):
        return value

    if isinstance(value, datetime):
        return value.date()

    text = str(value).strip()
    if "T" in text:
        text = text.split("T", 1)[0]

    return date.fromisoformat(text)


def _day_label(day_index: int | None) -> str | None:
    if day_index is None:
        return None
    if 0 <= int(day_index) < len(DAY_LABELS):
        return DAY_LABELS[int(day_index)]
    return None


def _serialize_session_definition(session: dict) -> dict:
    day_index = session.get("day_of_week")
    payload = {
        "id": str(session.get("_id")),
        "subject": session.get("subject", ""),
        "type": session.get("type", ""),
        "room": session.get("room", ""),
        "time": session.get("time", ""),
        "duration_minutes": int(session.get("duration_minutes", 60)),
        "repeat": session.get("repeat", "weekly"),
        "start_date": session.get("start_date"),
        "end_date": session.get("end_date"),
        "skip_dates": session.get("skip_dates", []),
        "day_of_week_index": day_index,
        "day_of_week": _day_label(day_index),
    }
    return payload


def _sort_session_definitions(session: dict) -> tuple:
    day_index = session.get("day_of_week")
    if day_index is None:
        start = _parse_date_only(session.get("start_date"))
        day_index = start.weekday() if start else 7
    return (int(day_index), session.get("time", ""), session.get("subject", ""))


def create_session_definition(data: dict) -> str:
    payload = {
        "subject": data.get("subject", ""),
        "type": data.get("type", ""),
        "room": data.get("room", ""),
        "time": data.get("time", ""),
        "duration_minutes": int(data.get("duration_minutes", 60)),
        "repeat": data.get("repeat", "weekly"),
        "start_date": data.get("start_date"),
        "end_date": data.get("end_date"),
        "day_of_week": data.get("day_of_week"),
        "skip_dates": list(data.get("skip_dates", [])),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = sessions_col.insert_one(payload)
    return str(result.inserted_id)


def get_session_definition_by_id(session_id: str) -> dict | None:
    query = {"_id": ObjectId(session_id)} if ObjectId.is_valid(session_id) else {"_id": session_id}
    session = sessions_col.find_one(query)
    if session:
        session["id"] = str(session.get("_id"))
    return session


def get_session_definitions() -> list[dict]:
    sessions = list(sessions_col.find({}))
    sessions.sort(key=_sort_session_definitions)
    for session in sessions:
        session["id"] = str(session.get("_id"))
    return sessions


def update_session_definition(session_id: str, data: dict) -> bool:
    payload = {**data, "updated_at": datetime.now(timezone.utc)}
    result = sessions_col.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": payload},
    )
    return result.modified_count > 0


def append_skip_date(session_id: str, skip_date: str) -> bool:
    result = sessions_col.update_one(
        {"_id": ObjectId(session_id)},
        {
            "$addToSet": {"skip_dates": skip_date},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )
    return result.matched_count > 0


def end_session_definition(session_id: str, end_date: str) -> bool:
    result = sessions_col.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {"end_date": end_date, "updated_at": datetime.now(timezone.utc)}},
    )
    return result.matched_count > 0


def delete_session_definition(session_id: str) -> bool:
    result = sessions_col.delete_one({"_id": ObjectId(session_id)})
    return result.deleted_count > 0


def _build_occurrence(session: dict, occurrence_date: date) -> dict:
    day_index = occurrence_date.weekday()
    return {
        "id": str(session.get("_id")),
        "session_id": str(session.get("_id")),
        "subject": session.get("subject", ""),
        "type": session.get("type", ""),
        "room": session.get("room", ""),
        "time": session.get("time", ""),
        "duration_minutes": int(session.get("duration_minutes", 60)),
        "repeat": session.get("repeat", "weekly"),
        "start_date": session.get("start_date"),
        "end_date": session.get("end_date"),
        "skip_dates": session.get("skip_dates", []),
        "date": occurrence_date.isoformat(),
        "day_of_week": day_index,
        "day_name": DAY_LABELS[day_index],
    }


def _iter_session_occurrences(session: dict, range_start: date, range_end: date) -> list[dict]:
    repeat = session.get("repeat", "weekly")
    start = _parse_date_only(session.get("start_date"))
    end = _parse_date_only(session.get("end_date")) or range_end
    skip_dates = set(session.get("skip_dates", []))
    occurrences: list[dict] = []

    if start is None:
        return occurrences

    if end < range_start or start > range_end:
        return occurrences

    actual_start = max(start, range_start)
    actual_end = min(end, range_end)

    if repeat == "one_time":
        if start >= range_start and start <= range_end and start.isoformat() not in skip_dates:
            occurrences.append(_build_occurrence(session, start))
        return occurrences

    if repeat == "daily":
        current = actual_start
        while current <= actual_end:
            if current.isoformat() not in skip_dates:
                occurrences.append(_build_occurrence(session, current))
            current += timedelta(days=1)
        return occurrences

    if repeat == "weekly":
        day_index = session.get("day_of_week")
        if day_index is None:
            return occurrences

        current = actual_start + timedelta(days=(int(day_index) - actual_start.weekday()) % 7)
        while current <= actual_end:
            if current.isoformat() not in skip_dates:
                occurrences.append(_build_occurrence(session, current))
            current += timedelta(days=7)

    return occurrences


def get_session_occurrences_in_range(range_start: date, range_end: date) -> list[dict]:
    occurrences: list[dict] = []
    for session in get_session_definitions():
        occurrences.extend(_iter_session_occurrences(session, range_start, range_end))

    occurrences.sort(key=lambda item: (item["date"], item["time"], item["subject"]))
    return occurrences


def get_session_week(date_value: str) -> dict:
    base_date = _parse_date_only(date_value) or datetime.now(timezone.utc).date()
    monday = base_date - timedelta(days=base_date.weekday())
    saturday = monday + timedelta(days=5)
    grouped = {key: [] for key in DAY_KEYS[:6]}

    for occurrence in get_session_occurrences_in_range(monday, saturday):
        grouped[DAY_KEYS[occurrence["day_of_week"]]].append(occurrence)

    return grouped


def get_session_month(month_value: str) -> list[dict]:
    month_start = date.fromisoformat(f"{month_value}-01")
    next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
    month_end = next_month - timedelta(days=1)
    occurrences = get_session_occurrences_in_range(month_start, month_end)

    attendance_records = list(attendance_col.find({
        "date": {
            "$gte": f"{month_value}-01",
            "$lte": f"{month_value}-31",
        }
    }))

    for occ in occurrences:
        occurrence_date = occ["date"]
        # Match by schedule ID
        match = next(
            (
                record for record in attendance_records
                if (record.get("session_date") or record.get("date")) == occurrence_date
                and str(record.get("schedule_id", "")) == occ["session_id"]
            ),
            None,
        )
        # Fallback to match by subject
        if not match:
            match = next(
                (
                    record for record in attendance_records
                    if (record.get("session_date") or record.get("date")) == occurrence_date
                    and record.get("subject") == occ["subject"]
                ),
                None,
            )

        if match:
            occ["attendance_taken"] = True
            occ["attendance_session_id"] = str(match.get("session_id", match.get("_id")))
        else:
            occ["attendance_taken"] = False
            occ["attendance_session_id"] = None

    return occurrences


def create_schedule(data: dict) -> str:
    payload = {
        "subject": data.get("subject", ""),
        "type": data.get("type", ""),
        "room": data.get("room", ""),
        "time": data.get("time", ""),
        "duration_minutes": int(data.get("duration_minutes", 60)),
        "repeat": data.get("repeat", "weekly"),
        "start_date": data.get("start_date"),
        "end_date": data.get("end_date"),
        "day_of_week": data.get("day_of_week"),
        "skip_dates": list(data.get("skip_dates", [])),
    }
    return create_session_definition(payload)


def get_schedules() -> list[dict]:
    return [_serialize_session_definition(session) for session in get_session_definitions()]


def update_schedule(schedule_id: str, data: dict) -> bool:
    payload = {
        **data,
        "updated_at": datetime.now(timezone.utc),
    }
    return update_session_definition(schedule_id, payload)


def delete_schedule(schedule_id: str) -> bool:
    return delete_session_definition(schedule_id)


def get_monthly_analytics(month_value: str) -> dict:
    month_occurrences = get_session_month(month_value)
    students = get_students(include_encodings=False)

    attendance_records = list(attendance_col.find({
        "date": {
            "$gte": f"{month_value}-01",
            "$lte": f"{month_value}-31",
        }
    }))
    for record in attendance_records:
        record["id"] = str(record.get("_id"))

    def match_record(occurrence: dict):
        occurrence_date = occurrence["date"]
        exact_schedule_match = next(
            (
                record for record in attendance_records
                if (record.get("session_date") or record.get("date")) == occurrence_date
                and str(record.get("schedule_id", "")) == occurrence["session_id"]
            ),
            None,
        )
        if exact_schedule_match:
            return exact_schedule_match

        return next(
            (
                record for record in attendance_records
                if (record.get("session_date") or record.get("date")) == occurrence_date
                and record.get("subject") == occurrence["subject"]
            ),
            None,
        )

    subject_map: dict[tuple[str, str], dict] = {}
    overall_map = {
        s["id"]: {
            "name": s["name"],
            "roll_number": s["roll_number"],
            "total_present": 0,
            "total_absent": 0,
            "overall_rate": 0,
        }
        for s in students
    }

    sessions_with_attendance = 0

    for occurrence in month_occurrences:
        subject_key = (occurrence["subject"], occurrence["type"])
        entry = subject_map.setdefault(
            subject_key,
            {
                "subject": occurrence["subject"],
                "type": occurrence["type"],
                "scheduled_count": 0,
                "attended_count": 0,
                "attendance_rate": 0,
                "per_student": {
                    s["id"]: {
                        "name": s["name"],
                        "roll_number": s["roll_number"],
                        "present_count": 0,
                        "absent_count": 0,
                        "rate": 0,
                    }
                    for s in students
                },
            },
        )

        entry["scheduled_count"] += 1
        record = match_record(occurrence)
        if not record:
            continue

        sessions_with_attendance += 1
        entry["attended_count"] += 1

        present_ids = {
            str(result.get("student_id", ""))
            for result in record.get("results", [])
            if result.get("status") == "present"
        }
        absent_ids = {
            str(student.get("student_id", ""))
            for student in record.get("absent_students", [])
        }

        for student_id, student_entry in entry["per_student"].items():
            if student_id in present_ids:
                student_entry["present_count"] += 1
                overall_map[student_id]["total_present"] += 1
            elif student_id in absent_ids:
                student_entry["absent_count"] += 1
                overall_map[student_id]["total_absent"] += 1

    per_subject = []
    for entry in subject_map.values():
        for student_entry in entry["per_student"].values():
            total = student_entry["present_count"] + student_entry["absent_count"]
            student_entry["rate"] = round((student_entry["present_count"] / total) * 100, 1) if total > 0 else 0

        entry["attendance_rate"] = round((entry["attended_count"] / entry["scheduled_count"]) * 100, 1) if entry["scheduled_count"] > 0 else 0
        entry["per_student"] = list(entry["per_student"].values())
        per_subject.append(entry)

    per_subject.sort(key=lambda item: (item["subject"], item["type"]))

    per_student_overall = []
    for student_entry in overall_map.values():
        total = student_entry["total_present"] + student_entry["total_absent"]
        student_entry["overall_rate"] = round((student_entry["total_present"] / total) * 100, 1) if total > 0 else 0
        per_student_overall.append(student_entry)

    per_student_overall.sort(key=lambda item: item["name"])

    total_scheduled_sessions = len(month_occurrences)

    return {
        "month": month_value,
        "total_scheduled_sessions": total_scheduled_sessions,
        "sessions_with_attendance": sessions_with_attendance,
        "sessions_missed": max(total_scheduled_sessions - sessions_with_attendance, 0),
        "per_subject": per_subject,
        "per_student_overall": per_student_overall,
    }


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
