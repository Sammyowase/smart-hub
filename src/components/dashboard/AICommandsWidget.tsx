"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Bot, 
  BarChart3, 
  CheckSquare, 
  Calendar, 
  Clock, 
  Zap,
  ArrowRight,
  Copy,
  Check,
  ExternalLink
} from "lucide-react";

interface AICommand {
  command: string;
  description: string;
  icon: React.ReactNode;
  example: string;
}

const featuredCommands: AICommand[] = [
  {
    command: "@ai summarize",
    description: "Get productivity insights and overview",
    icon: <BarChart3 className="w-4 h-4" />,
    example: "@ai summarize my productivity"
  },
  {
    command: "@ai tasks",
    description: "View your task overview and status",
    icon: <CheckSquare className="w-4 h-4" />,
    example: "@ai tasks overdue"
  },
  {
    command: "@ai meetings",
    description: "Check your calendar and meetings",
    icon: <Calendar className="w-4 h-4" />,
    example: "@ai meetings today"
  },
  {
    command: "@ai schedule",
    description: "Get help with scheduling",
    icon: <Clock className="w-4 h-4" />,
    example: "@ai schedule team meeting tomorrow"
  }
];

export const AICommandsWidget = () => {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCommand(text);
      setTimeout(() => setCopiedCommand(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-teal-500/20 to-purple-500/20 rounded-lg">
            <Bot className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">AI Assistant</h3>
            <p className="text-sm text-gray-400">Quick commands to boost productivity</p>
          </div>
        </div>
        <Link
          href="/ai-commands"
          className="flex items-center gap-2 text-teal-400 hover:text-teal-300 transition-colors text-sm font-medium"
        >
          View All
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      {/* Featured Commands */}
      <div className="space-y-3">
        {featuredCommands.map((cmd, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors group"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-gray-700 rounded text-gray-300">
                {cmd.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-sm font-mono text-teal-400 bg-gray-800 px-2 py-1 rounded">
                    {cmd.command}
                  </code>
                </div>
                <p className="text-xs text-gray-400">{cmd.description}</p>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(cmd.example)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
              title="Copy example"
            >
              {copiedCommand === cmd.example ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/dashboard/chat"
            className="flex-1 flex items-center justify-center gap-2 bg-teal-400 text-slate-900 px-4 py-2 rounded-lg font-medium hover:bg-teal-300 transition-colors"
          >
            <Bot className="w-4 h-4" />
            Try AI in Chat
          </Link>
          <Link
            href="/ai-commands"
            className="flex-1 flex items-center justify-center gap-2 border border-gray-600 text-gray-300 px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            Learn More
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Usage Tip */}
      <div className="mt-4 p-3 bg-gradient-to-r from-teal-500/10 to-purple-500/10 rounded-lg border border-teal-400/20">
        <div className="flex items-start gap-2">
          <Zap className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-gray-300">
              <strong className="text-teal-400">Pro Tip:</strong> Use AI commands in any chat to get instant help with tasks, scheduling, and productivity insights.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
