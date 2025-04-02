import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";

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

export async function fetchVideos(): Promise<Video[]> {
  const querySnapshot = await getDocs(collection(db, "videos"));
  
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title || `Video ${doc.id.substring(0, 6)}`,
      description: data.description || '',
      category: data.category || '',
      duration: data.duration || '',
      publicId: data.publicId || '',
      thumbnailUrl: data.thumbnailUrl || '',
      videoUrl: data.videoUrl || '',
      tags: data.tags || [],
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
    };
  });
} 