"use client";

import { useState, useEffect, useRef } from 'react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  MonitorOff,
  Phone,
  PhoneOff,
  Users,
  Clock,
  Settings,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface VideoMeetingProps {
  meetingId: string;
  meetingTitle: string;
  isHost?: boolean;
  onMeetingEnd?: () => void;
  className?: string;
}

interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  isMuted: boolean;
  isVideoOn: boolean;
  stream?: MediaStream;
}

export const VideoMeeting = ({ 
  meetingId, 
  meetingTitle, 
  isHost = false, 
  onMeetingEnd, 
  className = '' 
}: VideoMeetingProps) => {
  const { isMobile } = useMobileDetection();
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(20 * 60); // 20 minutes in seconds
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const meetingStartTime = useRef<Date | null>(null);

  // Initialize video stream
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        setIsConnected(true);
        meetingStartTime.current = new Date();
        
        // Add self as participant
        setParticipants([{
          id: 'self',
          name: 'You',
          isHost,
          isMuted: false,
          isVideoOn: true,
          stream
        }]);
        
      } catch (error) {
        console.error('Failed to access media devices:', error);
      }
    };

    initializeMedia();

    return () => {
      // Cleanup media streams
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isHost]);

  // Meeting timer
  useEffect(() => {
    if (!isConnected) return;

    const timer = setInterval(() => {
      if (meetingStartTime.current) {
        const elapsed = Math.floor((Date.now() - meetingStartTime.current.getTime()) / 1000);
        setMeetingDuration(elapsed);
        setTimeRemaining(Math.max(0, (20 * 60) - elapsed));
        
        // Auto-end meeting after 20 minutes
        if (elapsed >= 20 * 60) {
          handleEndMeeting();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isConnected]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoOn;
        setIsVideoOn(!isVideoOn);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        // Replace video track with screen share
        if (localStreamRef.current && localVideoRef.current) {
          const videoTrack = screenStream.getVideoTracks()[0];
          const sender = localStreamRef.current.getVideoTracks()[0];
          
          // In a real implementation, you'd replace the track in the peer connection
          localVideoRef.current.srcObject = screenStream;
          setIsScreenSharing(true);
          
          // Listen for screen share end
          videoTrack.onended = () => {
            setIsScreenSharing(false);
            // Restore camera
            if (localVideoRef.current && localStreamRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current;
            }
          };
        }
      } else {
        // Stop screen sharing and restore camera
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
          setIsScreenSharing(false);
        }
      }
    } catch (error) {
      console.error('Screen sharing failed:', error);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleEndMeeting = () => {
    // Stop all media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setIsConnected(false);
    onMeetingEnd?.();
  };

  if (!isConnected) {
    return (
      <div className={`bg-gray-900 border border-gray-700 rounded-xl p-8 text-center ${className}`}>
        <Video className="w-12 h-12 mx-auto mb-4 text-blue-400" />
        <h3 className="text-lg font-semibold text-white mb-2">Connecting to Meeting...</h3>
        <p className="text-gray-400">Please allow camera and microphone access</p>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50">
        <div>
          <h3 className="font-semibold text-white">{meetingTitle}</h3>
          <p className="text-sm text-gray-400">Meeting ID: {meetingId}</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Timer */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-white">{formatTime(meetingDuration)}</span>
            <span className="text-gray-400">/</span>
            <span className={`${timeRemaining < 300 ? 'text-red-400' : 'text-gray-400'}`}>
              {formatTime(timeRemaining)} left
            </span>
          </div>
          
          {/* Participants count */}
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <Users className="w-4 h-4" />
            <span>{participants.length}</span>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
        {/* Main video */}
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        
        {/* Video overlay when off */}
        {!isVideoOn && (
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
            <div className="text-center">
              <VideoOff className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p className="text-gray-400">Camera is off</p>
            </div>
          </div>
        )}
        
        {/* Screen sharing indicator */}
        {isScreenSharing && (
          <div className="absolute top-4 left-4 bg-green-500 text-white px-2 py-1 rounded text-sm">
            Screen Sharing
          </div>
        )}
        
        {/* Muted indicator */}
        {isMuted && (
          <div className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full">
            <MicOff className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 bg-gray-800/50">
        <div className="flex items-center justify-center gap-3">
          {/* Mute/Unmute */}
          <button
            onClick={toggleMute}
            className={`p-3 rounded-full transition-colors ${
              isMuted 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Video On/Off */}
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full transition-colors ${
              !isVideoOn 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
            title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Screen Share */}
          {!isMobile && (
            <button
              onClick={toggleScreenShare}
              className={`p-3 rounded-full transition-colors ${
                isScreenSharing 
                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
            >
              {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            </button>
          )}

          {/* Fullscreen */}
          {!isMobile && (
            <button
              onClick={toggleFullscreen}
              className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          )}

          {/* End Meeting */}
          <button
            onClick={handleEndMeeting}
            className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
            title="End meeting"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
        
        {/* Time warning */}
        {timeRemaining < 300 && timeRemaining > 0 && (
          <div className="mt-3 text-center text-sm text-red-400">
            ⚠️ Meeting will end in {formatTime(timeRemaining)}
          </div>
        )}
      </div>
    </div>
  );
};
