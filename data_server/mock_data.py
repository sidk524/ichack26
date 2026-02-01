#!/usr/bin/env python3
import asyncio
import time
import uuid
import random
from database.postgres import (
    init_db, save_hospital, save_danger_zone, save_extracted_entity,
    list_hospitals, list_danger_zones, list_extracted_entities,
    ensure_user_exists, append_call, list_users
)
from database.db import Hospital, DangerZone, DangerZoneVertex, ExtractedEntity, Call
from danger_extractor import generate_polygon_vertices
from tag_extractor import extract_bilingual_tags

# Real hospital data for Turkey
REAL_HOSPITALS = [
    # Istanbul
    {"name": "Acıbadem Maslak Hastanesi", "lat": 41.1086, "lon": 29.0219, "phone": "+90 212 304 4444"},
    {"name": "Memorial Şişli Hastanesi", "lat": 41.0602, "lon": 28.9784, "phone": "+90 212 314 6666"},
    {"name": "American Hospital", "lat": 41.0766, "lon": 29.0319, "phone": "+90 212 444 3777"},
    {"name": "Koç Üniversitesi Hastanesi", "lat": 41.1942, "lon": 29.0875, "phone": "+90 850 250 8250"},
    {"name": "Liv Hospital Ulus", "lat": 41.0766, "lon": 29.0157, "phone": "+90 212 227 4950"},
    {"name": "İstanbul Üniversitesi İstanbul Tıp Fakültesi", "lat": 41.0186, "lon": 28.9603, "phone": "+90 212 414 2000"},
    {"name": "Kartal Dr. Lütfi Kırdar Şehir Hastanesi", "lat": 40.9044, "lon": 29.1836, "phone": "+90 216 441 9700"},

    # Ankara
    {"name": "Hacettepe Üniversitesi Hastanesi", "lat": 39.9334, "lon": 32.8597, "phone": "+90 312 305 1000"},
    {"name": "Ankara Şehir Hastanesi", "lat": 39.7833, "lon": 32.6167, "phone": "+90 312 552 6000"},
    {"name": "TOBB ETÜ Hastanesi", "lat": 39.8667, "lon": 32.7500, "phone": "+90 312 292 4444"},

    # İzmir
    {"name": "Ege Üniversitesi Hastanesi", "lat": 38.4619, "lon": 27.2158, "phone": "+90 232 390 1010"},
    {"name": "Memorial Bahçelievler Hastanesi", "lat": 38.3742, "lon": 27.0853, "phone": "+90 232 489 4545"},
    {"name": "Acıbadem Kozyatağı Hastanesi", "lat": 38.4237, "lon": 27.1428, "phone": "+90 232 399 4444"},

    # Bursa
    {"name": "Uludağ Üniversitesi Hastanesi", "lat": 40.2108, "lon": 28.8746, "phone": "+90 224 295 0000"},
    {"name": "Acıbadem Bursa Hastanesi", "lat": 40.2269, "lon": 29.0669, "phone": "+90 224 272 7272"},

    # Antalya
    {"name": "Antalya Eğitim ve Araştırma Hastanesi", "lat": 36.9081, "lon": 30.7169, "phone": "+90 242 249 4400"},
    {"name": "Memorial Antalya Hastanesi", "lat": 36.8841, "lon": 30.7056, "phone": "+90 242 999 4444"},

    # Adana
    {"name": "Çukurova Üniversitesi Hastanesi", "lat": 37.0000, "lon": 35.3213, "phone": "+90 322 338 6060"},

    # Gaziantep (earthquake region)
    {"name": "Gaziantep Üniversitesi Hastanesi", "lat": 37.0662, "lon": 37.3833, "phone": "+90 342 360 6060"},
]

