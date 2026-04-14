import os
import uuid
import cv2
import numpy as np
import face_recognition

MATCH_TOLERANCE = 0.5


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
    """Average a list of 128-d encodings into one encoding."""
    if not list_of_encodings:
        raise ValueError("No encodings provided for averaging")
    return np.mean(list_of_encodings, axis=0)


def extract_single_face_encoding(image_path: str) -> list[float]:
    """Backward-compatible helper used by older call sites."""
    return encode_face(image_path).tolist()


def detect_faces_and_match(group_photo_path: str, known_students: list[dict], output_folder: str) -> tuple[list[dict], str]:
    image = face_recognition.load_image_file(group_photo_path)
    face_locations = face_recognition.face_locations(image, model="hog")
    face_encodings = face_recognition.face_encodings(image, face_locations)

    known_encodings = [np.array(s["face_encoding"], dtype=np.float64) for s in known_students]

    recognition_results: list[dict] = []
    for face_encoding, (top, right, bottom, left) in zip(face_encodings, face_locations):
        matched_student = None
        name = "Unknown"

        if known_encodings:
            matches = face_recognition.compare_faces(known_encodings, face_encoding, tolerance=MATCH_TOLERANCE)
            distances = face_recognition.face_distance(known_encodings, face_encoding)
            best_idx = int(np.argmin(distances)) if len(distances) else None

            if best_idx is not None and matches[best_idx]:
                matched_student = known_students[best_idx]
                name = matched_student["name"]

        recognition_results.append(
            {
                "student_id": matched_student["_id"] if matched_student else None,
                "name": name,
                "status": "present" if matched_student else "unknown",
                "bbox": [int(top), int(right), int(bottom), int(left)],
            }
        )

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

    annotated_name = f"annotated_{uuid.uuid4().hex}.jpg"
    annotated_path = os.path.join(output_folder, annotated_name)
    cv2.imwrite(annotated_path, annotated_image)

    return recognition_results, annotated_path
