"use client";

import { useState } from 'react';
import { 
  FileText, 
  Download, 
  Share2, 
  Copy, 
  Sparkles, 
  Loader2, 
  Check, 
  AlertCircle,
  Clock,
  Users,
  CheckSquare
} from 'lucide-react';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface MeetingSummaryProps {
  meetingTitle: string;
  duration: string;
  participants: string[];
  topics?: string[];
  decisions?: string[];
  actionItems?: string[];
  meetingNotes?: string;
  onClose?: () => void;
  className?: string;
}

export const MeetingSummary = ({ 
  meetingTitle,
  duration,
  participants,
  topics = [],
  decisions = [],
  actionItems = [],
  meetingNotes = '',
  onClose,
  className = '' 
}: MeetingSummaryProps) => {
  const { isMobile } = useMobileDetection();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [summary, setSummary] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const generateSummary = async () => {
    setIsGenerating(true);
    setError(null);
    setGenerationProgress(0);

    // Progressive progress tracking for meeting summary
    let progressStage = 0;
    const progressInterval = setInterval(() => {
      if (progressStage < 10000) { // First 10 seconds
        setGenerationProgress(prev => Math.min(prev + 6, 60));
      } else if (progressStage < 20000) { // 10-20 seconds
        setGenerationProgress(prev => Math.min(prev + 3, 80));
      } else { // 20+ seconds
        setGenerationProgress(prev => Math.min(prev + 1, 95));
      }
      progressStage += 500;
    }, 500);

    try {
      const startTime = Date.now();
      const response = await fetch("/api/ai/generate-meeting-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingTitle,
          duration,
          participants,
          topics,
          decisions,
          actionItems,
          meetingNotes
        }),
      });

      const processingTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error("Failed to generate summary");
      }

      const data = await response.json();
      
      setGenerationProgress(100);
      setSummary(data.summary);
      
      // Show appropriate success message
      if (data.fallback) {
        if (data.fallbackReason === 'AI_TIMEOUT') {
          setError("AI took longer than expected, generated structured summary from meeting data.");
          setTimeout(() => setError(null), 6000);
        } else {
          setError("AI unavailable, created summary from meeting information.");
          setTimeout(() => setError(null), 4000);
        }
      } else {
        console.log(`AI meeting summary generated in ${processingTime}ms`);
      }

    } catch (error) {
      console.error("Summary generation error:", error);
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          setError("Summary generation timed out. Please try again or use manual summary.");
        } else if (error.message.includes('Failed to fetch')) {
          setError("Network error. Please check your connection and try again.");
        } else {
          setError("Failed to generate summary. Please try again.");
        }
      } else {
        setError("Unexpected error occurred. Please try again.");
      }
      
      setTimeout(() => setError(null), 6000);
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const downloadSummary = () => {
    const blob = new Blob([summary], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meetingTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_summary.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-xl ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-400/10 rounded-lg">
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Meeting Summary</h2>
            <p className="text-gray-400 text-sm">{meetingTitle}</p>
          </div>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ×
          </button>
        )}
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

      {/* Meeting Info */}
      <div className="p-6 border-b border-gray-700">
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300 text-sm">Duration: {duration}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300 text-sm">{participants.length} participants</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300 text-sm">{actionItems.length} action items</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {!summary ? (
          <div className="text-center py-8">
            <div className="mb-4">
              <Sparkles className="w-12 h-12 mx-auto text-purple-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Generate AI Summary</h3>
              <p className="text-gray-400 mb-6">
                Create a comprehensive meeting summary with key points, decisions, and action items.
              </p>
            </div>
            
            {isGenerating ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                  <span className="text-gray-300">Generating summary...</span>
                </div>
                <div className="w-full max-w-xs mx-auto bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-purple-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${generationProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500">
                  Analyzing meeting content and generating structured summary...
                </p>
              </div>
            ) : (
              <button
                onClick={generateSummary}
                className="flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors mx-auto"
              >
                <Sparkles className="w-5 h-5" />
                Generate Summary
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* Summary Actions */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Generated Summary</h3>
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                  title="Copy to clipboard"
                >
                  {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copySuccess ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={downloadSummary}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                  title="Download as markdown"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
            
            {/* Summary Content */}
            <div className="bg-gray-800/50 rounded-lg p-4 prose prose-invert max-w-none">
              <div 
                className="text-gray-300 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ 
                  __html: summary
                    .replace(/^# /gm, '<h1 class="text-xl font-bold text-white mb-3">')
                    .replace(/^## /gm, '<h2 class="text-lg font-semibold text-white mb-2 mt-4">')
                    .replace(/^### /gm, '<h3 class="text-md font-medium text-white mb-2 mt-3">')
                    .replace(/^- /gm, '• ')
                    .replace(/\n/g, '<br>')
                }}
              />
            </div>
            
            {/* Regenerate Button */}
            <div className="mt-4 text-center">
              <button
                onClick={generateSummary}
                disabled={isGenerating}
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
              >
                Regenerate Summary
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
