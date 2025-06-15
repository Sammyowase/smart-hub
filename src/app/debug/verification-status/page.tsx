"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { RefreshCw, User, Database, AlertCircle, CheckCircle } from "lucide-react";

export default function VerificationStatusPage() {
  const { data: session, status, update: updateSession } = useSession();
  const [debugData, setDebugData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDebugData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/debug/user-verification-status");
      if (response.ok) {
        const data = await response.json();
        setDebugData(data);
        console.log("Debug data:", data);
      } else {
        console.error("Failed to fetch debug data");
      }
    } catch (error) {
      console.error("Error fetching debug data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchDebugData();
    }
  }, [status]);

  const handleRefreshSession = async () => {
    try {
      console.log("Refreshing session...");
      await updateSession();
      await fetchDebugData();
    } catch (error) {
      console.error("Failed to refresh session:", error);
    }
  };

  const handleForceRedirect = () => {
    console.log("Forcing redirect to dashboard...");
    window.location.href = "/dashboard";
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
          <h1 className="text-xl font-bold text-white mb-4">Not Authenticated</h1>
          <p className="text-gray-400">Please sign in to view verification status.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <User className="w-6 h-6" />
              Email Verification Debug Status
            </h1>
            <div className="flex gap-2">
              <button
                onClick={handleRefreshSession}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Session
              </button>
              <button
                onClick={fetchDebugData}
                disabled={isLoading}
                className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-2 disabled:opacity-50"
              >
                <Database className="w-4 h-4" />
                {isLoading ? "Loading..." : "Refresh Data"}
              </button>
              <button
                onClick={handleForceRedirect}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
              >
                Force Dashboard
              </button>
            </div>
          </div>

          {/* Session Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <User className="w-5 h-5" />
                Session Data
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Email:</span>
                  <span className="text-white">{session?.user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Name:</span>
                  <span className="text-white">{session?.user?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Email Verified:</span>
                  <span className={`flex items-center gap-1 ${
                    session?.user?.isEmailVerified === true ? 'text-green-400' : 
                    session?.user?.isEmailVerified === false ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {session?.user?.isEmailVerified === true ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        True
                      </>
                    ) : session?.user?.isEmailVerified === false ? (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        False
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        {String(session?.user?.isEmailVerified)}
                      </>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Role:</span>
                  <span className="text-white">{session?.user?.role}</span>
                </div>
              </div>
            </div>

            {/* Database Data */}
            <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Database className="w-5 h-5" />
                Database Data
              </h2>
              {debugData?.database?.user ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Email:</span>
                    <span className="text-white">{debugData.database.user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Email Verified:</span>
                    <span className={`flex items-center gap-1 ${
                      debugData.database.user.isEmailVerified === true ? 'text-green-400' : 
                      debugData.database.user.isEmailVerified === false ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {debugData.database.user.isEmailVerified === true ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          True
                        </>
                      ) : debugData.database.user.isEmailVerified === false ? (
                        <>
                          <AlertCircle className="w-4 h-4" />
                          False
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4" />
                          {String(debugData.database.user.isEmailVerified)}
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Email Verified Date:</span>
                    <span className="text-white">
                      {debugData.database.user.emailVerified 
                        ? new Date(debugData.database.user.emailVerified).toLocaleString()
                        : 'Not set'
                      }
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No database data available</p>
              )}
            </div>
          </div>

          {/* Analysis */}
          {debugData?.analysis && (
            <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-4 mb-6">
              <h2 className="text-lg font-semibold text-white mb-3">Analysis</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Should Redirect to Verification:</span>
                  <span className={debugData.analysis.shouldRedirectToVerification ? 'text-red-400' : 'text-green-400'}>
                    {debugData.analysis.shouldRedirectToVerification ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Is Legacy User:</span>
                  <span className={debugData.analysis.isLegacyUser ? 'text-yellow-400' : 'text-gray-400'}>
                    {debugData.analysis.isLegacyUser ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Has Completed Verification:</span>
                  <span className={debugData.analysis.hasCompletedVerification ? 'text-green-400' : 'text-red-400'}>
                    {debugData.analysis.hasCompletedVerification ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Needs Verification:</span>
                  <span className={debugData.analysis.needsVerification ? 'text-red-400' : 'text-green-400'}>
                    {debugData.analysis.needsVerification ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {debugData?.recommendations && debugData.recommendations.length > 0 && (
            <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-white mb-3">Recommendations</h2>
              <ul className="space-y-2">
                {debugData.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-teal-400 mt-1">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
