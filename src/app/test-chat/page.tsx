"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

export default function TestChatPage() {
  const { data: session } = useSession();
  const [testResults, setTestResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testMessage, setTestMessage] = useState("Hello, this is a test message!");

  const runDebugTest = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/debug-chat");
      const data = await response.json();
      setTestResults(data);
    } catch (error) {
      console.error("Debug test failed:", error);
      setTestResults({ error: "Failed to run debug test" });
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestMessage = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: testMessage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      const data = await response.json();
      alert("Message sent successfully! Check the chat page to see it.");
      console.log("Message sent:", data);
    } catch (error: any) {
      console.error("Send test message failed:", error);
      alert("Failed to send message: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const sendAITestMessage = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "@ai Hello AI, can you help me?" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send AI message");
      }

      const data = await response.json();
      alert("AI message sent successfully! Check the chat page to see the response.");
      console.log("AI message sent:", data);
    } catch (error: any) {
      console.error("Send AI test message failed:", error);
      alert("Failed to send AI message: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Chat System Test Page</h1>
        
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
              </>
            )}
          </div>
        </div>

        {/* Test Controls */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Test Controls</h2>
          <div className="space-y-4">
            <button
              onClick={runDebugTest}
              disabled={isLoading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {isLoading ? "Running..." : "Run Debug Test"}
            </button>

            <div className="flex gap-4">
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded"
                placeholder="Enter test message"
              />
              <button
                onClick={sendTestMessage}
                disabled={isLoading || !session}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                Send Test Message
              </button>
            </div>

            <button
              onClick={sendAITestMessage}
              disabled={isLoading || !session}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              Send AI Test Message
            </button>
          </div>
        </div>

        {/* Test Results */}
        {testResults && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Test Results</h2>
            <pre className="text-gray-300 text-sm overflow-auto">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-800 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold text-white mb-4">Instructions</h2>
          <div className="text-gray-300 space-y-2">
            <p>1. First, run the debug test to check system health</p>
            <p>2. Try sending a regular test message</p>
            <p>3. Try sending an AI test message (should trigger AI response)</p>
            <p>4. Check the main chat page at /dashboard/chat to see your messages</p>
            <p>5. Look at the browser console for detailed logs</p>
          </div>
        </div>
      </div>
    </div>
  );
}
