"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Plus, Search, Clock } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface Conversation {
  id: string;
  otherUser: {
    id: string;
    name: string;
    email: string;
  } | null;
  lastMessage: {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    createdAt: string;
    isFromCurrentUser: boolean;
  } | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ConversationsListProps {
  onSelectConversation: (conversationId: string, otherUser: any) => void;
  onStartNewConversation: () => void;
  selectedConversationId?: string;
}

export const ConversationsList = ({
  onSelectConversation,
  onStartNewConversation,
  selectedConversationId
}: ConversationsListProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    // Filter conversations based on search query
    if (searchQuery.trim()) {
      const filtered = conversations.filter(conversation =>
        conversation.otherUser?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conversation.otherUser?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conversation.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConversations(filtered);
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchQuery, conversations]);

  const fetchConversations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("ConversationsList - Fetching conversations...");
      const response = await fetch("/api/conversations", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Ensure cookies are sent
      });

      console.log("ConversationsList - Response status:", response.status);
      console.log("ConversationsList - Response headers:", Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const data = await response.json();
        console.log("ConversationsList - Received data:", data);

        // Ensure data is an array
        if (Array.isArray(data)) {
          setConversations(data);
          setFilteredConversations(data);
        } else {
          console.error("ConversationsList - Data is not an array:", data);
          throw new Error("Invalid response format - expected array");
        }
      } else {
        // Try to get error details
        let errorData;
        const contentType = response.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
          try {
            errorData = await response.json();
          } catch (parseError) {
            console.error("ConversationsList - Failed to parse error JSON:", parseError);
            errorData = { error: "Failed to parse error response" };
          }
        } else {
          const textResponse = await response.text();
          console.error("ConversationsList - Non-JSON error response:", textResponse);
          errorData = { error: textResponse || "Unknown error" };
        }

        console.error("ConversationsList - API Error:", errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch conversations`);
      }
    } catch (error: any) {
      console.error("ConversationsList - Error fetching conversations:", error);

      // Provide more specific error messages
      let errorMessage = "Failed to load conversations. Please try again.";

      if (error.name === "TypeError" && error.message.includes("fetch")) {
        errorMessage = "Network error - please check your connection and try again.";
      } else if (error.message.includes("Unauthorized")) {
        errorMessage = "Session expired - please refresh the page and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const truncateMessage = (content: string, maxLength: number = 50) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Direct Messages</h2>
          <button
            onClick={onStartNewConversation}
            className="p-2 bg-teal-400 text-slate-900 rounded-lg hover:bg-teal-300 transition-colors"
            title="Start new conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="p-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <MessageSquare className="w-12 h-12 text-gray-600 mb-3" />
            <h3 className="text-white font-medium mb-2">
              {searchQuery ? "No conversations found" : "No conversations yet"}
            </h3>
            <p className="text-gray-400 text-sm text-center mb-4">
              {searchQuery
                ? "Try adjusting your search terms"
                : "Start a conversation with a team member to begin chatting"
              }
            </p>
            {!searchQuery && (
              <button
                onClick={onStartNewConversation}
                className="px-4 py-2 bg-teal-400 text-slate-900 rounded-lg font-medium hover:bg-teal-300 transition-colors"
              >
                Start Conversation
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id, conversation.otherUser)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                  selectedConversationId === conversation.id
                    ? "bg-teal-400/10 border border-teal-400/20"
                    : "hover:bg-gray-800/50"
                }`}
              >
                {/* Avatar */}
                <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-blue-400 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-medium">
                    {conversation.otherUser
                      ? (conversation.otherUser.name || conversation.otherUser.email).charAt(0).toUpperCase()
                      : "?"
                    }
                  </span>
                </div>

                {/* Conversation Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white font-medium truncate">
                      {conversation.otherUser?.name || conversation.otherUser?.email || "Unknown User"}
                    </p>
                    {conversation.lastMessage && (
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {formatRelativeTime(new Date(conversation.lastMessage.createdAt))}
                      </span>
                    )}
                  </div>

                  {conversation.lastMessage ? (
                    <div className="flex items-center gap-1">
                      {conversation.lastMessage.isFromCurrentUser && (
                        <span className="text-gray-500 text-xs">You:</span>
                      )}
                      <p className="text-gray-400 text-sm truncate">
                        {truncateMessage(conversation.lastMessage.content)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm italic">No messages yet</p>
                  )}
                </div>

                {/* Message Count Badge */}
                {conversation.messageCount > 0 && (
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-gray-600 text-gray-300 text-xs rounded-full">
                      {conversation.messageCount > 99 ? "99+" : conversation.messageCount}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>Conversations are sorted by recent activity</span>
        </div>
      </div>
    </div>
  );
};
