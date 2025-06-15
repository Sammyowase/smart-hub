"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Globe,
  Save,
  Loader2
} from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [settings, setSettings] = useState({
    // Profile settings
    name: session?.user?.name || "",
    email: session?.user?.email || "",
    timezone: "UTC",
    language: "en",
    
    // Notification settings
    emailNotifications: true,
    pushNotifications: true,
    meetingReminders: true,
    taskDeadlines: true,
    chatMentions: true,
    
    // Appearance settings
    theme: "dark",
    sidebarCollapsed: false,
    compactMode: false,
    
    // Privacy settings
    profileVisibility: "team",
    activityStatus: true,
    readReceipts: true,
  });

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      
      if (!response.ok) throw new Error("Failed to save settings");
      
      // Show success message
      console.log("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "privacy", label: "Privacy", icon: Shield },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400">Manage your account preferences and workspace settings</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-teal-400 text-slate-900"
                      : "text-gray-300 hover:text-white hover:bg-gray-700"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            {/* Profile Settings */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white">Profile Information</h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={settings.name}
                      onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={settings.email}
                      onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Timezone
                    </label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Language
                    </label>
                    <select
                      value={settings.language}
                      onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white">Notification Preferences</h2>
                
                <div className="space-y-4">
                  {[
                    { key: "emailNotifications", label: "Email Notifications", desc: "Receive notifications via email" },
                    { key: "pushNotifications", label: "Push Notifications", desc: "Browser push notifications" },
                    { key: "meetingReminders", label: "Meeting Reminders", desc: "Get reminded about upcoming meetings" },
                    { key: "taskDeadlines", label: "Task Deadlines", desc: "Notifications for approaching deadlines" },
                    { key: "chatMentions", label: "Chat Mentions", desc: "When someone mentions you in chat" },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg">
                      <div>
                        <h3 className="text-white font-medium">{item.label}</h3>
                        <p className="text-gray-400 text-sm">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings[item.key as keyof typeof settings] as boolean}
                          onChange={(e) => setSettings(prev => ({ ...prev, [item.key]: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-400/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-400"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Appearance Settings */}
            {activeTab === "appearance" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white">Appearance</h2>
                
                <div className="space-y-4">
                  <div className="p-4 bg-gray-900/30 rounded-lg">
                    <h3 className="text-white font-medium mb-2">Theme</h3>
                    <div className="flex gap-3">
                      {["dark", "light", "auto"].map((theme) => (
                        <button
                          key={theme}
                          onClick={() => setSettings(prev => ({ ...prev, theme }))}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            settings.theme === theme
                              ? "bg-teal-400 text-slate-900"
                              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          }`}
                        >
                          {theme.charAt(0).toUpperCase() + theme.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg">
                    <div>
                      <h3 className="text-white font-medium">Compact Mode</h3>
                      <p className="text-gray-400 text-sm">Reduce spacing and padding</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.compactMode}
                        onChange={(e) => setSettings(prev => ({ ...prev, compactMode: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-400/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-400"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Settings */}
            {activeTab === "privacy" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white">Privacy & Security</h2>
                
                <div className="space-y-4">
                  <div className="p-4 bg-gray-900/30 rounded-lg">
                    <h3 className="text-white font-medium mb-2">Profile Visibility</h3>
                    <select
                      value={settings.profileVisibility}
                      onChange={(e) => setSettings(prev => ({ ...prev, profileVisibility: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                    >
                      <option value="public">Public</option>
                      <option value="team">Team Only</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                  
                  {[
                    { key: "activityStatus", label: "Show Activity Status", desc: "Let others see when you're online" },
                    { key: "readReceipts", label: "Read Receipts", desc: "Show when you've read messages" },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg">
                      <div>
                        <h3 className="text-white font-medium">{item.label}</h3>
                        <p className="text-gray-400 text-sm">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings[item.key as keyof typeof settings] as boolean}
                          onChange={(e) => setSettings(prev => ({ ...prev, [item.key]: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-400/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-400"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end pt-6 border-t border-gray-700">
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="bg-teal-400 text-slate-900 px-6 py-2 rounded-lg font-medium hover:bg-teal-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
