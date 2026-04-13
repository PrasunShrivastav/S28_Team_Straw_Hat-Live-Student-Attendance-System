"""
face_utils.py — Face detection and recognition helper functions.
Uses the `face_recognition` library (dlib) and OpenCV.
"""

import face_recognition
import cv2
import numpy as np
from PIL import Image


MATCH_TOLERANCE = 0.5  # Lower = stricter matching


def load_image_file(file_path: str) -> np.ndarray:
    """Load an image file into a numpy array (RGB)."""
    return face_recognition.load_image_file(file_path)


def get_face_encoding(image_path: str):
    """
    Extract a single face encoding from an image.
    Returns:
        encoding (np.ndarray) if exactly one face found,
        raises ValueError otherwise.
    """
    image = load_image_file(image_path)
    face_locations = face_recognition.face_locations(image, model="hog")

    if len(face_locations) == 0:
        raise ValueError("No face detected in the uploaded photo. Please upload a clear photo with one visible face.")
    if len(face_locations) > 1:
        raise ValueError(
            f"Multiple faces ({len(face_locations)}) detected. "
            "Please upload a photo with only ONE face for registration."
        )

    encodings = face_recognition.face_encodings(image, face_locations)
    return encodings[0]


def detect_and_match(group_image_path: str, known_encodings: list, known_names: list):
    """
    Detect all faces in a group photo and match against known encodings.

    Args:
        group_image_path: Path to the group/class photo.
        known_encodings:  List of numpy arrays (128-d face encodings).
        known_names:      Corresponding list of student names.

    Returns:
        matched_names:  List of names for each detected face ("Unknown" if no match).
        face_locations: List of (top, right, bottom, left) tuples.
        annotated_path: Path to the saved annotated image.
    """
    image = load_image_file(group_image_path)
    face_locations = face_recognition.face_locations(image, model="hog")

    if len(face_locations) == 0:
        return [], [], None

    face_encodings = face_recognition.face_encodings(image, face_locations)

    matched_names = []
    for encoding in face_encodings:
        name = "Unknown"
        if known_encodings:
            distances = face_recognition.face_distance(known_encodings, encoding)
            best_match_idx = np.argmin(distances)
            if distances[best_match_idx] <= MATCH_TOLERANCE:
                name = known_names[best_match_idx]
        matched_names.append(name)

    # Draw bounding boxes on image (convert RGB → BGR for OpenCV)
    annotated = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

    for (top, right, bottom, left), name in zip(face_locations, matched_names):
        if name == "Unknown":
            color = (0, 0, 255)   # RED in BGR
        else:
            color = (0, 200, 0)   # GREEN in BGR

        # Draw rectangle
        cv2.rectangle(annotated, (left, top), (right, bottom), color, 3)

        # Draw label background
        label_h = 35
        cv2.rectangle(annotated, (left, bottom), (right, bottom + label_h), color, cv2.FILLED)

        # Draw name text
        font = cv2.FONT_HERSHEY_DUPLEX
        cv2.putText(annotated, name, (left + 6, bottom + label_h - 8),
                    font, 0.8, (255, 255, 255), 1)

    # Save annotated image
    annotated_path = group_image_path.rsplit(".", 1)[0] + "_result.jpg"
    cv2.imwrite(annotated_path, annotated)

    return matched_names, face_locations, annotated_path


def validate_image(file_path: str) -> bool:
    """Check that the file is a valid, non-corrupted image."""
    try:
        img = Image.open(file_path)
        img.verify()
        return True
    except Exception:
        return False
