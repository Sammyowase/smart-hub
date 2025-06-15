"use client";

import { useState, useEffect } from "react";
import { X, Calendar, User, Flag, Sparkles, Loader2, Check, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useMobileDetection } from "@/hooks/useMobileDetection";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: () => void;
}

interface WorkspaceUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
}

export const CreateTaskModal = ({ isOpen, onClose, onTaskCreated }: CreateTaskModalProps) => {
  const { data: session } = useSession();
  const { isMobile } = useMobileDetection();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    assigneeId: "",
    dueDate: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [enhancementSuccess, setEnhancementSuccess] = useState(false);
  const [enhancementProgress, setEnhancementProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load workspace users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!session?.user?.workspaceId) return;

      setLoadingUsers(true);
      try {
        const response = await fetch(`/api/workspace/${session.user.workspaceId}/users`);
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setLoadingUsers(false);
      }
    };

    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, session?.user?.workspaceId]);

  // AI Enhancement function with improved timeout handling
  const enhanceDescription = async () => {
    if (!formData.title.trim()) {
      setError("Please enter a task title first");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsEnhancing(true);
    setError(null);
    setEnhancementProgress(0);

    // Progressive progress tracking with realistic timing
    let progressStage = 0;
    const progressInterval = setInterval(() => {
      if (progressStage < 8000) { // First 8 seconds - quick progress
        setEnhancementProgress(prev => Math.min(prev + 8, 70));
      } else if (progressStage < 15000) { // 8-15 seconds - slower progress
        setEnhancementProgress(prev => Math.min(prev + 3, 85));
      } else { // 15+ seconds - very slow progress
        setEnhancementProgress(prev => Math.min(prev + 1, 95));
      }
      progressStage += 500;
    }, 500);

    try {
      const startTime = Date.now();
      const response = await fetch("/api/ai/enhance-task-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          currentDescription: formData.description,
          priority: formData.priority
        }),
      });

      const processingTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error("Failed to enhance description");
      }

      const data = await response.json();

      // Complete progress
      setEnhancementProgress(100);

      setFormData(prev => ({ ...prev, description: data.enhancedDescription }));
      setEnhancementSuccess(true);

      // Show appropriate success message based on processing method
      if (data.fallback) {
        if (data.fallbackReason === 'AI_TIMEOUT') {
          setError("AI took too long, used smart fallback enhancement. Result may be less detailed.");
          setTimeout(() => setError(null), 6000);
        } else {
          setError("AI unavailable, used intelligent fallback enhancement.");
          setTimeout(() => setError(null), 4000);
        }
      } else {
        console.log(`AI enhancement completed in ${processingTime}ms`);
      }

      // Clear success state
      setTimeout(() => {
        setEnhancementSuccess(false);
        setEnhancementProgress(0);
      }, 2000);

    } catch (error) {
      console.error("Enhancement error:", error);

      // Provide specific error messages based on error type
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          setError("AI enhancement timed out. The system is working on a fallback solution...");
        } else if (error.message.includes('Failed to fetch')) {
          setError("Network error. Please check your connection and try again.");
        } else {
          setError("Enhancement failed. Please try again or continue without AI enhancement.");
        }
      } else {
        setError("Unexpected error occurred. Please try again.");
      }

      setTimeout(() => setError(null), 6000);
    } finally {
      clearInterval(progressInterval);
      setIsEnhancing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          assigneeId: formData.assigneeId || null,
          dueDate: formData.dueDate || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create task");
      }

      // Reset form
      setFormData({
        title: "",
        description: "",
        priority: "MEDIUM",
        assigneeId: "",
        dueDate: "",
      });

      onClose();
      onTaskCreated?.();
    } catch (error) {
      console.error("Error creating task:", error);
      setError(error instanceof Error ? error.message : "Failed to create task. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className={`bg-gray-800 border border-gray-700 rounded-xl w-full ${
        isMobile ? 'max-w-full h-full max-h-full rounded-none' : 'max-w-md'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Create New Task</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
              Task Title *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
              placeholder="Enter task title"
            />
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-300">
                Description
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={enhanceDescription}
                  disabled={isEnhancing || !formData.title.trim()}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-md hover:bg-purple-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Use AI to enhance description"
                >
                  {isEnhancing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : enhancementSuccess ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  {isEnhancing ? "Enhancing..." : enhancementSuccess ? "Enhanced!" : "AI Enhance"}
                </button>

                {/* Progress bar */}
                {isEnhancing && (
                  <div className="flex-1 max-w-20">
                    <div className="w-full bg-gray-700 rounded-full h-1">
                      <div
                        className="bg-purple-400 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${enhancementProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent resize-none"
              placeholder="Enter task description or use AI to enhance it..."
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 Tip: Enter a title first, then click "AI Enhance" to automatically improve your description
            </p>
          </div>

          {/* Priority */}
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-300 mb-2">
              <Flag className="w-4 h-4 inline mr-1" />
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Assignee */}
          <div>
            <label htmlFor="assigneeId" className="block text-sm font-medium text-gray-300 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Assignee
              {loadingUsers && (
                <Loader2 className="w-3 h-3 inline ml-2 animate-spin text-gray-400" />
              )}
            </label>
            <select
              id="assigneeId"
              name="assigneeId"
              value={formData.assigneeId}
              onChange={handleChange}
              disabled={loadingUsers}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent disabled:opacity-50"
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </option>
              ))}
            </select>
            {users.length === 0 && !loadingUsers && (
              <p className="text-xs text-gray-500 mt-1">
                No workspace users found. Task will be unassigned.
              </p>
            )}
          </div>

          {/* Due Date */}
          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Due Date
            </label>
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-teal-400 text-slate-900 rounded-lg font-medium hover:bg-teal-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Task"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
