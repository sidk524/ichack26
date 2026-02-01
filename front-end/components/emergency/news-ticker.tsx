"use client"

import { useEffect, useState, useRef } from "react"
import { motion } from "framer-motion"
import { IconAlertTriangle, IconChevronDown } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import type { NewsArticle } from "@/types/api"

interface NewsTickerProps {
  onExpand: () => void
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
]

export function NewsTicker({ onExpand, className }: NewsTickerProps) {
  const [news, setNews] = useState<NewsArticle[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchNews = async () => {
      const articles = await api.news.list()
      setNews(articles.length > 0 ? articles.slice(0, 5) : mockNews)
    }
    fetchNews()
    // Refresh every 30 seconds
    const interval = setInterval(fetchNews, 30000)
    return () => clearInterval(interval)
  }, [])

  // Auto-rotate headlines
  useEffect(() => {
    if (news.length <= 1) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % news.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [news.length])

  const currentNews = news[currentIndex]

  if (!currentNews) return null

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={cn(
        "bg-black/80 backdrop-blur-md border-b border-red-500/30",
        "cursor-pointer select-none",
        className
      )}
      onClick={onExpand}
    >
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Alert icon */}
        <div className="flex-shrink-0">
          <IconAlertTriangle className="size-5 text-red-500 animate-pulse" />
        </div>

        {/* Scrolling news content */}
        <div className="flex-1 min-w-0 overflow-hidden" ref={scrollRef}>
          <motion.div
            key={currentIndex}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-white text-sm font-medium truncate">
              {currentNews.title}
            </p>
            <p className="text-red-400/80 text-xs truncate">
              {currentNews.location_name}
            </p>
          </motion.div>
        </div>

        {/* Expand indicator */}
        <div className="flex-shrink-0 flex items-center gap-1 text-white/60">
          <span className="text-xs">{news.length}</span>
          <IconChevronDown className="size-4" />
        </div>
      </div>

      {/* Progress dots */}
      {news.length > 1 && (
        <div className="flex justify-center gap-1 pb-2">
          {news.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors",
                idx === currentIndex ? "bg-red-500" : "bg-white/20"
              )}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}
