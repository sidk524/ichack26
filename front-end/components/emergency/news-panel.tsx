"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { IconX, IconExternalLink, IconMapPin, IconClock } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import type { NewsArticle } from "@/types/api"

interface NewsPanelProps {
  open: boolean
  onClose: () => void
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
    image_url: "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=400",
  },
  {
    article_id: "2",
    title: "Emergency shelters set up across affected regions",
    link: "#",
    pub_date: new Date().toISOString(),
    disaster: true,
    location_name: "Gaziantep, Turkey",
    image_url: "https://images.unsplash.com/photo-1569974498991-d3c12a504f95?w=400",
  },
  {
    article_id: "3",
    title: "International rescue teams arrive to assist relief efforts",
    link: "#",
    pub_date: new Date().toISOString(),
    disaster: true,
    location_name: "Adana, Turkey",
    image_url: "https://images.unsplash.com/photo-1504173010664-32509aeebb62?w=400",
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

export function NewsPanel({ open, onClose }: NewsPanelProps) {
  const [news, setNews] = useState<NewsArticle[]>([])

  useEffect(() => {
    if (open) {
      const fetchNews = async () => {
        const articles = await api.news.list()
        setNews(articles.length > 0 ? articles : mockNews)
      }
      fetchNews()
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 top-16 bg-background rounded-t-3xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-4 border-b">
              <div>
                <h2 className="text-lg font-semibold">Emergency Updates</h2>
                <p className="text-sm text-muted-foreground">
                  {news.length} news articles
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted transition-colors"
              >
                <IconX className="size-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {news.map((article, idx) => (
                <motion.div
                  key={article.article_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={cn(
                    "bg-muted/50 rounded-xl overflow-hidden",
                    "border border-border/50",
                    "hover:border-border transition-colors"
                  )}
                >
                  {/* Image if available */}
                  {article.image_url && (
                    <div className="h-32 bg-muted overflow-hidden">
                      <img
                        src={article.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-4">
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
                        className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Read more
                        <IconExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Bottom safe area / close hint */}
            <div
              className="flex-shrink-0 py-4 text-center text-xs text-muted-foreground border-t cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={onClose}
            >
              Tap to close
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
