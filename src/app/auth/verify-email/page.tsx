"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Mail, ArrowLeft, RefreshCw, CheckCircle, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update: updateSession } = useSession();
  const email = searchParams.get("email");

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0 && !success) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setCanResend(true);
    }
  }, [timeLeft, success]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendCooldown]);

  // Redirect if no email provided
  useEffect(() => {
    if (!email) {
      router.push("/auth/signin");
    }
  }, [email, router]);

  // Check if user is already verified on page load
  useEffect(() => {
    const checkVerificationStatus = async () => {
      if (!email) return;

      try {
        console.log("Checking verification status for:", email);
        const response = await fetch("/api/debug/user-verification-status");
        if (response.ok) {
          const data = await response.json();
          console.log("User verification status:", data);

          if (data.verification?.databaseStatus === true) {
            console.log("User is already verified, redirecting to dashboard");
            setSuccess(true);
            setTimeout(() => {
              console.log("Forcing redirect to dashboard...");
              window.location.href = "/dashboard";
            }, 1000);
          } else if (data.verification?.databaseStatus === false) {
            console.log("User needs verification, staying on page");
          } else {
            console.log("User verification status unclear:", data.verification);
          }
        } else {
          console.error("Failed to fetch verification status");
        }
      } catch (error) {
        console.error("Failed to check verification status:", error);
      }
    };

    // Check immediately and then periodically
    checkVerificationStatus();

    // Also check every 5 seconds in case verification happens in another tab
    const interval = setInterval(checkVerificationStatus, 5000);

    return () => clearInterval(interval);
  }, [email, router]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (newOtp.every(digit => digit !== "") && newOtp.join("").length === 6) {
      handleVerify(newOtp.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");

    if (pastedData.length === 6) {
      const newOtp = pastedData.split("");
      setOtp(newOtp);
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const code = otpCode || otp.join("");

    if (code.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    console.log(`Starting OTP verification for ${email} with code ${code}`);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp: code,
          type: "EMAIL_VERIFICATION"
        }),
      });

      const data = await response.json();
      console.log("OTP verification response:", data);

      if (!response.ok) {
        console.error("OTP verification failed:", data);
        throw new Error(data.error || "Verification failed");
      }

      console.log("OTP verification successful, user data:", data.user);

      setSuccess(true);

      console.log("OTP verification successful, starting session refresh...");

      // Force a complete page refresh to ensure session is updated
      // This is more reliable than trying to update the session client-side
      setTimeout(() => {
        console.log("Redirecting to dashboard with page refresh...");
        window.location.href = "/dashboard";
      }, 2000);

    } catch (error) {
      console.error("Verification error:", error);
      setError(error instanceof Error ? error.message : "Verification failed");

      // Clear OTP on error
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || resendCooldown > 0) return;

    setIsResending(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          type: "EMAIL_VERIFICATION"
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend code");
      }

      // Reset timers
      setTimeLeft(600);
      setCanResend(false);
      setResendCooldown(60); // 1 minute cooldown
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();

    } catch (error) {
      console.error("Resend error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to resend code";

      // If email is already verified, redirect to dashboard
      if (errorMessage.includes("already verified")) {
        setError("Your email is already verified! Redirecting to dashboard...");
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsResending(false);
    }
  };

  if (!email) {
    return null; // Will redirect
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Email Verified!</h1>
          <p className="text-gray-400 mb-6">
            Your email has been successfully verified. Redirecting to dashboard...
          </p>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-400 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 border border-gray-700 rounded-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-teal-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Verify Your Email</h1>
          <p className="text-gray-400">
            We've sent a 6-digit code to <br />
            <span className="text-white font-medium">{email}</span>
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* OTP Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Enter verification code
          </label>
          <div className="flex gap-3 justify-center" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-12 text-center text-xl font-bold bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                disabled={isLoading}
              />
            ))}
          </div>
        </div>

        {/* Timer */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <Clock className="w-4 h-4" />
            {timeLeft > 0 ? (
              <span>Code expires in {formatTime(timeLeft)}</span>
            ) : (
              <span className="text-red-400">Code expired</span>
            )}
          </div>
        </div>

        {/* Verify Button */}
        <button
          onClick={() => handleVerify()}
          disabled={isLoading || otp.some(digit => !digit)}
          className="w-full bg-teal-400 text-slate-900 py-3 rounded-lg font-medium hover:bg-teal-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-900"></div>
              Verifying...
            </>
          ) : (
            "Verify Email"
          )}
        </button>

        {/* Resend */}
        <div className="text-center mt-6">
          <p className="text-gray-400 text-sm mb-2">Didn't receive the code?</p>
          <button
            onClick={handleResend}
            disabled={!canResend || resendCooldown > 0 || isResending}
            className="text-teal-400 hover:text-teal-300 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
          >
            {isResending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : resendCooldown > 0 ? (
              `Resend in ${resendCooldown}s`
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Resend Code
              </>
            )}
          </button>
        </div>

        {/* Back to Sign In */}
        <div className="text-center mt-8 pt-6 border-t border-gray-700">
          <Link
            href="/auth/signin"
            className="text-gray-400 hover:text-white text-sm flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
