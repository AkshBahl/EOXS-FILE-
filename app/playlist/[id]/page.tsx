"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Lock, Play, CheckCircle, ArrowLeft, Clock } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";

interface Video {
  id: string;
  title: string;
  duration?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  description?: string;
  publicId?: string;
  tags?: string[];
  category?: string;
}

export default function PlaylistPage() {
  const params = useParams();
  const playlistId = params?.id as string;
  const router = useRouter();
  const [playlist, setPlaylist] = useState<{ videos: Video[]; unlocked: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoStartTime, setVideoStartTime] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    const fetchPlaylist = async () => {
      if (!playlistId) {
        toast({
          title: "Error",
          description: "No playlist ID provided",
          variant: "destructive",
        });
        router.push("/dashboard");
        return;
      }

      try {
        const docRef = doc(db, "playlists", playlistId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPlaylist({
            videos: data.videos || [],
            unlocked: data.unlocked || 1
          });
        } else {
          toast({
            title: "Error",
            description: "Playlist not found",
            variant: "destructive",
          });
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Error fetching playlist:", error);
        toast({
          title: "Error",
          description: "Failed to load playlist",
          variant: "destructive",
        });
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylist();
  }, [playlistId, router]);

  useEffect(() => {
    // Prevent keyboard shortcuts for video control
    const preventKeyboardShortcuts = (e: KeyboardEvent) => {
      if ([' ', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', preventKeyboardShortcuts);
    return () => window.removeEventListener('keydown', preventKeyboardShortcuts);
  }, []);

  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const currentTime = video.currentTime;
    
    // Update progress
    setProgress((currentTime / video.duration) * 100);
    
    // If the video is seeking or the time has jumped significantly
    if (Math.abs(currentTime - videoStartTime) > 1) {
      video.currentTime = videoStartTime;
    } else {
      setVideoStartTime(currentTime);
    }
  };

  const handleVideoPlay = () => {
    if (!videoRef.current) return;
    setVideoStartTime(videoRef.current.currentTime);
  };

  const handleVideoEnd = async () => {
    if (!playlist || currentVideoIndex >= playlist.videos.length - 1) return;

    try {
      // Unlock next video
      const newUnlocked = Math.min(currentVideoIndex + 2, playlist.videos.length);
      await updateDoc(doc(db, "playlists", playlistId), {
        unlocked: newUnlocked
      });

      setPlaylist(prev => prev ? { ...prev, unlocked: newUnlocked } : null);
      
      toast({
        title: "Video Completed! 🎉",
        description: "Next video has been unlocked.",
        duration: 3000,
      });

      // Short delay before moving to next video
      setTimeout(() => {
        setCurrentVideoIndex(currentVideoIndex + 1);
      }, 1000);

    } catch (error) {
      console.error("Error updating playlist:", error);
      toast({
        title: "Error",
        description: "Failed to unlock next video",
        variant: "destructive"
      });
    }
  };

  const switchVideo = (index: number) => {
    if (!playlist || index >= playlist.unlocked) return;
    setCurrentVideoIndex(index);
    setProgress(0);
    setVideoStartTime(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!playlist) return null;

  const currentVideo = playlist.videos[currentVideoIndex];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 hidden md:flex">
            <Button variant="ghost" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none">
              <h1 className="text-xl font-bold">Your Playlist</h1>
            </div>
            <nav className="flex items-center space-x-2">
              <ThemeToggle />
            </nav>
          </div>
        </div>
      </header>

      <main className="container py-6 px-4">
        {/* Main Video Player */}
        {currentVideo && (
          <div className="mb-8">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-4">
              <video
                ref={videoRef}
                src={currentVideo.publicId 
                  ? `https://res.cloudinary.com/dvuf7bf0x/video/upload/${currentVideo.publicId}.mp4`
                  : currentVideo.videoUrl}
                className="w-full h-full"
                controls
                controlsList="nodownload noremoteplayback nofullscreen"
                onPlay={handleVideoPlay}
                onEnded={handleVideoEnd}
                onTimeUpdate={handleVideoTimeUpdate}
                onSeeking={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = videoStartTime;
                  }
                }}
                onContextMenu={(e) => e.preventDefault()}
                disablePictureInPicture
                playsInline
              />
              {/* Progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
                <div 
                  className="h-full bg-primary transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">{currentVideo.title}</h2>
              <div className="flex items-center gap-2">
                {currentVideo.category && (
                  <Badge variant="outline">{currentVideo.category}</Badge>
                )}
                {currentVideo.duration && (
                  <Badge variant="secondary">{currentVideo.duration}</Badge>
                )}
              </div>
              {currentVideo.description && (
                <p className="text-muted-foreground mt-2">{currentVideo.description}</p>
              )}
              {currentVideo.tags && currentVideo.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {currentVideo.tags.map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Playlist Videos */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Videos in Playlist</h2>
          <div className="grid gap-4">
            {playlist.videos.map((video, index) => (
              <Card 
                key={video.id} 
                className={`overflow-hidden cursor-pointer transition-all duration-200 ${
                  index === currentVideoIndex ? 'ring-2 ring-primary' : ''
                } ${index >= playlist.unlocked ? 'opacity-60' : 'hover:bg-accent'}`}
                onClick={() => switchVideo(index)}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4 items-center">
                    <div className="relative w-48 aspect-video rounded-md overflow-hidden">
                      <Image
                        src={video.thumbnailUrl || (video.publicId 
                          ? `https://res.cloudinary.com/dvuf7bf0x/video/upload/${video.publicId}.jpg`
                          : "/placeholder.svg")}
                        alt={video.title}
                        fill
                        className="object-cover"
                      />
                      {index >= playlist.unlocked && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                          <Lock className="w-6 h-6 text-white" />
                        </div>
                      )}
                      {index < currentVideoIndex && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle className="w-6 h-6 text-green-500" />
                        </div>
                      )}
                      {index === currentVideoIndex && (
                        <div className="absolute bottom-2 right-2">
                          <Badge className="bg-primary">Currently Playing</Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{video.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {video.duration && (
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {video.duration}
                          </span>
                        )}
                        {video.category && (
                          <Badge variant="outline" className="text-xs">
                            {video.category}
                          </Badge>
                        )}
                      </div>
                      {index >= playlist.unlocked && (
                        <p className="text-sm text-muted-foreground mt-2 flex items-center">
                          <Lock className="w-4 h-4 mr-1" />
                          Complete previous video to unlock
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
} 