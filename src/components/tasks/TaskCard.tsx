"use client";

import { Calendar, User, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
}

const priorityColors = {
  LOW: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  MEDIUM: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  HIGH: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  URGENT: "bg-red-500/20 text-red-400 border-red-500/30",
};

export const TaskCard = ({ task, onClick }: TaskCardProps) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", task.id);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger click when dragging
    if (e.defaultPrevented) return;
    onClick?.(task);
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  const dueSoon = task.dueDate &&
    new Date(task.dueDate) > new Date() &&
    new Date(task.dueDate) <= new Date(Date.now() + 24 * 60 * 60 * 1000); // Due within 24 hours

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-700/50 transition-colors cursor-pointer group"
    >
      {/* Priority Badge */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={cn(
            "text-xs px-2 py-1 rounded-full border font-medium",
            priorityColors[task.priority]
          )}
        >
          {task.priority}
        </span>
        {(isOverdue || dueSoon) && (
          <AlertCircle
            className={cn(
              "w-4 h-4",
              isOverdue ? "text-red-400" : "text-yellow-400"
            )}
          />
        )}
      </div>

      {/* Task Title */}
      <h4 className="text-white font-medium mb-2 group-hover:text-teal-400 transition-colors">
        {task.title}
      </h4>

      {/* Task Description */}
      {task.description && (
        <p className="text-gray-400 text-sm mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Task Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        {/* Due Date */}
        {task.dueDate && (
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span className={cn(
              isOverdue && "text-red-400",
              dueSoon && "text-yellow-400"
            )}>
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Assignee */}
        {task.assignee && (
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-medium">
                {task.assignee.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
