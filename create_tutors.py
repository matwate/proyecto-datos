#!/usr/bin/env python3

import json
import subprocess
import time

# Base URL for the API
BASE_URL = "https://matwa.tail013c29.ts.net/api/v1"

def make_curl_request(method, endpoint, data=None):
    """Make a curl request to the API"""
    cmd = ["curl", "-X", method, f"{BASE_URL}/{endpoint}", "-H", "Content-Type: application/json"]
    if data:
        cmd.extend(["-d", json.dumps(data)])
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout

def create_tutor(estudiante_id):
    """Create a tutor from an existing student"""
    data = {"estudiante_id": estudiante_id}
    response = make_curl_request("POST", "tutores", data)
    return json.loads(response)["tutor_id"]

def assign_subject(tutor_id, materia_id):
    """Assign a subject to a tutor"""
    data = {
        "tutor_id": tutor_id,
        "materia_id": materia_id,
        "fecha_asignacion": "2024-03-15",
        "activo": True
    }
    make_curl_request("POST", "tutor-materias", data)

def create_availability(tutor_id, dia_semana, hora_inicio, hora_fin):
    """Create an availability slot for a tutor"""
    data = {
        "tutor_id": tutor_id,
        "dia_semana": dia_semana,
        "hora_inicio": hora_inicio,
        "hora_fin": hora_fin
    }
    make_curl_request("POST", "disponibilidad", data)

def main():
    # Create 5 tutors (IDs 6-10)
    tutor_ids = []
    for estudiante_id in range(6, 11):
        tutor_id = create_tutor(estudiante_id)
        tutor_ids.append(tutor_id)
        print(f"Created tutor with ID: {tutor_id}")
        time.sleep(1)  # Small delay to avoid overwhelming the server

    # Assign all subjects (IDs 18-92) to each tutor
    for tutor_id in tutor_ids:
        for materia_id in range(18, 93):
            assign_subject(tutor_id, materia_id)
            print(f"Assigned subject {materia_id} to tutor {tutor_id}")
            time.sleep(0.5)  # Small delay to avoid overwhelming the server

    # Create availability slots for each tutor
    # We'll create slots for each day of the week (1-7)
    # And for each time slot from 8:00 to 20:00 in 2-hour blocks
    time_slots = [
        ("08:00", "10:00"),
        ("10:00", "12:00"),
        ("12:00", "14:00"),
        ("14:00", "16:00"),
        ("16:00", "18:00"),
        ("18:00", "20:00")
    ]

    for tutor_id in tutor_ids:
        for dia_semana in range(1, 8):  # 1 = Monday, 7 = Sunday
            for hora_inicio, hora_fin in time_slots:
                create_availability(tutor_id, dia_semana, hora_inicio, hora_fin)
                print(f"Created availability for tutor {tutor_id} on day {dia_semana} from {hora_inicio} to {hora_fin}")
                time.sleep(0.5)  # Small delay to avoid overwhelming the server

if __name__ == "__main__":
    main() 