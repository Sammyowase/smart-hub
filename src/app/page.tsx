import Link from "next/link";
import { ArrowRight, Users, CheckCircle, MessageSquare, Calendar, BarChart3 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-teal-400/10">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-400 rounded-lg flex items-center justify-center">
            <span className="text-slate-900 font-bold text-lg">S</span>
          </div>
          <span className="text-white font-bold text-xl">SmartHub</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/ai-commands"
            className="text-gray-300 hover:text-white transition-colors"
          >
            AI Commands
          </Link>
          <Link
            href="/login"
            className="text-gray-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="bg-teal-400 text-slate-900 px-4 py-2 rounded-lg font-medium hover:bg-teal-300 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center py-20 lg:py-32">
          <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6">
            Smarter productivity,{" "}
            <span className="text-teal-400">together</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            A comprehensive team productivity and communication platform designed for modern organizations.
            Streamline tasks, enhance collaboration, and boost team efficiency with AI-powered insights.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-teal-400 text-slate-900 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-teal-300 transition-colors flex items-center justify-center gap-2"
            >
              Create Workspace
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="border border-gray-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-800 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 py-20">
          <FeatureCard
            icon={<CheckCircle className="w-8 h-8 text-teal-400" />}
            title="Task Management"
            description="Organize work with Kanban boards, assign tasks, and track progress with AI-powered insights."
          />
          <FeatureCard
            icon={<Users className="w-8 h-8 text-purple-400" />}
            title="Team Collaboration"
            description="Real-time chat, file sharing, and seamless communication tools for distributed teams."
          />
          <FeatureCard
            icon={<MessageSquare className="w-8 h-8 text-blue-400" />}
            title="Smart Notes"
            description="Rich text editor with AI categorization, sentiment analysis, and PDF export capabilities."
          />
          <FeatureCard
            icon={<Calendar className="w-8 h-8 text-green-400" />}
            title="Meeting Scheduler"
            description="Schedule meetings, get AI-generated summaries, and never miss important discussions."
          />
          <FeatureCard
            icon={<BarChart3 className="w-8 h-8 text-orange-400" />}
            title="Attendance Tracking"
            description="Location-based clock-in/out with comprehensive attendance logs and analytics."
          />
          <FeatureCard
            icon={<ArrowRight className="w-8 h-8 text-pink-400" />}
            title="AI Assistant"
            description="Gemini-powered AI with 5+ commands for productivity, task management, and smart scheduling."
            link="/ai-commands"
            linkText="View AI Commands"
          />
        </div>

        {/* AI Commands Preview Section */}
        <div className="py-20 border-t border-gray-800">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Meet Your AI Assistant
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Boost your productivity with intelligent commands that help you manage tasks,
              schedule meetings, and get insights instantly.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-teal-400/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-teal-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">@ai summarize</h3>
              <p className="text-gray-400 text-sm">Get productivity insights and task overview</p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-purple-400/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">@ai tasks</h3>
              <p className="text-gray-400 text-sm">View and manage your task status</p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-blue-400/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">@ai schedule</h3>
              <p className="text-gray-400 text-sm">Smart meeting and event scheduling</p>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/ai-commands"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-400 to-purple-400 text-slate-900 px-8 py-4 rounded-lg font-semibold hover:from-teal-500 hover:to-purple-500 transition-all duration-200"
            >
              Explore All AI Commands
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 bg-teal-400 rounded-lg flex items-center justify-center">
              <span className="text-slate-900 font-bold text-sm">S</span>
            </div>
            <span className="text-white font-bold">SmartHub</span>
          </div>
          <p className="text-gray-400">
            © 2024 SmartHub. Built with Next.js, Tailwind CSS, and Gemini AI.
          </p>
        </div>
      </footer>
    </div>
  );
}

const FeatureCard = ({ icon, title, description, link, linkText }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  link?: string;
  linkText?: string;
}) => (
  <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:bg-gray-800/70 transition-colors">
    <div className="mb-4">{icon}</div>
    <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
    <p className="text-gray-400 mb-4">{description}</p>
    {link && linkText && (
      <Link
        href={link}
        className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 transition-colors text-sm font-medium"
      >
        {linkText}
        <ArrowRight className="w-4 h-4" />
      </Link>
    )}
  </div>
);
