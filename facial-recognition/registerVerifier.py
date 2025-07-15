import face_recognition
import cv2
import os
import sys
import json
import numpy as np
import uuid
from PIL import Image

# Paths
FACE_DIR = "registered_faces"
PHOTO_DIR = "registered_photos"
DB_FILE = "voters.json"

# Ensure folders exist
os.makedirs(FACE_DIR, exist_ok=True)
os.makedirs(PHOTO_DIR, exist_ok=True)

def load_database():
    if not os.path.exists(DB_FILE) or os.path.getsize(DB_FILE) == 0:
        with open(DB_FILE, "w") as f:
            json.dump([], f)
    with open(DB_FILE, "r") as f:
        return json.load(f)

def save_database(data):
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=4)

def encode_face(image_path):
    image = face_recognition.load_image_file(image_path)
    encodings = face_recognition.face_encodings(image)
    return encodings[0] if encodings else None

def is_duplicate_name(voters, name):
    return any(v["name"].strip().lower() == name.strip().lower() for v in voters)

def is_duplicate_face(new_encoding):
    for fname in os.listdir(FACE_DIR):
        path = os.path.join(FACE_DIR, fname)
        known_encoding = np.load(path)
        match = face_recognition.compare_faces([known_encoding], new_encoding, tolerance=0.45)[0]
        if match:
            return True
    return False

def register(image_path, name, age):
    age = int(age)
    if age < 18:
        return False, "You must be at least 18 years old to vote."
    voters = load_database()

    if is_duplicate_name(voters, name):
        return False, "Name already registered."

    encoding = encode_face(image_path)
    if encoding is None:
        return False, "No clear face found in the image."

    if is_duplicate_face(encoding):
        return False, "Face already registered."

    face_id = str(uuid.uuid4())
    np.save(os.path.join(FACE_DIR, face_id + ".npy"), encoding)

    # Save image as JPG using PIL
    pil_img = Image.open(image_path).convert("RGB")
    photo_dest = os.path.join(PHOTO_DIR, face_id + ".jpg")
    pil_img.save(photo_dest, format="JPEG")

    # Cleanup uploaded original
    if os.path.exists(image_path):
        os.remove(image_path)

    voter = {
        "name": name,
        "age": age,
        "photo": f"/registered_photos/{face_id}.jpg",
        "face_id": face_id
    }

    voters.append(voter)
    save_database(voters)
    return True, "Registration successful."

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("FAIL Missing parameters.")
        sys.exit(1)

    name = sys.argv[1]
    age = int(sys.argv[2])
    image_path = sys.argv[3]

    success, message = register(image_path, name, age)
    print("SUCCESS" if success else "FAIL", message)
