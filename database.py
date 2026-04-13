"""
database.py — SQLite database setup and query helpers for the
Face Recognition Attendance Monitoring System.
"""

import sqlite3
import os
import numpy as np
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "attendance.db")


def get_connection():
    """Return a new SQLite connection with Row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create the required tables if they do not exist."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            photo_path  TEXT NOT NULL,
            face_encoding BLOB NOT NULL,
            created_at  TEXT DEFAULT (datetime('now','localtime'))
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS attendance_records (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id  INTEGER NOT NULL,
            date        TEXT NOT NULL,
            status      TEXT NOT NULL CHECK(status IN ('Present','Absent')),
            timestamp   TEXT NOT NULL,
            FOREIGN KEY (student_id) REFERENCES students(id)
        )
    """)

    conn.commit()
    conn.close()


# ── Student helpers ──────────────────────────────────────────────

def add_student(name: str, photo_path: str, encoding: np.ndarray) -> int:
    """Insert a new student. Returns the new row id."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO students (name, photo_path, face_encoding) VALUES (?, ?, ?)",
        (name, photo_path, encoding.tobytes()),
    )
    conn.commit()
    student_id = cursor.lastrowid
    conn.close()
    return student_id


def student_name_exists(name: str) -> bool:
    """Check if a student with the given name already exists."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM students WHERE LOWER(name) = LOWER(?)", (name,))
    exists = cursor.fetchone() is not None
    conn.close()
    return exists


def get_all_students():
    """Return all students as a list of dicts."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, photo_path, face_encoding, created_at FROM students ORDER BY name")
    rows = cursor.fetchall()
    conn.close()

    students = []
    for row in rows:
        students.append({
            "id": row["id"],
            "name": row["name"],
            "photo_path": row["photo_path"],
            "face_encoding": np.frombuffer(row["face_encoding"], dtype=np.float64),
            "created_at": row["created_at"],
        })
    return students


def get_student_by_id(student_id: int):
    """Return a single student dict or None."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM students WHERE id = ?", (student_id,))
    row = cursor.fetchone()
    conn.close()
    if row is None:
        return None
    return {
        "id": row["id"],
        "name": row["name"],
        "photo_path": row["photo_path"],
        "face_encoding": np.frombuffer(row["face_encoding"], dtype=np.float64),
        "created_at": row["created_at"],
    }


def delete_student(student_id: int):
    """Delete a student by id."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM students WHERE id = ?", (student_id,))
    conn.commit()
    conn.close()


# ── Attendance helpers ───────────────────────────────────────────

def save_attendance(records: list[dict]):
    """
    Save a batch of attendance records.
    Each dict: {"student_id": int, "status": "Present"|"Absent"}
    """
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    timestamp_str = now.strftime("%Y-%m-%d %H:%M:%S")

    for rec in records:
        cursor.execute(
            "INSERT INTO attendance_records (student_id, date, status, timestamp) VALUES (?, ?, ?, ?)",
            (rec["student_id"], date_str, rec["status"], timestamp_str),
        )

    conn.commit()
    conn.close()
    return timestamp_str


def get_attendance_history(limit: int = 50):
    """Return recent attendance records joined with student names."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ar.id, s.name, ar.status, ar.date, ar.timestamp
        FROM attendance_records ar
        JOIN students s ON ar.student_id = s.id
        ORDER BY ar.timestamp DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]
