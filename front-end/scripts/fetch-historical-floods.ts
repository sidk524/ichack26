/**
 * Fetch Historical Floods from NASA EONET API
 *
 * This script attempts to fetch flood events from NASA EONET API for a specified date range
 * and caches them to a local JSON file.
 *
 * IMPORTANT DATA AVAILABILITY NOTE:
 * ================================
 * NASA EONET API has a significant data gap for flood events:
 * - Available years: 2015-2018, 2025-2026
 * - Missing years: 2019-2024 (NO FLOOD DATA)
 *
 * This means the requested date range (December 6, 2022 - February 6, 2023) falls within
 * the data gap and will return ZERO results. This is a limitation of the EONET database,
 * not an issue with this script.
 *
 * Verified via API query:
 *   curl "https://eonet.gsfc.nasa.gov/api/v3/events?category=floods&status=all" | python3 -c "..."
 *   Result: 554 total flood events, 0 events from 2019-2024
 *
 * NASA EONET API v3 Documentation:
 * - Base URL: https://eonet.gsfc.nasa.gov/api/v3/events
 * - Supports date range queries via `start` and `end` parameters (YYYY-MM-DD format)
 * - Use `status=all` to include both open and closed (historical) events
 * - Use `category=floods` to filter for flood events
 *
 * Example API call:
 * https://eonet.gsfc.nasa.gov/api/v3/events?category=floods&status=all&start=2022-12-06&end=2023-02-06
 *
 * Alternative Data Sources for Historical Floods:
 * - GDACS (Global Disaster Alert and Coordination System): https://www.gdacs.org/
 * - EM-DAT (Emergency Events Database): https://www.emdat.be/
 * - Dartmouth Flood Observatory: https://floodobservatory.colorado.edu/
 * - NOAA National Weather Service: https://water.weather.gov/ahps/
 *
 * Usage:
 *   npx tsx scripts/fetch-historical-floods.ts
 *   # or
 *   node --loader ts-node/esm scripts/fetch-historical-floods.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// Configuration
const START_DATE = '2022-12-06'
const END_DATE = '2023-02-06'
const OUTPUT_PATH = path.join(__dirname, '../public/cache/floods_historical.json')

// NASA EONET API types
interface EONETGeometry {
  magnitudeValue?: number
  magnitudeUnit?: string
  date: string
  type: 'Point' | 'Polygon'
  coordinates: [number, number] | number[][]
}

interface EONETCategory {
  id: string
  title: string
}

interface EONETSource {
  id: string
  url: string
}

interface EONETEvent {
  id: string
  title: string
  description?: string
  link: string
  closed?: string | null
  categories: EONETCategory[]
  sources: EONETSource[]
  geometry: EONETGeometry[]
}

interface EONETResponse {
  title: string
  description: string
  link: string
  events: EONETEvent[]
}

// Cached event format (simplified for frontend use)
interface CachedFloodEvent {
  id: string
  title: string
  description?: string
  closed?: string | null
  category: string
  sources: { id: string; url: string }[]
  geometry: {
    date: string
    coordinates: [number, number]
    magnitudeValue?: number
    magnitudeUnit?: string
  }[]
  // Computed fields for convenience
  firstDate: string
  lastDate: string
  latestCoordinates: [number, number]
}

interface CacheMetadata {
  fetchedAt: string
  startDate: string
  endDate: string
  totalEvents: number
  apiUrl: string
  notes: string[]
  dataAvailability: {
    description: string
    availableYears: string[]
    missingYears: string[]
    alternativeSources: { name: string; url: string }[]
  }
}

interface CachedFloodsData {
  metadata: CacheMetadata
  events: CachedFloodEvent[]
}

async function fetchHistoricalFloods(): Promise<void> {
  const apiUrl = `https://eonet.gsfc.nasa.gov/api/v3/events?category=floods&status=all&start=${START_DATE}&end=${END_DATE}`

  console.log('NASA EONET Historical Floods Fetcher')
  console.log('=====================================')
  console.log(`Date Range: ${START_DATE} to ${END_DATE}`)
  console.log(`API URL: ${apiUrl}`)
  console.log('')

  console.log('DATA AVAILABILITY WARNING:')
  console.log('==========================')
  console.log('NASA EONET has a known data gap for flood events:')
  console.log('  - Available years: 2015-2018, 2025-2026')
  console.log('  - Missing years: 2019-2024 (NO FLOOD DATA)')
  console.log('The requested date range falls in the missing period.')
  console.log('')

  try {
    console.log('Fetching data from NASA EONET API...')
    const response = await fetch(apiUrl)

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data: EONETResponse = await response.json()

    console.log(`Received ${data.events?.length || 0} events from API`)

    const alternativeSources = [
      { name: 'GDACS (Global Disaster Alert and Coordination System)', url: 'https://www.gdacs.org/' },
      { name: 'EM-DAT (Emergency Events Database)', url: 'https://www.emdat.be/' },
      { name: 'Dartmouth Flood Observatory', url: 'https://floodobservatory.colorado.edu/' },
      { name: 'NOAA National Weather Service', url: 'https://water.weather.gov/ahps/' },
      { name: 'Copernicus Emergency Management Service', url: 'https://emergency.copernicus.eu/' }
    ]

    if (!data.events || data.events.length === 0) {
      console.log('\nNo flood events found in the specified date range.')
      console.log('\nThis is expected due to the EONET data gap (2019-2024).')
      console.log('\nAlternative data sources for historical floods:')
      alternativeSources.forEach(src => {
        console.log(`  - ${src.name}: ${src.url}`)
      })

      // Save cache file with detailed metadata explaining the data gap
      const emptyCache: CachedFloodsData = {
        metadata: {
          fetchedAt: new Date().toISOString(),
          startDate: START_DATE,
          endDate: END_DATE,
          totalEvents: 0,
          apiUrl,
          notes: [
            'No flood events found for this date range due to EONET data gap',
            'NASA EONET flood data is missing for years 2019-2024',
            'The requested period (Dec 2022 - Feb 2023) falls in this gap',
            'This is a database limitation, not an API or network issue',
            'Consider using alternative data sources listed in dataAvailability'
          ],
          dataAvailability: {
            description: 'NASA EONET API has incomplete historical flood data. The database contains 554 total flood events, but none from 2019-2024.',
            availableYears: ['2015', '2016', '2017', '2018', '2025', '2026'],
            missingYears: ['2019', '2020', '2021', '2022', '2023', '2024'],
            alternativeSources
          }
        },
        events: []
      }

      await saveToCache(emptyCache)
      return
    }

    // Transform events to cached format
    const cachedEvents: CachedFloodEvent[] = data.events.map(event => {
      // Get all Point geometries (some events may have Polygon)
      const pointGeometries = event.geometry
        .filter(g => g.type === 'Point')
        .map(g => ({
          date: g.date,
          coordinates: g.coordinates as [number, number],
          magnitudeValue: g.magnitudeValue,
          magnitudeUnit: g.magnitudeUnit
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      const firstDate = pointGeometries[0]?.date || event.geometry[0]?.date || ''
      const lastDate = pointGeometries[pointGeometries.length - 1]?.date || event.geometry[event.geometry.length - 1]?.date || ''
      const latestCoords = pointGeometries[pointGeometries.length - 1]?.coordinates ||
                          (event.geometry[event.geometry.length - 1]?.coordinates as [number, number]) || [0, 0]

      return {
        id: event.id,
        title: event.title,
        description: event.description,
        closed: event.closed,
        category: event.categories[0]?.title || 'Floods',
        sources: event.sources.map(s => ({ id: s.id, url: s.url })),
        geometry: pointGeometries.length > 0 ? pointGeometries : [{
          date: event.geometry[0]?.date || '',
          coordinates: latestCoords,
          magnitudeValue: event.geometry[0]?.magnitudeValue,
          magnitudeUnit: event.geometry[0]?.magnitudeUnit
        }],
        firstDate,
        lastDate,
        latestCoordinates: latestCoords
      }
    })

    // Sort by first date
    cachedEvents.sort((a, b) => new Date(a.firstDate).getTime() - new Date(b.firstDate).getTime())

    const cachedData: CachedFloodsData = {
      metadata: {
        fetchedAt: new Date().toISOString(),
        startDate: START_DATE,
        endDate: END_DATE,
        totalEvents: cachedEvents.length,
        apiUrl,
        notes: [
          'Data fetched from NASA EONET API v3',
          'Events filtered by category=floods and status=all',
          'Geometry coordinates are [longitude, latitude]',
          'Events sorted by first observation date'
        ],
        dataAvailability: {
          description: 'NASA EONET API flood data availability',
          availableYears: ['2015', '2016', '2017', '2018', '2025', '2026'],
          missingYears: ['2019', '2020', '2021', '2022', '2023', '2024'],
          alternativeSources
        }
      },
      events: cachedEvents
    }

    await saveToCache(cachedData)

    // Print summary
    console.log('\nSummary:')
    console.log(`  Total events: ${cachedEvents.length}`)

    const openEvents = cachedEvents.filter(e => !e.closed).length
    const closedEvents = cachedEvents.filter(e => e.closed).length
    console.log(`  Open events: ${openEvents}`)
    console.log(`  Closed events: ${closedEvents}`)

    // Sample of event titles
    if (cachedEvents.length > 0) {
      console.log('\nSample events:')
      cachedEvents.slice(0, 5).forEach(e => {
        console.log(`  - ${e.title} (${e.firstDate.split('T')[0]})`)
      })
      if (cachedEvents.length > 5) {
        console.log(`  ... and ${cachedEvents.length - 5} more`)
      }
    }

  } catch (error) {
    console.error('\nError fetching data:', error)

    // Document the error in cache file
    const errorCache: CachedFloodsData = {
      metadata: {
        fetchedAt: new Date().toISOString(),
        startDate: START_DATE,
        endDate: END_DATE,
        totalEvents: 0,
        apiUrl,
        notes: [
          `Fetch failed: ${error instanceof Error ? error.message : String(error)}`,
          'Retry later or check network connectivity',
          'Note: Even if fetch succeeds, no data exists for 2019-2024 period'
        ],
        dataAvailability: {
          description: 'NASA EONET API has incomplete historical flood data for years 2019-2024',
          availableYears: ['2015', '2016', '2017', '2018', '2025', '2026'],
          missingYears: ['2019', '2020', '2021', '2022', '2023', '2024'],
          alternativeSources: [
            { name: 'GDACS', url: 'https://www.gdacs.org/' },
            { name: 'EM-DAT', url: 'https://www.emdat.be/' },
            { name: 'Dartmouth Flood Observatory', url: 'https://floodobservatory.colorado.edu/' }
          ]
        }
      },
      events: []
    }

    await saveToCache(errorCache)
    process.exit(1)
  }
}

async function saveToCache(data: CachedFloodsData): Promise<void> {
  // Ensure directory exists
  const dir = path.dirname(OUTPUT_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2))
  console.log(`\nCache saved to: ${OUTPUT_PATH}`)

  // Show file size
  const stats = fs.statSync(OUTPUT_PATH)
  console.log(`File size: ${(stats.size / 1024).toFixed(2)} KB`)
}

// Run the script
fetchHistoricalFloods()
