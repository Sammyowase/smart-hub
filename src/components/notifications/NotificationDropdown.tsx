"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  User,
  Calendar,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle
} from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "TASK_ASSIGNED" | "MEETING_REMINDER" | "INVITATION";
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

// Global cache to prevent multiple instances from making duplicate requests
let notificationCache: {
  data: Notification[];
  timestamp: number;
  promise: Promise<Notification[]> | null;
} = {
  data: [],
  timestamp: 0,
  promise: null
};

const CACHE_DURATION = 30000; // 30 seconds
const POLL_INTERVAL = 60000; // Reduced to 60 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);
  const router = useRouter();

  // Debounced fetch function to prevent rapid successive calls
  const fetchNotifications = useCallback(async (force = false) => {
    const now = Date.now();

    // Check if we have fresh cached data and this isn't a forced refresh
    if (!force && notificationCache.data.length > 0 && (now - notificationCache.timestamp) < CACHE_DURATION) {
      setNotifications(notificationCache.data);
      setUnreadCount(notificationCache.data.filter(n => !n.isRead).length);
      setLastFetchTime(notificationCache.timestamp);
      return;
    }

    // If there's already a request in progress, wait for it
    if (notificationCache.promise) {
      try {
        const data = await notificationCache.promise;
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.isRead).length);
        setLastFetchTime(now);
        return;
      } catch (error) {
        // If the shared promise failed, we'll make our own request below
        notificationCache.promise = null;
      }
    }

    // Prevent multiple simultaneous requests using a ref
    if (isLoadingRef.current) return;

    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      // Create a shared promise for this request
      const fetchPromise = fetch("/api/notifications?limit=10").then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      });

      notificationCache.promise = fetchPromise;
      const data = await fetchPromise;

      // Update cache
      notificationCache.data = data;
      notificationCache.timestamp = now;
      notificationCache.promise = null;

      // Update component state
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.isRead).length);
      setLastFetchTime(now);
      setRetryCount(0); // Reset retry count on success

    } catch (error) {
      console.error("Error fetching notifications:", error);
      notificationCache.promise = null;

      // Provide better error context
      let errorMessage = "Failed to fetch notifications";
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          errorMessage = "Authentication required";
        } else if (error.message.includes('403')) {
          errorMessage = "Access denied";
        } else if (error.message.includes('500')) {
          errorMessage = "Server error - please try again later";
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = "Network error - check your connection";
        }
      }

      // Implement exponential backoff for retries
      setRetryCount(currentRetryCount => {
        if (currentRetryCount < MAX_RETRIES) {
          const delay = RETRY_DELAY * Math.pow(2, currentRetryCount);
          console.log(`Retrying notifications fetch in ${delay}ms (attempt ${currentRetryCount + 1}/${MAX_RETRIES})`);
          setTimeout(() => {
            fetchNotifications(force);
          }, delay);
          return currentRetryCount + 1;
        } else {
          console.error(`Failed to fetch notifications after ${MAX_RETRIES} attempts: ${errorMessage}`);
          // Set empty state to show "No notifications" instead of loading forever
          setNotifications([]);
          setUnreadCount(0);
          return currentRetryCount;
        }
      });
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, []); // Remove dependencies that cause infinite loops

  // Setup polling with proper cleanup
  useEffect(() => {
    // Initial fetch
    fetchNotifications();

    // Setup intelligent polling
    const startPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      pollIntervalRef.current = setInterval(() => {
        // Only poll if the tab is visible and component is mounted
        if (!document.hidden) {
          fetchNotifications();
        }
      }, POLL_INTERVAL);
    };

    startPolling();

    // Handle visibility change to pause/resume polling
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause polling when tab is hidden
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      } else {
        // Resume polling when tab becomes visible
        fetchNotifications(); // Immediate fetch when tab becomes visible
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle dropdown open with fresh data fetch
  const handleDropdownToggle = () => {
    if (!isOpen) {
      // Fetch fresh data when opening dropdown
      const now = Date.now();
      if (now - lastFetchTime > 10000) { // Fetch if last fetch was more than 10 seconds ago
        fetchNotifications(true);
      }
    }
    setIsOpen(!isOpen);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Optimistic update
      const updatedNotifications = notifications.map(n =>
        n.id === notificationId ? { ...n, isRead: true } : n
      );
      setNotifications(updatedNotifications);
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Update cache
      notificationCache.data = updatedNotifications;

      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PUT",
      });

      if (!response.ok) {
        // Revert optimistic update on failure
        setNotifications(notifications);
        setUnreadCount(notifications.filter(n => !n.isRead).length);
        notificationCache.data = notifications;
        throw new Error("Failed to mark notification as read");
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (isLoading) return; // Prevent multiple simultaneous requests

    setIsLoading(true);
    try {
      // Optimistic update
      const updatedNotifications = notifications.map(n => ({ ...n, isRead: true }));
      setNotifications(updatedNotifications);
      setUnreadCount(0);

      // Update cache
      notificationCache.data = updatedNotifications;

      const response = await fetch("/api/notifications/mark-all-read", {
        method: "PUT",
      });

      if (!response.ok) {
        // Revert optimistic update on failure
        setNotifications(notifications);
        setUnreadCount(notifications.filter(n => !n.isRead).length);
        notificationCache.data = notifications;
        throw new Error("Failed to mark all notifications as read");
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }

    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "TASK_ASSIGNED":
        return <CheckCircle className="w-4 h-4 text-blue-400" />;
      case "MEETING_REMINDER":
        return <Calendar className="w-4 h-4 text-purple-400" />;
      case "INVITATION":
        return <User className="w-4 h-4 text-teal-400" />;
      case "SUCCESS":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "WARNING":
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case "ERROR":
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Info className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleDropdownToggle}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
        disabled={isLoading}
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-white font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={isLoading}
                className="text-teal-400 hover:text-teal-300 text-sm flex items-center gap-1 disabled:opacity-50"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b border-gray-700 last:border-b-0 cursor-pointer hover:bg-gray-700/50 transition-colors ${
                    !notification.isRead ? "bg-gray-700/30" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-white text-sm font-medium truncate">
                          {notification.title}
                        </h4>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-teal-400 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="w-3 h-3 text-gray-500" />
                        <span className="text-gray-500 text-xs">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-700">
              <button
                onClick={() => {
                  router.push("/dashboard/notifications");
                  setIsOpen(false);
                }}
                className="w-full text-center text-teal-400 hover:text-teal-300 text-sm"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
