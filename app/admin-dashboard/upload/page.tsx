"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, addDoc } from "firebase/firestore"
import { auth, db } from "@/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload, Loader2, X, CheckCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function UploadPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
  });

  // Reset success message after 5 seconds
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (uploadSuccess) {
      timer = setTimeout(() => {
        setUploadSuccess(false);
      }, 5000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [uploadSuccess]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      // Reset progress and success state when new file is selected
      setUploadProgress(0);
      setUploadSuccess(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a video file",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);
    setUploadSuccess(false);

    try {
      // Create XHR for upload with progress tracking
      const xhr = new XMLHttpRequest();
      const uploadData = new FormData();
      
      uploadData.append("file", selectedFile);
      
      // Get the Cloudinary credentials from environment variables
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "eoxs_video_tool";
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dxxq7qj5k";
      const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
      
      uploadData.append("upload_preset", uploadPreset);
      uploadData.append("resource_type", "video");
      uploadData.append("cloud_name", cloudName);
      uploadData.append("folder", "videos");
      
      if (apiKey) {
        uploadData.append("api_key", apiKey);
      }

      // Track upload progress
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      });

      // Promise wrapper for XHR
      const uploadPromise = new Promise<any>((resolve, reject) => {
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error("Invalid response format"));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
          }
        };
        
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(uploadData);
      });

      // Wait for upload to complete
      const cloudinaryData = await uploadPromise;

      // Save to Firestore
      await addDoc(collection(db, "videos"), {
        ...formData,
        videoUrl: cloudinaryData.secure_url,
        publicId: cloudinaryData.public_id,
        createdAt: new Date().toISOString(),
        views: 0,
        watchTime: 0,
        engagement: 0,
      });

      // Show success state
      setUploadSuccess(true);
      setUploadProgress(100);
      
      toast({
        title: "Success",
        description: "Video uploaded successfully",
      });

      // Reset form after successful upload
      setTimeout(() => {
        router.push("/admin-dashboard/videos");
      }, 2000);
    } catch (error) {
      console.error("Error uploading video:", error);
      toast({
        title: "Error",
        description: "Failed to upload video",
        variant: "destructive",
      });
      setUploadProgress(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    setUploadSuccess(false);
  };

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <Card className="shadow-sm">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="text-xl font-medium">Upload New Video</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {uploadSuccess && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700">
                Video uploaded successfully! Redirecting to video library...
              </AlertDescription>
            </Alert>
          )}
        
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-1">
              <Label htmlFor="title" className="text-sm font-medium">Title</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="h-9"
              />
            </div>

            <div className="grid gap-1">
              <Label htmlFor="category" className="text-sm font-medium">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1">
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="video" className="text-sm font-medium">Upload Video</Label>
              
              {!selectedFile ? (
                <div className="border-2 border-dashed rounded-md p-6 text-center">
                  <Input
                    id="video"
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label 
                    htmlFor="video" 
                    className="flex flex-col items-center cursor-pointer"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm font-medium mb-1">Click to upload</span>
                    <span className="text-xs text-muted-foreground">MP4, WebM, MOV (max 100MB)</span>
                  </label>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-muted rounded-md p-2">
                    <span className="text-sm truncate max-w-[240px]">{selectedFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeSelectedFile}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {previewUrl && (
                    <video
                      src={previewUrl}
                      controls
                      className="w-full h-auto rounded-md"
                      style={{ maxHeight: "200px" }}
                    />
                  )}
                  
                  {/* Upload progress bar */}
                  {uploadProgress > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Upload progress</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin-dashboard/videos")}
                className="h-9"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || uploadSuccess} 
                className="h-9"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading
                  </>
                ) : uploadSuccess ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Uploaded
                  </>
                ) : "Upload Video"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}