# Sample danger zones for Turkey
SAMPLE_DANGER_ZONES = [
    {
        "category": "natural",
        "disaster_type": "earthquake",
        "severity": 5,
        "lat": 37.0662,
        "lon": 37.3833,
        "radius": 5000,
        "description": "7.8 magnitude earthquake in Gaziantep region, major structural damage",
        "action": "evacuate"
    },
    {
        "category": "natural",
        "disaster_type": "earthquake",
        "severity": 4,
        "lat": 37.8667,
        "lon": 37.2000,
        "radius": 3000,
        "description": "Aftershock in Kahramanmaraş, building collapses reported",
        "action": "evacuate"
    },
    {
        "category": "infrastructure",
        "disaster_type": "building_collapse",
        "severity": 4,
        "lat": 41.0082,
        "lon": 28.9784,
        "radius": 300,
        "description": "Building collapse in Fatih district, Istanbul",
        "action": "avoid_area"
    },
    {
        "category": "natural",
        "disaster_type": "landslide",
        "severity": 3,
        "lat": 41.0200,
        "lon": 29.1000,
        "radius": 800,
        "description": "Heavy rains cause landslide on Bosphorus hillside",
        "action": "evacuate"
    },
    {
        "category": "infrastructure",
        "disaster_type": "fire",
        "severity": 3,
        "lat": 39.9208,
        "lon": 32.8541,
        "radius": 400,
        "description": "Industrial fire in Ankara Ostim, smoke hazard",
        "action": "shelter_in_place"
    }
]

# Sample extracted entities from AI analysis (Turkey-specific)
SAMPLE_EXTRACTED_ENTITIES = [
    {
        "source_type": "call",
        "source_id": "call_gaziantep_001",
        "entity_type": "person_status",
        "urgency": 5,
        "status": "needs_help",
        "needs": ["medical", "evacuation", "search_and_rescue"],
        "location_mentioned": "Şahinbey District, Gaziantep",
        "lat": 37.0594,
        "lon": 37.3825,
        "medical_keywords": ["trapped", "building_collapse", "unconscious", "bleeding"]
    },
    {
        "source_type": "news",
        "source_id": "article_earthquake_kahramanmaras",
        "entity_type": "danger_zone",
        "urgency": 5,
        "status": "active_incident",
        "needs": ["evacuation", "search_and_rescue", "medical_aid"],
        "location_mentioned": "Kahramanmaraş City Center",
        "lat": 37.5858,
        "lon": 36.9371,
        "medical_keywords": ["crush_injuries", "hypothermia"]
    },
    {
        "source_type": "sensor",
        "source_id": "sensor_istanbul_building_12",
        "entity_type": "movement",
        "urgency": 3,
        "status": "monitoring",
        "needs": ["structural_assessment", "evacuation_planning"],
        "location_mentioned": "Beyoğlu District, Near Galata Tower",
        "lat": 41.0256,
        "lon": 28.9744,
        "medical_keywords": []
    },
    {
        "source_type": "call",
        "source_id": "call_ankara_medical_005",
        "entity_type": "medical",
        "urgency": 4,
        "status": "help_coming",
        "needs": ["medical", "ambulance"],
        "location_mentioned": "Kızılay Square, Ankara",
        "lat": 39.9208,
        "lon": 32.8541,
        "medical_keywords": ["heart_attack", "chest_pain", "elderly"]
    },
    {
        "source_type": "call",
        "source_id": "call_antakya_trapped",
        "entity_type": "person_status",
        "urgency": 5,
        "status": "needs_help",
        "needs": ["search_and_rescue", "medical", "heavy_equipment"],
        "location_mentioned": "Antakya Old City Center, Hatay",
        "lat": 36.2048,
        "lon": 36.1581,
        "medical_keywords": ["trapped_under_debris", "multiple_injuries", "family_of_four"]
    },
    {
        "source_type": "call",
        "source_id": "call_adiyaman_fire",
        "entity_type": "infrastructure",
        "urgency": 4,
        "status": "active_incident",
        "needs": ["fire_suppression", "evacuation", "medical"],
        "location_mentioned": "Adıyaman Province Center",
        "lat": 37.7648,
        "lon": 38.2786,
        "medical_keywords": ["smoke_inhalation", "burns"]
    },
    {
        "source_type": "news",
        "source_id": "article_malatya_rescue",
        "entity_type": "rescue_operation",
        "urgency": 5,
        "status": "in_progress",
        "needs": ["heavy_equipment", "search_and_rescue", "medical_teams"],
        "location_mentioned": "Malatya City Center",
        "lat": 38.3552,
        "lon": 38.3095,
        "medical_keywords": ["crush_syndrome", "dehydration", "hypothermia"]
    },
    {
        "source_type": "sensor",
        "source_id": "sensor_diyarbakir_bridge",
        "entity_type": "infrastructure",
        "urgency": 3,
        "status": "monitoring",
        "needs": ["structural_inspection", "traffic_diversion"],
        "location_mentioned": "Diyarbakır Historic Bridge",
        "lat": 37.9144,
        "lon": 40.2306,
        "medical_keywords": []
    },
    {
        "source_type": "call",
        "source_id": "call_iskenderun_port",
        "entity_type": "infrastructure",
        "urgency": 4,
        "status": "active_incident",
        "needs": ["fire_suppression", "hazmat_team", "evacuation"],
        "location_mentioned": "İskenderun Port, Hatay",
        "lat": 36.5873,
        "lon": 36.1734,
        "medical_keywords": ["chemical_exposure", "respiratory_distress"]
    },
    {
        "source_type": "news",
        "source_id": "article_sanliurfa_hospital",
        "entity_type": "medical_facility",
        "urgency": 5,
        "status": "overwhelmed",
        "needs": ["medical_supplies", "additional_staff", "blood_donations"],
        "location_mentioned": "Şanlıurfa Training and Research Hospital",
        "lat": 37.1674,
        "lon": 38.7955,
        "medical_keywords": ["mass_casualties", "triage", "critical_care"]
    }
]


