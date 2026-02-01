import '@testing-library/jest-dom'

// Store original fetch for integration tests
const originalFetch = global.fetch

// Reset fetch before each test - individual tests can mock as needed
beforeEach(() => {
  global.fetch = originalFetch
})

// Mock DOMParser for GDACS XML parsing (only in jsdom environment)
if (typeof global.DOMParser === 'undefined') {
  global.DOMParser = class DOMParser {
    parseFromString(str, type) {
      // Simple mock - tests will need to provide actual mock data
      return {
        querySelectorAll: () => [],
        querySelector: () => null,
      }
    }
  }
}
