"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Smile, Bot, MessageSquare, Hash, Users, UserPlus } from "lucide-react";
import { useSession } from "next-auth/react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { ConversationsList } from "@/components/chat/ConversationsList";
import { UserDirectory } from "@/components/chat/UserDirectory";
import { useSocket } from "@/hooks/useSocket";

interface Message {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  timestamp: string;
  isAI?: boolean;
}

type ChatMode = "groups" | "direct";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  memberCount: number;
  messageCount: number;
}

export default function ChatPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [chatMode, setChatMode] = useState<ChatMode>("groups");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>("general");
  const [groups, setGroups] = useState<Group[]>([]);
  const [showUserDirectory, setShowUserDirectory] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket integration
  const {
    socket,
    isConnected,
    onlineUsers,
    typingUsers,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    markMessageAsRead,
    onNewMessage,
    onNewNotification,
    onUserOnline,
    onUserOffline,
    onGroupCreated,
    onGroupUpdated,
    onGroupDeleted
  } = useSocket();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (chatMode === "groups") {
      fetchGroups();
      if (selectedGroupId) {
        fetchGroupMessages();
      }
    } else if (selectedConversationId) {
      fetchConversationMessages(selectedConversationId);
    }
  }, [chatMode, selectedConversationId, selectedGroupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // WebSocket event handlers
  useEffect(() => {
    if (!socket) return;

    // Handle new messages
    onNewMessage((message) => {
      setMessages(prev => [...prev, message]);
    });

    // Handle new notifications
    onNewNotification((notification) => {
      // You can integrate this with your notification system
      console.log("New notification:", notification);
    });

    // Handle user online/offline status
    onUserOnline((user) => {
      console.log("User came online:", user);
    });

    onUserOffline((user) => {
      console.log("User went offline:", user);
    });

    // Handle real-time group events
    onGroupCreated((group) => {
      console.log("Real-time group created:", group);
      setGroups(prev => [group, ...prev]);
    });

    onGroupUpdated((group) => {
      console.log("Real-time group updated:", group);
      setGroups(prev => prev.map(g => g.id === group.id ? group : g));
    });

    onGroupDeleted((groupId) => {
      console.log("Real-time group deleted:", groupId);
      setGroups(prev => prev.filter(g => g.id !== groupId));
      // If the deleted group was selected, switch to general
      if (selectedGroupId === groupId) {
        setSelectedGroupId("general");
      }
    });

  }, [socket, onNewMessage, onNewNotification, onUserOnline, onUserOffline, onGroupCreated, onGroupUpdated, onGroupDeleted]);

  // Join/leave conversation rooms when selection changes
  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log("🔄 Socket room change:", { chatMode, selectedGroupId, selectedConversationId });

    if (chatMode === "groups" && selectedGroupId) {
      // Join the selected group room
      console.log("📥 Joining group room:", selectedGroupId);
      joinConversation(selectedGroupId, "group");
    } else if (selectedConversationId) {
      console.log("📥 Joining conversation room:", selectedConversationId);
      joinConversation(selectedConversationId, "direct");
    }

    return () => {
      if (chatMode === "groups" && selectedGroupId) {
        console.log("📤 Leaving group room:", selectedGroupId);
        leaveConversation(selectedGroupId, "group");
      } else if (selectedConversationId) {
        console.log("📤 Leaving conversation room:", selectedConversationId);
        leaveConversation(selectedConversationId, "direct");
      }
    };
  }, [socket, isConnected, chatMode, selectedGroupId, selectedConversationId]);

  const fetchGroups = async () => {
    try {
      const response = await fetch("/api/groups");

      if (!response.ok) {
        if (response.status === 401) {
          console.log("User not authenticated for groups");
          return;
        }
        throw new Error("Failed to fetch groups");
      }

      const data = await response.json();
      setGroups(data.groups || []);
    } catch (error) {
      console.error("Error fetching groups:", error);
      setGroups([]);
    }
  };

  const fetchGroupMessages = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/chat/messages");
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Error fetching group messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConversationMessages = async (conversationId: string) => {
    setIsLoading(true);
    try {
      console.log("ChatPage - Fetching conversation messages for:", conversationId);
      const response = await fetch(`/api/conversations/${conversationId}/messages`);

      if (response.ok) {
        const data = await response.json();
        console.log("ChatPage - Received conversation messages:", data);
        setMessages(data);
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("ChatPage - Error fetching conversation messages:", errorData);
        throw new Error(errorData.error || "Failed to fetch messages");
      }
    } catch (error: any) {
      console.error("ChatPage - Error fetching conversation messages:", error);
      // You might want to show an error message to the user here
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if ((!content.trim() && (!attachments || attachments.length === 0)) || !session?.user) {
      console.warn("Cannot send message: empty content and no attachments, or no session");
      return;
    }

    console.log("Sending message:", {
      content: content.trim(),
      attachments: attachments?.length || 0,
      userId: session.user.id,
      mode: chatMode
    });

    try {
      let response;

      // Prepare form data for file uploads
      const formData = new FormData();
      formData.append("content", content.trim());

      if (attachments && attachments.length > 0) {
        attachments.forEach((file, index) => {
          formData.append(`attachment_${index}`, file);
        });
        formData.append("attachmentCount", attachments.length.toString());
      }

      if (chatMode === "groups") {
        // Send to group chat
        response = await fetch("/api/chat/messages", {
          method: "POST",
          body: formData, // Use FormData instead of JSON for file uploads
        });
      } else if (selectedConversationId) {
        // Send to direct conversation
        response = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
          method: "POST",
          body: formData, // Use FormData instead of JSON for file uploads
        });
      } else {
        throw new Error("No conversation selected");
      }

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("API Error:", errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to send message`);
      }

      const data = await response.json();
      console.log("Message sent successfully:", data);

      // Add user message
      if (data.userMessage) {
        setMessages(prev => [...prev, data.userMessage]);
      }

      // Add AI response if it exists
      if (data.aiResponse) {
        setTimeout(() => {
          setMessages(prev => [...prev, data.aiResponse]);
        }, 1000);
      }

      // Input is cleared in ChatInput component
    } catch (error: any) {
      console.error("Error sending message:", error);
      const errorMessage = error.message || "Failed to send message. Please try again.";
      alert(errorMessage);
    }
  };

  const handleSelectConversation = (conversationId: string, otherUser: User) => {
    setSelectedConversationId(conversationId);
    setSelectedUser(otherUser);
    setChatMode("direct");
  };

  const handleStartConversation = (conversationId: string, otherUser: User) => {
    setSelectedConversationId(conversationId);
    setSelectedUser(otherUser);
    setChatMode("direct");
    setShowUserDirectory(false);
  };

  const handleInputChange = (value: string) => {
    setNewMessage(value);

    // Handle typing indicators
    if (socket && isConnected) {
      if (value.trim() && !isTyping) {
        setIsTyping(true);
        const conversationId = chatMode === "groups" ? selectedGroupId : selectedConversationId;
        if (conversationId) {
          startTyping(conversationId, chatMode === "groups" ? "group" : "direct");
        }
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        if (isTyping) {
          setIsTyping(false);
          const conversationId = chatMode === "groups" ? selectedGroupId : selectedConversationId;
          if (conversationId) {
            stopTyping(conversationId, chatMode === "groups" ? "group" : "direct");
          }
        }
      }, 2000); // Stop typing after 2 seconds of inactivity
    }
  };

  const handleStopTyping = () => {
    if (isTyping && socket && isConnected) {
      setIsTyping(false);
      const conversationId = chatMode === "groups" ? selectedGroupId : selectedConversationId;
      if (conversationId) {
        stopTyping(conversationId, chatMode === "groups" ? "group" : "direct");
      }
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <div className="w-80 bg-gray-800/30 border-r border-gray-700 flex flex-col">
        {/* Mode Switcher */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex bg-gray-900/50 rounded-lg p-1">
            <button
              onClick={() => setChatMode("groups")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                chatMode === "groups"
                  ? "bg-teal-400 text-slate-900"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Hash className="w-4 h-4" />
              Groups
            </button>
            <button
              onClick={() => setChatMode("direct")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                chatMode === "direct"
                  ? "bg-teal-400 text-slate-900"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Direct
            </button>
          </div>
        </div>

        {/* Content based on mode */}
        <div className="flex-1 overflow-hidden">
          {chatMode === "groups" ? (
            <div className="p-4 space-y-2">
              {/* Default general group */}
              <div
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedGroupId === "general"
                    ? "bg-teal-400/10 border-teal-400/20"
                    : "bg-gray-900/30 border-gray-700 hover:bg-gray-800/50"
                }`}
                onClick={() => setSelectedGroupId("general")}
              >
                <Hash className="w-5 h-5 text-teal-400" />
                <div>
                  <p className="text-white font-medium">#general</p>
                  <p className="text-gray-400 text-sm">Team communication</p>
                </div>
              </div>

              {/* Dynamic groups */}
              {groups.map((group) => (
                <div
                  key={group.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedGroupId === group.id
                      ? "bg-teal-400/10 border-teal-400/20"
                      : "bg-gray-900/30 border-gray-700 hover:bg-gray-800/50"
                  }`}
                  onClick={() => setSelectedGroupId(group.id)}
                >
                  <Hash className="w-5 h-5 text-teal-400" />
                  <div className="flex-1">
                    <p className="text-white font-medium">#{group.name}</p>
                    <p className="text-gray-400 text-sm">
                      {group.description || `${group.memberCount} members`}
                    </p>
                  </div>
                  {group.isPrivate && (
                    <div className="w-2 h-2 bg-yellow-400 rounded-full" title="Private group" />
                  )}
                </div>
              ))}

              {groups.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Hash className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                  <p className="text-sm">No groups available</p>
                  <p className="text-xs">Ask an admin to create groups</p>
                </div>
              )}
            </div>
          ) : (
            <ConversationsList
              onSelectConversation={handleSelectConversation}
              onStartNewConversation={() => setShowUserDirectory(true)}
              selectedConversationId={selectedConversationId}
            />
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800/50 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              {chatMode === "groups" ? (
                <>
                  <h1 className="text-xl font-semibold text-white">
                    #{selectedGroupId === "general" ? "general" : groups.find(g => g.id === selectedGroupId)?.name || "unknown"}
                  </h1>
                  <p className="text-gray-400 text-sm">
                    {selectedGroupId === "general"
                      ? "Team communication channel"
                      : groups.find(g => g.id === selectedGroupId)?.description || "Group chat"
                    }
                  </p>
                </>
              ) : selectedUser ? (
                <>
                  <h1 className="text-xl font-semibold text-white">{selectedUser.name || selectedUser.email}</h1>
                  <p className="text-gray-400 text-sm">Direct conversation</p>
                </>
              ) : (
                <>
                  <h1 className="text-xl font-semibold text-white">Direct Messages</h1>
                  <p className="text-gray-400 text-sm">Select a conversation to start chatting</p>
                </>
              )}
            </div>
            <div className="flex items-center gap-4 text-gray-400">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4" />
                <span className="text-sm">AI Assistant available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
              {onlineUsers.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{onlineUsers.length} online</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-400"></div>
            </div>
          ) : chatMode === "direct" && !selectedConversationId ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <p className="mb-4">Select a conversation or start a new one</p>
                <button
                  onClick={() => setShowUserDirectory(true)}
                  className="px-4 py-2 bg-teal-400 text-slate-900 rounded-lg font-medium hover:bg-teal-300 transition-colors"
                >
                  Start New Conversation
                </button>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isOwn={message.authorId === session?.user?.id}
              />
            ))
          )}

          {/* Typing Indicators */}
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>
                {typingUsers.length === 1
                  ? `${typingUsers[0].userName} is typing...`
                  : `${typingUsers.length} people are typing...`
                }
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {(chatMode === "groups" || selectedConversationId) && (
          <div className="border-t border-gray-700 p-4">
            <ChatInput
              value={newMessage}
              onChange={handleInputChange}
              onSend={(content, attachments) => {
                handleStopTyping();
                handleSendMessage(content, attachments);
              }}
              placeholder={
                chatMode === "groups"
                  ? "Type a message... Use @ai to ask the AI assistant"
                  : `Message ${selectedUser?.name || selectedUser?.email || "user"}... Use @ai for AI assistance`
              }
            />
          </div>
        )}
      </div>

      {/* User Directory Modal */}
      <UserDirectory
        isOpen={showUserDirectory}
        onClose={() => setShowUserDirectory(false)}
        onStartConversation={handleStartConversation}
      />
    </div>
  );
}
