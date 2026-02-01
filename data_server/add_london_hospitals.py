import sqlite3
import uuid
import time

# Major London hospitals with their coordinates
london_hospitals = [
    # Already existing (will skip these)
    {"name": "Chelsea and Westminster Hospital", "lat": 51.4843, "lon": -0.1819},
    {"name": "St Mary's Hospital Paddington", "lat": 51.5174, "lon": -0.1744},
    {"name": "Royal Brompton Hospital", "lat": 51.4899, "lon": -0.1707},
    {"name": "Charing Cross Hospital", "lat": 51.4867, "lon": -0.2194},

    # New major London hospitals to add
    {"name": "University College Hospital", "lat": 51.5237, "lon": -0.1355},
    {"name": "Guy's Hospital", "lat": 51.5031, "lon": -0.0877},
    {"name": "St Thomas' Hospital", "lat": 51.4988, "lon": -0.1178},
    {"name": "King's College Hospital", "lat": 51.4682, "lon": -0.0939},
    {"name": "Royal London Hospital", "lat": 51.5191, "lon": -0.0600},
    {"name": "St Bartholomew's Hospital", "lat": 51.5185, "lon": -0.1002},
    {"name": "Great Ormond Street Hospital", "lat": 51.5223, "lon": -0.1200},
    {"name": "Moorfields Eye Hospital", "lat": 51.5266, "lon": -0.0860},
    {"name": "Royal Free Hospital", "lat": 51.5526, "lon": -0.1647},
    {"name": "Whittington Hospital", "lat": 51.5656, "lon": -0.1385},
    {"name": "Homerton University Hospital", "lat": 51.5517, "lon": -0.0459},
    {"name": "Newham University Hospital", "lat": 51.5253, "lon": 0.0380},
    {"name": "Queen Elizabeth Hospital Woolwich", "lat": 51.4819, "lon": 0.0605},
    {"name": "Lewisham Hospital", "lat": 51.4525, "lon": -0.0158},
    {"name": "St George's Hospital", "lat": 51.4270, "lon": -0.1737},
    {"name": "Kingston Hospital", "lat": 51.4151, "lon": -0.2818},
    {"name": "Croydon University Hospital", "lat": 51.3878, "lon": -0.1169},
    {"name": "Barnet Hospital", "lat": 51.6527, "lon": -0.2160},
    {"name": "North Middlesex Hospital", "lat": 51.6149, "lon": -0.0479},
    {"name": "Ealing Hospital", "lat": 51.5067, "lon": -0.3403},
    {"name": "Hillingdon Hospital", "lat": 51.5255, "lon": -0.4591},
    {"name": "West Middlesex Hospital", "lat": 51.4786, "lon": -0.3253},
    {"name": "Queen's Hospital Romford", "lat": 51.5726, "lon": 0.1827},
    {"name": "Princess Royal Hospital", "lat": 51.3985, "lon": 0.0288},
    {"name": "Hammersmith Hospital", "lat": 51.5173, "lon": -0.2338},
]

def add_hospitals():
    conn = sqlite3.connect('data/ichack_server.db')
    cursor = conn.cursor()

    current_time = time.time()
    added_count = 0

    for hospital in london_hospitals:
        # Check if hospital already exists
        cursor.execute(
            "SELECT hospital_id FROM hospitals WHERE name = ?",
            (hospital["name"],)
        )

        if cursor.fetchone():
            print(f"Hospital '{hospital['name']}' already exists, skipping...")
            continue

        # Generate random but realistic bed numbers
        import random
        total_beds = random.randint(200, 800)
        icu_beds = random.randint(15, 60)
        er_beds = random.randint(30, 120)
        pediatric_beds = random.randint(20, 100)

        # Available beds (simulate partial occupancy)
        available_beds = random.randint(int(total_beds * 0.1), int(total_beds * 0.4))
        available_icu = random.randint(0, int(icu_beds * 0.3))
        available_er = random.randint(int(er_beds * 0.1), int(er_beds * 0.5))
        available_pediatric = random.randint(int(pediatric_beds * 0.1), int(pediatric_beds * 0.4))

        hospital_id = str(uuid.uuid4())

        cursor.execute("""
            INSERT INTO hospitals (
                hospital_id, name, lat, lon,
                total_beds, available_beds,
                icu_beds, available_icu,
                er_beds, available_er,
                pediatric_beds, available_pediatric,
                contact_phone, last_updated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            hospital_id,
            hospital["name"],
            hospital["lat"],
            hospital["lon"],
            total_beds,
            available_beds,
            icu_beds,
            available_icu,
            er_beds,
            available_er,
            pediatric_beds,
            available_pediatric,
            "+44 20 XXXX XXXX",  # Placeholder phone
            current_time
        ))

        print(f"Added hospital: {hospital['name']}")
        added_count += 1

    conn.commit()
    conn.close()

    print(f"\nSuccessfully added {added_count} new hospitals to the database")
    print(f"Total London hospitals now: {len(london_hospitals)}")

if __name__ == "__main__":
    add_hospitals()