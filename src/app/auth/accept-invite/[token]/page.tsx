"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface InvitationData {
  id: string;
  email: string;
  workspaceName: string;
  inviterName: string;
  expiresAt: string;
  isValid: boolean;
  isExpired: boolean;
}

export default function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    password: "",
    confirmPassword: ""
  });

  // Fetch invitation details
  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const resolvedParams = await params;
        const response = await fetch(`/api/auth/invitation/${resolvedParams.token}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Invalid invitation");
        }

        setInvitation(data);
      } catch (error) {
        console.error("Error fetching invitation:", error);
        setError(error instanceof Error ? error.message : "Failed to load invitation");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvitation();
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invitation) return;

    // Validation
    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Accept invitation and create account
      const resolvedParams = await params;
      const response = await fetch(`/api/auth/accept-invitation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: resolvedParams.token,
          name: formData.name.trim(),
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to accept invitation");
      }

      // Sign in the user automatically
      const signInResult = await signIn("credentials", {
        email: invitation.email,
        password: formData.password,
        redirect: false
      });

      if (signInResult?.error) {
        throw new Error("Account created but sign-in failed. Please sign in manually.");
      }

      // Redirect to dashboard
      router.push("/dashboard");

    } catch (error) {
      console.error("Error accepting invitation:", error);
      setError(error instanceof Error ? error.message : "Failed to accept invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Invalid Invitation</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push("/auth/signin")}
            className="w-full bg-teal-400 text-slate-900 py-3 rounded-lg font-medium hover:bg-teal-300 transition-colors"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (invitation?.isExpired) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-yellow-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Invitation Expired</h1>
          <p className="text-gray-400 mb-6">
            This invitation has expired. Please contact your administrator for a new invitation.
          </p>
          <button
            onClick={() => router.push("/auth/signin")}
            className="w-full bg-teal-400 text-slate-900 py-3 rounded-lg font-medium hover:bg-teal-300 transition-colors"
          >
            Go to Sign In
          </button>
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
            <UserPlus className="w-8 h-8 text-teal-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Join {invitation?.workspaceName}</h1>
          <p className="text-gray-400">
            {invitation?.inviterName} has invited you to join their workspace on SmartHub
          </p>
        </div>

        {/* Invitation Details */}
        <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-4 mb-6">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Email:</span>
              <span className="text-white">{invitation?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Workspace:</span>
              <span className="text-white">{invitation?.workspaceName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Invited by:</span>
              <span className="text-white">{invitation?.inviterName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Expires:</span>
              <span className="text-white">
                {invitation?.expiresAt ? new Date(invitation.expiresAt).toLocaleDateString() : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Account Creation Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent pr-10"
                placeholder="Create a password"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
              placeholder="Confirm your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-teal-400 text-slate-900 py-3 rounded-lg font-medium hover:bg-teal-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Accept Invitation & Create Account
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-6 pt-6 border-t border-gray-700">
          <p className="text-xs text-gray-500">
            By accepting this invitation, you agree to SmartHub&apos;s Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
