import os
import uuid
import cv2
import numpy as np
import face_recognition

MATCH_TOLERANCE = 0.5


# ---------------- ENCODING ---------------- #

def encode_face(image_path: str) -> np.ndarray:
    """Return exactly one 128-d face encoding for a photo."""
    image = face_recognition.load_image_file(image_path)
    face_locations = face_recognition.face_locations(image, model="hog")

    if len(face_locations) == 0:
        raise ValueError("No face detected in uploaded image")
    if len(face_locations) > 1:
        raise ValueError("Multiple faces detected. Please upload exactly one face")

    encoding = face_recognition.face_encodings(image, face_locations)[0]
    return encoding


def average_encodings(list_of_encodings: list[np.ndarray]) -> np.ndarray:
    """Average a list of encodings."""
    if not list_of_encodings:
        raise ValueError("No encodings provided")
    return np.mean(list_of_encodings, axis=0)


def extract_single_face_encoding(image_path: str) -> list[float]:
    """Backward-compatible helper."""
    return encode_face(image_path).tolist()


# ---------------- FACE DETECTION + MATCH ---------------- #

def detect_faces_and_match(
    group_photo_path: str,
    known_students: list[dict],
    output_folder: str
) -> tuple[list[dict], str]:

    image = face_recognition.load_image_file(group_photo_path)
    face_locations = face_recognition.face_locations(image, model="hog")
    face_encodings = face_recognition.face_encodings(image, face_locations)

    # ✅ FILTER VALID STUDENTS
    known_encodings = []
    valid_students = []

    for s in known_students:
        encoding = s.get("face_encoding")

        if encoding is None or len(encoding) == 0:
            print(f"⚠️ Skipping student without encoding: {s.get('name')}")
            continue

        try:
            enc_array = np.array(encoding, dtype=np.float64)

            # ensure it's correct shape (128-d)
            if enc_array.shape != (128,):
                print(f"⚠️ Invalid encoding shape for {s.get('name')}")
                continue

            known_encodings.append(enc_array)
            valid_students.append(s)

        except Exception as e:
            print(f"⚠️ Error processing encoding for {s.get('name')}: {e}")

    # replace list with valid ones
    known_students = valid_students

    recognition_results: list[dict] = []

    for face_encoding, (top, right, bottom, left) in zip(face_encodings, face_locations):

        matched_student = None
        name = "Unknown"

        if known_encodings:
            matches = face_recognition.compare_faces(
                known_encodings,
                face_encoding,
                tolerance=MATCH_TOLERANCE
            )

            distances = face_recognition.face_distance(
                known_encodings,
                face_encoding
            )

            if len(distances) > 0:
                best_idx = int(np.argmin(distances))

                if matches[best_idx]:
                    matched_student = known_students[best_idx]
                    name = matched_student.get("name", "Unknown")

        recognition_results.append({
            "student_id": str(matched_student.get("_id")) if matched_student else None,
            "name": name,
            "status": "present" if matched_student else "unknown",
            "bbox": [int(top), int(right), int(bottom), int(left)],
        })

    # ---------------- DRAW BOXES ---------------- #

    annotated_image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

    for result in recognition_results:
        top, right, bottom, left = result["bbox"]
        is_known = result["status"] == "present"

        color = (34, 197, 94) if is_known else (239, 68, 68)

        cv2.rectangle(annotated_image, (left, top), (right, bottom), color, 2)
        cv2.rectangle(annotated_image, (left, bottom - 24), (right, bottom), color, cv2.FILLED)

        cv2.putText(
            annotated_image,
            result["name"],
            (left + 6, bottom - 6),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (255, 255, 255),
            1,
            cv2.LINE_AA,
        )

    # ---------------- SAVE IMAGE ---------------- #

    os.makedirs(output_folder, exist_ok=True)

    annotated_name = f"annotated_{uuid.uuid4().hex}.jpg"
    annotated_path = os.path.join(output_folder, annotated_name)

    cv2.imwrite(annotated_path, annotated_image)

    return recognition_results, annotated_path