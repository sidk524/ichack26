package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"net/http"
	"os"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

type Location struct {
	Name string  `json:"name"`
	Lat  float32 `json:"lat"`
	Long float32 `json:"long"`
}

// NewsItem represents the full data read from the file
type NewsItem struct {
	Title       string   `json:"title"`
	Link        string   `json:"link"`
	GUID        string   `json:"guid"`
	PubDate     string   `json:"pubDate"`
	Description string   `json:"description"`
	Source      string   `json:"source"`
	Disaster    bool     `json:"disaster"`
	Location    Location `json:"location"`
}

// FeedInfo represents the RSS feed metadata
type FeedInfo struct {
	Title         string `json:"title"`
	Link          string `json:"link"`
	Description   string `json:"description"`
	Language      string `json:"language"`
	LastBuildDate string `json:"lastBuildDate"`
	Generator     string `json:"generator"`
}

// NewsData represents the complete JSON structure
type NewsData struct {
	Feed        FeedInfo   `json:"feed"`
	Items       []NewsItem `json:"items"`
	TotalItems  int        `json:"totalItems"`
	ConvertedAt string     `json:"convertedAt"`
}

const targetURL = "https://715814cd2aaf.ngrok-free.app/news_information_in"

func main() {
	// 1. Setup Zerolog with Nano precision timestamp
	log.Logger = log.Output(zerolog.ConsoleWriter{
		Out:        os.Stderr,
		TimeFormat: time.RFC3339Nano,
	})

	// 2. Define flags
	var filename string
	var startPercent int
	var delay int
	flag.StringVar(&filename, "file", "news.json", "JSON file containing news data")
	flag.IntVar(&startPercent, "start", 0, "Percentage (0-100) to start from in the news list")
	flag.IntVar(&delay, "delay", 1000, "Delay in milliseconds between each item")
	flag.Parse()

	// 3. Validate inputs
	if startPercent < 0 || startPercent > 100 {
		log.Fatal().Int("start", startPercent).Msg("Start percentage must be between 0 and 100")
	}

	// 4. Read File
	data, err := os.ReadFile(filename)
	if err != nil {
		log.Fatal().Err(err).Str("file", filename).Msg("Error reading file")
	}

	// 5. Parse JSON
	var newsData NewsData
	if err := json.Unmarshal(data, &newsData); err != nil {
		log.Fatal().Err(err).Msg("Error parsing JSON")
	}

	totalItems := len(newsData.Items)
	if totalItems == 0 {
		log.Fatal().Str("file", filename).Msg("No news items found in file")
	}

	startIndex := (startPercent * totalItems) / 100

	// 6. Setup HTTP Client
	httpClient := &http.Client{
		Timeout: 10 * time.Second,
	}

	log.Info().
		Int("total_items", totalItems).
		Str("feed_title", newsData.Feed.Title).
		Int("start_index", startIndex).
		Int("delay_ms", delay).
		Msg("Starting news processor")

	currentIndex := startIndex
	itemCount := 0

	// 7. Process Loop
	for {
		// Get a copy of the item so we can modify it safely without changing the original slice
		item := newsData.Items[currentIndex]
		itemCount++

		// --- DATE CONVERSION LOGIC ---
		// Parse from RSS format (RFC1123): "Fri, 30 Jan 2026 08:28:27 GMT"
		parsedTime, err := time.Parse(time.RFC1123, item.PubDate)
		if err != nil {
			log.Warn().Err(err).Str("original_date", item.PubDate).Msg("Could not parse PubDate, keeping original")
		} else {
			// Convert to RFC3339Nano
			item.PubDate = parsedTime.Format(time.RFC3339Nano)
		}
		// -----------------------------

		// Create a trimmed version of the data for the payload
		payloadData := struct {
			Title    string   `json:"title"`
			Link     string   `json:"link"`
			PubDate  string   `json:"pubDate"`
			Disaster bool     `json:"disaster"`
			Location Location `json:"location"`
		}{
			Title:    item.Title,
			Link:     item.Link,
			PubDate:  item.PubDate,
			Disaster: item.Disaster,
			Location: item.Location,
		}

		// Serialize the simplified payload
		payload, err := json.Marshal(payloadData)

		// Debug print to verify only title, link, and pubDate are present
		println(string(payload))

		if err != nil {
			log.Error().Err(err).Str("title", item.Title).Msg("Failed to marshal item")
		} else {
			// Create Request
			req, err := http.NewRequest("POST", targetURL, bytes.NewBuffer(payload))
			if err != nil {
				log.Error().Err(err).Msg("Failed to create request")
			} else {
				req.Header.Set("Content-Type", "application/json")

				// Send Request
				resp, err := httpClient.Do(req)
				if err != nil {
					log.Error().Err(err).Str("url", targetURL).Msg("Failed to send request")
				} else {
					// Handle Response
					logger := log.Info()
					if resp.StatusCode >= 400 {
						logger = log.Warn()
					}

					logger.
						Int("status", resp.StatusCode).
						Str("title", item.Title).
						Int("index", currentIndex).
						Str("pub_date", item.PubDate).
						Msg("Sent news item")

					resp.Body.Close()
				}
			}
		}

		// Move to next item
		currentIndex++
		if currentIndex >= totalItems {
			currentIndex = 0
			log.Info().Msg("Reached end of list, wrapping back to beginning")
		}

		time.Sleep(time.Duration(delay) * time.Millisecond)
	}
}
