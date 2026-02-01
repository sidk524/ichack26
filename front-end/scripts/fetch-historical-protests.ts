#!/usr/bin/env npx ts-node
/**
 * Script to fetch historical protest data from ACLED API
 *
 * Usage:
 *   1. Set environment variables:
 *      export ACLED_EMAIL_ADDRESS="your-email@example.com"
 *      export ACLED_ACCESS_KEY="your-access-key"
 *
 *   2. Run the script:
 *      npx ts-node scripts/fetch-historical-protests.ts
 *
 *   Or run with Node.js after compiling:
 *      tsc scripts/fetch-historical-protests.ts
 *      node scripts/fetch-historical-protests.js
 *
 * Registration:
 *   Get your free ACLED API credentials at: https://acleddata.com/register/
 *
 * Output:
 *   Creates/updates: public/cache/protests_historical.json
 */

import * as fs from 'fs'
import * as path from 'path'

interface ACLEDEvent {
  event_id_cnty: string
  event_date: string
  year: number
  event_type: string
  sub_event_type: string
  actor1: string
  actor2?: string
  country: string
  admin1: string
  admin2?: string
  admin3?: string
  location: string
  latitude: string
  longitude: string
  source: string
  notes: string
  fatalities: number
  timestamp: number
}

interface HistoricalProtestEvent {
  id: string
  type: 'protest'
  coordinates: [number, number]
  title: string
  severity: number
  timestamp: string
  source: string
  category?: string
  details: {
    eventDate: string
    source: string
    eventType?: string
    subEventType?: string
    fatalities?: number
    actors?: string[]
    notes?: string
  }
}

const ACLED_BASE_URL = 'https://api.acleddata.com/acled/read'

function getSeverityFromACLED(event: ACLEDEvent): number {
  if (event.fatalities > 10) return 5
  if (event.fatalities > 5) return 4
  if (event.fatalities > 0) return 3
  if (event.event_type === 'Riots') return 3
  return 2
}

async function fetchACLEDProtests(
  email: string,
  accessKey: string,
  startDate: string,
  endDate: string
): Promise<HistoricalProtestEvent[]> {
  console.log(`Fetching ACLED data for Turkey from ${startDate} to ${endDate}...`)

  // Build ACLED API URL
  // Using the new API format with proper parameters
  const url = new URL(ACLED_BASE_URL)
  url.searchParams.set('key', accessKey)
  url.searchParams.set('email', email)
  url.searchParams.set('country', 'Turkey')
  url.searchParams.set('event_date', `${startDate}|${endDate}`)
  url.searchParams.set('event_date_where', 'BETWEEN')
  // Filter for protests and riots
  url.searchParams.set('event_type', 'Protests')
  url.searchParams.set('limit', '500')

  console.log('Request URL:', url.toString().replace(accessKey, '***HIDDEN***'))

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`ACLED API error: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()

  if (!data.success) {
    throw new Error(`ACLED API returned error: ${JSON.stringify(data)}`)
  }

  const events: ACLEDEvent[] = data.data || []
  console.log(`Received ${events.length} events from ACLED`)

  // Also fetch riots
  url.searchParams.set('event_type', 'Riots')
  console.log('Fetching riots data...')

  const riotsResponse = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
    },
  })

  if (riotsResponse.ok) {
    const riotsData = await riotsResponse.json()
    if (riotsData.success && riotsData.data) {
      events.push(...riotsData.data)
      console.log(`Added ${riotsData.data.length} riot events`)
    }
  }

  // Transform ACLED events to our format
  return events.map((event) => ({
    id: `acled-${event.event_id_cnty}`,
    type: 'protest' as const,
    coordinates: [
      parseFloat(event.longitude),
      parseFloat(event.latitude),
    ] as [number, number],
    title: `${event.event_type}: ${event.location}`,
    severity: getSeverityFromACLED(event),
    timestamp: new Date(event.event_date).toISOString(),
    source: 'ACLED',
    category: event.sub_event_type,
    details: {
      eventDate: event.event_date,
      source: event.source,
      eventType: event.event_type,
      subEventType: event.sub_event_type,
      fatalities: event.fatalities,
      actors: [event.actor1, event.actor2].filter(Boolean) as string[],
      notes: event.notes,
    },
  }))
}

async function main() {
  const email = process.env.ACLED_EMAIL_ADDRESS
  const accessKey = process.env.ACLED_ACCESS_KEY

  if (!email || !accessKey) {
    console.error('Error: Missing ACLED credentials')
    console.error('')
    console.error('Please set the following environment variables:')
    console.error('  export ACLED_EMAIL_ADDRESS="your-email@example.com"')
    console.error('  export ACLED_ACCESS_KEY="your-access-key"')
    console.error('')
    console.error('Get your free API credentials at: https://acleddata.com/register/')
    console.error('')
    console.error('Using sample data instead...')

    // Use sample data if no credentials
    const sampleData = require('../lib/historical-protests').SAMPLE_HISTORICAL_PROTESTS
    const outputPath = path.join(__dirname, '..', 'public', 'cache', 'protests_historical.json')
    fs.writeFileSync(outputPath, JSON.stringify(sampleData, null, 2))
    console.log(`Sample data written to: ${outputPath}`)
    return
  }

  try {
    // Fetch historical data for Turkey, Dec 2022 - Feb 2023
    const protests = await fetchACLEDProtests(
      email,
      accessKey,
      '2022-12-01',
      '2023-02-28'
    )

    console.log(`Total events fetched: ${protests.length}`)

    // Sort by date
    protests.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    // Write to cache file
    const outputPath = path.join(__dirname, '..', 'public', 'cache', 'protests_historical.json')
    fs.writeFileSync(outputPath, JSON.stringify(protests, null, 2))

    console.log(`Data written to: ${outputPath}`)

    // Print summary statistics
    const byMonth: Record<string, number> = {}
    protests.forEach(p => {
      const month = p.timestamp.substring(0, 7)
      byMonth[month] = (byMonth[month] || 0) + 1
    })

    console.log('\nSummary by month:')
    Object.entries(byMonth).forEach(([month, count]) => {
      console.log(`  ${month}: ${count} events`)
    })

    const bySeverity: Record<number, number> = {}
    protests.forEach(p => {
      bySeverity[p.severity] = (bySeverity[p.severity] || 0) + 1
    })

    console.log('\nSummary by severity:')
    Object.entries(bySeverity).forEach(([severity, count]) => {
      console.log(`  Severity ${severity}: ${count} events`)
    })

  } catch (error) {
    console.error('Failed to fetch ACLED data:', error)
    process.exit(1)
  }
}

main()
