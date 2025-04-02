import { v2 as cloudinary } from 'cloudinary';
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/firebase";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function fetchVideos() {
  try {
    const videosRef = collection(db, "videos");
    const q = query(videosRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      let createdAt = new Date().toISOString(); // Default to current date

      try {
        // Handle Firestore Timestamp
        if (data.createdAt?.toDate) {
          createdAt = data.createdAt.toDate().toISOString();
        }
        // Handle ISO string
        else if (typeof data.createdAt === 'string') {
          const date = new Date(data.createdAt);
          if (!isNaN(date.getTime())) {
            createdAt = date.toISOString();
          }
        }
        // Handle timestamp number
        else if (typeof data.createdAt === 'number') {
          createdAt = new Date(data.createdAt).toISOString();
        }
      } catch (error) {
        console.error("Error parsing date:", error);
      }

      return {
        id: doc.id,
        ...data,
        createdAt,
      };
    });
  } catch (error) {
    console.error("Error fetching videos:", error);
    return [];
  }
}

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
};

export const uploadVideo = async (file: File, category: string, tags: string[]) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'default_preset');
  formData.append('context', `category=${category}`);
  formData.append('tags', tags.join(','));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`, {
    method: 'POST',
    body: formData,
  });
  return response.json();
};

export const fetchAnalytics = async (publicId: string) => {
  const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/resources/video/analytics?public_ids=${publicId}`, {
    headers: { Authorization: `Basic ${btoa(`${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}`)}` },
  });
  return response.json();
};