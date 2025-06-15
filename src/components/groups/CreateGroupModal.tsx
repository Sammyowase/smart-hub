"use client";

import { useState, useEffect } from "react";
import { X, Users, Lock, Globe, Plus, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";

interface User {
  id: string;
  name: string;
  email: string;
}

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated?: (group: any) => void;
}

export const CreateGroupModal = ({ isOpen, onClose, onGroupCreated }: CreateGroupModalProps) => {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPrivate: false,
    memberIds: [] as string[],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableUsers();
    }
  }, [isOpen]);

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch("/api/team/members");
      if (response.ok) {
        const users = await response.json();
        // Filter out current user since they'll be added as admin automatically
        const filteredUsers = users.filter((user: User) => user.id !== session?.user?.id);
        setAvailableUsers(filteredUsers);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate form data
      if (!formData.name.trim()) {
        throw new Error("Group name is required");
      }

      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          memberIds: selectedUsers.map(user => user.id)
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to create group");
      }

      // Reset form
      setFormData({
        name: "",
        description: "",
        isPrivate: false,
        memberIds: [],
      });
      setSelectedUsers([]);

      onClose();
      onGroupCreated?.(responseData);
    } catch (error: any) {
      console.error("Error creating group:", error);
      setError(error.message || "Failed to create group. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleUserSelect = (user: User) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers(prev => [...prev, user]);
    }
  };

  const handleUserRemove = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  if (!isOpen) return null;

  // Check if user is admin
  if (session?.user?.role !== "ADMIN") {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md p-6">
          <div className="text-center">
            <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400 mb-4">Only administrators can create groups.</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-semibold text-white">Create New Group</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Group Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Group Name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
              placeholder="Enter group name"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent resize-none"
              placeholder="Group description (optional)"
            />
          </div>

          {/* Privacy Setting */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="isPrivate"
                checked={formData.isPrivate}
                onChange={handleChange}
                className="w-4 h-4 text-teal-400 bg-gray-700 border-gray-600 rounded focus:ring-teal-400 focus:ring-2"
              />
              <div className="flex items-center gap-2">
                {formData.isPrivate ? (
                  <Lock className="w-4 h-4 text-yellow-400" />
                ) : (
                  <Globe className="w-4 h-4 text-green-400" />
                )}
                <span className="text-white text-sm font-medium">
                  {formData.isPrivate ? "Private Group" : "Public Group"}
                </span>
              </div>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-7">
              {formData.isPrivate
                ? "Only invited members can see and join this group"
                : "All workspace members can see and join this group"
              }
            </p>
          </div>

          {/* Member Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Add Members (Optional)
            </label>

            {/* Selected Users */}
            {selectedUsers.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-2">Selected members:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 bg-teal-400/10 border border-teal-400/20 rounded-lg px-3 py-1"
                    >
                      <span className="text-teal-400 text-sm">{user.name || user.email}</span>
                      <button
                        type="button"
                        onClick={() => handleUserRemove(user.id)}
                        className="text-teal-400 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Users */}
            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-600 rounded-lg p-2">
              {availableUsers.filter(user => !selectedUsers.find(u => u.id === user.id)).map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleUserSelect(user)}
                  className="w-full flex items-center gap-3 p-2 bg-gray-900/30 rounded-lg hover:bg-gray-900/50 cursor-pointer transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {(user.name || user.email).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{user.name || user.email}</p>
                    {user.name && <p className="text-gray-400 text-xs truncate">{user.email}</p>}
                  </div>
                  <Plus className="w-4 h-4 text-gray-400" />
                </button>
              ))}
              {availableUsers.filter(user => !selectedUsers.find(u => u.id === user.id)).length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">
                  {availableUsers.length === 0 ? "No users available" : "All users selected"}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-teal-400 text-slate-900 rounded-lg font-medium hover:bg-teal-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Group"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
