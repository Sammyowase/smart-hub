"use client";

import { useState, useEffect } from "react";
import { Plus, Calendar, Clock, Users, Video } from "lucide-react";
import { MeetingCard } from "@/components/meetings/MeetingCard";
import { CreateMeetingModal } from "@/components/meetings/CreateMeetingModal";

interface Meeting {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  participants: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  summary?: string;
  createdAt: string;
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewFilter, setViewFilter] = useState<"all" | "upcoming" | "past">("upcoming");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchMeetings();
  }, [refreshTrigger]);

  const fetchMeetings = async () => {
    try {
      const response = await fetch("/api/meetings");
      if (response.ok) {
        const data = await response.json();
        setMeetings(data);
      }
    } catch (error) {
      console.error("Error fetching meetings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMeetingCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Filter meetings based on selected view
  const getFilteredMeetings = () => {
    const now = new Date();

    switch (viewFilter) {
      case "upcoming":
        return meetings.filter(meeting => new Date(meeting.startTime) > now);
      case "past":
        return meetings.filter(meeting => new Date(meeting.endTime) < now);
      default:
        return meetings;
    }
  };

  const filteredMeetings = getFilteredMeetings().sort((a, b) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  // Get today's meetings
  const todaysMeetings = meetings.filter(meeting => {
    const meetingDate = new Date(meeting.startTime).toDateString();
    const today = new Date().toDateString();
    return meetingDate === today;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Meetings</h1>
          <p className="text-gray-400">Schedule and manage team meetings</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-teal-400 text-slate-900 px-4 py-2 rounded-lg font-medium hover:bg-teal-300 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Schedule Meeting
        </button>
      </div>

      {/* Today's Meetings Summary */}
      {todaysMeetings.length > 0 && (
        <div className="bg-gradient-to-r from-blue-400/10 to-purple-400/10 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Today's Schedule</h2>
          </div>
          <div className="grid gap-3">
            {todaysMeetings.map(meeting => (
              <div key={meeting.id} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                <div>
                  <h3 className="text-white font-medium">{meeting.title}</h3>
                  <p className="text-gray-400 text-sm">
                    {new Date(meeting.startTime).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })} - {new Date(meeting.endTime).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400 text-sm">{meeting.participants.length}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1">
        {[
          { key: "upcoming", label: "Upcoming" },
          { key: "past", label: "Past" },
          { key: "all", label: "All" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setViewFilter(tab.key as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewFilter === tab.key
                ? "bg-teal-400 text-slate-900"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Meetings List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-400"></div>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="text-center py-12">
          <Video className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">
            No {viewFilter === "all" ? "" : viewFilter} meetings
          </h3>
          <p className="text-gray-500">
            {viewFilter === "upcoming"
              ? "Schedule your first meeting to get started"
              : "No meetings found for this period"
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredMeetings.map(meeting => (
            <MeetingCard key={meeting.id} meeting={meeting} />
          ))}
        </div>
      )}

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <CreateMeetingModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onMeetingCreated={handleMeetingCreated}
        />
      )}
    </div>
  );
}
