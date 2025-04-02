import { NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import { collection, getDocs, query, where } from 'firebase-admin/firestore';
import { cookies } from 'next/headers';

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

interface User {
  id: string;
  email: string;
  lastActive?: string;
  isAdmin?: boolean;
}

interface WatchHistory {
  id: string;
  videoId: string;
  userId: string;
  watchTime: number;
  completed: boolean;
  skipped: boolean;
  rewatched: boolean;
  timestamp: string;
}

export async function GET() {
  try {
    // Get the session cookie
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the session cookie
    const decodedClaims = await auth.verifySessionCookie(sessionCookie);
    
    // Check if user is admin
    const userDoc = await getDocs(query(collection(db, 'users'), where('email', '==', decodedClaims.email)));
    const userData = userDoc.docs[0]?.data() as User | undefined;
    
    if (!userData?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all videos with their analytics
    const videosSnapshot = await getDocs(collection(db, 'videos'));
    const videos = videosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Video[];

    // Get all users with their engagement data
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as User[];

    // Get watch history
    const watchHistorySnapshot = await getDocs(collection(db, 'watchHistory'));
    const watchHistory = watchHistorySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as WatchHistory[];

    // Process video analytics
    const videoAnalytics = videos.map(video => {
      const videoWatchHistory = watchHistory.filter(w => w.videoId === video.id);
      const totalViews = videoWatchHistory.length;
      const uniqueViewers = new Set(videoWatchHistory.map(w => w.userId)).size;
      
      const totalWatchTime = videoWatchHistory.reduce((acc, curr) => acc + curr.watchTime, 0);
      const averageWatchTime = totalWatchTime / (videoWatchHistory.length || 1);
      
      const completedViews = videoWatchHistory.filter(w => w.completed).length;
      const completionRate = (completedViews / (videoWatchHistory.length || 1)) * 100;
      
      const skippedViews = videoWatchHistory.filter(w => w.skipped).length;
      const skipRate = (skippedViews / (videoWatchHistory.length || 1)) * 100;
      
      const rewatchedViews = videoWatchHistory.filter(w => w.rewatched).length;
      const rewatchRate = (rewatchedViews / (videoWatchHistory.length || 1)) * 100;

      return {
        id: video.id,
        title: video.title,
        totalViews,
        uniqueViewers,
        averageWatchTime,
        completionRate,
        skipRate,
        rewatchRate,
      };
    });

    // Process user engagement
    const userEngagement = users.map(user => {
      const userWatchHistory = watchHistory.filter(w => w.userId === user.id);
      const totalVideosWatched = userWatchHistory.length;
      const totalWatchTime = userWatchHistory.reduce((acc, curr) => acc + curr.watchTime, 0);
      const averageWatchTime = totalWatchTime / (totalVideosWatched || 1);
      
      const completedVideos = userWatchHistory.filter(w => w.completed).length;
      const completionRate = (completedVideos / (totalVideosWatched || 1)) * 100;

      return {
        userId: user.id,
        email: user.email,
        totalVideosWatched,
        averageWatchTime,
        completionRate,
        lastActive: user.lastActive || new Date().toISOString(),
      };
    });

    // Calculate overall metrics
    const totalUsers = users.length;
    const totalVideos = videos.length;
    const totalViews = watchHistory.length;
    const averageEngagement = userEngagement.reduce((acc, user) => acc + user.completionRate, 0) / (totalUsers || 1);

    return NextResponse.json({
      videos: videoAnalytics,
      users: userEngagement,
      totalUsers,
      totalVideos,
      totalViews,
      averageEngagement,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
} 