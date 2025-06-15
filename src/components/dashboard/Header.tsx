"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Sun, Moon, LogOut, User, Settings, Search, Bot, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { useTheme } from "@/contexts/ThemeContext";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import Link from "next/link";

export const Header = () => {
  const { data: session } = useSession();
  const { isDarkMode, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Search - hidden on mobile */}
        <div className="hidden sm:block">
          <GlobalSearch />
        </div>

        {/* Mobile search button */}
        <button
          className="sm:hidden p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          onClick={() => setShowMobileSearch(!showMobileSearch)}
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Right side actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* AI Commands Button */}
          <Link
            href="/ai-commands"
            className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="AI Commands Help"
          >
            <Bot className="w-5 h-5" />
          </Link>

          {/* Theme Toggle - hidden on mobile */}
          <button
            onClick={toggleTheme}
            className="hidden sm:block p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Notifications */}
          <ErrorBoundary
            fallback={
              <div className="p-2 text-gray-400">
                <Bell className="w-5 h-5" />
              </div>
            }
            onError={(error) => console.error('NotificationDropdown error:', error)}
          >
            <NotificationDropdown />
          </ErrorBoundary>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
              <div className="text-left hidden lg:block">
                <p className="text-white text-sm font-medium">
                  {session?.user?.name || "User"}
                </p>
                <p className="text-gray-400 text-xs">
                  {session?.user?.role === "ADMIN" ? "Admin" : "User"}
                </p>
              </div>
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                <div className="p-2">
                  <Link
                    href="/dashboard/profile"
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                  <hr className="my-2 border-gray-700" />
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-400 hover:text-red-300 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search */}
      {showMobileSearch && (
        <div className="sm:hidden mt-4 border-t border-gray-700 pt-4">
          <GlobalSearch />
        </div>
      )}
    </header>
  );
};
