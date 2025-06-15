"use client";

import { useState } from "react";
import { Plus, Filter, LayoutGrid, List, Search } from "lucide-react";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { TaskList } from "@/components/tasks/TaskList";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";

type ViewMode = "board" | "list";

export default function TasksPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTaskCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-gray-400">Manage and track your team's tasks</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-teal-400 text-slate-900 px-4 py-2 rounded-lg font-medium hover:bg-teal-300 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Task
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            />
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option value="all">All Tasks</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="REVIEW">Review</option>
            <option value="DONE">Done</option>
          </select>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-gray-800 border border-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode("board")}
            className={`p-2 rounded-md transition-colors ${
              viewMode === "board"
                ? "bg-teal-400 text-slate-900"
                : "text-gray-400 hover:text-white"
            }`}
            title="Board View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-md transition-colors ${
              viewMode === "list"
                ? "bg-teal-400 text-slate-900"
                : "text-gray-400 hover:text-white"
            }`}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Task View */}
      <div className="min-h-[600px]">
        {viewMode === "board" ? (
          <TaskBoard
            searchQuery={searchQuery}
            filterStatus={filterStatus}
            refreshTrigger={refreshTrigger}
          />
        ) : (
          <TaskList
            searchQuery={searchQuery}
            filterStatus={filterStatus}
            refreshTrigger={refreshTrigger}
          />
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onTaskCreated={handleTaskCreated}
        />
      )}
    </div>
  );
}
