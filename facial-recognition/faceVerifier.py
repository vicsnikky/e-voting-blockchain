import face_recognition
import sys
import os
import uuid
import json
import shutil
from PIL import Image

DATA_FILE = "voters.json"
PHOTO_DIR = "registered_photos"

def load_database():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r") as f:
        content = f.read()
        return json.loads(content) if content else []

def save_database(voters):
    with open(DATA_FILE, "w") as f:
        json.dump(voters, f, indent=2)

def is_duplicate(name, enc, voters):
    for voter in voters:
        if voter["name"].lower() == name.lower():
            return True
        if "encoding" in voter:
            dist = face_recognition.face_distance([voter["encoding"]], enc)[0]
            if dist < 0.5:
                return True
    return False

def register(image_path, name, age):
    voters = load_database()

    # Validate age
    if int(age) < 18:
        return False, "Voter must be at least 18 years old."

    # Load and encode face
    image = face_recognition.load_image_file(image_path)
    encodings = face_recognition.face_encodings(image)
    if not encodings:
        return False, "No face detected."
    encoding = encodings[0]

    if is_duplicate(name, encoding, voters):
        return False, "Voter already exists."

    # Save voter record
    face_id = str(uuid.uuid4())
    voter_data = {
        "name": name,
        "age": int(age),
        "face_id": face_id,
        "encoding": encoding.tolist()
    }

    # Save face image as .jpg
    if not os.path.exists(PHOTO_DIR):
        os.makedirs(PHOTO_DIR)
    pil_img = Image.fromarray(image)
    photo_path = os.path.join(PHOTO_DIR, f"{face_id}.jpg")
    pil_img.save(photo_path)

    voters.append(voter_data)
    save_database(voters)
    return True, "Registered successfully."

if __name__ == "__main__":
    try:
        name = sys.argv[1]
        age = int(sys.argv[2])
        image_path = sys.argv[3]
        success, message = register(image_path, name, age)
        if success:
            print("SUCCESS")
        else:
            print("FAIL " + message)
    except Exception as e:
        print("FAIL " + str(e))
