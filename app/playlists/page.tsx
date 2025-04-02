"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { auth, db } from "@/firebase"
import { Button } from "@/components/ui/button"
import { Home, LogOut, Lock, Play, ArrowLeft, Info, CheckCircle, Clock, MessageSquare } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ThemeToggle } from "@/components/theme-toggle"
import { Logo } from "@/components/logo"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

// Define Video and Playlist types
interface Video {
  id: string
  title: string
  duration: string
  thumbnail?: string
  publicId?: string
  tags?: string[]
  description?: string
  category?: string
  videoUrl?: string
}

interface Playlist {
  id: string
  createdAt: { seconds: number; nanoseconds: number }
  videos: Video[]
}

export default function PlaylistsPage() {
  const router = useRouter()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [user, setUser] = useState<any>(null)
  const [watchedVideos, setWatchedVideos] = useState<Record<string, Record<string, boolean>>>({})
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({})
  const [activePlaylist, setActivePlaylist] = useState<string | null>(null)
  const [videoWatchTimes, setVideoWatchTimes] = useState<Record<string, Record<string, number>>>({})
  const [videoStartTimes, setVideoStartTimes] = useState<Record<string, Record<string, number>>>({})
  const [videoProgress, setVideoProgress] = useState<Record<string, Record<string, number>>>({})
  const [videoDetailsOpen, setVideoDetailsOpen] = useState(false)
  const [selectedVideoDetails, setSelectedVideoDetails] = useState<Video | null>(null)
  const [playbackError, setPlaybackError] = useState<string | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [currentPlayingVideo, setCurrentPlayingVideo] = useState<{
    playlistId: string
    videoId: string
    index: number
  } | null>(null)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser)
      } else {
        router.push("/login")
      }
    })

    const handleBeforeUnload = () => {
      sessionStorage.setItem("navigationOccurred", "true")
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      unsubscribe()
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [router])

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const userId = auth.currentUser?.uid
        if (!userId) {
          setLoading(false)
          return
        }

        const q = query(collection(db, "playlists"), where("userId", "==", userId))
        const querySnapshot = await getDocs(q)

        const fetchedPlaylists: Playlist[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Playlist[]

        const initialWatchedState: Record<string, Record<string, boolean>> = {}
        const initialWatchTimesState: Record<string, Record<string, number>> = {}
        const initialProgressState: Record<string, Record<string, number>> = {}

        fetchedPlaylists.forEach((playlist) => {
          initialWatchedState[playlist.id] = {}
          initialWatchTimesState[playlist.id] = {}
          initialProgressState[playlist.id] = {}

          if (playlist.videos.length > 0) {
            initialWatchedState[playlist.id][playlist.videos[0].id] = false
            initialWatchTimesState[playlist.id][playlist.videos[0].id] = 0
            initialProgressState[playlist.id][playlist.videos[0].id] = 0
          }
        })

        setWatchedVideos(initialWatchedState)
        setVideoWatchTimes(initialWatchTimesState)
        setVideoProgress(initialProgressState)
        setPlaylists(fetchedPlaylists)

        if (fetchedPlaylists.length === 1) {
          setActivePlaylist(fetchedPlaylists[0].id)
        }

        setLoading(false)
      } catch (error) {
        console.error("Error fetching playlists:", error)
        setLoading(false)
      }
    }

    if (user) {
      fetchPlaylists()
    }
  }, [user])

  const handleVideoPlay = (playlistId: string, videoId: string, videoTitle: string, index: number) => {
    if (
      currentPlayingVideo &&
      (currentPlayingVideo.playlistId !== playlistId || currentPlayingVideo.videoId !== videoId)
    ) {
      const currentVideoRef = videoRefs.current[`${currentPlayingVideo.playlistId}-${currentPlayingVideo.videoId}`]
      if (currentVideoRef) {
        currentVideoRef.pause()
      }
    }

    setCurrentPlayingVideo({ playlistId, videoId, index })

    const now = Date.now() / 1000
    setVideoStartTimes((prev) => ({
      ...prev,
      [playlistId]: {
        ...prev[playlistId],
        [videoId]: now,
      },
    }))

    const isRewatch = watchedVideos[playlistId]?.[videoId] === true

    addDoc(collection(db, "videoWatchEvents"), {
      videoId,
      videoTitle,
      userId: user.uid,
      playlistId,
      watchedAt: serverTimestamp(),
      isRewatch,
      completed: false,
      watchDuration: 0,
    })
  }

  const handleVideoPause = (playlistId: string, videoId: string, videoTitle: string) => {
    const startTime = videoStartTimes[playlistId]?.[videoId] || 0
    if (startTime === 0) return

    const now = Date.now() / 1000
    const duration = now - startTime

    setVideoWatchTimes((prev) => ({
      ...prev,
      [playlistId]: {
        ...prev[playlistId],
        [videoId]: (prev[playlistId]?.[videoId] || 0) + duration,
      },
    }))

    addDoc(collection(db, "videoWatchEvents"), {
      videoId,
      videoTitle,
      userId: user.uid,
      playlistId,
      watchedAt: serverTimestamp(),
      isRewatch: watchedVideos[playlistId]?.[videoId] === true,
      completed: false,
      watchDuration: duration,
    })

    setVideoStartTimes((prev) => ({
      ...prev,
      [playlistId]: {
        ...prev[playlistId],
        [videoId]: 0,
      },
    }))

    setCurrentPlayingVideo(null)
  }

  const handleVideoTimeUpdate = (
    playlistId: string,
    videoId: string,
    event: React.SyntheticEvent<HTMLVideoElement>,
  ) => {
    const video = event.currentTarget
    const progress = (video.currentTime / video.duration) * 100

    setVideoProgress((prev) => ({
      ...prev,
      [playlistId]: {
        ...prev[playlistId],
        [videoId]: progress,
      },
    }))
  }

  const handleVideoEnded = async (playlistId: string, videoId: string, videoTitle: string, index: number) => {
    const startTime = videoStartTimes[playlistId]?.[videoId] || 0
    if (startTime === 0) return

    const now = Date.now() / 1000
    const duration = now - startTime

    setVideoWatchTimes((prev) => ({
      ...prev,
      [playlistId]: {
        ...prev[playlistId],
        [videoId]: (prev[playlistId]?.[videoId] || 0) + duration,
      },
    }))

    setWatchedVideos((prev) => ({
      ...prev,
      [playlistId]: {
        ...prev[playlistId],
        [videoId]: true,
        ...(index + 1 < playlists.find((p) => p.id === playlistId)?.videos.length
          ? { [playlists.find((p) => p.id === playlistId)?.videos[index + 1].id as string]: false }
          : {}),
      },
    }))

    await addDoc(collection(db, "videoWatchEvents"), {
      videoId,
      videoTitle,
      userId: user.uid,
      playlistId,
      watchedAt: serverTimestamp(),
      isRewatch: false,
      completed: true,
      watchDuration: duration,
    })

    setVideoStartTimes((prev) => ({
      ...prev,
      [playlistId]: {
        ...prev[playlistId],
        [videoId]: 0,
      },
    }))

    setVideoProgress((prev) => ({
      ...prev,
      [playlistId]: {
        ...prev[playlistId],
        [videoId]: 100,
      },
    }))

    setCurrentPlayingVideo(null)
  }

  const isVideoPlayable = (playlistId: string, videoId: string, index: number) => {
    if (index === 0) return true
    const prevVideoId = playlists.find((p) => p.id === playlistId)?.videos[index - 1].id
    return prevVideoId && watchedVideos[playlistId]?.[prevVideoId] === true
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const showVideoDetails = (video: Video, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedVideoDetails(video)
    setVideoDetailsOpen(true)
  }

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) return

    setSubmittingFeedback(true)
    try {
      await addDoc(collection(db, "feedback"), {
        userId: user?.uid,
        userEmail: user?.email,
        feedback,
        createdAt: serverTimestamp(),
      })

      setSubmittingFeedback(false)
      setFeedback("")
      setFeedbackOpen(false)
    } catch (error) {
      console.error("Error submitting feedback:", error)
      setSubmittingFeedback(false)
    }
  }

  const formatDate = (seconds: number) => {
    const date = new Date(seconds * 1000)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <header className="border-b sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <Link href="/">
              <Logo width={120} height={40} />
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
                    <Home className="h-5 w-5" />
                    <span className="sr-only">Dashboard</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Back to Dashboard</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <ThemeToggle />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleLogout}>
                    <LogOut className="h-5 w-5" />
                    <span className="sr-only">Log out</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Logout</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-8 px-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" className="mr-2" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Your Playlists</h1>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-12 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-dashed">
            <Play className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground mb-4">You haven't created any playlists yet.</p>
            <Button
              className="bg-primary hover:bg-primary/90 btn-enhanced btn-primary-enhanced"
              onClick={() => router.push("/dashboard")}
            >
              Create Your First Playlist
            </Button>
          </div>
        ) : (
          <motion.div className="space-y-8" variants={containerVariants} initial="hidden" animate="visible">
            {playlists.map((playlist) => (
              <motion.div
                key={playlist.id}
                className="bg-white/50 dark:bg-gray-800/50 p-6 rounded-lg shadow-sm border"
                variants={itemVariants}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-xl">
                    Playlist Created: <span className="text-primary">{formatDate(playlist.createdAt.seconds)}</span>
                  </h2>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFeedbackOpen(true)}
                      className="transition-all duration-200"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Feedback
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActivePlaylist(activePlaylist === playlist.id ? null : playlist.id)}
                      className="transition-all duration-200"
                    >
                      {activePlaylist === playlist.id ? "Collapse" : "Expand"}
                    </Button>
                  </div>
                </div>

                <AnimatePresence>
                  {activePlaylist === playlist.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {playlist.videos.map((video, index) => (
                          <Card
                            key={video.id}
                            className={`overflow-hidden transition-all duration-300 bg-white dark:bg-gray-800 ${
                              isVideoPlayable(playlist.id, video.id, index)
                                ? "border-border hover:shadow-md"
                                : "border-muted opacity-70"
                            }`}
                          >
                            <div className="relative">
                              {!isVideoPlayable(playlist.id, video.id, index) && (
                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
                                  <Lock className="h-10 w-10 text-white mb-2" />
                                  <p className="text-white text-sm text-center px-4">Watch previous video first</p>
                                </div>
                              )}

                              <div className="aspect-video bg-gray-100 dark:bg-gray-700 relative">
                                {video.publicId ? (
                                  <video
                                    ref={(el) => (videoRefs.current[`${playlist.id}-${video.id}`] = el)}
                                    src={`https://res.cloudinary.com/dvuf7bf0x/video/upload/${video.publicId}.mp4`}
                                    controls={isVideoPlayable(playlist.id, video.id, index)}
                                    controlsList="nodownload noremoteplayback"
                                    disablePictureInPicture
                                    onContextMenu={(e) => e.preventDefault()}
                                    className="w-full h-full object-cover"
                                    style={{
                                      pointerEvents: isVideoPlayable(playlist.id, video.id, index) ? "auto" : "none",
                                    }}
                                    onPlay={() => handleVideoPlay(playlist.id, video.id, video.title, index)}
                                    onPause={() => handleVideoPause(playlist.id, video.id, video.title)}
                                    onTimeUpdate={(e) => handleVideoTimeUpdate(playlist.id, video.id, e)}
                                    onEnded={() => handleVideoEnded(playlist.id, video.id, video.title, index)}
                                    onError={() => setPlaybackError("Error playing video. Please try again.")}
                                    playsInline
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Play className="h-10 w-10 text-muted-foreground" />
                                  </div>
                                )}

                                {isVideoPlayable(playlist.id, video.id, index) && (
                                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-600">
                                    <div
                                      className="h-full bg-primary transition-all duration-100"
                                      style={{ width: `${videoProgress[playlist.id]?.[video.id] || 0}%` }}
                                    ></div>
                                  </div>
                                )}
                              </div>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 h-8 w-8 bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
                                onClick={(e) => showVideoDetails(video, e)}
                              >
                                <Info className="h-4 w-4" />
                              </Button>
                            </div>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-center">
                                <h3 className="font-medium truncate">{video.title}</h3>
                                {watchedVideos[playlist.id]?.[video.id] === true && (
                                  <Badge className="bg-green-600 text-white">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Watched
                                  </Badge>
                                )}
                              </div>

                              <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                                <div className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {video.duration}
                                </div>

                                {video.category && (
                                  <Badge variant="outline" className="text-xs">
                                    {video.category}
                                  </Badge>
                                )}
                              </div>

                              {video.tags && video.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {video.tags.slice(0, 2).map((tag, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {video.tags.length > 2 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{video.tags.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        )}

        {playbackError && (
          <div className="fixed bottom-4 right-4 bg-destructive text-white p-4 rounded-md shadow-lg">
            {playbackError}
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 text-white hover:bg-white/20"
              onClick={() => setPlaybackError(null)}
            >
              Dismiss
            </Button>
          </div>
        )}
      </main>

      <footer className="border-t bg-white dark:bg-gray-900">
        <div className="container flex flex-col items-center justify-between gap-4 py-6 md:h-16 md:flex-row md:py-0">
          <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
            <p className="text-sm text-gray-500 dark:text-gray-400">Where Steel Meets Technology</p>
          </div>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 md:text-left">
            © {new Date().getFullYear()} EOXS. All rights reserved.
          </p>
        </div>
      </footer>

      <Dialog open={videoDetailsOpen} onOpenChange={setVideoDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedVideoDetails?.title}</DialogTitle>
            <DialogDescription>Video details and information</DialogDescription>
          </DialogHeader>

          {selectedVideoDetails && (
            <div className="space-y-4">
              <div className="rounded-md overflow-hidden">
                <Image
                  src={selectedVideoDetails.thumbnail || "/placeholder.svg?height=180&width=320"}
                  alt={selectedVideoDetails.title}
                  width={400}
                  height={225}
                  className="w-full object-cover"
                />
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Duration</h4>
                  <p>{selectedVideoDetails.duration}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Category</h4>
                  <p>{selectedVideoDetails.category || "Uncategorized"}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                  <p className="text-sm">{selectedVideoDetails.description}</p>
                </div>

                {selectedVideoDetails.tags && selectedVideoDetails.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Tags</h4>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedVideoDetails.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Your Feedback</DialogTitle>
            <DialogDescription>We'd love to hear your thoughts about our demo videos and platform.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Textarea
              placeholder="What did you think about the videos? Any suggestions for improvement?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitFeedback}
              disabled={!feedback.trim() || submittingFeedback}
              className="bg-primary hover:bg-primary/90 btn-enhanced"
            >
              {submittingFeedback ? "Submitting..." : "Submit Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 