"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { signOut, User } from "firebase/auth"
import { auth, db } from "@/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Calendar, Mail, User as UserIcon } from "lucide-react"

interface Feedback {
  id: string;
  userId: string;
  userEmail: string;
  playlistId: string;
  feedback: string;
  createdAt: any;
}

export default function FeedbackPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);
    });

    loadFeedback();
    return () => unsubscribe();
  }, [router]);

  const loadFeedback = async () => {
    try {
      setIsLoading(true);
      const feedbackQuery = query(
        collection(db, "feedback"),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(feedbackQuery);
      const feedbackData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      })) as Feedback[];
      setFeedback(feedbackData);
    } catch (error) {
      console.error("Error fetching feedback:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Feedback</h1>
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        ) : feedback.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">
                No feedback received yet.
              </div>
            </CardContent>
          </Card>
        ) : (
          feedback.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardHeader className="bg-muted/40 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{item.userEmail}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(item.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <MessageSquare className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                  <div className="space-y-1">
                    <p className="text-sm leading-relaxed">{item.feedback}</p>
                    <p className="text-xs text-muted-foreground">
                      Playlist ID: {item.playlistId}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
} 