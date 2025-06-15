"use client";

import { useState, useEffect } from 'react';
import { Save, FileText, Sparkles, Loader2, Check, AlertCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface NotesEditorProps {
  note?: Note | null;
  onSave?: (note: Note) => void;
  onCancel?: () => void;
  className?: string;
}

export const NotesEditor = ({ note, onSave, onCancel, className = '' }: NotesEditorProps) => {
  const { data: session } = useSession();
  const { isMobile } = useMobileDetection();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancementProgress, setEnhancementProgress] = useState(0);
  const [enhancementSuccess, setEnhancementSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Initialize with existing note data
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
    }
  }, [note]);

  // AI Enhancement function
  const enhanceContent = async () => {
    if (!title.trim()) {
      setError("Please enter a note title first");
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
      const startTime = Date.now();
      const response = await fetch("/api/ai/enhance-note-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title,
          currentContent: content,
          noteType: "general"
        }),
      });

      const processingTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error("Failed to enhance content");
      }

      const data = await response.json();

      setEnhancementProgress(100);
      setContent(data.enhancedContent);
      setEnhancementSuccess(true);

      // Show appropriate success message based on processing method
      if (data.fallback) {
        if (data.fallbackReason === 'AI_TIMEOUT') {
          setError("AI took too long, used smart fallback enhancement. Content structured with professional formatting.");
          setTimeout(() => setError(null), 6000);
        } else {
          setError("AI unavailable, used intelligent content structuring.");
          setTimeout(() => setError(null), 4000);
        }
      } else {
        console.log(`AI note enhancement completed in ${processingTime}ms`);
      }

      setTimeout(() => {
        setEnhancementSuccess(false);
        setEnhancementProgress(0);
      }, 2000);

    } catch (error) {
      console.error("Enhancement error:", error);

      // Provide specific error messages based on error type
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          setError("AI enhancement timed out. The system is working on a structured fallback...");
        } else if (error.message.includes('Failed to fetch')) {
          setError("Network error. Please check your connection and try again.");
        } else {
          setError("Enhancement failed. Please try again or continue with manual formatting.");
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

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Please enter a note title");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSaveSuccess(null);

    try {
      const noteData = {
        title: title.trim(),
        content: content.trim(),
        ...(note?.id && { id: note.id })
      };

      const response = await fetch("/api/notes", {
        method: note?.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noteData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save note");
      }

      const savedNote = await response.json();
      setSaveSuccess(note?.id ? "Note updated successfully!" : "Note created successfully!");

      setTimeout(() => setSaveSuccess(null), 3000);

      onSave?.(savedNote);

    } catch (error) {
      console.error("Error saving note:", error);
      setError(error instanceof Error ? error.message : "Failed to save note. Please try again.");
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-400/10 rounded-lg">
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">
            {note?.id ? 'Edit Note' : 'Create Note'}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Ctrl+S to save</span>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="mb-4 bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-green-400">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            {saveSuccess}
          </div>
        </div>
      )}

      {/* Title Input */}
      <div className="mb-4">
        <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
          Title *
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter note title..."
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
        />
      </div>

      {/* Content Editor */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="content" className="block text-sm font-medium text-gray-300">
            Content
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={enhanceContent}
              disabled={isEnhancing || !title.trim()}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-md hover:bg-purple-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Use AI to enhance content"
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
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={isMobile ? 12 : 16}
          placeholder="Start writing your note... or use AI to enhance it!"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          💡 Tip: Enter a title first, then click "AI Enhance" to automatically improve your content
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={isLoading || !title.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-400 text-slate-900 rounded-lg font-medium hover:bg-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isLoading ? "Saving..." : note?.id ? "Update Note" : "Save Note"}
        </button>
      </div>
    </div>
  );
};
