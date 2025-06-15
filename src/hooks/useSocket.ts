"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";

interface OnlineUser {
  userId: string;
  userName: string;
  lastSeen: string;
}

interface TypingUser {
  userId: string;
  userName: string;
  conversationId: string;
  type: 'group' | 'direct';
  timestamp: string;
}

interface MessageReadReceipt {
  messageId: string;
  readBy: {
    userId: string;
    userName: string;
  };
  conversationId: string;
  type: 'group' | 'direct';
  timestamp: string;
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: OnlineUser[];
  typingUsers: TypingUser[];
  joinConversation: (conversationId: string, type: 'group' | 'direct') => void;
  leaveConversation: (conversationId: string, type: 'group' | 'direct') => void;
  startTyping: (conversationId: string, type: 'group' | 'direct') => void;
  stopTyping: (conversationId: string, type: 'group' | 'direct') => void;
  markMessageAsRead: (messageId: string, conversationId: string, type: 'group' | 'direct') => void;
  onNewMessage: (callback: (message: any) => void) => void;
  onNewNotification: (callback: (notification: any) => void) => void;
  onUserOnline: (callback: (user: OnlineUser) => void) => void;
  onUserOffline: (callback: (user: { userId: string; userName: string; timestamp: string }) => void) => void;
  onGroupCreated: (callback: (group: any) => void) => void;
  onGroupUpdated: (callback: (group: any) => void) => void;
  onGroupDeleted: (callback: (groupId: string) => void) => void;
}

export const useSocket = (): UseSocketReturn => {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  const messageCallbackRef = useRef<((message: any) => void) | null>(null);
  const notificationCallbackRef = useRef<((notification: any) => void) | null>(null);
  const userOnlineCallbackRef = useRef<((user: OnlineUser) => void) | null>(null);
  const userOfflineCallbackRef = useRef<((user: any) => void) | null>(null);
  const groupCreatedCallbackRef = useRef<((group: any) => void) | null>(null);
  const groupUpdatedCallbackRef = useRef<((group: any) => void) | null>(null);
  const groupDeletedCallbackRef = useRef<((groupId: string) => void) | null>(null);

  useEffect(() => {
    if (!session?.user) return;

    // Initialize socket connection
    const socketInstance = io(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000", {
      path: "/api/socket",
      addTrailingSlash: false,
    });

    socketInstance.on("connect", () => {
      console.log("Socket connected:", socketInstance.id);
      setIsConnected(true);

      // Authenticate with the server
      socketInstance.emit("authenticate", {
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          workspaceId: session.user.workspaceId
        }
      });
    });

    socketInstance.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    socketInstance.on("auth_error", (data) => {
      console.error("Socket authentication error:", data);
    });

    // Handle online users
    socketInstance.on("online_users", (users: OnlineUser[]) => {
      setOnlineUsers(users);
    });

    socketInstance.on("user_online", (user: OnlineUser) => {
      setOnlineUsers(prev => {
        const exists = prev.find(u => u.userId === user.userId);
        if (exists) return prev;
        return [...prev, user];
      });
      userOnlineCallbackRef.current?.(user);
    });

    socketInstance.on("user_offline", (data: { userId: string; userName: string; timestamp: string }) => {
      setOnlineUsers(prev => prev.filter(u => u.userId !== data.userId));
      userOfflineCallbackRef.current?.(data);
    });

    // Handle typing indicators
    socketInstance.on("user_typing", (data: TypingUser) => {
      setTypingUsers(prev => {
        const exists = prev.find(u => u.userId === data.userId && u.conversationId === data.conversationId);
        if (exists) return prev;
        return [...prev, data];
      });
    });

    socketInstance.on("user_stop_typing", (data: { userId: string; conversationId: string }) => {
      setTypingUsers(prev => prev.filter(u =>
        !(u.userId === data.userId && u.conversationId === data.conversationId)
      ));
    });

    // Handle new messages
    socketInstance.on("new_message", (message: any) => {
      messageCallbackRef.current?.(message);
    });

    // Handle new notifications
    socketInstance.on("new_notification", (notification: any) => {
      notificationCallbackRef.current?.(notification);
    });

    // Handle message read receipts
    socketInstance.on("message_read_receipt", (data: MessageReadReceipt) => {
      // Handle read receipts if needed
      console.log("Message read receipt:", data);
    });

    // Handle group events
    socketInstance.on("group_created", (data: { group: any; timestamp: string }) => {
      console.log("Group created:", data.group);
      groupCreatedCallbackRef.current?.(data.group);
    });

    socketInstance.on("group_updated", (data: { group: any; timestamp: string }) => {
      console.log("Group updated:", data.group);
      groupUpdatedCallbackRef.current?.(data.group);
    });

    socketInstance.on("group_deleted", (data: { groupId: string; timestamp: string }) => {
      console.log("Group deleted:", data.groupId);
      groupDeletedCallbackRef.current?.(data.groupId);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [session?.user]);

  const joinConversation = useCallback((conversationId: string, type: 'group' | 'direct') => {
    console.log("🔌 Socket joinConversation called:", { conversationId, type, socketId: socket?.id });
    socket?.emit("join_conversation", { conversationId, type });
  }, [socket]);

  const leaveConversation = useCallback((conversationId: string, type: 'group' | 'direct') => {
    console.log("🔌 Socket leaveConversation called:", { conversationId, type, socketId: socket?.id });
    socket?.emit("leave_conversation", { conversationId, type });
  }, [socket]);

  const startTyping = useCallback((conversationId: string, type: 'group' | 'direct') => {
    socket?.emit("typing_start", { conversationId, type });
  }, [socket]);

  const stopTyping = useCallback((conversationId: string, type: 'group' | 'direct') => {
    socket?.emit("typing_stop", { conversationId, type });
  }, [socket]);

  const markMessageAsRead = useCallback((messageId: string, conversationId: string, type: 'group' | 'direct') => {
    socket?.emit("message_read", { messageId, conversationId, type });
  }, [socket]);

  const onNewMessage = (callback: (message: any) => void) => {
    messageCallbackRef.current = callback;
  };

  const onNewNotification = (callback: (notification: any) => void) => {
    notificationCallbackRef.current = callback;
  };

  const onUserOnline = (callback: (user: OnlineUser) => void) => {
    userOnlineCallbackRef.current = callback;
  };

  const onUserOffline = (callback: (user: any) => void) => {
    userOfflineCallbackRef.current = callback;
  };

  const onGroupCreated = (callback: (group: any) => void) => {
    groupCreatedCallbackRef.current = callback;
  };

  const onGroupUpdated = (callback: (group: any) => void) => {
    groupUpdatedCallbackRef.current = callback;
  };

  const onGroupDeleted = (callback: (groupId: string) => void) => {
    groupDeletedCallbackRef.current = callback;
  };

  return {
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
  };
};
