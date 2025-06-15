"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import {
  Bot,
  MessageSquare,
  Calendar,
  CheckSquare,
  Clock,
  BarChart3,
  ArrowRight,
  Copy,
  Check,
  Sparkles,
  Zap,
  Target,
  Users,
  Home,
  Lock,
  UserPlus,
  Star
} from "lucide-react"

interface AICommand {
  command: string
  description: string
  examples: string[]
  icon: React.ReactNode
  category: string
}

const aiCommands: AICommand[] = [
  {
    command: "@ai summarize",
    description: "Get a comprehensive overview of your productivity, tasks, and meetings with actionable insights",
    examples: [
      "@ai summarize my productivity",
      "@ai summarize today's progress",
      "@ai summarize this week"
    ],
    icon: <BarChart3 className="w-5 h-5" />,
    category: "Productivity"
  },
  {
    command: "@ai tasks",
    description: "View your task overview including pending, in-progress, completed, and overdue items",
    examples: [
      "@ai tasks",
      "@ai tasks overdue",
      "@ai tasks today"
    ],
    icon: <CheckSquare className="w-5 h-5" />,
    category: "Task Management"
  },
  {
    command: "@ai meetings",
    description: "Get an overview of your upcoming meetings, today's schedule, and weekly calendar",
    examples: [
      "@ai meetings",
      "@ai meetings today",
      "@ai meetings this week"
    ],
    icon: <Calendar className="w-5 h-5" />,
    category: "Calendar"
  },
  {
    command: "@ai schedule",
    description: "Get help scheduling meetings, events, or appointments with smart suggestions",
    examples: [
      "@ai schedule team meeting tomorrow at 2pm",
      "@ai schedule project review next week",
      "@ai schedule 1-on-1 with John Friday"
    ],
    icon: <Clock className="w-5 h-5" />,
    category: "Scheduling"
  },
  {
    command: "@ai remind",
    description: "Set up reminders and get guidance on creating tasks or notifications",
    examples: [
      "@ai remind me to review the proposal tomorrow",
      "@ai remind me about the client call at 3pm",
      "@ai remind me to follow up on the project"
    ],
    icon: <Zap className="w-5 h-5" />,
    category: "Reminders"
  }
]