async def create_hospital_data():
    """Create realistic hospital data with varying capacities."""
    hospitals = []
    current_time = time.time()

    for hospital_info in REAL_HOSPITALS:
        # Generate realistic bed capacities
        total_beds = random.randint(200, 800)
        available_beds = random.randint(20, int(total_beds * 0.3))

        icu_beds = random.randint(20, int(total_beds * 0.1))
        available_icu = random.randint(0, int(icu_beds * 0.4))

        er_beds = random.randint(30, int(total_beds * 0.15))
        available_er = random.randint(5, int(er_beds * 0.5))

        pediatric_beds = random.randint(40, int(total_beds * 0.2))
        available_pediatric = random.randint(10, int(pediatric_beds * 0.6))

        hospital = Hospital(
            hospital_id=str(uuid.uuid4()),
            name=hospital_info["name"],
            lat=hospital_info["lat"],
            lon=hospital_info["lon"],
            total_beds=total_beds,
            available_beds=available_beds,
            icu_beds=icu_beds,
            available_icu=available_icu,
            er_beds=er_beds,
            available_er=available_er,
            pediatric_beds=pediatric_beds,
            available_pediatric=available_pediatric,
            contact_phone=hospital_info["phone"],
            last_updated=current_time
        )

        hospitals.append(hospital)

    return hospitals


async def create_danger_zone_data():
    """Create sample danger zones."""
    zones = []
    current_time = time.time()

    for zone_info in SAMPLE_DANGER_ZONES:
        # Generate polygon vertices from center and radius
        vertices = generate_polygon_vertices(
            zone_info["lat"],
            zone_info["lon"],
            zone_info["radius"],
            num_vertices=6
        )

        zone = DangerZone(
            zone_id=str(uuid.uuid4()),
            category=zone_info["category"],
            disaster_type=zone_info["disaster_type"],
            severity=zone_info["severity"],
            lat=zone_info["lat"],
            lon=zone_info["lon"],
            vertices=vertices,
            is_active=True,
            detected_at=current_time - random.randint(300, 3600),  # 5min to 1hr ago
            expires_at=current_time + random.randint(3600, 86400) if random.random() < 0.7 else None,  # 1hr to 1 day
            description=zone_info["description"],
            recommended_action=zone_info["action"]
        )

        zones.append(zone)

    return zones


