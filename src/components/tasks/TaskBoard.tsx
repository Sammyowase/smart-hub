"use client";

import { useState, useEffect } from "react";
import { TaskColumn } from "./TaskColumn";
import { TaskDetailModal } from "./TaskDetailModal";
import { useOptimisticTasks } from "@/hooks/useOptimisticTasks";
import { useMobileDetection } from "@/hooks/useMobileDetection";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

interface TaskBoardProps {
  searchQuery: string;
  filterStatus: string;
  refreshTrigger?: number;
}

const columns = [
  { id: "TODO", title: "To Do", color: "border-gray-600" },
  { id: "IN_PROGRESS", title: "In Progress", color: "border-blue-500" },
  { id: "REVIEW", title: "Review", color: "border-yellow-500" },
  { id: "DONE", title: "Done", color: "border-green-500" },
];

export const TaskBoard = ({ searchQuery, filterStatus, refreshTrigger }: TaskBoardProps) => {
  const {
    tasks,
    isLoading,
    updateTaskStatus,
    hasPendingUpdate,
    refetch
  } = useOptimisticTasks();

  const { isMobile, isTablet } = useMobileDetection();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentColumnIndex, setCurrentColumnIndex] = useState(0);

  useEffect(() => {
    if (refreshTrigger) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

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

  // Mobile navigation functions
  const nextColumn = () => {
    setCurrentColumnIndex(prev => Math.min(prev + 1, columns.length - 1));
  };

  const prevColumn = () => {
    setCurrentColumnIndex(prev => Math.max(prev - 1, 0));
  };

  const goToColumn = (index: number) => {
    setCurrentColumnIndex(index);
  };

  // Filter tasks based on search and status
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || task.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Group tasks by status
  const tasksByStatus = columns.reduce((acc, column) => {
    acc[column.id] = filteredTasks.filter((task) => task.status === column.id);
    return acc;
  }, {} as Record<string, Task[]>);

  const handleTaskMove = async (taskId: string, newStatus: string) => {
    // Use optimistic update for instant UI feedback
    const success = await updateTaskStatus(taskId, newStatus as Task["status"]);

    if (!success) {
      // Error handling is managed by the optimistic hook
      console.error("Failed to update task status");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  // Mobile view: show one column at a time
  if (isMobile) {
    const currentColumn = columns[currentColumnIndex];
    const currentTasks = tasksByStatus[currentColumn.id] || [];

    return (
      <>
        {/* Mobile Column Navigation */}
        <div className="mb-4">
          {/* Column Tabs */}
          <div className="flex overflow-x-auto scrollbar-hide mb-4">
            {columns.map((column, index) => (
              <button
                key={column.id}
                onClick={() => goToColumn(index)}
                className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-lg mr-2 transition-colors ${
                  index === currentColumnIndex
                    ? 'bg-teal-400 text-slate-900'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {column.title}
                <span className="ml-2 bg-gray-600 text-xs px-1.5 py-0.5 rounded-full">
                  {(tasksByStatus[column.id] || []).length}
                </span>
              </button>
            ))}
          </div>

          {/* Navigation Arrows */}
          <div className="flex items-center justify-between">
            <button
              onClick={prevColumn}
              disabled={currentColumnIndex === 0}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <span className="text-gray-400 text-sm">
              {currentColumnIndex + 1} of {columns.length}
            </span>

            <button
              onClick={nextColumn}
              disabled={currentColumnIndex === columns.length - 1}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Single Column View */}
        <div className="h-full">
          <TaskColumn
            key={currentColumn.id}
            title={currentColumn.title}
            status={currentColumn.id}
            tasks={currentTasks}
            onTaskMove={handleTaskMove}
            onTaskClick={handleTaskClick}
            color={currentColumn.color}
          />
        </div>

        {/* Task Detail Modal */}
        <TaskDetailModal
          isOpen={showDetailModal}
          onClose={handleCloseModal}
          task={selectedTask}
          onTaskUpdated={handleTaskUpdated}
        />
      </>
    );
  }

  // Tablet view: show 2 columns
  if (isTablet) {
    return (
      <>
        <div className="grid grid-cols-2 gap-4 h-full">
          {columns.map((column) => (
            <TaskColumn
              key={column.id}
              title={column.title}
              status={column.id}
              tasks={tasksByStatus[column.id] || []}
              onTaskMove={handleTaskMove}
              onTaskClick={handleTaskClick}
              color={column.color}
            />
          ))}
        </div>

        {/* Task Detail Modal */}
        <TaskDetailModal
          isOpen={showDetailModal}
          onClose={handleCloseModal}
          task={selectedTask}
          onTaskUpdated={handleTaskUpdated}
        />
      </>
    );
  }

  // Desktop view: show all 4 columns
  return (
    <>
      <div className="grid grid-cols-4 gap-6 h-full">
        {columns.map((column) => (
          <TaskColumn
            key={column.id}
            title={column.title}
            status={column.id}
            tasks={tasksByStatus[column.id] || []}
            onTaskMove={handleTaskMove}
            onTaskClick={handleTaskClick}
            color={column.color}
          />
        ))}
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={showDetailModal}
        onClose={handleCloseModal}
        task={selectedTask}
        onTaskUpdated={handleTaskUpdated}
      />
    </>
  );
};
