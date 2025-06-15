"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

export default function TestConversationsPage() {
  const { data: session } = useSession();
  const [testResults, setTestResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationTests, setConversationTests] = useState<any>(null);

  const runSystemTest = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/test-conversations");
      const data = await response.json();
      setTestResults(data);
    } catch (error) {
      console.error("System test failed:", error);
      setTestResults({ error: "Failed to run system test" });
    } finally {
      setIsLoading(false);
    }
  };

  const testConversationAPI = async () => {
    setIsLoading(true);
    try {
      // Test debug endpoint first
      console.log("Testing GET /api/debug-conversations...");
      const debugResponse = await fetch("/api/debug-conversations");
      const debugResult = {
        status: debugResponse.status,
        ok: debugResponse.ok,
        data: debugResponse.ok ? await debugResponse.json() : await debugResponse.text()
      };

      // Test GET conversations
      console.log("Testing GET /api/conversations...");
      const getResponse = await fetch("/api/conversations");
      const getResult = {
        status: getResponse.status,
        ok: getResponse.ok,
        data: getResponse.ok ? await getResponse.json() : await getResponse.text()
      };

      // Test GET team members
      console.log("Testing GET /api/team/members...");
      const membersResponse = await fetch("/api/team/members");
      const membersResult = {
        status: membersResponse.status,
        ok: membersResponse.ok,
        data: membersResponse.ok ? await membersResponse.json() : await membersResponse.text()
      };

      // Test POST conversation (if there are members)
      let postResult = null;
      if (membersResult.ok && Array.isArray(membersResult.data) && membersResult.data.length > 0) {
        const otherUser = membersResult.data.find((user: any) => user.id !== session?.user?.id);
        if (otherUser) {
          console.log("Testing POST /api/conversations...");
          const postResponse = await fetch("/api/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: otherUser.id }),
          });
          postResult = {
            status: postResponse.status,
            ok: postResponse.ok,
            data: postResponse.ok ? await postResponse.json() : await postResponse.text()
          };
        }
      }

      setConversationTests({
        debugEndpoint: debugResult,
        getConversations: getResult,
        getMembers: membersResult,
        postConversation: postResult,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error("Conversation API test failed:", error);
      setConversationTests({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Conversation System Test Page</h1>

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
              onClick={runSystemTest}
              disabled={isLoading || !session}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 mr-4"
            >
              {isLoading ? "Running..." : "Run System Test"}
            </button>

            <button
              onClick={testConversationAPI}
              disabled={isLoading || !session}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50 mr-4"
            >
              {isLoading ? "Testing..." : "Test Conversation APIs"}
            </button>

            <button
              onClick={async () => {
                setIsLoading(true);
                try {
                  const response = await fetch("/api/debug-conversations");
                  const data = await response.json();
                  setConversationTests({ debugOnly: data, timestamp: new Date().toISOString() });
                } catch (error: any) {
                  setConversationTests({ debugError: error.message });
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading || !session}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {isLoading ? "Testing..." : "Debug Only"}
            </button>
          </div>
        </div>

        {/* System Test Results */}
        {testResults && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">System Test Results</h2>
            <pre className="text-gray-300 text-sm overflow-auto bg-gray-900 p-4 rounded">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        )}

        {/* API Test Results */}
        {conversationTests && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">API Test Results</h2>
            <pre className="text-gray-300 text-sm overflow-auto bg-gray-900 p-4 rounded">
              {JSON.stringify(conversationTests, null, 2)}
            </pre>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Debug Instructions</h2>
          <div className="text-gray-300 space-y-2">
            <p>1. <strong>System Test:</strong> Checks database models and basic functionality</p>
            <p>2. <strong>API Test:</strong> Tests the actual conversation API endpoints</p>
            <p>3. <strong>Check Browser Console:</strong> Look for detailed error logs</p>
            <p>4. <strong>Check Server Logs:</strong> Monitor the terminal for API logs</p>
            <p>5. <strong>Database Check:</strong> Ensure all models are properly generated</p>
          </div>

          <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded">
            <p className="text-yellow-400 text-sm">
              <strong>Note:</strong> Make sure you have other users in your workspace to test conversation creation.
              If you're the only user, invite others or create test users first.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
