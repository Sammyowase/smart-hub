"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, Grid, List, FileText } from "lucide-react";
import { NoteCard } from "@/components/notes/NoteCard";
import { CreateNoteModal } from "@/components/notes/CreateNoteModal";

interface Note {
  id: string;
  title: string;
  content: string;
  category?: string;
  isShared: boolean;
  sentiment?: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchNotes();
  }, [selectedCategory, refreshTrigger]);

  const fetchNotes = async () => {
    try {
      const url = selectedCategory === "all"
        ? "/api/notes"
        : `/api/notes?category=${encodeURIComponent(selectedCategory)}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNoteCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleNoteDeleted = (noteId: string) => {
    setNotes(prev => prev.filter(note => note.id !== noteId));
  };

  // Get unique categories
  const categories = Array.from(new Set(notes.map(note => note.category).filter(Boolean)));

  // Filter notes
  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || note.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Notes</h1>
          <p className="text-gray-400">Capture and organize your thoughts</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-teal-400 text-slate-900 px-4 py-2 rounded-lg font-medium hover:bg-teal-300 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Note
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
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-gray-800 border border-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-md transition-colors ${
              viewMode === "grid"
                ? "bg-teal-400 text-slate-900"
                : "text-gray-400 hover:text-white"
            }`}
            title="Grid View"
          >
            <Grid className="w-4 h-4" />
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

      {/* Notes Grid/List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-400"></div>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No notes found</h3>
          <p className="text-gray-500">
            {searchQuery || selectedCategory !== "all"
              ? "Try adjusting your search or filter criteria"
              : "Create your first note to get started"
            }
          </p>
        </div>
      ) : (
        <div className={
          viewMode === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
        }>
          {filteredNotes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              viewMode={viewMode}
              onDeleted={handleNoteDeleted}
            />
          ))}
        </div>
      )}

      {/* Create Note Modal */}
      {showCreateModal && (
        <CreateNoteModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onNoteCreated={handleNoteCreated}
        />
      )}
    </div>
  );
}
