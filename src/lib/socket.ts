import { Server as NetServer } from "http";
import { NextApiRequest, NextApiResponse } from "next";
import { Server as ServerIO } from "socket.io";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: ServerIO;
    };
  };
};

interface SocketUser {
  id: string;
  name: string;
  email: string;
  workspaceId: string;
  socketId: string;
  lastSeen: Date;
}

interface TypingUser {
  userId: string;
  userName: string;
  conversationId?: string;
  groupId?: string;
  timestamp: Date;
}

class SocketManager {
  private io: ServerIO | null = null;
  private connectedUsers = new Map<string, SocketUser>();
  private typingUsers = new Map<string, TypingUser>();

  initialize(server: NetServer) {
    if (this.io) return this.io;

    this.io = new ServerIO(server, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    this.io.on("connection", (socket) => {
      console.log("Socket connected:", socket.id);

      // Handle user authentication
      socket.on("authenticate", async (data) => {
        try {
          const { sessionToken } = data;
          // In a real implementation, you'd verify the session token
          // For now, we'll use a simplified approach

          if (data.user) {
            const user: SocketUser = {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              workspaceId: data.user.workspaceId,
              socketId: socket.id,
              lastSeen: new Date()
            };

            this.connectedUsers.set(socket.id, user);

            // Join workspace room
            socket.join(`workspace:${user.workspaceId}`);

            // Notify others in workspace about user coming online
            socket.to(`workspace:${user.workspaceId}`).emit("user_online", {
              userId: user.id,
              userName: user.name,
              timestamp: new Date().toISOString()
            });

            // Send current online users to the newly connected user
            const onlineUsers = this.getWorkspaceUsers(user.workspaceId);
            socket.emit("online_users", onlineUsers);

            console.log(`User ${user.name} authenticated and joined workspace ${user.workspaceId}`);
          }
        } catch (error) {
          console.error("Authentication error:", error);
          socket.emit("auth_error", { message: "Authentication failed" });
        }
      });

      // Handle joining conversation rooms
      socket.on("join_conversation", (data) => {
        const { conversationId, type } = data; // type: 'group' | 'direct'
        const roomName = type === 'group' ? `group:${conversationId}` : `conversation:${conversationId}`;
        socket.join(roomName);
        console.log(`Socket ${socket.id} joined ${roomName}`);
      });

      // Handle leaving conversation rooms
      socket.on("leave_conversation", (data) => {
        const { conversationId, type } = data;
        const roomName = type === 'group' ? `group:${conversationId}` : `conversation:${conversationId}`;
        socket.leave(roomName);
        console.log(`Socket ${socket.id} left ${roomName}`);
      });

      // Handle typing indicators
      socket.on("typing_start", (data) => {
        const user = this.connectedUsers.get(socket.id);
        if (!user) return;

        const { conversationId, type } = data;
        const roomName = type === 'group' ? `group:${conversationId}` : `conversation:${conversationId}`;
        const typingKey = `${user.id}:${conversationId}`;

        this.typingUsers.set(typingKey, {
          userId: user.id,
          userName: user.name,
          conversationId: type === 'direct' ? conversationId : undefined,
          groupId: type === 'group' ? conversationId : undefined,
          timestamp: new Date()
        });

        // Broadcast typing indicator to others in the room
        socket.to(roomName).emit("user_typing", {
          userId: user.id,
          userName: user.name,
          conversationId,
          type,
          timestamp: new Date().toISOString()
        });
      });

      socket.on("typing_stop", (data) => {
        const user = this.connectedUsers.get(socket.id);
        if (!user) return;

        const { conversationId, type } = data;
        const roomName = type === 'group' ? `group:${conversationId}` : `conversation:${conversationId}`;
        const typingKey = `${user.id}:${conversationId}`;

        this.typingUsers.delete(typingKey);

        // Broadcast stop typing to others in the room
        socket.to(roomName).emit("user_stop_typing", {
          userId: user.id,
          conversationId,
          type,
          timestamp: new Date().toISOString()
        });
      });

      // Handle message read receipts
      socket.on("message_read", (data) => {
        const user = this.connectedUsers.get(socket.id);
        if (!user) return;

        const { messageId, conversationId, type } = data;
        const roomName = type === 'group' ? `group:${conversationId}` : `conversation:${conversationId}`;

        // Broadcast read receipt to others in the room
        socket.to(roomName).emit("message_read_receipt", {
          messageId,
          readBy: {
            userId: user.id,
            userName: user.name
          },
          conversationId,
          type,
          timestamp: new Date().toISOString()
        });
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        const user = this.connectedUsers.get(socket.id);
        if (user) {
          // Notify others in workspace about user going offline
          socket.to(`workspace:${user.workspaceId}`).emit("user_offline", {
            userId: user.id,
            userName: user.name,
            timestamp: new Date().toISOString()
          });

          // Clean up typing indicators
          for (const [key, typingUser] of this.typingUsers.entries()) {
            if (typingUser.userId === user.id) {
              this.typingUsers.delete(key);
            }
          }

          this.connectedUsers.delete(socket.id);
          console.log(`User ${user.name} disconnected`);
        }
      });
    });

    // Clean up old typing indicators periodically
    setInterval(() => {
      const now = new Date();
      for (const [key, typingUser] of this.typingUsers.entries()) {
        if (now.getTime() - typingUser.timestamp.getTime() > 10000) { // 10 seconds
          this.typingUsers.delete(key);
        }
      }
    }, 5000);

    return this.io;
  }

  // Broadcast new message to relevant users
  broadcastMessage(message: any, conversationId: string, type: 'group' | 'direct') {
    if (!this.io) return;

    const roomName = type === 'group' ? `group:${conversationId}` : `conversation:${conversationId}`;

    this.io.to(roomName).emit("new_message", {
      ...message,
      conversationId,
      type,
      timestamp: new Date().toISOString()
    });
  }

  // Broadcast notification to user
  broadcastNotification(userId: string, notification: any) {
    if (!this.io) return;

    // Find user's socket
    for (const [socketId, user] of this.connectedUsers.entries()) {
      if (user.id === userId) {
        this.io.to(socketId).emit("new_notification", notification);
        break;
      }
    }
  }

  // Broadcast group creation to workspace
  broadcastGroupCreated(workspaceId: string, group: any) {
    if (!this.io) return;

    this.io.to(`workspace:${workspaceId}`).emit("group_created", {
      group,
      timestamp: new Date().toISOString()
    });
  }

  // Broadcast group updates to workspace
  broadcastGroupUpdated(workspaceId: string, group: any) {
    if (!this.io) return;

    this.io.to(`workspace:${workspaceId}`).emit("group_updated", {
      group,
      timestamp: new Date().toISOString()
    });
  }

  // Broadcast group deletion to workspace
  broadcastGroupDeleted(workspaceId: string, groupId: string) {
    if (!this.io) return;

    this.io.to(`workspace:${workspaceId}`).emit("group_deleted", {
      groupId,
      timestamp: new Date().toISOString()
    });
  }

  // Get online users in a workspace
  getWorkspaceUsers(workspaceId: string) {
    const users = [];
    for (const [socketId, user] of this.connectedUsers.entries()) {
      if (user.workspaceId === workspaceId) {
        users.push({
          userId: user.id,
          userName: user.name,
          lastSeen: user.lastSeen.toISOString()
        });
      }
    }
    return users;
  }

  // Get typing users for a conversation
  getTypingUsers(conversationId: string) {
    const typingUsers = [];
    for (const [key, typingUser] of this.typingUsers.entries()) {
      if (typingUser.conversationId === conversationId || typingUser.groupId === conversationId) {
        typingUsers.push({
          userId: typingUser.userId,
          userName: typingUser.userName
        });
      }
    }
    return typingUsers;
  }
}

export const socketManager = new SocketManager();