async def create_extracted_entity_data():
    """Create sample extracted entities from AI analysis."""
    entities = []
    current_time = time.time()

    for entity_info in SAMPLE_EXTRACTED_ENTITIES:
        entity = ExtractedEntity(
            entity_id=str(uuid.uuid4()),
            source_type=entity_info["source_type"],
            source_id=entity_info["source_id"],
            entity_type=entity_info["entity_type"],
            urgency=entity_info["urgency"],
            status=entity_info["status"],
            needs=entity_info["needs"],
            location_mentioned=entity_info["location_mentioned"],
            lat=entity_info.get("lat"),
            lon=entity_info.get("lon"),
            medical_keywords=entity_info["medical_keywords"],
            extracted_at=current_time - random.randint(60, 1800)  # 1min to 30min ago
        )

        entities.append(entity)

    return entities


async def create_sample_users_and_calls():
    """Create sample users with language preferences and emergency calls with tags."""
    current_time = time.time()

    # Sample emergency call transcripts in English and Turkish
    sample_calls = [
        # English calls
        {
            "user_id": "civilian_en_001",
            "lang": "en",
            "role": "civilian",
            "transcript": "Help! There's a fire in the building and we're trapped on the third floor. The smoke is getting thick and we need immediate evacuation assistance. There are five people here including two children."
        },
        {
            "user_id": "civilian_en_002",
            "lang": "en",
            "role": "civilian",
            "transcript": "Emergency! An earthquake just hit and the building collapsed. People are trapped under rubble. We need search and rescue teams immediately at the industrial district."
        },
        {
            "user_id": "responder_en_001",
            "lang": "en",
            "role": "first_responder",
            "transcript": "This is unit 42. We're responding to the building collapse on Main Street. Multiple casualties confirmed. Requesting additional ambulances and heavy equipment for extraction."
        },
        # Turkish calls
        {
            "user_id": "civilian_tr_001",
            "lang": "tr",
            "role": "civilian",
            "transcript": "İmdat! Deprem oldu ve binamız yıkıldı. Enkaz altında insanlar var. Gaziantep Şehitkamil bölgesindeyiz. Acil yardım gönderin, çocuklar var burada!"
        },
        {
            "user_id": "civilian_tr_002",
            "lang": "tr",
            "role": "civilian",
            "transcript": "Yangın var! Hastane yakınında büyük bir yangın çıktı. Dumanlar yükseliyor ve insanlar tahliye ediliyor. İtfaiye ve ambulans lazım acil!"
        },
        {
            "user_id": "responder_tr_001",
            "lang": "tr",
            "role": "first_responder",
            "transcript": "Ekip 23 burada. Kahramanmaraş merkezdeki göçük bölgesine ulaştık. Ağır yaralılar var. Ek ambulans ve kurtarma ekibi takviyesi gerekiyor."
        }
    ]

    print("\nCreating sample users with language preferences and emergency calls...")
    for call_data in sample_calls:
        # Create user with language preference
        await ensure_user_exists(call_data["user_id"], role=call_data["role"])

        # Extract tags from transcript
        tags = extract_bilingual_tags(call_data["transcript"], num_tags=3)

        # Create call with extracted tags
        call = Call(
            call_id=uuid.uuid4().hex,
            transcript=call_data["transcript"],
            start_time=current_time - random.randint(300, 1800),
            end_time=current_time - random.randint(60, 299),
            tags=tags
        )

        await append_call(call_data["user_id"], call)

        lang_label = "🇬🇧 English" if call_data["lang"] == "en" else "🇹🇷 Turkish"
        print(f"  ✓ {call_data['user_id']} ({lang_label} {call_data['role']})")
        print(f"    📞 Call tags: {', '.join(tags) if tags else 'None'}")


