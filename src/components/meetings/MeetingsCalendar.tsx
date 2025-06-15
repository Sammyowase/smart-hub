"use client";

import { useState } from 'react';
import { Calendar, Clock, Users, Video, MapPin, Plus, Sparkles, Loader2, Check } from 'lucide-react';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface Meeting {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  attendees: string[];
  location?: string;
  isVirtual: boolean;
  meetingUrl?: string;
}

interface MeetingsCalendarProps {
  className?: string;
}

export const MeetingsCalendar = ({ className = '' }: MeetingsCalendarProps) => {
  const { isMobile } = useMobileDetection();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [meetings] = useState<Meeting[]>([
    {
      id: '1',
      title: 'Team Standup',
      description: 'Daily team sync meeting',
      startTime: '2024-01-15T09:00:00',
      endTime: '2024-01-15T09:30:00',
      attendees: ['john@example.com', 'jane@example.com'],
      isVirtual: true,
      meetingUrl: 'https://meet.google.com/abc-def-ghi'
    },
    {
      id: '2',
      title: 'Project Review',
      description: 'Quarterly project review meeting',
      startTime: '2024-01-15T14:00:00',
      endTime: '2024-01-15T15:30:00',
      attendees: ['manager@example.com', 'team@example.com'],
      location: 'Conference Room A',
      isVirtual: false
    }
  ]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-400/10 rounded-lg">
            <Calendar className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Meetings</h2>
            <p className="text-gray-400 text-sm">Manage your meetings and schedule</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-400 text-slate-900 rounded-lg font-medium hover:bg-blue-300 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {!isMobile && "New Meeting"}
        </button>
      </div>

      {/* Calendar View - Simplified for demo */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {selectedDate.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric'
            })}
          </h3>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors">
              Today
            </button>
          </div>
        </div>

        {/* Simple calendar grid placeholder */}
        <div className="bg-gray-800/50 rounded-lg p-4 text-center text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Calendar view coming soon</p>
          <p className="text-sm">For now, see your meetings below</p>
        </div>
      </div>

      {/* Meetings List */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Upcoming Meetings</h3>
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:bg-gray-700/30 transition-colors"
            >
              <div className={`${isMobile ? 'space-y-3' : 'flex items-start justify-between'}`}>
                <div className="flex-1">
                  <h4 className="font-semibold text-white mb-1">{meeting.title}</h4>
                  {meeting.description && (
                    <p className="text-gray-400 text-sm mb-2">{meeting.description}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-gray-300">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>
                        {formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{meeting.attendees.length} attendees</span>
                    </div>

                    {meeting.isVirtual ? (
                      <div className="flex items-center gap-1">
                        <Video className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">Virtual</span>
                      </div>
                    ) : meeting.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{meeting.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {!isMobile && (
                  <div className="flex gap-2 ml-4">
                    {meeting.isVirtual && meeting.meetingUrl && (
                      <button className="px-3 py-1 text-sm bg-green-500/10 border border-green-500/20 text-green-400 rounded hover:bg-green-500/20 transition-colors">
                        Join
                      </button>
                    )}
                    <button className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors">
                      Edit
                    </button>
                  </div>
                )}
              </div>

              {isMobile && (
                <div className="flex gap-2 mt-3">
                  {meeting.isVirtual && meeting.meetingUrl && (
                    <button className="flex-1 px-3 py-2 text-sm bg-green-500/10 border border-green-500/20 text-green-400 rounded hover:bg-green-500/20 transition-colors">
                      Join Meeting
                    </button>
                  )}
                  <button className="px-3 py-2 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors">
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {meetings.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No meetings scheduled</p>
            <p className="text-sm">Create your first meeting to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};
