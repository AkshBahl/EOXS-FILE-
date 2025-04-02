"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db, auth } from "@/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, SendHorizonal } from "lucide-react";

interface FeedbackFormProps {
  playlistId: string;
}

const FeedbackForm = ({ playlistId }: FeedbackFormProps) => {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedback.trim()) {
      toast({
        title: "Feedback Required",
        description: "Please enter your feedback before submitting.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "feedback"), {
        userId: user?.uid,
        userEmail: user?.email,
        playlistId,
        feedback,
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Thank You!",
        description: "Your feedback has been submitted successfully.",
      });

      setFeedback("");
      await auth.signOut();
      router.push("/");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your feedback. Please try again.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        id="feedback"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        rows={6}
        placeholder="Share your thoughts or suggestions..."
        disabled={submitting}
        className="resize-none"
      />
      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary transition-all"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <SendHorizonal className="mr-2 h-4 w-4" />
            Submit Feedback
          </>
        )}
      </Button>
    </form>
  );
};

export default FeedbackForm;