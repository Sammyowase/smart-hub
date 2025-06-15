"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  User,
  Camera,
  Save,
  Loader2,
  Mail,
  Calendar,
  Shield,
  Activity,
  CheckCircle,
  Clock,
  Target,
  AlertCircle
} from "lucide-react";

export default function ProfilePage() {
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    bio: "",
    location: "",
    timezone: "UTC",
    phone: "",
    department: "",
    jobTitle: "",
    avatar: null as File | null,
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Update profile data when session changes
  useEffect(() => {
    if (session?.user) {
      setProfileData(prev => ({
        ...prev,
        name: session.user.name || "",
        email: session.user.email || "",
      }));
      // Set avatar preview from session if available
      if (session.user.image) {
        setAvatarPreview(session.user.image);
      }
    }
  }, [session]);



  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsLoading(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      const formData = new FormData();
      Object.entries(profileData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (key === 'avatar' && value instanceof File) {
            formData.append(key, value);
          } else if (typeof value === 'string') {
            formData.append(key, value);
          }
        }
      });

      const response = await fetch("/api/user/profile", {
        method: "PUT",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setSaveSuccess(data.message || "Profile updated successfully!");

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(null), 3000);

    } catch (error) {
      console.error("Error updating profile:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to update profile. Please try again.");

      // Clear error message after 5 seconds
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);

    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPG, PNG, GIF, etc.)');
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      setUploadError('Image size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatarPreview(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);

    // Update profile data
    setProfileData(prev => ({ ...prev, avatar: file }));
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="text-gray-400">Manage your personal information and preferences</p>
      </div>

      {/* Success/Error Messages */}
      {saveSuccess && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-green-400">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {saveSuccess}
          </div>
        </div>
      )}

      {saveError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {saveError}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Basic Information</h2>

            <div className="space-y-4">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-2xl font-bold">
                        {profileData.name.charAt(0).toUpperCase() || "U"}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-teal-400 rounded-full flex items-center justify-center hover:bg-teal-300 transition-colors"
                    title="Change profile picture"
                  >
                    <Camera className="w-4 h-4 text-slate-900" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <div>
                  <h3 className="text-white font-medium">{profileData.name || "User"}</h3>
                  <p className="text-gray-400 text-sm">{session?.user?.role}</p>
                  {uploadError && (
                    <p className="text-red-400 text-xs mt-1">{uploadError}</p>
                  )}
                  <p className="text-gray-500 text-xs mt-1">
                    Click camera icon to upload image (max 5MB)
                  </p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profileData.email}
                    readOnly
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                    title="Email address cannot be changed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email address cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={profileData.jobTitle}
                    onChange={(e) => setProfileData(prev => ({ ...prev, jobTitle: e.target.value }))}
                    placeholder="e.g., Software Developer"
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Department
                  </label>
                  <input
                    type="text"
                    value={profileData.department}
                    onChange={(e) => setProfileData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="e.g., Engineering"
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={profileData.location}
                    onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., New York, NY"
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bio
                </label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-700 mt-6">
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

        {/* Account Information */}
        <div className="space-y-6">
          {/* Account Info */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-gray-300">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-sm">{session?.user?.email}</span>
              </div>

              <div className="flex items-center gap-2 text-gray-300">
                <Shield className="w-4 h-4 text-gray-400" />
                <span className="text-sm">Role: {session?.user?.role}</span>
              </div>

              <div className="flex items-center gap-2 text-gray-300">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm">
                  Member since {session?.user?.createdAt ? new Date(session.user.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>

              {session?.user?.workspaceId && (
                <div className="flex items-center gap-2 text-gray-300">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">Workspace ID: {session.user.workspaceId}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
