"use client";

import { useState, useEffect } from "react";
import { Search, MessageSquare, Users, X } from "lucide-react";
import { useSession } from "next-auth/react";

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserDirectoryProps {
  isOpen: boolean;
  onClose: () => void;
  onStartConversation: (conversationId: string, otherUser: User) => void;
}

export const UserDirectory = ({ isOpen, onClose, onStartConversation }: UserDirectoryProps) => {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    // Filter users based on search query
    if (searchQuery.trim()) {
      const filtered = users.filter(user =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/team/members");
      if (response.ok) {
        const data = await response.json();
        // Filter out current user
        const otherUsers = data.filter((user: User) => user.id !== session?.user?.id);
        setUsers(otherUsers);
        setFilteredUsers(otherUsers);
      } else {
        throw new Error("Failed to fetch users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setError("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartConversation = async (user: User) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("UserDirectory - Starting conversation with user:", user);

      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Ensure cookies are sent
        body: JSON.stringify({ userId: user.id }),
      });

      console.log("UserDirectory - Response status:", response.status);
      console.log("UserDirectory - Response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        // Try to get error details
        let errorData;
        const contentType = response.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
          try {
            errorData = await response.json();
          } catch (parseError) {
            console.error("UserDirectory - Failed to parse error JSON:", parseError);
            errorData = { error: "Failed to parse error response" };
          }
        } else {
          const textResponse = await response.text();
          console.error("UserDirectory - Non-JSON error response:", textResponse);
          errorData = { error: textResponse || "Unknown error" };
        }

        console.error("UserDirectory - API Error:", errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to start conversation`);
      }

      const conversation = await response.json();
      console.log("UserDirectory - Conversation created/found:", conversation);

      // Validate response structure
      if (!conversation.id) {
        throw new Error("Invalid response - missing conversation ID");
      }

      onStartConversation(conversation.id, user);
      onClose();
    } catch (error: any) {
      console.error("UserDirectory - Error starting conversation:", error);

      // Provide more specific error messages
      let errorMessage = "Failed to start conversation. Please try again.";

      if (error.name === "TypeError" && error.message.includes("fetch")) {
        errorMessage = "Network error - please check your connection and try again.";
      } else if (error.message.includes("Unauthorized")) {
        errorMessage = "Session expired - please refresh the page and try again.";
      } else if (error.message.includes("Invalid user ID")) {
        errorMessage = "Invalid user selected - please try selecting a different user.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-semibold text-white">Start Conversation</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">
                {searchQuery ? "No users found matching your search" : "No users available"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleStartConversation(user)}
                  disabled={isLoading}
                  className="w-full flex items-center gap-3 p-3 bg-gray-900/30 rounded-lg hover:bg-gray-900/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-blue-400 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-medium">
                      {(user.name || user.email).charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {user.name || user.email}
                    </p>
                    {user.name && (
                      <p className="text-gray-400 text-sm truncate">{user.email}</p>
                    )}
                  </div>

                  {/* Message Icon */}
                  <MessageSquare className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <p className="text-xs text-gray-500 text-center">
            Select a user to start a direct conversation
          </p>
        </div>
      </div>
    </div>
  );
};
