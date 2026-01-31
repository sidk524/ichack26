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
	Name string `json:"name"`
}

// NewsItem represents a single news article
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

const targetURL = "https://ichack-server-611481283314.europe-west1.run.app/news_information_in"

func main() {
	// 1. Setup Zerolog with Nano precision timestamp
	// CHANGED: time.RFC3339 -> time.RFC3339Nano
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
		item := newsData.Items[currentIndex]
		itemCount++

		// Serialize Item
		payload, err := json.Marshal(item)
		// Kept your debug print
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
						Msg("Sent news item")

					resp.Body.Close() // Explicit close
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
