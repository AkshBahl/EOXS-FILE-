"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { auth, db } from "@/firebase";
import { signOut } from "firebase/auth";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Eye, List, Layout, ChevronDown } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Video {
  id: string;
  title: string;
  duration?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  description?: string;
  publicId?: string;
  tags?: string[];
  category?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

const VideoCard = ({ video, isSelected, onSelect }: { video: Video; isSelected: boolean; onSelect: () => void }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsVideoLoaded(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
    }
  };

  return (
    <>
      <Card
        className={`group relative cursor-pointer transition-all duration-300 hover:shadow-md bg-card border-border ${
          isSelected ? "ring-1 ring-primary" : "hover:border-primary/30"
        }`}
        onClick={onSelect}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="relative">
          <div className="aspect-video overflow-hidden bg-muted rounded-t-lg">
            <Image
              src={video.publicId ? `https://res.cloudinary.com/dvuf7bf0x/video/upload/${video.publicId}.jpg` : "/placeholder.svg"}
              alt={video.title}
              width={320}
              height={180}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                isHovered && isVideoLoaded ? "opacity-0" : "opacity-100"
              }`}
              priority
            />
            
            {/* Video Preview */}
            {isHovered && video.publicId && (
              <video
                ref={videoRef}
                src={`https://res.cloudinary.com/dvuf7bf0x/video/upload/e_preview:duration_8/${video.publicId}.mp4`}
                autoPlay
                muted
                loop
                playsInline
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  isVideoLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoadedData={() => setIsVideoLoaded(true)}
                onError={() => setIsVideoLoaded(false)}
              />
            )}

            {/* Loading Indicator */}
            {isHovered && !isVideoLoaded && video.publicId && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Badges Container */}
            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
              {video.category && (
                <Badge variant="secondary" className="bg-black/50 text-white border-0">
                  {video.category}
                </Badge>
              )}
              {video.duration && (
                <Badge variant="secondary" className="bg-black/50 text-white border-0">
                  {video.duration}
                </Badge>
              )}
            </div>

            {/* Details Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-black/30 hover:bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails(true);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>

          <CardContent className="p-3">
            <h3 className="font-medium text-sm line-clamp-2 text-foreground/90">{video.title}</h3>
          </CardContent>
        </div>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">{video.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <video
                src={video.videoUrl}
                controls
                className="w-full h-full"
                poster={video.publicId ? `https://res.cloudinary.com/dvuf7bf0x/video/upload/${video.publicId}.jpg` : undefined}
              />
            </div>
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-foreground/80 mb-1">Description</h4>
                <p className="text-sm text-muted-foreground">{video.description || "No description available."}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-primary/5">
                  {video.category}
                </Badge>
                {video.tags?.map((tag) => (
                  <Badge key={tag} variant="outline" className="bg-muted">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: "",
    description: "",
    category: "",
    file: null as File | null,
  });
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [showAllVideos, setShowAllVideos] = useState(false);

  const loadVideos = async () => {
    try {
      setIsLoading(true);
      const querySnapshot = await getDocs(collection(db, "videos"));
      const videoData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        thumbnail: doc.data().publicId
          ? `https://res.cloudinary.com/dvuf7bf0x/video/upload/${doc.data().publicId}.jpg`
          : "/placeholder.svg",
      })) as Video[];

      setVideos(videoData);
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setUploadData(prev => ({ ...prev, file }));
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select a video file",
        variant: "destructive",
      });
    }
  };

  const handleUpload = async () => {
    if (!uploadData.file || !uploadData.title || !uploadData.category) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create form data for Cloudinary upload
      const formData = new FormData();
      formData.append('file', uploadData.file);
      formData.append('upload_preset', 'eoxsDemoTool');

      // Upload to Cloudinary
      const cloudinaryResponse = await fetch('https://api.cloudinary.com/v1_1/dvuf7bf0x/video/upload', {
        method: 'POST',
        body: formData,
      });

      if (!cloudinaryResponse.ok) {
        throw new Error('Failed to upload to Cloudinary');
      }

      const uploadProgressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 500);

      const cloudinaryData = await cloudinaryResponse.json();
      clearInterval(uploadProgressInterval);
      setUploadProgress(100);

      // Add to Firestore
      await addDoc(collection(db, "videos"), {
        title: uploadData.title,
        description: uploadData.description,
        category: uploadData.category,
        videoUrl: cloudinaryData.secure_url,
        publicId: cloudinaryData.public_id,
        createdAt: new Date().toISOString(),
      });

      // Show success banner
      setShowSuccessBanner(true);
      setTimeout(() => setShowSuccessBanner(false), 5000); // Hide after 5 seconds

      // Reset and close dialog
      setUploadData({
        title: "",
        description: "",
        category: "",
        file: null,
      });
      setIsUploading(false);
      setShowUploadDialog(false);

      // Refresh video list
      loadVideos();
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your video",
        variant: "destructive",
      });
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layout className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost"
              onClick={() => setShowAllVideos(!showAllVideos)}
              className="flex items-center gap-2 text-sm"
            >
              <List className="h-4 w-4" />
              {showAllVideos ? 'Hide Videos' : 'View Videos'}
              <ChevronDown className={`h-4 w-4 transition-transform ${showAllVideos ? 'rotate-180' : ''}`} />
            </Button>
            <Button 
              variant="default" 
              onClick={() => setShowUploadDialog(true)}
              className="flex items-center gap-2"
              size="sm"
            >
              <Upload className="h-4 w-4" />
              Upload
            </Button>
            <div className="h-6 w-px bg-border" />
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={() => signOut(auth)}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Success Banner */}
        {showSuccessBanner && (
          <Alert className="mb-6 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/50">
            <AlertTitle className="text-emerald-600 dark:text-emerald-400 font-medium">Upload Successful</AlertTitle>
            <AlertDescription className="text-emerald-600/90 dark:text-emerald-400/90">
              Your video has been uploaded and is now available.
            </AlertDescription>
          </Alert>
        )}

        {/* Video Grid */}
        {showAllVideos && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
          >
            {isLoading ? (
              <div className="col-span-full flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : videos.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No videos found. Upload your first video to get started.
              </div>
            ) : (
              videos.map((video) => (
                <motion.div key={video.id} variants={itemVariants}>
                  <VideoCard
                    video={video}
                    isSelected={false}
                    onSelect={() => {}}
                  />
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {/* Upload Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Video</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Enter video title"
                  value={uploadData.title}
                  onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
                  disabled={isUploading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={uploadData.category}
                  onValueChange={(value) => setUploadData(prev => ({ ...prev, category: value }))}
                  disabled={isUploading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Technology">Technology</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter video description"
                  value={uploadData.description}
                  onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                  disabled={isUploading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="video">Video File</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="video"
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                  />
                  {uploadData.file && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setUploadData(prev => ({ ...prev, file: null }))}
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-sm text-center text-muted-foreground">
                    Uploading... {Math.round(uploadProgress)}%
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowUploadDialog(false)}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!uploadData.file || !uploadData.title || !uploadData.category || isUploading}
                >
                  {isUploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
} 