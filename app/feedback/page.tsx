"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db, auth } from "@/firebase";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SendHorizonal } from "lucide-react";
import FeedbackForm from "@/components/FeedbackForm";

const FeedbackPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const playlistId = searchParams.get("playlistId");
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user) {
      router.push("/login");
    } else {
      setLoading(false);
    }
  }, [user, router]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        Loading...
      </div>
    );
  }
  
  if (!user) {
    return null; // Redirect will happen in useEffect
  }
  
  if (!playlistId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <Card className="w-full max-w-xl shadow-lg border border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-2xl">Invalid Playlist</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">No playlist ID provided.</p>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="w-full"
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <Card className="w-full max-w-xl shadow-lg border border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <SendHorizonal className="w-6 h-6 text-primary" />
            Submit Your Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Thank you for creating your playlist! Please share your thoughts below:
          </p>
          <FeedbackForm playlistId={playlistId} />
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackPage;