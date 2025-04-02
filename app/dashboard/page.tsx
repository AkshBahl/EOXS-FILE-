"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, LogOut, Search, Save, X, Play, Eye, CheckCircle, PlayCircle } from "lucide-react";
import { auth, db } from "@/firebase";
import { signOut } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ThemeToggle } from "../theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { fetchVideos } from "../lib/cloudinary";

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
  createdAt?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

const VideoListItem = ({ 
  video, 
  isSelected, 
  onSelect,
  onViewDetails 
}: { 
  video: Video; 
  isSelected: boolean; 
  onSelect: () => void;
  onViewDetails: (e: React.MouseEvent) => void;
}) => {
  const displayTitle = video.title || "Untitled Video";

  return (
    <Card
      className={`flex items-center p-4 gap-4 cursor-pointer transition-colors duration-200 ${
        isSelected ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
      }`}
      onClick={onSelect}
    >
      <div className="flex-shrink-0">
        {isSelected ? (
          <CheckCircle className="h-5 w-5 text-primary" />
        ) : (
          <Play className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium truncate">{displayTitle}</h3>
          {video.duration && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {video.duration}
            </span>
          )}
        </div>

        {video.description && (
          <p className="text-sm text-muted-foreground truncate">
            {video.description}
          </p>
        )}

        {video.tags && video.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {video.tags.map((tag, index) => (
              <Badge key={index} variant="outline">{tag}</Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-primary"
          onClick={onViewDetails}
        >
          <Eye className="h-4 w-4 mr-2" />
          Details
        </Button>
        <Button
          variant={isSelected ? "default" : "outline"}
          size="sm"
          className="whitespace-nowrap"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          {isSelected ? 'Selected' : 'Select'}
        </Button>
      </div>
    </Card>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [videos, setVideos] = useState<Video[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVideoForDetails, setSelectedVideoForDetails] = useState<Video | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [playlistVideoCount, setPlaylistVideoCount] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);
    });

    loadVideos();
    return () => unsubscribe();
  }, [router]);

  const loadVideos = async () => {
    try {
      setIsLoading(true);
      const videoData = await fetchVideos();
    
      const processedVideoData = videoData.map((video) => {
        const data = video as unknown as {
          id: string;
          title?: string;
          description?: string;
          duration?: string;
          publicId?: string;
          tags?: string[];
        };

        const processedVideo: Video = {
          id: data.id,
          title: data.title || `Video ${data.id.substring(0, 6)}`,
          description: data.description || '',
          duration: data.duration || '',
          publicId: data.publicId || '',
          tags: data.tags || [],
        };

        if (!processedVideo.title || processedVideo.title.match(/^[a-z0-9]{15,}$/i)) {
          processedVideo.title = processedVideo.description 
            ? `Video: ${processedVideo.description.substring(0, 30)}${processedVideo.description.length > 30 ? '...' : ''}` 
            : `Video #${processedVideo.id.substring(0, 8)}`;
        }
        
        if (processedVideo.publicId) {
          processedVideo.videoUrl = `https://res.cloudinary.com/dvuf7bf0x/video/upload/${processedVideo.publicId}.mp4`;
          processedVideo.thumbnailUrl = `https://res.cloudinary.com/dvuf7bf0x/video/upload/${processedVideo.publicId}.jpg`;
        }
        
        return processedVideo;
      });
      
      setVideos(processedVideoData);
      setFilteredVideos(processedVideoData);
    } catch (error) {
      console.error("Error fetching videos:", error);
      toast({ 
        title: "Error", 
        description: "Failed to load videos. Please try again later.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterVideos = useCallback(() => {
    if (!searchTerm) return videos;
    
    const lowerCaseQuery = searchTerm.toLowerCase();
    return videos.filter(video => 
      video.title.toLowerCase().includes(lowerCaseQuery) ||
      (video.description && video.description.toLowerCase().includes(lowerCaseQuery)) ||
      (video.tags && video.tags.some(tag => tag.toLowerCase().includes(lowerCaseQuery)))
    );
  }, [searchTerm, videos]);

  useEffect(() => {
    setFilteredVideos(filterVideos());
  }, [filterVideos]);

  const toggleVideoSelection = useCallback((videoId: string) => {
    setSelectedVideos(prev => 
      prev.includes(videoId) 
        ? prev.filter(id => id !== videoId) 
        : [...prev, videoId]
    );
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      toast({ title: "Logout Failed", description: "Please try again", variant: "destructive" });
    }
  };

  const handleSubmit = async () => {
    if (selectedVideos.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one video.",
        variant: "destructive",
      });
      return;
    }

    if (!user?.email) {
      toast({ 
        title: "Authentication Error", 
        description: "Please log in again to create a playlist", 
        variant: "destructive" 
      });
      return;
    }

    setSubmitting(true);

    try {
      const selectedVideoData = videos
        .filter(video => selectedVideos.includes(video.id))
        .map(video => ({
          id: video.id,
          title: video.title || 'Untitled Video',
          description: video.description || '',
          videoUrl: video.videoUrl || '',
          thumbnailUrl: video.thumbnailUrl || '',
          duration: video.duration || '',
          publicId: video.publicId || ''
        }));
      
      setPlaylistVideoCount(selectedVideoData.length);
      
      const playlistRef = await addDoc(collection(db, "playlists"), {
        userId: user?.uid || "",
        userEmail: user?.email || "",
        createdAt: serverTimestamp(),
        videos: selectedVideoData,
        unlocked: 1
      });

      const playlistUrl = `${window.location.origin}/playlist/${playlistRef.id}`;

      const emailResponse = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: user?.email,
          subject: 'Your Video Playlist is Ready!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Your Video Playlist is Ready! 🎉</h2>
              <p>Your playlist has been created successfully. Click the button below to start watching:</p>
              <a href="${playlistUrl}" 
                 style="display: inline-block; background-color: #0070f3; color: white; 
                        padding: 12px 24px; text-decoration: none; border-radius: 5px; 
                        margin: 20px 0;">
                View Your Playlist
              </a>
              <p style="color: #666; font-size: 14px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <span style="color: #0070f3;">${playlistUrl}</span>
              </p>
            </div>
          `
        }),
      });

      const emailResult = await emailResponse.json();

      if (!emailResponse.ok) {
        throw new Error(emailResult.error || 'Failed to send email');
      }

      setShowSuccessDialog(true);
      
      toast({
        title: "Playlist Created! 🎉",
        description: "The playlist link has been sent to your email.",
        duration: 2000,
      });

      setSelectedVideos([]);

      setTimeout(() => {
        router.push(`/feedback?playlistId=${playlistRef.id}`);
      }, 2000);

    } catch (error: any) {
      console.error("Error:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create playlist. Please try again.", 
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = (video: Video) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedVideoForDetails(video);
    setShowDetailsDialog(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 max-w-[1400px] mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold">Video Dashboard</span>
          </Link>
          <nav className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="text-sm hidden sm:inline">{user?.email}</span>
            </div>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 container py-6 px-4 max-w-[1400px] mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search videos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 w-full"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="flex items-center gap-4 justify-end">
              <Button
                onClick={handleSubmit}
                disabled={submitting || !selectedVideos.length}
                className="min-w-[180px]"
              >
                {submitting ? (
                  "Creating..."
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Playlist ({selectedVideos.length})
                  </>
                )}
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
              <PlayCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No videos found</p>
            </div>
          ) : (
            <motion.div
              className="space-y-2"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {filteredVideos.map((video) => (
                <motion.div key={video.id} variants={itemVariants}>
                  <VideoListItem
                    video={video}
                    isSelected={selectedVideos.includes(video.id)}
                    onSelect={() => toggleVideoSelection(video.id)}
                    onViewDetails={(e) => handleViewDetails(video)(e)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </main>

      <footer className="border-t py-4 text-center text-sm text-muted-foreground">
        <div className="container max-w-[1400px] mx-auto">
          © {new Date().getFullYear()} Video Dashboard. All rights reserved.
        </div>
      </footer>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Video Details</DialogTitle>
          </DialogHeader>
          {selectedVideoForDetails && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold">Title</h3>
                  <p>{selectedVideoForDetails.title}</p>
                </div>

                {selectedVideoForDetails.description && (
                  <div>
                    <h3 className="font-semibold">Description</h3>
                    <p className="text-muted-foreground">{selectedVideoForDetails.description}</p>
                  </div>
                )}

                {selectedVideoForDetails.duration && (
                  <div>
                    <h3 className="font-semibold">Duration</h3>
                    <span className="text-muted-foreground">{selectedVideoForDetails.duration}</span>
                  </div>
                )}

                {selectedVideoForDetails.tags && selectedVideoForDetails.tags.length > 0 && (
                  <div>
                    <h3 className="font-semibold">Tags</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedVideoForDetails.tags.map((tag, index) => (
                        <Badge key={index} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  variant="outline"
                  onClick={() => setShowDetailsDialog(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    toggleVideoSelection(selectedVideoForDetails.id);
                    setShowDetailsDialog(false);
                  }}
                >
                  {selectedVideos.includes(selectedVideoForDetails.id) ? 'Remove from Playlist' : 'Add to Playlist'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              Playlist Created Successfully!
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-center">
                Your playlist with {playlistVideoCount} videos has been created and sent to your email.
              </p>
            </div>
            
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Redirecting to feedback form in 2 seconds...</p>
            </div>
            
            <div className="flex justify-center">
              <AnimatePresence>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2 }}
                  className="h-1 bg-primary rounded-full"
                />
              </AnimatePresence>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}