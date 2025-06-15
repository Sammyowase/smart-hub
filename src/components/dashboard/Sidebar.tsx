"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  MessageSquare,
  Calendar,
  Clock,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  UserPlus,
  Shield,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Tasks", href: "/dashboard/tasks", icon: CheckSquare },
  { name: "Notes", href: "/dashboard/notes", icon: FileText },
  { name: "Chat", href: "/dashboard/chat", icon: MessageSquare },
  { name: "AI Commands", href: "/ai-commands", icon: Bot },
  { name: "Groups", href: "/dashboard/groups", icon: Users },
  { name: "Meetings", href: "/dashboard/meetings", icon: Calendar },
  { name: "Attendance", href: "/dashboard/attendance", icon: Clock },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
];

const adminNavigation = [
  { name: "Team", href: "/dashboard/team", icon: Shield },
  { name: "Invite Users", href: "/dashboard/invite", icon: UserPlus },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <div
      className={cn(
        "bg-gray-800 border-r border-gray-700 flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-400 rounded-lg flex items-center justify-center">
                <span className="text-slate-900 font-bold text-lg">S</span>
              </div>
              <span className="text-white font-bold text-xl">SmartHub</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-teal-400 text-slate-900"
                  : "text-gray-300 hover:text-white hover:bg-gray-700"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}

        {/* Admin Section */}
        {isAdmin && (
          <>
            <div className="pt-4 mt-4 border-t border-gray-700">
              {!collapsed && (
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Admin
                </p>
              )}
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-purple-400 text-slate-900"
                        : "text-gray-300 hover:text-white hover:bg-gray-700"
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </nav>

      {/* User Info */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {session?.user?.name || "User"}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {session?.user?.email}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
