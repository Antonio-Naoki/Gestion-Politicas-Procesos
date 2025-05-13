import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const [, navigate] = useLocation();
  const { user, isLoading } = useAuth();
  
  // Redirect to dashboard if authenticated, or auth page if not
  useEffect(() => {
    if (!isLoading) {
      if (user) {
        navigate("/dashboard");
      } else {
        navigate("/auth");
      }
    }
  }, [user, isLoading, navigate]);
  
  // Show loading spinner while determining where to navigate
  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-50">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
