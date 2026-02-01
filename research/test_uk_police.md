# UK Police Crime API Test Results

**Test Date:** 2026-02-01
**API Endpoint:** `https://data.police.uk/api/crimes-street/all-crime`

## Summary

**VERIFIED: Each crime record includes `location` object with `latitude` and `longitude` fields.**

---

## Test 1: London Area (lat=51.5, lng=-0.1, date=2024-01)

**Status:** SUCCESS - Returns crimes with coordinates

### Sample Crime Records with Coordinates:

| Crime Category | Latitude | Longitude | Street Name |
|---------------|----------|-----------|-------------|
| anti-social-behaviour | 51.490825 | -0.111492 | On or near Petrol Station |
| anti-social-behaviour | 51.492051 | -0.083423 | On or near Supermarket |
| anti-social-behaviour | 51.504782 | -0.097039 | On or near Great Guildford Street |
| anti-social-behaviour | 51.496488 | -0.102988 | On or near Gaywood Street |

---

## Test 2: Manchester Area (lat=53.483959, lng=-2.244644, date=2023-12)

**Status:** SUCCESS - Returns crimes with coordinates

### Sample Crime Records with Coordinates:

| Crime Category | Latitude | Longitude | Street Name |
|---------------|----------|-----------|-------------|
| bicycle-theft | 53.475776 | -2.231700 | Manchester Piccadilly (station) |
| burglary | 53.475776 | -2.231700 | Manchester Piccadilly (station) |
| criminal-damage-arson | 53.475776 | -2.231700 | Manchester Piccadilly (station) |
| drugs | 53.475776 | -2.231700 | Manchester Piccadilly (station) |

---

## Test 3: Birmingham Area (lat=52.4862, lng=-1.8904, date=2024-01)

**Status:** SUCCESS - Returns crimes with coordinates

### Sample Crime Records with Coordinates:

| Crime Category | Latitude | Longitude | Street Name |
|---------------|----------|-----------|-------------|
| anti-social-behaviour | 52.482070 | -1.891331 | On or near Parking Area |
| anti-social-behaviour | 52.480180 | -1.898816 | On or near Parking Area |
| anti-social-behaviour | 52.485347 | -1.896522 | On or near St Mary's Row |

---

## API Response Structure

Each crime record follows this structure:

```json
{
    "category": "anti-social-behaviour",
    "location_type": "Force",
    "location": {
        "latitude": "51.490825",
        "street": {
            "id": 1680899,
            "name": "On or near Petrol Station"
        },
        "longitude": "-0.111492"
    },
    "context": "",
    "outcome_status": null,
    "persistent_id": "",
    "id": 116083561,
    "location_subtype": "",
    "month": "2024-01"
}
```

---

## Key Findings

1. **Coordinates are ALWAYS present** in the `location` object
2. **Latitude and longitude are strings**, not numbers (e.g., `"51.490825"` not `51.490825`)
3. **Street information** is nested within `location.street`
4. **Crime categories** include: anti-social-behaviour, bicycle-theft, burglary, criminal-damage-arson, drugs, public-order, robbery, shoplifting, theft-from-the-person, vehicle-crime, violent-crime, other-crime, other-theft, possession-of-weapons
5. **Date format** for queries: `YYYY-MM` (e.g., `2024-01`)

---

## Notes

- The initial Manchester query with `lat=53.4&lng=-2.2&date=2024-01` returned empty results `[]`
- This may be due to the specific coordinates not falling within a covered police force area
- Using more precise coordinates (`lat=53.483959&lng=-2.244644`) successfully returned data
- The API may have data availability gaps for certain dates/locations

---

## Conclusion

**The UK Police Crime API reliably provides latitude and longitude coordinates for each crime record.** This makes it suitable for geospatial crime mapping and analysis applications.
