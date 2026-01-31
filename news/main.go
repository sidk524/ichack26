package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"time"
)

// NewsItem represents a single news article
type NewsItem struct {
	Title       string `json:"title"`
	Link        string `json:"link"`
	GUID        string `json:"guid"`
	PubDate     string `json:"pubDate"`
	Description string `json:"description"`
	Source      string `json:"source"`
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

func main() {
	// Define command line flags
	var filename string
	var startPercent int
	var delay int
	flag.StringVar(&filename, "file", "news.json", "JSON file containing news data")
	flag.IntVar(&startPercent, "start", 0, "Percentage (0-100) to start from in the news list")
	flag.IntVar(&delay, "delay", 1000, "Delay in milliseconds between each item")
	flag.Parse()

	// Validate start percentage
	if startPercent < 0 || startPercent > 100 {
		log.Fatalf("Start percentage must be between 0 and 100, got: %d", startPercent)
	}

	// Read the JSON file
	data, err := os.ReadFile(filename)
	if err != nil {
		log.Fatalf("Error reading file %s: %v", filename, err)
	}

	// Parse JSON
	var newsData NewsData
	if err := json.Unmarshal(data, &newsData); err != nil {
		log.Fatalf("Error parsing JSON: %v", err)
	}

	// Calculate starting index based on percentage
	totalItems := len(newsData.Items)
	if totalItems == 0 {
		log.Fatalf("No news items found in file: %s", filename)
	}

	startIndex := (startPercent * totalItems) / 100

	// Process news items in infinite loop
	fmt.Printf("Processing %d news items from %s\n", totalItems, filename)
	fmt.Printf("Feed: %s\n", newsData.Feed.Title)
	fmt.Printf("Starting from item %d (%d%% through the list)\n", startIndex+1, startPercent)
	fmt.Printf("Will loop infinitely with %dms delay between items\n", delay)
	fmt.Println("---")

	itemCount := 0
	currentIndex := startIndex

	for {
		item := newsData.Items[currentIndex]
		itemCount++

		fmt.Printf("Item %d (index %d):\n", itemCount, currentIndex+1)
		fmt.Printf("  Title: %s\n", item.Title)
		fmt.Printf("  Published: %s\n", item.PubDate)
		fmt.Printf("  Source: %s\n", item.Source)
		fmt.Printf("  Link: %s\n", item.Link)
		fmt.Printf("push to webserver\n")
		fmt.Println("---")

		// Move to next item, wrapping around to beginning when we reach the end
		currentIndex++
		if currentIndex >= totalItems {
			currentIndex = 0
			fmt.Printf("*** Reached end of list, wrapping back to beginning ***\n")
			fmt.Println("---")
		}

		// Wait before processing next item
		time.Sleep(time.Duration(delay) * time.Millisecond)
	}
}
