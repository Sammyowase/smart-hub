"use client";

import { useState } from "react";
import {
  Calendar,
  Share2,
  Lock,
  MoreHorizontal,
  Edit,
  Trash2,
  Download,
  Heart,
  Meh,
  Frown
} from "lucide-react";
import { cn } from "@/lib/utils";

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

interface NoteCardProps {
  note: Note;
  viewMode: "grid" | "list";
  onDeleted?: (noteId: string) => void;
}

const sentimentIcons = {
  POSITIVE: { icon: Heart, color: "text-green-400" },
  NEUTRAL: { icon: Meh, color: "text-gray-400" },
  NEGATIVE: { icon: Frown, color: "text-red-400" },
};

export const NoteCard = ({ note, viewMode, onDeleted }: NoteCardProps) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onDeleted?.(note.id);
      } else {
        throw new Error("Failed to delete note");
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      alert("Failed to delete note. Please try again.");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const truncateContent = (content: string, maxLength: number) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  const SentimentIcon = note.sentiment ? sentimentIcons[note.sentiment].icon : null;
  const sentimentColor = note.sentiment ? sentimentIcons[note.sentiment].color : "";

  if (viewMode === "list") {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:bg-gray-800/70 transition-colors">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-white font-medium truncate">{note.title}</h3>
              {note.category && (
                <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full">
                  {note.category}
                </span>
              )}
              {note.isShared ? (
                <Share2 className="w-4 h-4 text-green-400" title="Shared" />
              ) : (
                <Lock className="w-4 h-4 text-gray-400" title="Private" />
              )}
              {SentimentIcon && (
                <SentimentIcon className={cn("w-4 h-4", sentimentColor)} />
              )}
            </div>
            <p className="text-gray-400 text-sm mb-2">
              {truncateContent(note.content, 150)}
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(note.createdAt)}
              </span>
            </div>
          </div>
          <div className="relative ml-4">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 w-32 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                <button className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-300 hover:bg-gray-700 text-sm">
                  <Edit className="w-3 h-3" />
                  Edit
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-300 hover:bg-gray-700 text-sm">
                  <Download className="w-3 h-3" />
                  Export
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-400 hover:bg-gray-700 text-sm"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:bg-gray-800/70 transition-colors group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h3 className="text-white font-medium truncate">{note.title}</h3>
          {note.isShared ? (
            <Share2 className="w-4 h-4 text-green-400 flex-shrink-0" title="Shared" />
          ) : (
            <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" title="Private" />
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-1 w-32 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
              <button className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-300 hover:bg-gray-700 text-sm">
                <Edit className="w-3 h-3" />
                Edit
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-300 hover:bg-gray-700 text-sm">
                <Download className="w-3 h-3" />
                Export
              </button>
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-400 hover:bg-gray-700 text-sm"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="text-gray-400 text-sm mb-4 line-clamp-3">
        {note.content}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {note.category && (
            <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full">
              {note.category}
            </span>
          )}
          {SentimentIcon && (
            <SentimentIcon className={cn("w-4 h-4", sentimentColor)} />
          )}
        </div>
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(note.createdAt)}
        </span>
      </div>
    </div>
  );
};
