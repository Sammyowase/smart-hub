"use client";

import { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  User,
  MapPin,
  Smartphone
} from 'lucide-react';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'late' | 'partial';
  location?: string;
  device?: string;
  totalHours?: number;
}

interface AttendanceTrackerProps {
  className?: string;
}

export const AttendanceTracker = ({ className = '' }: AttendanceTrackerProps) => {
  const { isMobile } = useMobileDetection();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  
  const [attendanceRecords] = useState<AttendanceRecord[]>([
    {
      id: '1',
      date: '2024-01-15',
      checkIn: '09:00',
      checkOut: '17:30',
      status: 'present',
      location: 'Office',
      device: 'Desktop',
      totalHours: 8.5
    },
    {
      id: '2',
      date: '2024-01-14',
      checkIn: '09:15',
      checkOut: '17:00',
      status: 'late',
      location: 'Remote',
      device: 'Mobile',
      totalHours: 7.75
    },
    {
      id: '3',
      date: '2024-01-13',
      checkIn: '09:00',
      checkOut: '13:00',
      status: 'partial',
      location: 'Office',
      device: 'Desktop',
      totalHours: 4
    }
  ]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleCheckIn = () => {
    setIsCheckedIn(true);
    setCheckInTime(new Date());
  };

  const handleCheckOut = () => {
    setIsCheckedIn(false);
    setCheckInTime(null);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'late': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'partial': return <Clock className="w-4 h-4 text-orange-400" />;
      case 'absent': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-green-400';
      case 'late': return 'text-yellow-400';
      case 'partial': return 'text-orange-400';
      case 'absent': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const totalHoursThisWeek = attendanceRecords.reduce((sum, record) => sum + (record.totalHours || 0), 0);
  const averageHours = attendanceRecords.length > 0 ? totalHoursThisWeek / attendanceRecords.length : 0;

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-400/10 rounded-lg">
          <Clock className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Attendance Tracker</h2>
          <p className="text-gray-400 text-sm">Track your work hours and attendance</p>
        </div>
      </div>

      {/* Current Status */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-white mb-2">
            {formatTime(currentTime)}
          </div>
          <div className="text-gray-400 text-sm mb-4">
            {currentTime.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          
          {isCheckedIn ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span>Checked In</span>
              </div>
              {checkInTime && (
                <div className="text-sm text-gray-400">
                  Since {formatTime(checkInTime)}
                </div>
              )}
              <button
                onClick={handleCheckOut}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Check Out
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <XCircle className="w-5 h-5" />
                <span>Not Checked In</span>
              </div>
              <button
                onClick={handleCheckIn}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Check In
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className={`grid gap-4 mb-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-white">{totalHoursThisWeek.toFixed(1)}h</div>
          <div className="text-xs text-gray-400">This Week</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-white">{averageHours.toFixed(1)}h</div>
          <div className="text-xs text-gray-400">Daily Average</div>
        </div>
        {!isMobile && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-white">
              {attendanceRecords.filter(r => r.status === 'present').length}
            </div>
            <div className="text-xs text-gray-400">Days Present</div>
          </div>
        )}
      </div>

      {/* Recent Attendance */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Recent Attendance</h3>
        <div className="space-y-3">
          {attendanceRecords.map((record) => (
            <div
              key={record.id}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
            >
              <div className={`${isMobile ? 'space-y-2' : 'flex items-center justify-between'}`}>
                <div className="flex items-center gap-3">
                  {getStatusIcon(record.status)}
                  <div>
                    <div className="font-medium text-white">
                      {formatDate(record.date)}
                    </div>
                    <div className={`text-sm ${getStatusColor(record.status)}`}>
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </div>
                  </div>
                </div>
                
                <div className={`${isMobile ? 'ml-7 space-y-1' : 'flex items-center gap-6'}`}>
                  {record.checkIn && (
                    <div className="text-sm text-gray-300">
                      <span className="text-gray-500">In:</span> {record.checkIn}
                    </div>
                  )}
                  {record.checkOut && (
                    <div className="text-sm text-gray-300">
                      <span className="text-gray-500">Out:</span> {record.checkOut}
                    </div>
                  )}
                  {record.totalHours && (
                    <div className="text-sm text-gray-300">
                      <span className="text-gray-500">Total:</span> {record.totalHours}h
                    </div>
                  )}
                </div>
              </div>
              
              {(record.location || record.device) && (
                <div className={`${isMobile ? 'ml-7 mt-2' : 'mt-2'} flex gap-4 text-xs text-gray-500`}>
                  {record.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {record.location}
                    </div>
                  )}
                  {record.device && (
                    <div className="flex items-center gap-1">
                      <Smartphone className="w-3 h-3" />
                      {record.device}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {attendanceRecords.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No attendance records found</p>
            <p className="text-sm">Check in to start tracking your attendance</p>
          </div>
        )}
      </div>
    </div>
  );
};
