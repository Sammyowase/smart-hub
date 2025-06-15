"use client";

import { useState, useEffect, useMemo } from "react";
import { Calendar, User, AlertCircle, MoreHorizontal, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOptimisticTasks } from "@/hooks/useOptimisticTasks";
import { useMobileDetection } from "@/hooks/useMobileDetection";
import { TaskDetailModal } from "./TaskDetailModal";

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

interface TaskListProps {
  searchQuery: string;
  filterStatus: string;
  refreshTrigger?: number;
}

const priorityColors = {
  LOW: "bg-gray-500/20 text-gray-400",
  MEDIUM: "bg-blue-500/20 text-blue-400",
  HIGH: "bg-yellow-500/20 text-yellow-400",
  URGENT: "bg-red-500/20 text-red-400",
};

const statusColors = {
  TODO: "bg-gray-500/20 text-gray-400",
  IN_PROGRESS: "bg-blue-500/20 text-blue-400",
  REVIEW: "bg-yellow-500/20 text-yellow-400",
  DONE: "bg-green-500/20 text-green-400",
};

export const TaskList = ({ searchQuery, filterStatus, refreshTrigger }: TaskListProps) => {
  const {
    tasks,
    isLoading,
    updateTaskStatus,
    hasPendingUpdate,
    refetch
  } = useOptimisticTasks();

  const { isMobile } = useMobileDetection();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (refreshTrigger) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  // Optimized filtering with useMemo for performance
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];

    return tasks.filter((task) => {
      const matchesSearch = searchQuery === "" ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" || task.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchQuery, filterStatus]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedTask(null);
  };

  const handleTaskUpdated = () => {
    refetch();
  };

  const handleStatusChange = async (taskId: string, newStatus: Task["status"]) => {
    await updateTaskStatus(taskId, newStatus);
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
          <span className="ml-3 text-gray-400">Loading tasks...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
      {/* Table Header - Hidden on mobile */}
      {!isMobile && (
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-700 bg-gray-800/70">
          <div className="col-span-4 text-sm font-medium text-gray-300">Task</div>
          <div className="col-span-2 text-sm font-medium text-gray-300">Status</div>
          <div className="col-span-2 text-sm font-medium text-gray-300">Priority</div>
          <div className="col-span-2 text-sm font-medium text-gray-300">Assignee</div>
          <div className="col-span-1 text-sm font-medium text-gray-300">Due Date</div>
          <div className="col-span-1 text-sm font-medium text-gray-300"></div>
        </div>
      )}

      {/* Task Rows */}
      <div className="divide-y divide-gray-700">
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No tasks found matching your criteria
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
            const dueSoon = task.dueDate &&
              new Date(task.dueDate) > new Date() &&
              new Date(task.dueDate) <= new Date(Date.now() + 24 * 60 * 60 * 1000);

            const isPending = hasPendingUpdate(task.id);

            return (
              <div
                key={task.id}
                onClick={() => handleTaskClick(task)}
                className={`${
                  isMobile
                    ? 'p-4 space-y-3'
                    : 'grid grid-cols-12 gap-4 p-4'
                } hover:bg-gray-700/30 transition-colors cursor-pointer ${
                  isPending ? 'opacity-70' : ''
                }`}
              >
                {/* Mobile Layout */}
                {isMobile ? (
                  <>
                    {/* Task Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-white font-medium mb-1">{task.title}</h4>
                        {task.description && (
                          <p className="text-gray-400 text-sm line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTaskClick(task);
                        }}
                        className="ml-2 p-1 text-gray-400 hover:text-white"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Task Meta */}
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={cn(
                          "text-xs px-2 py-1 rounded-full font-medium",
                          statusColors[task.status]
                        )}
                      >
                        {task.status.replace("_", " ")}
                      </span>
                      <span
                        className={cn(
                          "text-xs px-2 py-1 rounded-full font-medium",
                          priorityColors[task.priority]
                        )}
                      >
                        {task.priority}
                      </span>
                    </div>

                    {/* Task Footer */}
                    <div className="flex items-center justify-between text-sm">
                      {task.assignee ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-medium">
                              {task.assignee.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-gray-300">{task.assignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">Unassigned</span>
                      )}

                      {task.dueDate && (
                        <div className="flex items-center gap-1">
                          {(isOverdue || dueSoon) && (
                            <AlertCircle
                              className={cn(
                                "w-3 h-3",
                                isOverdue ? "text-red-400" : "text-yellow-400"
                              )}
                            />
                          )}
                          <span className={cn(
                            "text-sm",
                            isOverdue ? "text-red-400" : dueSoon ? "text-yellow-400" : "text-gray-400"
                          )}>
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* Desktop Layout */
                  <>
                    {/* Task Info */}
                    <div className="col-span-4">
                      <h4 className="text-white font-medium mb-1">{task.title}</h4>
                      {task.description && (
                        <p className="text-gray-400 text-sm line-clamp-1">
                          {task.description}
                        </p>
                      )}
                    </div>

                {/* Status */}
                <div className="col-span-2 flex items-center">
                  <span
                    className={cn(
                      "text-xs px-2 py-1 rounded-full font-medium",
                      statusColors[task.status]
                    )}
                  >
                    {task.status.replace("_", " ")}
                  </span>
                </div>

                {/* Priority */}
                <div className="col-span-2 flex items-center">
                  <span
                    className={cn(
                      "text-xs px-2 py-1 rounded-full font-medium",
                      priorityColors[task.priority]
                    )}
                  >
                    {task.priority}
                  </span>
                </div>

                {/* Assignee */}
                <div className="col-span-2 flex items-center">
                  {task.assignee ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-medium">
                          {task.assignee.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-gray-300 text-sm">
                        {task.assignee.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">Unassigned</span>
                  )}
                </div>

                {/* Due Date */}
                <div className="col-span-1 flex items-center">
                  {task.dueDate ? (
                    <div className="flex items-center gap-1">
                      {(isOverdue || dueSoon) && (
                        <AlertCircle
                          className={cn(
                            "w-3 h-3",
                            isOverdue ? "text-red-400" : "text-yellow-400"
                          )}
                        />
                      )}
                      <span className={cn(
                        "text-sm",
                        isOverdue ? "text-red-400" : dueSoon ? "text-yellow-400" : "text-gray-400"
                      )}>
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">-</span>
                  )}
                </div>

                    {/* Actions */}
                    <div className="col-span-1 flex items-center justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTaskClick(task);
                        }}
                        className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                        title="Edit task"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={showDetailModal}
        onClose={handleCloseModal}
        task={selectedTask}
        onTaskUpdated={handleTaskUpdated}
      />
    </div>
  );
};
