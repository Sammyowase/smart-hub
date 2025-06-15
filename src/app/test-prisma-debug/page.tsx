"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

export default function TestPrismaDebugPage() {
  const { data: session } = useSession();
  const [testResults, setTestResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runPrismaTest = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/test-prisma");
      const data = await response.json();
      setTestResults(data);
    } catch (error) {
      console.error("Prisma test failed:", error);
      setTestResults({ error: "Failed to run Prisma test" });
    } finally {
      setIsLoading(false);
    }
  };

  const testSpecificEndpoints = async () => {
    setIsLoading(true);
    try {
      const tests = {
        conversations: null,
        groups: null,
        teamMembers: null
      };

      // Test conversations endpoint
      try {
        const convResponse = await fetch("/api/conversations");
        tests.conversations = {
          status: convResponse.status,
          ok: convResponse.ok,
          data: convResponse.ok ? await convResponse.json() : await convResponse.text()
        };
      } catch (error: any) {
        tests.conversations = { error: error.message };
      }

      // Test groups endpoint
      try {
        const groupResponse = await fetch("/api/groups");
        tests.groups = {
          status: groupResponse.status,
          ok: groupResponse.ok,
          data: groupResponse.ok ? await groupResponse.json() : await groupResponse.text()
        };
      } catch (error: any) {
        tests.groups = { error: error.message };
      }

      // Test team members endpoint (known working)
      try {
        const teamResponse = await fetch("/api/team/members");
        tests.teamMembers = {
          status: teamResponse.status,
          ok: teamResponse.ok,
          data: teamResponse.ok ? await teamResponse.json() : await teamResponse.text()
        };
      } catch (error: any) {
        tests.teamMembers = { error: error.message };
      }

      setTestResults({
        endpointTests: tests,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      setTestResults({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Prisma Client Debug Page</h1>

        {/* Session Info */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Session Information</h2>
          <div className="text-gray-300">
            <p><strong>Logged in:</strong> {session ? "Yes" : "No"}</p>
            {session && (
              <>
                <p><strong>User ID:</strong> {session.user?.id}</p>
                <p><strong>Name:</strong> {session.user?.name}</p>
                <p><strong>Email:</strong> {session.user?.email}</p>
                <p><strong>Workspace ID:</strong> {session.user?.workspaceId}</p>
                <p><strong>Role:</strong> {session.user?.role}</p>
              </>
            )}
          </div>
        </div>

        {/* Test Controls */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Test Controls</h2>
          <div className="space-y-4">
            <button
              onClick={runPrismaTest}
              disabled={isLoading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 mr-4"
            >
              {isLoading ? "Running..." : "Run Prisma Client Test"}
            </button>

            <button
              onClick={testSpecificEndpoints}
              disabled={isLoading || !session}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50 mr-4"
            >
              {isLoading ? "Testing..." : "Test Failing Endpoints"}
            </button>

            <button
              onClick={async () => {
                setIsLoading(true);
                try {
                  const response = await fetch("/api/test-import");
                  const data = await response.json();
                  setTestResults({ importTest: data, timestamp: new Date().toISOString() });
                } catch (error: any) {
                  setTestResults({ importError: error.message });
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50 mr-4"
            >
              {isLoading ? "Testing..." : "Test Imports"}
            </button>

            <button
              onClick={async () => {
                setIsLoading(true);
                try {
                  const response = await fetch("/api/reproduce-error");
                  const data = await response.json();
                  setTestResults({ reproductionTest: data, timestamp: new Date().toISOString() });
                } catch (error: any) {
                  setTestResults({ reproductionError: error.message });
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading || !session}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded disabled:opacity-50 mr-4"
            >
              {isLoading ? "Testing..." : "Reproduce Error"}
            </button>

            <button
              onClick={async () => {
                setIsLoading(true);
                try {
                  const response = await fetch("/api/test-new-prisma");
                  const data = await response.json();
                  setTestResults({ newPrismaTest: data, timestamp: new Date().toISOString() });
                } catch (error: any) {
                  setTestResults({ newPrismaError: error.message });
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading || !session}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {isLoading ? "Testing..." : "Test New Prisma"}
            </button>
          </div>
        </div>

        {/* Test Results */}
        {testResults && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Test Results</h2>

            {/* Summary */}
            {testResults.summary && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-white mb-2">Summary</h3>
                <div className={`p-4 rounded-lg ${testResults.summary.overallSuccess ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                  <p className={`font-medium ${testResults.summary.overallSuccess ? 'text-green-400' : 'text-red-400'}`}>
                    {testResults.summary.overallSuccess ? '✅ All tests passed!' : '❌ Some tests failed'}
                  </p>
                  {testResults.summary.criticalIssues && (
                    <div className="mt-2">
                      <p className="text-white font-medium">Issues:</p>
                      <ul className="list-disc list-inside text-gray-300">
                        {testResults.summary.criticalIssues.map((issue: string, index: number) => (
                          <li key={index}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Detailed Results */}
            <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
              <pre className="text-gray-300 text-sm">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Debug Instructions</h2>
          <div className="text-gray-300 space-y-2">
            <p>1. <strong>Run Prisma Client Test:</strong> Tests the Prisma client initialization and basic functionality</p>
            <p>2. <strong>Test Failing Endpoints:</strong> Tests the specific endpoints that are failing</p>
            <p>3. <strong>Check Browser Console:</strong> Look for detailed error logs</p>
            <p>4. <strong>Check Server Logs:</strong> Monitor the terminal for Prisma initialization logs</p>
          </div>

          <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded">
            <p className="text-yellow-400 text-sm">
              <strong>Expected Issues:</strong> If Prisma client is not properly initialized, you'll see "Cannot read properties of undefined" errors.
              The enhanced Prisma client should now provide more detailed error messages.
            </p>
          </div>

          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded">
            <p className="text-blue-400 text-sm">
              <strong>Quick Fixes:</strong>
            </p>
            <ul className="list-disc list-inside text-blue-300 text-sm mt-2">
              <li>Run <code className="bg-gray-700 px-1 rounded">npx prisma generate</code> to regenerate the client</li>
              <li>Check that DATABASE_URL is properly set in .env file</li>
              <li>Restart the development server after making changes</li>
              <li>Check for TypeScript compilation errors</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
