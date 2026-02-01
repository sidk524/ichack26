"use client"

import { useEffect, useState } from "react"
import { IconMapPin, IconClock, IconExternalLink, IconAlertTriangle } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import type { NewsArticle } from "@/types/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface NewsFeedProps {
  className?: string
}

// Mock news for when API returns empty
const mockNews: NewsArticle[] = [
  {
    article_id: "1",
    title: "Earthquake aftershocks continue in Hatay province",
    link: "#",
    pub_date: new Date().toISOString(),
    disaster: true,
    location_name: "Hatay, Turkey",
  },
  {
    article_id: "2",
    title: "Emergency shelters set up across affected regions",
    link: "#",
    pub_date: new Date().toISOString(),
    disaster: true,
    location_name: "Gaziantep, Turkey",
  },
  {
    article_id: "3",
    title: "International rescue teams arrive to assist relief efforts",
    link: "#",
    pub_date: new Date().toISOString(),
    disaster: true,
    location_name: "Adana, Turkey",
  },
  {
    article_id: "4",
    title: "Road closures reported due to infrastructure damage",
    link: "#",
    pub_date: new Date().toISOString(),
    disaster: true,
    location_name: "Kahramanmaras, Turkey",
  },
  {
    article_id: "5",
    title: "Medical supplies distributed to remote areas",
    link: "#",
    pub_date: new Date().toISOString(),
    disaster: true,
    location_name: "Malatya, Turkey",
  },
]

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

export function NewsFeed({ className }: NewsFeedProps) {
  const [news, setNews] = useState<NewsArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchNews = async () => {
      setIsLoading(true)
      const articles = await api.news.list()
      setNews(articles.length > 0 ? articles : mockNews)
      setIsLoading(false)
    }
    fetchNews()
    // Refresh every 30 seconds
    const interval = setInterval(fetchNews, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <IconAlertTriangle className="size-5 text-red-500" />
          Emergency Updates
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-3 pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Loading news...
          </div>
        ) : (
          news.map((article) => (
            <div
              key={article.article_id}
              className={cn(
                "p-3 rounded-lg border bg-muted/30",
                "hover:bg-muted/50 transition-colors"
              )}
            >
              <h3 className="font-medium text-sm leading-snug mb-2">
                {article.title}
              </h3>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {article.location_name && (
                  <span className="flex items-center gap-1">
                    <IconMapPin className="size-3" />
                    {article.location_name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <IconClock className="size-3" />
                  {formatTimeAgo(article.pub_date)}
                </span>
              </div>

              {article.link && article.link !== "#" && (
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Read more
                  <IconExternalLink className="size-3" />
                </a>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
