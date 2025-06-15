"use client";

import { useState, useEffect } from "react";
import {
  X,
  Calendar,
  User,
  Flag,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
  Edit3,
  Save
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useMobileDetection } from "@/hooks/useMobileDetection";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  dueDate?: string;
  createdAt: string;
}

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onTaskUpdated?: () => void;
}

interface WorkspaceUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
}

export const TaskDetailModal = ({ isOpen, onClose, task, onTaskUpdated }: TaskDetailModalProps) => {
  const { data: session } = useSession();
  const { isMobile } = useMobileDetection();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancementProgress, setEnhancementProgress] = useState(0);
  const [enhancementSuccess, setEnhancementSuccess] = useState(false);
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    assigneeId: "",
    dueDate: "",
    status: "TODO"
  });

  // Initialize form data when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || "",
        priority: task.priority,
        assigneeId: task.assignee?.id || "",
        dueDate: task.dueDate || "",
        status: task.status
      });
    }
  }, [task]);

  // Load workspace users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!session?.user?.workspaceId || !isOpen) return;

      try {
        const response = await fetch(`/api/workspace/${session.user.workspaceId}/users`);
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };

    fetchUsers();
  }, [isOpen, session?.user?.workspaceId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // AI Enhancement function
  const enhanceDescription = async () => {
    if (!formData.title.trim()) {
      setError("Please enter a task title first");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsEnhancing(true);
    setError(null);
    setEnhancementProgress(0);

    const progressInterval = setInterval(() => {
      setEnhancementProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const response = await fetch("/api/ai/enhance-task-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          currentDescription: formData.description,
          priority: formData.priority
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to enhance description");
      }

      const data = await response.json();

      setEnhancementProgress(100);
      setFormData(prev => ({ ...prev, description: data.enhancedDescription }));
      setEnhancementSuccess(true);

      setTimeout(() => {
        setEnhancementSuccess(false);
        setEnhancementProgress(0);
      }, 2000);

    } catch (error) {
      console.error("Enhancement error:", error);
      setError(error instanceof Error && error.message.includes('timeout')
        ? "AI enhancement is taking longer than expected. Please try again."
        : "Failed to enhance description. Please try again.");
      setTimeout(() => setError(null), 5000);
    } finally {
      clearInterval(progressInterval);
      setIsEnhancing(false);
    }
  };

  const handleSave = async () => {
    if (!task) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          assigneeId: formData.assigneeId || null,
          dueDate: formData.dueDate || null,
          status: formData.status
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update task");
      }

      setIsEditing(false);
      onTaskUpdated?.();
    } catch (error) {
      console.error("Error updating task:", error);
      setError(error instanceof Error ? error.message : "Failed to update task. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-gray-900 border border-gray-700 rounded-xl w-full overflow-y-auto ${
        isMobile
          ? 'max-w-full h-full max-h-full rounded-none'
          : 'max-w-2xl max-h-[90vh]'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Task Details</h2>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-teal-400/10 border border-teal-400/20 text-teal-400 rounded-lg hover:bg-teal-400/20 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
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

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title
            </label>
            {isEditing ? (
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            ) : (
              <div className="text-white text-lg font-medium">{task.title}</div>
            )}
          </div>

          {/* Description with AI Enhancement */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">
                Description
              </label>
              {isEditing && (
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
              )}
            </div>
            {isEditing ? (
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
                placeholder="Enter task description or use AI to enhance it..."
              />
            ) : (
              <div className="text-gray-300 bg-gray-900/50 rounded-lg p-3 min-h-[100px]">
                {task.description || "No description provided."}
              </div>
            )}
          </div>

          {/* Task Details Grid */}
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Flag className="w-4 h-4 inline mr-1" />
                Priority
              </label>
              {isEditing ? (
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              ) : (
                <div className="text-white">{task.priority}</div>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              {isEditing ? (
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="REVIEW">Review</option>
                  <option value="DONE">Done</option>
                </select>
              ) : (
                <div className="text-white">{task.status.replace('_', ' ')}</div>
              )}
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Assignee
              </label>
              {isEditing ? (
                <select
                  name="assigneeId"
                  value={formData.assigneeId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-white">{task.assignee?.name || "Unassigned"}</div>
              )}
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Due Date
              </label>
              {isEditing ? (
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              ) : (
                <div className="text-white">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        {isEditing && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-teal-400 text-slate-900 rounded-lg font-medium hover:bg-teal-300 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
