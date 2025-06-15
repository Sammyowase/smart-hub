"use client";

import { useState } from "react";
import { X, FileText, Share2, Lock, Tag, Sparkles, Loader2, Check, AlertCircle } from "lucide-react";

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNoteCreated?: () => void;
}

export const CreateNoteModal = ({ isOpen, onClose, onNoteCreated }: CreateNoteModalProps) => {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "",
    isShared: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancementProgress, setEnhancementProgress] = useState(0);
  const [enhancementSuccess, setEnhancementSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create note");
      }

      // Reset form
      setFormData({
        title: "",
        content: "",
        category: "",
        isShared: false,
      });

      onClose();
      onNoteCreated?.();
    } catch (error) {
      console.error("Error creating note:", error);
      alert("Failed to create note. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  // AI Enhancement function for note content
  const enhanceContent = async () => {
    if (!formData.title.trim()) {
      setError("Please enter a note title first");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsEnhancing(true);
    setError(null);
    setEnhancementProgress(0);

    // Progressive progress tracking
    let progressStage = 0;
    const progressInterval = setInterval(() => {
      if (progressStage < 8000) {
        setEnhancementProgress(prev => Math.min(prev + 8, 70));
      } else if (progressStage < 15000) {
        setEnhancementProgress(prev => Math.min(prev + 3, 85));
      } else {
        setEnhancementProgress(prev => Math.min(prev + 1, 95));
      }
      progressStage += 500;
    }, 500);

    try {
      const startTime = Date.now();
      const response = await fetch("/api/ai/enhance-note-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          currentContent: formData.content,
          noteType: formData.category || "general"
        }),
      });

      const processingTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error("Failed to enhance content");
      }

      const data = await response.json();

      setEnhancementProgress(100);
      setFormData(prev => ({ ...prev, content: data.enhancedContent }));
      setEnhancementSuccess(true);

      // Show appropriate success message
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-semibold text-white">Create New Note</h2>
          </div>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
              Note Title *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
              placeholder="Enter note title"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              Category
            </label>
            <input
              id="category"
              name="category"
              type="text"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
              placeholder="Enter category (e.g., Meetings, Ideas, Development)"
            />
          </div>

          {/* Content with AI Enhancement */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="content" className="block text-sm font-medium text-gray-300">
                Content *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={enhanceContent}
                  disabled={isEnhancing || !formData.title.trim()}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-md hover:bg-purple-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Use AI to enhance note content"
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
              name="content"
              value={formData.content}
              onChange={handleChange}
              required
              rows={12}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent resize-none"
              placeholder="Write your note content here... or use AI to enhance it!"
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 Tip: Enter a title first, then click "AI Enhance" to automatically create structured, professional content. Supports Markdown formatting.
            </p>
          </div>

          {/* Sharing Options */}
          <div className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg">
            <div className="flex items-center gap-3">
              {formData.isShared ? (
                <Share2 className="w-5 h-5 text-green-400" />
              ) : (
                <Lock className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <p className="text-white font-medium">
                  {formData.isShared ? "Shared with team" : "Private note"}
                </p>
                <p className="text-gray-400 text-sm">
                  {formData.isShared
                    ? "All team members can view this note"
                    : "Only you can view this note"
                  }
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="isShared"
                checked={formData.isShared}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-400/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-400"></div>
            </label>
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
                "Create Note"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
