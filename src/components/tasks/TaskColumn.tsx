"use client";

import { TaskCard } from "./TaskCard";

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

interface TaskColumnProps {
  title: string;
  status: string;
  tasks: Task[];
  onTaskMove: (taskId: string, newStatus: string) => void;
  onTaskClick?: (task: Task) => void;
  color: string;
}

export const TaskColumn = ({ title, status, tasks, onTaskMove, onTaskClick, color }: TaskColumnProps) => {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    onTaskMove(taskId, status);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Column Header */}
      <div className={`border-l-4 ${color} bg-gray-800/50 border border-gray-700 rounded-t-xl p-4`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">{title}</h3>
          <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Tasks Container */}
      <div
        className="flex-1 bg-gray-800/30 border-l border-r border-b border-gray-700 rounded-b-xl p-4 space-y-3 min-h-[500px]"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
            No tasks in {title.toLowerCase()}
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onTaskClick} />
          ))
        )}
      </div>
    </div>
  );
};
