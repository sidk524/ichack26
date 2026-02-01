/**
 * Fetch Historical Fires from NASA EONET API
 *
 * This script fetches wildfire events from NASA EONET API for a specified date range
 * and caches them to a local JSON file.
 *
 * NASA EONET API v3 Documentation:
 * - Base URL: https://eonet.gsfc.nasa.gov/api/v3/events
 * - Supports date range queries via `start` and `end` parameters (YYYY-MM-DD format)
 * - Use `status=all` to include both open and closed (historical) events
 * - Use `category=wildfires` to filter for fire events
 *
 * IMPORTANT: Date Range Filtering Behavior
 * - The `start` and `end` parameters filter on GEOMETRY DATES (observation timestamps)
 * - NOT on event start/end dates or "closed" dates
 * - This means events that were active during a period but have no geometry observations
 *   recorded in that period will NOT be returned
 *
 * Historical Data Availability (as of Feb 2026):
 * - 2022: 157 events (mostly Oct-Nov geometry dates)
 * - 2023: 97 events (starting from March 2023)
 * - 2024: 5615 events
 * - 2025: 4038+ events
 * - Dec 2022 - Feb 2023: DATA GAP - no geometry observations recorded
 *
 * Alternative Data Sources for Historical Fire Data:
 * - NASA FIRMS: https://firms.modaps.eosdis.nasa.gov/ (comprehensive historical archive)
 * - MODIS Active Fire Products: https://modis.gsfc.nasa.gov/data/dataprod/mod14.php
 * - VIIRS Active Fire Products (375m resolution since 2012)
 *
 * Example API calls:
 *   Date range: https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=all&start=2022-12-06&end=2023-02-06
 *   Last N days: https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=all&days=30
 *   Open only: https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open
 *
 * Usage:
 *   npx tsx scripts/fetch-historical-fires.ts
 *   # or
 *   node --loader ts-node/esm scripts/fetch-historical-fires.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// Configuration
const START_DATE = '2022-12-06'
const END_DATE = '2023-02-06'
const OUTPUT_PATH = path.join(__dirname, '../public/cache/fires_historical.json')

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
interface CachedFireEvent {
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
}

interface CachedFiresData {
  metadata: CacheMetadata
  events: CachedFireEvent[]
}

async function fetchHistoricalFires(): Promise<void> {
  const apiUrl = `https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=all&start=${START_DATE}&end=${END_DATE}`

  console.log('NASA EONET Historical Fires Fetcher')
  console.log('=====================================')
  console.log(`Date Range: ${START_DATE} to ${END_DATE}`)
  console.log(`API URL: ${apiUrl}`)
  console.log('')

  try {
    console.log('Fetching data from NASA EONET API...')
    const response = await fetch(apiUrl)

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data: EONETResponse = await response.json()

    console.log(`Received ${data.events?.length || 0} events from API`)

    if (!data.events || data.events.length === 0) {
      console.log('\nNo wildfire events found in the specified date range.')
      console.log('This could mean:')
      console.log('  1. No wildfires were tracked during this period')
      console.log('  2. The date range is too old (EONET may not retain all historical data)')
      console.log('  3. Network or API issues')

      // Still save an empty cache file with metadata
      const emptyCache: CachedFiresData = {
        metadata: {
          fetchedAt: new Date().toISOString(),
          startDate: START_DATE,
          endDate: END_DATE,
          totalEvents: 0,
          apiUrl,
          notes: [
            'No events found for this date range',
            'EONET primarily focuses on recent/ongoing events',
            'Historical data availability may be limited'
          ]
        },
        events: []
      }

      await saveToCache(emptyCache)
      return
    }

    // Transform events to cached format
    const cachedEvents: CachedFireEvent[] = data.events.map(event => {
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
        category: event.categories[0]?.title || 'Wildfires',
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

    const cachedData: CachedFiresData = {
      metadata: {
        fetchedAt: new Date().toISOString(),
        startDate: START_DATE,
        endDate: END_DATE,
        totalEvents: cachedEvents.length,
        apiUrl,
        notes: [
          'Data fetched from NASA EONET API v3',
          'Events filtered by category=wildfires and status=all',
          'Geometry coordinates are [longitude, latitude]',
          'Events sorted by first observation date'
        ]
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
    const errorCache: CachedFiresData = {
      metadata: {
        fetchedAt: new Date().toISOString(),
        startDate: START_DATE,
        endDate: END_DATE,
        totalEvents: 0,
        apiUrl,
        notes: [
          `Fetch failed: ${error instanceof Error ? error.message : String(error)}`,
          'Retry later or check network connectivity'
        ]
      },
      events: []
    }

    await saveToCache(errorCache)
    process.exit(1)
  }
}

async function saveToCache(data: CachedFiresData): Promise<void> {
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
fetchHistoricalFires()
