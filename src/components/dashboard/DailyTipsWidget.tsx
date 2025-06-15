"use client";

import { useState, useEffect } from "react";
import { 
  Lightbulb, 
  RefreshCw, 
  Sparkles, 
  TrendingUp,
  Clock,
  Target,
  Zap,
  ChevronRight
} from "lucide-react";

interface DailyTip {
  id: string;
  title: string;
  content: string;
  category: "productivity" | "wellness" | "collaboration" | "efficiency" | "focus";
  icon: React.ReactNode;
  actionText?: string;
  actionUrl?: string;
}

const tipCategories = {
  productivity: { icon: <TrendingUp className="w-4 h-4" />, color: "text-teal-400" },
  wellness: { icon: <Sparkles className="w-4 h-4" />, color: "text-purple-400" },
  collaboration: { icon: <Target className="w-4 h-4" />, color: "text-blue-400" },
  efficiency: { icon: <Zap className="w-4 h-4" />, color: "text-green-400" },
  focus: { icon: <Clock className="w-4 h-4" />, color: "text-orange-400" }
};

// Fallback tips for when AI is not available
const fallbackTips: DailyTip[] = [
  {
    id: "1",
    title: "Use the Pomodoro Technique",
    content: "Work in 25-minute focused intervals followed by 5-minute breaks to maintain high productivity throughout the day.",
    category: "productivity",
    icon: <Clock className="w-4 h-4" />,
    actionText: "Try Timer",
    actionUrl: "/dashboard/tasks"
  },
  {
    id: "2", 
    title: "Leverage AI Commands",
    content: "Use @ai commands in chat to quickly summarize your tasks, get productivity insights, and schedule meetings efficiently.",
    category: "efficiency",
    icon: <Zap className="w-4 h-4" />,
    actionText: "View Commands",
    actionUrl: "/ai-commands"
  },
  {
    id: "3",
    title: "Organize Your Workspace",
    content: "Keep your digital workspace clean by regularly archiving completed tasks and organizing your notes into categories.",
    category: "productivity",
    icon: <TrendingUp className="w-4 h-4" />,
    actionText: "Organize Now",
    actionUrl: "/dashboard/notes"
  },
  {
    id: "4",
    title: "Take Regular Breaks",
    content: "Step away from your screen every hour for 2-3 minutes to reduce eye strain and maintain mental clarity.",
    category: "wellness",
    icon: <Sparkles className="w-4 h-4" />
  },
  {
    id: "5",
    title: "Collaborate Effectively",
    content: "Use group chats and shared notes to keep your team aligned and reduce the need for lengthy meetings.",
    category: "collaboration",
    icon: <Target className="w-4 h-4" />,
    actionText: "Start Chat",
    actionUrl: "/dashboard/chat"
  }
];

export const DailyTipsWidget = () => {
  const [currentTip, setCurrentTip] = useState<DailyTip>(fallbackTips[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  // Auto-rotate tips every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % fallbackTips.length);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Update current tip when index changes
  useEffect(() => {
    setCurrentTip(fallbackTips[tipIndex]);
  }, [tipIndex]);

  const generateAITip = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/ai/daily-tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          context: "dashboard",
          previousTips: [currentTip.id]
        }),
      });

      if (response.ok) {
        const aiTip = await response.json();
        setCurrentTip({
          id: `ai-${Date.now()}`,
          title: aiTip.title,
          content: aiTip.content,
          category: aiTip.category || "productivity",
          icon: tipCategories[aiTip.category as keyof typeof tipCategories]?.icon || <Lightbulb className="w-4 h-4" />,
          actionText: aiTip.actionText,
          actionUrl: aiTip.actionUrl
        });
      } else {
        // Fallback to next tip in rotation
        setTipIndex(prev => (prev + 1) % fallbackTips.length);
      }
    } catch (error) {
      console.error("Failed to generate AI tip:", error);
      // Fallback to next tip in rotation
      setTipIndex(prev => (prev + 1) % fallbackTips.length);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextTip = () => {
    if (Math.random() > 0.5) {
      // 50% chance to generate AI tip
      generateAITip();
    } else {
      // 50% chance to use fallback tips
      setTipIndex(prev => (prev + 1) % fallbackTips.length);
    }
  };

  const categoryInfo = tipCategories[currentTip.category];

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Daily Tip</h3>
            <div className="flex items-center gap-2">
              {categoryInfo?.icon && (
                <span className={categoryInfo.color}>
                  {categoryInfo.icon}
                </span>
              )}
              <span className="text-xs text-gray-400 capitalize">
                {currentTip.category}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={handleNextTip}
          disabled={isLoading}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          title="Get new tip"
        >
          <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tip Content */}
      <div className="space-y-4">
        <h4 className="text-white font-medium">{currentTip.title}</h4>
        <p className="text-gray-300 text-sm leading-relaxed">
          {currentTip.content}
        </p>

        {/* Action Button */}
        {currentTip.actionText && currentTip.actionUrl && (
          <a
            href={currentTip.actionUrl}
            className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 transition-colors text-sm font-medium group"
          >
            {currentTip.actionText}
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </a>
        )}
      </div>

      {/* Progress Indicator */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex space-x-1">
          {fallbackTips.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === tipIndex ? 'bg-teal-400' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
        <div className="text-xs text-gray-500">
          Tip {tipIndex + 1} of {fallbackTips.length}
        </div>
      </div>

      {/* Auto-refresh indicator */}
      <div className="mt-3 text-xs text-gray-500 text-center">
        Tips refresh automatically every 30 seconds
      </div>
    </div>
  );
};
