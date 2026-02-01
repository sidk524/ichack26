#!/usr/bin/env node
/**
 * Fetch Historical Storms from NASA EONET API
 *
 * NASA EONET API v3 Documentation: https://eonet.gsfc.nasa.gov/docs/v3
 *
 * API Parameters used:
 * - category: "severeStorms" - Filter for severe storm events
 * - status: "all" - Include both open and closed events (historical)
 * - start: Start date in YYYY-MM-DD format
 * - end: End date in YYYY-MM-DD format
 *
 * Date Range: December 6, 2022 to February 6, 2023
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const START_DATE = '2022-12-06'
const END_DATE = '2023-02-06'
const CACHE_FILE = path.join(__dirname, '../public/cache/storms_historical.json')

async function fetchHistoricalStorms() {
  console.log('=== NASA EONET Historical Storms Fetcher ===')
  console.log(`Date Range: ${START_DATE} to ${END_DATE}`)
  console.log('')

  // Build the API URL
  // NASA EONET v3 API supports:
  // - start: YYYY-MM-DD format
  // - end: YYYY-MM-DD format
  // - status: "open", "closed", or "all"
  // - category: category name (e.g., "severeStorms")
  const apiUrl = new URL('https://eonet.gsfc.nasa.gov/api/v3/events')
  apiUrl.searchParams.set('category', 'severeStorms')
  apiUrl.searchParams.set('status', 'all')  // Include both open and closed events
  apiUrl.searchParams.set('start', START_DATE)
  apiUrl.searchParams.set('end', END_DATE)

  console.log(`API URL: ${apiUrl.toString()}`)
  console.log('')

  try {
    console.log('Fetching data from NASA EONET...')
    const response = await fetch(apiUrl.toString())

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    console.log(`Received ${data.events?.length || 0} storm events`)
    console.log('')

    if (data.events && data.events.length > 0) {
      // Log summary of events
      console.log('Storm Events Summary:')
      console.log('--------------------')
      data.events.forEach((event, index) => {
        const latestGeo = event.geometry[event.geometry.length - 1]
        console.log(`${index + 1}. ${event.title}`)
        console.log(`   ID: ${event.id}`)
        console.log(`   Date: ${latestGeo?.date || 'Unknown'}`)
        console.log(`   Status: ${event.closed ? 'Closed' : 'Open'}`)
        if (latestGeo?.magnitudeValue) {
          console.log(`   Magnitude: ${latestGeo.magnitudeValue} ${latestGeo.magnitudeUnit || ''}`)
        }
        console.log('')
      })
    }

    // Prepare cached data structure
    const cachedData = {
      fetchedAt: new Date().toISOString(),
      dateRange: {
        start: START_DATE,
        end: END_DATE,
      },
      apiUrl: apiUrl.toString(),
      totalEvents: data.events?.length || 0,
      events: data.events || [],
    }

    // Ensure the cache directory exists
    const cacheDir = path.dirname(CACHE_FILE)
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true })
      console.log(`Created cache directory: ${cacheDir}`)
    }

    // Write to cache file
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cachedData, null, 2))
    console.log(`Successfully cached ${cachedData.totalEvents} events to:`)
    console.log(`  ${CACHE_FILE}`)

  } catch (error) {
    console.error('Error fetching historical storms:', error)

    // If fetch fails, document the reason
    const errorData = {
      error: true,
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      attemptedUrl: apiUrl.toString(),
      dateRange: {
        start: START_DATE,
        end: END_DATE,
      },
      documentation: `
NASA EONET API v3 supports historical queries with the following parameters:
- start: Start date in YYYY-MM-DD format
- end: End date in YYYY-MM-DD format
- status: "all" to include both open and closed events
- category: "severeStorms" for storm events

If this error persists, possible reasons include:
1. Network connectivity issues
2. NASA EONET API service unavailable
3. Rate limiting (if making too many requests)
4. Invalid date range (EONET may not have data for requested period)

The API endpoint is: https://eonet.gsfc.nasa.gov/api/v3/events
Documentation: https://eonet.gsfc.nasa.gov/docs/v3
      `.trim(),
    }

    // Ensure the cache directory exists
    const cacheDir = path.dirname(CACHE_FILE)
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true })
    }

    fs.writeFileSync(CACHE_FILE, JSON.stringify(errorData, null, 2))
    console.log(`Error details saved to: ${CACHE_FILE}`)
    process.exit(1)
  }
}

// Run the fetch
fetchHistoricalStorms()
