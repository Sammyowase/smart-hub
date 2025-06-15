"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { PerformanceDashboard } from "@/components/debug/PerformanceDashboard";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { EmailVerificationGuard } from "@/components/auth/EmailVerificationGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false);

  useEffect(() => {
    if (status === "loading") return; // Still loading

    if (!session) {
      router.push("/login");
      return;
    }

    // Check if user needs to change password
    if (session.user.isTemporaryPassword) {
      router.push("/change-password");
      return;
    }

    // Check if email verification is required (only for users explicitly marked as unverified)
    // Note: null/undefined means legacy user (before email verification), treat as verified
    console.log(`Dashboard layout check - User: ${session.user.email}, isEmailVerified: ${session.user.isEmailVerified}`);

    if (session.user.isEmailVerified === false) {
      console.log("User email not verified, redirecting to verification page");
      router.push(`/auth/verify-email?email=${encodeURIComponent(session.user.email || '')}`);
      return;
    } else {
      console.log("User email verification OK, allowing dashboard access");
    }
  }, [session, status, router]);

  // Keyboard shortcut for performance dashboard (Ctrl+Shift+P)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        setShowPerformanceDashboard(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-900 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>

        {/* Performance Dashboard */}
        <ErrorBoundary
          fallback={<div className="hidden" />}
          onError={(error) => console.error('PerformanceDashboard error:', error)}
        >
          <PerformanceDashboard
            isOpen={showPerformanceDashboard}
            onClose={() => setShowPerformanceDashboard(false)}
          />
        </ErrorBoundary>

        {/* Performance Dashboard Hint */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 right-4 bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-gray-400">
            Press Ctrl+Shift+P for Performance Dashboard
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
