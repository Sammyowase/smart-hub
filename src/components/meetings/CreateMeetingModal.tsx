"use client";

import { useState, useEffect } from "react";
import { X, Calendar, Clock, Users, FileText, Sparkles, Loader2, Check } from "lucide-react";

interface CreateMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMeetingCreated?: () => void;
}

export const CreateMeetingModal = ({ isOpen, onClose, onMeetingCreated }: CreateMeetingModalProps) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    participants: [] as string[],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{id: string, name: string, email: string}>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancementProgress, setEnhancementProgress] = useState(0);
  const [enhancementSuccess, setEnhancementSuccess] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch("/api/team/members");
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data);
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate form data
      if (!formData.title.trim()) {
        throw new Error("Meeting title is required");
      }
      if (!formData.date) {
        throw new Error("Meeting date is required");
      }
      if (!formData.startTime) {
        throw new Error("Start time is required");
      }
      if (!formData.endTime) {
        throw new Error("End time is required");
      }

      // Validate time logic
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      if (startDateTime >= endDateTime) {
        throw new Error("End time must be after start time");
      }

      // Check if meeting is in the past
      const now = new Date();
      if (startDateTime < now) {
        throw new Error("Cannot schedule meetings in the past");
      }

      console.log("Submitting meeting data:", formData);

      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const responseData = await response.json();
      console.log("API Response:", responseData);

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to create meeting");
      }

      // Reset form
      setFormData({
        title: "",
        description: "",
        date: "",
        startTime: "",
        endTime: "",
        participants: [],
      });

      onClose();
      onMeetingCreated?.();
    } catch (error: any) {
      console.error("Error creating meeting:", error);
      setError(error.message || "Failed to create meeting. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleParticipantToggle = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.includes(userId)
        ? prev.participants.filter(id => id !== userId)
        : [...prev.participants, userId]
    }));
  };

  // AI Enhancement function for meeting description
  const enhanceDescription = async () => {
    if (!formData.title.trim()) {
      setError("Please enter a meeting title first");
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

      // Calculate duration if both times are provided
      let duration = '';
      if (formData.startTime && formData.endTime) {
        const start = new Date(`2024-01-01T${formData.startTime}`);
        const end = new Date(`2024-01-01T${formData.endTime}`);
        const diffMs = end.getTime() - start.getTime();
        const diffMins = Math.round(diffMs / (1000 * 60));
        duration = `${diffMins} minutes`;
      }

      const response = await fetch("/api/ai/enhance-meeting-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          currentDescription: formData.description,
          duration: duration,
          attendeeCount: formData.participants.length,
          meetingType: 'general'
        }),
      });

      const processingTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error("Failed to enhance description");
      }

      const data = await response.json();

      setEnhancementProgress(100);
      setFormData(prev => ({ ...prev, description: data.enhancedDescription }));
      setEnhancementSuccess(true);

      // Show appropriate success message
      if (data.fallback) {
        if (data.fallbackReason === 'AI_TIMEOUT') {
          setError("AI took too long, used smart fallback enhancement. Meeting structure added.");
          setTimeout(() => setError(null), 6000);
        } else {
          setError("AI unavailable, used intelligent meeting template.");
          setTimeout(() => setError(null), 4000);
        }
      } else {
        console.log(`AI meeting enhancement completed in ${processingTime}ms`);
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
          setError("Enhancement failed. Please try again or continue with manual description.");
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
            <Calendar className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-semibold text-white">Schedule New Meeting</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
              Meeting Title *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
              placeholder="Enter meeting title"
            />
          </div>

          {/* Description with AI Enhancement */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-300">
                Description
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={enhanceDescription}
                  disabled={isEnhancing || !formData.title.trim()}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-md hover:bg-purple-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Use AI to enhance meeting description"
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
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent resize-none"
              placeholder="Meeting agenda or description... or use AI to enhance it!"
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 Tip: Enter a title first, then click "AI Enhance" to automatically create a structured agenda
            </p>
          </div>

          {/* Date and Time */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date *
              </label>
              <input
                id="date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-300 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Start Time *
              </label>
              <input
                id="startTime"
                name="startTime"
                type="time"
                value={formData.startTime}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-300 mb-2">
                End Time *
              </label>
              <input
                id="endTime"
                name="endTime"
                type="time"
                value={formData.endTime}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Participants */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              <Users className="w-4 h-4 inline mr-1" />
              Participants
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {teamMembers.map(member => (
                <label
                  key={member.id}
                  className="flex items-center gap-3 p-3 bg-gray-900/30 rounded-lg hover:bg-gray-900/50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={formData.participants.includes(member.id)}
                    onChange={() => handleParticipantToggle(member.id)}
                    className="w-4 h-4 text-teal-400 bg-gray-700 border-gray-600 rounded focus:ring-teal-400 focus:ring-2"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{member.name}</p>
                      <p className="text-gray-400 text-xs">{member.email}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Selected: {formData.participants.length} participants
            </p>
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
                "Schedule Meeting"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
