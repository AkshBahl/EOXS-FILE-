"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore"
import { auth, db } from "@/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Users,
  PlayCircle,
  Clock,
  TrendingUp,
  Activity,
} from "lucide-react"

interface Video {
  id: string;
  title: string;
  description?: string;
  category?: string;
  videoUrl?: string;
  createdAt: Timestamp | Date;
  views: number;
  watchTime: number;
  engagement: number;
  thumbnailUrl?: string;
}

export default function AdminDashboard() {
  const router = useRouter()
  const [videos, setVideos] = useState<Video[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalViews: 0,
    totalWatchTime: 0,
    totalVideos: 0,
    avgEngagement: 0,
  })

  useEffect(() => {
    const checkAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/login")
        return
      }
      loadVideos()
    })

    return () => checkAuth()
  }, [router])

  const loadVideos = async () => {
    try {
      setIsLoading(true)
      const videosQuery = query(
        collection(db, "videos"),
        orderBy("createdAt", "desc")
      )
      const querySnapshot = await getDocs(videosQuery)
      const videoData = querySnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title || "Untitled Video",
          description: data.description,
          category: data.category || "Uncategorized",
          videoUrl: data.videoUrl,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          views: Number(data.views) || 0,
          watchTime: Number(data.watchTime) || 0,
          engagement: Number(data.engagement) || 0,
          thumbnailUrl: data.thumbnailUrl,
        }
      }) as Video[]
      
      setVideos(videoData)
      
      // Calculate stats with proper number conversion
      const totalViews = videoData.reduce((sum, video) => sum + (video.views || 0), 0)
      const totalWatchTime = videoData.reduce((sum, video) => sum + (video.watchTime || 0), 0)
      const totalEngagement = videoData.reduce((sum, video) => sum + (video.engagement || 0), 0)
      const avgEngagement = videoData.length > 0 ? totalEngagement / videoData.length : 0

      setStats({
        totalViews,
        totalWatchTime,
        totalVideos: videoData.length,
        avgEngagement,
      })

      console.log("Loaded videos:", videoData)
      console.log("Calculated stats:", {
        totalViews,
        totalWatchTime,
        totalVideos: videoData.length,
        avgEngagement,
      })
    } catch (error) {
      console.error("Error loading videos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-2">
          Monitor your video performance and engagement metrics
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Views
                </CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all videos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Watch Time
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(stats.totalWatchTime)} mins
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total watch duration
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Videos
                </CardTitle>
                <PlayCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalVideos}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Published content
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg. Engagement
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(stats.avgEngagement * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  User interaction rate
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {videos.slice(0, 5).map((video) => (
                    <div key={video.id} className="flex items-center">
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{video.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {video.views.toLocaleString()} views • {video.createdAt instanceof Date ? 
                            video.createdAt.toLocaleDateString() : 
                            new Date(video.createdAt.seconds * 1000).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Top Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {Object.entries(
                    videos.reduce((acc, video) => {
                      const category = video.category || "Uncategorized"
                      acc[category] = (acc[category] || 0) + 1
                      return acc
                    }, {} as Record<string, number>)
                  )
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([category, count]) => (
                      <div key={category} className="flex items-center">
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">{category}</p>
                          <p className="text-sm text-muted-foreground">
                            {count} videos
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}