async def populate_mock_data():
    """Populate database with mock data."""
    print("Creating mock hospitals...")
    hospitals = await create_hospital_data()
    for hospital in hospitals:
        await save_hospital(hospital)
        print(f"  ✓ {hospital.name} ({hospital.available_beds}/{hospital.total_beds} beds available)")

    print("\nCreating danger zones...")
    zones = await create_danger_zone_data()
    for zone in zones:
        await save_danger_zone(zone)
        print(f"  ⚠️  {zone.disaster_type} ({zone.category}) - Severity {zone.severity}")

    print("\nCreating extracted entities...")
    entities = await create_extracted_entity_data()
    for entity in entities:
        await save_extracted_entity(entity)
        print(f"  🤖 {entity.entity_type} from {entity.source_type} - Urgency {entity.urgency}")

    # Create sample users and calls with language preferences and tags
    await create_sample_users_and_calls()


async def show_mock_data():
    """Display current mock data in database."""
    # Show users and their calls first
    print("\n=== USERS & CALLS ===")
    users = await list_users()
    for user in users:
        lang = "🇬🇧 EN" if user.get('preferred_language', 'en') == 'en' else "🇹🇷 TR"
        print(f"{user['user_id']} ({lang} - {user['role']})")
        if user.get('calls'):
            for call in user['calls']:
                tags = call.get('tags', [])
                if tags:
                    print(f"  📞 Call: {call['transcript'][:60]}...")
                    print(f"     Tags: {', '.join(tags)}")
        print()

    print("\n=== HOSPITALS ===")
    hospitals = await list_hospitals()
    for hospital in hospitals:
        utilization = ((hospital["total_beds"] - hospital["available_beds"]) / hospital["total_beds"]) * 100
        print(f"{hospital['name']}")
        print(f"  📍 ({hospital['lat']:.4f}, {hospital['lon']:.4f})")
        print(f"  🏥 {hospital['available_beds']}/{hospital['total_beds']} beds ({utilization:.1f}% full)")
        print(f"  🚨 ICU: {hospital['available_icu']}/{hospital['icu_beds']} | ER: {hospital['available_er']}/{hospital['er_beds']}")
        print(f"  👶 Pediatric: {hospital['available_pediatric']}/{hospital['pediatric_beds']}")
        print(f"  📞 {hospital['contact_phone']}")
        print()

    print("=== DANGER ZONES ===")
    zones = await list_danger_zones()
    for zone in zones:
        print(f"⚠️  {zone['disaster_type'].upper()} - {zone['category']}")
        vertices_count = len(zone.get('vertices', []))
        print(f"  📍 ({zone['lat']:.4f}, {zone['lon']:.4f}) with {vertices_count} vertices")
        print(f"  🔥 Severity {zone['severity']}/5 - {zone['description']}")
        print(f"  💡 Action: {zone['recommended_action']}")
        print(f"  ⏰ Active: {'Yes' if zone['is_active'] else 'No'}")
        print()

    print("=== EXTRACTED ENTITIES ===")
    entities = await list_extracted_entities()
    for entity in entities:
        print(f"🤖 {entity['entity_type'].upper()} from {entity['source_type']}")
        print(f"  🚨 Urgency {entity['urgency']}/5 - Status: {entity['status']}")
        print(f"  📍 {entity['location_mentioned'] or 'No location'}")
        print(f"  🏥 Needs: {', '.join(entity['needs']) if entity['needs'] else 'None'}")
        if entity['medical_keywords']:
            print(f"  🩺 Medical: {', '.join(entity['medical_keywords'])}")
        print()


async def main():
    """Main function to populate and display mock data."""
    print("🔄 Initializing database...")
    await init_db()

    print("🎭 Populating with mock data...")
    await populate_mock_data()

    print("📊 Current database contents:")
    await show_mock_data()

    print("✅ Mock data setup complete!")


if __name__ == "__main__":
    asyncio.run(main())