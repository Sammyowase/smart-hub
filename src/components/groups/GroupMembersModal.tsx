"use client";

import { useState, useEffect } from "react";
import { X, Users, Crown, Shield, User, Plus, Trash2, MoreVertical } from "lucide-react";
import { useSession } from "next-auth/react";

interface GroupMember {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface Group {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  memberCount: number;
  messageCount: number;
  members: GroupMember[];
  createdAt: string;
  updatedAt: string;
}

interface AvailableUser {
  id: string;
  name: string;
  email: string;
}

interface GroupMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  onMembersUpdated?: () => void;
}

export const GroupMembersModal = ({ isOpen, onClose, group, onMembersUpdated }: GroupMembersModalProps) => {
  const { data: session } = useSession();
  const [members, setMembers] = useState<GroupMember[]>(group.members);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<AvailableUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableUsers();
      setMembers(group.members);
    }
  }, [isOpen, group.members]);

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch("/api/team/members");
      if (response.ok) {
        const users = await response.json();
        // Filter out users who are already members
        const memberIds = group.members.map(m => m.user.id);
        const available = users.filter((user: AvailableUser) => !memberIds.includes(user.id));
        setAvailableUsers(available);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Crown className="w-4 h-4 text-yellow-400" />;
      case "MODERATOR":
        return <Shield className="w-4 h-4 text-blue-400" />;
      default:
        return <User className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "text-yellow-400";
      case "MODERATOR":
        return "text-blue-400";
      default:
        return "text-gray-400";
    }
  };

  const canManageMembers = () => {
    return session?.user?.role === "ADMIN";
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/groups/${group.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: selectedUsers.map(u => u.id),
          role: "MEMBER"
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add members");
      }

      setMembers(data.members);
      setSelectedUsers([]);
      setShowAddMembers(false);
      onMembersUpdated?.();
      
      // Update available users
      const newMemberIds = selectedUsers.map(u => u.id);
      setAvailableUsers(prev => prev.filter(u => !newMemberIds.includes(u.id)));

    } catch (error: any) {
      console.error("Error adding members:", error);
      setError(error.message || "Failed to add members");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/groups/${group.id}/members/${userId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove member");
      }

      setMembers(prev => prev.filter(m => m.id !== memberId));
      onMembersUpdated?.();

      // Add user back to available users
      const removedMember = members.find(m => m.id === memberId);
      if (removedMember) {
        setAvailableUsers(prev => [...prev, removedMember.user]);
      }

    } catch (error: any) {
      console.error("Error removing member:", error);
      setError(error.message || "Failed to remove member");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string, userId: string, newRole: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/groups/${group.id}/members/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update role");
      }

      setMembers(prev => prev.map(m => 
        m.id === memberId ? { ...m, role: newRole } : m
      ));
      onMembersUpdated?.();

    } catch (error: any) {
      console.error("Error updating role:", error);
      setError(error.message || "Failed to update role");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-semibold text-white">Manage Members - {group.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Add Members Section */}
          {canManageMembers() && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-medium">Members ({members.length})</h3>
                {availableUsers.length > 0 && (
                  <button
                    onClick={() => setShowAddMembers(!showAddMembers)}
                    className="flex items-center gap-2 px-3 py-1 bg-teal-400/10 border border-teal-400/20 text-teal-400 rounded-lg text-sm hover:bg-teal-400/20 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Members
                  </button>
                )}
              </div>

              {/* Add Members Interface */}
              {showAddMembers && (
                <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-4 mb-4">
                  <h4 className="text-white text-sm font-medium mb-3">Add New Members</h4>
                  
                  {/* Selected Users */}
                  {selectedUsers.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-2">
                        {selectedUsers.map(user => (
                          <div
                            key={user.id}
                            className="flex items-center gap-2 bg-teal-400/10 border border-teal-400/20 rounded-lg px-3 py-1"
                          >
                            <span className="text-teal-400 text-sm">{user.name || user.email}</span>
                            <button
                              onClick={() => setSelectedUsers(prev => prev.filter(u => u.id !== user.id))}
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
                  <div className="space-y-2 max-h-32 overflow-y-auto mb-3">
                    {availableUsers.filter(user => !selectedUsers.find(u => u.id === user.id)).map(user => (
                      <button
                        key={user.id}
                        onClick={() => setSelectedUsers(prev => [...prev, user])}
                        className="w-full flex items-center gap-3 p-2 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors text-left"
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
                      </button>
                    ))}
                  </div>

                  {/* Add Button */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddMembers(false)}
                      className="px-3 py-1 border border-gray-600 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddMembers}
                      disabled={selectedUsers.length === 0 || isLoading}
                      className="px-3 py-1 bg-teal-400 text-slate-900 rounded-lg text-sm font-medium hover:bg-teal-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? "Adding..." : `Add ${selectedUsers.length} Member${selectedUsers.length !== 1 ? 's' : ''}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Members List */}
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">
                      {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">{member.user.name || member.user.email}</p>
                      {getRoleIcon(member.role)}
                    </div>
                    <div className="flex items-center gap-2">
                      {member.user.name && <p className="text-gray-400 text-sm">{member.user.email}</p>}
                      <span className="text-xs text-gray-500">•</span>
                      <span className={`text-xs font-medium ${getRoleColor(member.role)}`}>
                        {member.role}
                      </span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-500">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Member Actions */}
                {canManageMembers() && member.user.id !== group.createdBy.id && (
                  <div className="flex items-center gap-2">
                    {/* Role Selector */}
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, member.user.id, e.target.value)}
                      disabled={isLoading}
                      className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    >
                      <option value="MEMBER">Member</option>
                      <option value="MODERATOR">Moderator</option>
                      <option value="ADMIN">Admin</option>
                    </select>

                    {/* Remove Button */}
                    <button
                      onClick={() => handleRemoveMember(member.id, member.user.id)}
                      disabled={isLoading}
                      className="p-1 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Creator Badge */}
                {member.user.id === group.createdBy.id && (
                  <div className="px-2 py-1 bg-yellow-400/10 border border-yellow-400/20 rounded text-yellow-400 text-xs font-medium">
                    Creator
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
