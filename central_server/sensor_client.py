#!/usr/bin/env python3
import json
import time
import uuid
from aiohttp import web

from database.postgres import save_sensor_reading, list_sensor_readings
from database.db import SensorReading


async def print_sensor_table():
    readings = await list_sensor_readings()
    print(f"\n=== SENSOR READINGS TABLE ({len(readings)} readings) ===")
    print(json.dumps(readings, indent=2, default=str))
    print("=" * 40)


async def _read_json(request):
    try:
        return await request.json()
    except Exception:
        return None


async def sensor_data_in(request):
    data = await _read_json(request)
    if not isinstance(data, dict):
        return web.json_response({"ok": False, "error": "Invalid JSON"}, status=400)

    # Extract nested data
    accel = data.get("accel", {})
    gyro = data.get("gyro", {})
    mic = data.get("mic", {})

    reading = SensorReading(
        reading_id=uuid.uuid4().hex,
        status=data.get("status", 0),
        temperature=data.get("temperature", 0.0),
        humidity=data.get("humidity", 0.0),
        accel_x=accel.get("x", 0.0),
        accel_y=accel.get("y", 0.0),
        accel_z=accel.get("z", 0.0),
        gyro_x=gyro.get("x", 0.0),
        gyro_y=gyro.get("y", 0.0),
        gyro_z=gyro.get("z", 0.0),
        mic_amplitude=mic.get("amplitude", 0.0),
        mic_frequency=mic.get("frequency", 0.0),
        received_at=time.time(),
    )

    try:
        await save_sensor_reading(reading)
        print(f"Sensor reading saved: temp={reading.temperature}, humidity={reading.humidity}")
        await print_sensor_table()
    except Exception as e:
        print(f"Error saving sensor reading: {e}")
        return web.json_response({"ok": False, "error": str(e)}, status=500)

    return web.json_response({"ok": True, "reading_id": reading.reading_id})


def register_sensor_routes(app):
    app.router.add_post("/sensor_data_in", sensor_data_in)
