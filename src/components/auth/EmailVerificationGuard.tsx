"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Mail, AlertCircle, RefreshCw } from "lucide-react";

interface EmailVerificationGuardProps {
  children: React.ReactNode;
}

export function EmailVerificationGuard({ children }: EmailVerificationGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.isEmailVerified === false) {
      // Redirect to email verification page
      router.push(`/auth/verify-email?email=${encodeURIComponent(session.user.email || '')}`);
    }
  }, [status, session, router]);

  const handleResendVerification = async () => {
    if (!session?.user?.email) return;

    setIsResending(true);
    setResendMessage(null);

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session.user.email,
          type: "EMAIL_VERIFICATION",
          name: session.user.name
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResendMessage("Verification email sent! Please check your inbox.");
        // Redirect to verification page
        router.push(`/auth/verify-email?email=${encodeURIComponent(session.user.email)}`);
      } else {
        setResendMessage(data.error || "Failed to send verification email");
      }
    } catch (error) {
      setResendMessage("Failed to send verification email. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  // Show loading while checking session
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  // Show email verification required screen
  if (status === "authenticated" && session?.user?.isEmailVerified === false) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-yellow-400" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-4">Email Verification Required</h1>
          
          <p className="text-gray-400 mb-6">
            Please verify your email address to access SmartHub. 
            We've sent a verification code to:
          </p>
          
          <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-3 mb-6">
            <span className="text-white font-medium">{session.user.email}</span>
          </div>

          {resendMessage && (
            <div className={`mb-6 p-3 rounded-lg text-sm ${
              resendMessage.includes('sent') 
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {resendMessage}
              </div>
            </div>
          )}

          <button
            onClick={handleResendVerification}
            disabled={isResending}
            className="w-full bg-teal-400 text-slate-900 py-3 rounded-lg font-medium hover:bg-teal-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
          >
            {isResending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Resend Verification Email
              </>
            )}
          </button>

          <p className="text-xs text-gray-500">
            Check your spam folder if you don't see the email in your inbox.
          </p>
        </div>
      </div>
    );
  }

  // User is verified or not authenticated, show children
  return <>{children}</>;
}
