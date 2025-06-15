"use client";

import { useState } from "react";
import {
  Calendar,
  Clock,
  Users,
  Video,
  MoreHorizontal,
  Edit,
  Trash2,
  FileText,
  Play
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VideoMeeting } from "./VideoMeeting";
import { MeetingSummary } from "./MeetingSummary";

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

interface MeetingCardProps {
  meeting: Meeting;
}

export const MeetingCard = ({ meeting }: MeetingCardProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showVideoMeeting, setShowVideoMeeting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getDuration = () => {
    const start = new Date(meeting.startTime);
    const end = new Date(meeting.endTime);
    const diffMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

    if (diffMinutes < 60) {
      return `${diffMinutes}m`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  };

  const isUpcoming = () => {
    return new Date(meeting.startTime) > new Date();
  };

  const isPast = () => {
    return new Date(meeting.endTime) < new Date();
  };

  const isOngoing = () => {
    const now = new Date();
    return new Date(meeting.startTime) <= now && new Date(meeting.endTime) > now;
  };

  const getStatusColor = () => {
    if (isOngoing()) return "text-green-400 bg-green-400/10 border-green-400/20";
    if (isUpcoming()) return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    return "text-gray-400 bg-gray-400/10 border-gray-400/20";
  };

  const getStatusText = () => {
    if (isOngoing()) return "Ongoing";
    if (isUpcoming()) return "Upcoming";
    return "Completed";
  };

  const handleStartMeeting = () => {
    setShowVideoMeeting(true);
  };

  const handleJoinMeeting = () => {
    setShowVideoMeeting(true);
  };

  const handleMeetingEnd = () => {
    setShowVideoMeeting(false);
    // Optionally show summary generation
    setShowSummary(true);
  };

  const handleShowSummary = () => {
    setShowSummary(true);
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 hover:bg-gray-800/70 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-white font-semibold text-lg">{meeting.title}</h3>
            <span className={cn(
              "text-xs px-2 py-1 rounded-full border font-medium",
              getStatusColor()
            )}>
              {getStatusText()}
            </span>
          </div>
          {meeting.description && (
            <p className="text-gray-400 text-sm mb-3">{meeting.description}</p>
          )}
        </div>

        <div className="relative">
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
              {meeting.summary && (
                <button
                  onClick={handleShowSummary}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-300 hover:bg-gray-700 text-sm"
                >
                  <FileText className="w-3 h-3" />
                  Summary
                </button>
              )}
              {isPast() && !meeting.summary && (
                <button
                  onClick={handleShowSummary}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-300 hover:bg-gray-700 text-sm"
                >
                  <FileText className="w-3 h-3" />
                  Add Summary
                </button>
              )}
              <button className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-400 hover:bg-gray-700 text-sm">
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Meeting Details */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-300">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm">{formatDate(meeting.startTime)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm">
              {formatTime(meeting.startTime)} - {formatTime(meeting.endTime)} ({getDuration()})
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-300">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm">{meeting.participants.length} participants</span>
          </div>
          <div className="flex -space-x-2">
            {meeting.participants.slice(0, 4).map((participant, index) => (
              <div
                key={participant.id}
                className="w-6 h-6 bg-gray-600 rounded-full border-2 border-gray-800 flex items-center justify-center"
                title={participant.name}
              >
                <span className="text-xs text-white font-medium">
                  {participant.name.charAt(0).toUpperCase()}
                </span>
              </div>
            ))}
            {meeting.participants.length > 4 && (
              <div className="w-6 h-6 bg-gray-700 rounded-full border-2 border-gray-800 flex items-center justify-center">
                <span className="text-xs text-gray-300">
                  +{meeting.participants.length - 4}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      {meeting.summary && (
        <div className="bg-gray-900/30 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400 text-sm font-medium">Meeting Summary</span>
          </div>
          <p className="text-gray-300 text-sm">{meeting.summary}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        {isOngoing() && (
          <button
            onClick={handleJoinMeeting}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Video className="w-4 h-4" />
            Join Meeting
          </button>
        )}
        {isUpcoming() && (
          <button
            onClick={handleStartMeeting}
            className="bg-teal-400 hover:bg-teal-300 text-slate-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Start Meeting
          </button>
        )}
        {isPast() && !meeting.summary && (
          <button
            onClick={handleShowSummary}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Add Summary
          </button>
        )}
        {isPast() && meeting.summary && (
          <button
            onClick={handleShowSummary}
            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            View Summary
          </button>
        )}
      </div>

      {/* Video Meeting Modal */}
      {showVideoMeeting && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <VideoMeeting
              meetingId={meeting.id}
              meetingTitle={meeting.title}
              isHost={true} // You might want to determine this based on user role
              onMeetingEnd={handleMeetingEnd}
              className="w-full h-full"
            />
          </div>
        </div>
      )}

      {/* Meeting Summary Modal */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <MeetingSummary
              meetingTitle={meeting.title}
              duration={getDuration()}
              participants={meeting.participants.map(p => p.name)}
              topics={[]} // You might want to extract this from meeting description
              decisions={[]} // You might want to store this in meeting data
              actionItems={[]} // You might want to store this in meeting data
              meetingNotes={meeting.description || ''}
              onClose={() => setShowSummary(false)}
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};