export default function AICommandsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null)

  const copyToClipboard = async (text: string) => {
    // For unauthenticated users, show sign-in prompt instead of copying
    if (!session) {
      router.push('/auth/signin')
      return
    }

    try {
      await navigator.clipboard.writeText(text)
      setCopiedCommand(text)
      setTimeout(() => setCopiedCommand(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const navigateToChat = () => {
    if (session) {
      router.push('/dashboard/chat')
    } else {
      router.push('/auth/signin')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 lg:px-8 border-b border-gray-800">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-400 rounded-lg flex items-center justify-center">
            <span className="text-slate-900 font-bold text-lg">S</span>
          </div>
          <span className="text-white font-bold text-xl">SmartHub</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
          {session ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/dashboard/chat')}
                className="bg-teal-400 text-slate-900 px-4 py-2 rounded-lg font-medium hover:bg-teal-300 transition-colors"
              >
                Try in Chat
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="border border-gray-600 text-gray-300 px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Dashboard
              </button>
            </div>
          ) : (
            <Link
              href="/auth/signin"
              className="bg-teal-400 text-slate-900 px-4 py-2 rounded-lg font-medium hover:bg-teal-300 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </nav>

      {/* Authentication Status Banner for Unauthenticated Users */}
      {!session && (
        <div className="bg-gradient-to-r from-teal-500/20 to-purple-500/20 border-b border-teal-400/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-center gap-3 text-center">
              <Lock className="w-5 h-5 text-teal-400" />
              <p className="text-white font-medium">
                Sign in to access AI commands in your workspace and unlock full productivity features
              </p>
              <Link
                href="/auth/signin"
                className="ml-4 bg-teal-400 text-slate-900 px-4 py-2 rounded-lg font-medium hover:bg-teal-300 transition-colors"
              >
                Sign In Now
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 to-purple-500/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-gradient-to-r from-teal-500 to-purple-500 rounded-2xl">
                <Bot className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              SmartHub AI
              <span className="bg-gradient-to-r from-teal-400 to-purple-400 bg-clip-text text-transparent">
                {" "}Commands
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              {session
                ? "Supercharge your productivity with AI-powered assistance. Get instant insights, manage tasks, schedule meetings, and stay organized with simple chat commands."
                : "Discover how SmartHub's AI assistant can supercharge your productivity. See all available commands and examples below, then sign in to start using them in your workspace."
              }
            </p>
            <button
              onClick={navigateToChat}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-purple-500 text-white px-8 py-4 rounded-xl font-semibold hover:from-teal-600 hover:to-purple-600 transition-all duration-200 transform hover:scale-105"
            >
              {session ? (
                <>
                  <MessageSquare className="w-5 h-5" />
                  Go to Chat
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Sign In to Start
                </>
              )}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Features Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="text-center p-6 bg-gray-800/50 rounded-xl border border-gray-700">
            <Sparkles className="w-8 h-8 text-teal-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Intelligent Insights</h3>
            <p className="text-gray-400">Get AI-powered analysis of your productivity and workload</p>
          </div>
          <div className="text-center p-6 bg-gray-800/50 rounded-xl border border-gray-700">
            <Target className="w-8 h-8 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Smart Scheduling</h3>
            <p className="text-gray-400">AI helps you schedule meetings and manage your calendar</p>
          </div>
          <div className="text-center p-6 bg-gray-800/50 rounded-xl border border-gray-700">
            <Users className="w-8 h-8 text-teal-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Team Collaboration</h3>
            <p className="text-gray-400">Use AI commands in group chats and direct messages</p>
          </div>
        </div>

        {/* AI Commands List */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Available AI Commands
          </h2>
          <div className="grid gap-6">
            {aiCommands.map((cmd, index) => (
              <div
                key={index}
                className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-teal-400/30 transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-to-r from-teal-500/20 to-purple-500/20 rounded-lg">
                    {cmd.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <code className="text-lg font-mono text-teal-400 bg-gray-900/50 px-3 py-1 rounded">
                        {cmd.command}
                      </code>
                      <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-1 rounded">
                        {cmd.category}
                      </span>
                    </div>
                    <p className="text-gray-300 mb-4">{cmd.description}</p>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-gray-400">Examples:</h4>
                      {cmd.examples.map((example, exIndex) => (
                        <div
                          key={exIndex}
                          className="flex items-center justify-between bg-gray-900/50 rounded-lg p-3 group"
                        >
                          <code className="text-sm text-gray-300 font-mono">{example}</code>
                          {session ? (
                            <button
                              onClick={() => copyToClipboard(example)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-700 rounded"
                              title="Copy command"
                            >
                              {copiedCommand === example ? (
                                <Check className="w-4 h-4 text-green-400" />
                              ) : (
                                <Copy className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => router.push('/auth/signin')}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-700 rounded"
                              title="Sign in to copy commands"
                            >
                              <Lock className="w-4 h-4 text-teal-400" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How to Use */}
        <div className="bg-gradient-to-r from-teal-500/10 to-purple-500/10 rounded-2xl p-8 border border-teal-400/20">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            {session ? "How to Use AI Commands" : "How AI Commands Work"}
          </h2>

          {session ? (
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-teal-400 mb-3">In Group Chats</h3>
                <p className="text-gray-300 mb-4">
                  Type any AI command in a group chat to get instant assistance. The AI will respond
                  with relevant information based on your workspace data.
                </p>
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <code className="text-sm text-gray-300">@ai summarize my productivity</code>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-purple-400 mb-3">In Direct Messages</h3>
                <p className="text-gray-300 mb-4">
                  Use AI commands in direct conversations for personalized assistance and
                  private productivity insights.
                </p>
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <code className="text-sm text-gray-300">@ai tasks overdue</code>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="text-center">
                <p className="text-gray-300 mb-6 text-lg">
                  Once you sign in to SmartHub, you'll have access to powerful AI commands that integrate
                  with your workspace data to provide personalized insights and assistance.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="text-center p-6 bg-gray-800/30 rounded-xl border border-gray-600">
                  <MessageSquare className="w-8 h-8 text-teal-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-teal-400 mb-3">In Team Chats</h3>
                  <p className="text-gray-300 mb-4">
                    Use AI commands in group conversations to get team-wide insights, schedule meetings,
                    and manage collaborative tasks.
                  </p>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <code className="text-sm text-gray-300">@ai summarize team progress</code>
                  </div>
                </div>
                <div className="text-center p-6 bg-gray-800/30 rounded-xl border border-gray-600">
                  <Users className="w-8 h-8 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-purple-400 mb-3">Personal Assistant</h3>
                  <p className="text-gray-300 mb-4">
                    Get personalized productivity insights, task management, and scheduling assistance
                    tailored to your workflow.
                  </p>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <code className="text-sm text-gray-300">@ai tasks overdue</code>
                  </div>
                </div>
              </div>

              <div className="text-center p-6 bg-gradient-to-r from-teal-500/10 to-purple-500/10 rounded-xl border border-teal-400/30">
                <Star className="w-8 h-8 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-3">Smart Workspace Integration</h3>
                <p className="text-gray-300">
                  AI commands work with your actual workspace data - tasks, meetings, notes, and team activity -
                  to provide relevant, actionable insights that help you stay productive and organized.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          {session ? (
            <>
              <h2 className="text-2xl font-bold text-white mb-4">Ready to boost your productivity?</h2>
              <p className="text-gray-400 mb-8">Start using AI commands in your SmartHub workspace today.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => router.push('/dashboard/chat')}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-purple-500 text-white px-8 py-4 rounded-xl font-semibold hover:from-teal-600 hover:to-purple-600 transition-all duration-200 transform hover:scale-105"
                >
                  <Bot className="w-5 h-5" />
                  Start Chatting with AI
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="inline-flex items-center gap-2 border border-gray-600 text-gray-300 px-8 py-4 rounded-xl font-semibold hover:bg-gray-700 transition-all duration-200"
                >
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-white mb-4">Ready to unlock AI-powered productivity?</h2>
              <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                Join thousands of teams using SmartHub's AI assistant to streamline their workflow,
                manage tasks efficiently, and boost productivity with intelligent automation.
              </p>

              <div className="grid md:grid-cols-3 gap-6 mb-8 max-w-4xl mx-auto">
                <div className="text-center p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                  <CheckSquare className="w-6 h-6 text-teal-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-300">Smart Task Management</p>
                </div>
                <div className="text-center p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                  <Calendar className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-300">Intelligent Scheduling</p>
                </div>
                <div className="text-center p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                  <BarChart3 className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-300">Productivity Insights</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-purple-500 text-white px-8 py-4 rounded-xl font-semibold hover:from-teal-600 hover:to-purple-600 transition-all duration-200 transform hover:scale-105"
                >
                  <UserPlus className="w-5 h-5" />
                  Sign In to Get Started
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 border border-gray-600 text-gray-300 px-8 py-4 rounded-xl font-semibold hover:bg-gray-700 transition-all duration-200"
                >
                  Create Free Account
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>

              <p className="text-sm text-gray-500 mt-6">
                Free to start • No credit card required • Full AI features included
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
