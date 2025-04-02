"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs } from "firebase/firestore"
import { signOut, User } from "firebase/auth"
import { auth, db } from "@/firebase"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Download, FileText, Filter } from "lucide-react"

interface Video {
  id: string;
  title: string;
  description?: string;
  category?: string;
  videoUrl?: string;
  publicId?: string;
  createdAt: string;
  views?: number;
  watchTime?: number;
  engagement?: number;
}

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportType, setReportType] = useState("all");

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
      const querySnapshot = await getDocs(collection(db, "videos"));
      const videoData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt || new Date().toISOString(),
        title: doc.data().title || "Untitled Video",
      })) as Video[];
      setVideos(videoData);
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredVideos = videos.filter(video => {
    if (reportType === "all") return true;
    return video.category === reportType;
  });

  const handleDownloadReport = () => {
    // Create CSV content
    const headers = ["Title", "Category", "Views", "Watch Time", "Engagement Rate", "Created At"];
    const rows = filteredVideos.map(video => [
      video.title,
      video.category || "Uncategorized",
      video.views || 0,
      video.watchTime ? `${video.watchTime}h` : "0h",
      `${video.engagement || 0}%`,
      new Date(video.createdAt).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(",")),
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `video-report-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex items-center gap-4">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Videos</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="technology">Technology</SelectItem>
              <SelectItem value="education">Education</SelectItem>
              <SelectItem value="entertainment">Entertainment</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleDownloadReport}>
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Watch Time</TableHead>
              <TableHead>Engagement Rate</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : filteredVideos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">No videos found</TableCell>
              </TableRow>
            ) : (
              filteredVideos.map((video) => (
                <TableRow key={video.id}>
                  <TableCell className="font-medium">{video.title}</TableCell>
                  <TableCell>{video.category || "Uncategorized"}</TableCell>
                  <TableCell>{video.views || 0}</TableCell>
                  <TableCell>{video.watchTime ? `${video.watchTime}h` : "0h"}</TableCell>
                  <TableCell>{video.engagement || 0}%</TableCell>
                  <TableCell>{new Date(video.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 