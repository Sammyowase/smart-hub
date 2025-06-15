"use client";

import { useState, useEffect } from "react";
import { Users, Lock, Globe, MessageSquare, Plus, Settings, Crown, Shield, User } from "lucide-react";
import { useSession } from "next-auth/react";
import { CreateGroupModal } from "./CreateGroupModal";
import { GroupMembersModal } from "./GroupMembersModal";

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
  members: Array<{
    id: string;
    role: string;
    joinedAt: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

export const GroupsList = () => {
  const { data: session } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch("/api/groups?includePrivate=true");
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGroupCreated = (newGroup: Group) => {
    setGroups(prev => [newGroup, ...prev]);
  };

  const handleManageMembers = (group: Group) => {
    setSelectedGroup(group);
    setShowMembersModal(true);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Crown className="w-3 h-3 text-yellow-400" />;
      case "MODERATOR":
        return <Shield className="w-3 h-3 text-blue-400" />;
      default:
        return <User className="w-3 h-3 text-gray-400" />;
    }
  };

  const getUserRole = (group: Group) => {
    const userMembership = group.members.find(member => member.user.id === session?.user?.id);
    return userMembership?.role || null;
  };

  const canManageGroup = (group: Group) => {
    return session?.user?.role === "ADMIN" || getUserRole(group) === "ADMIN";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Groups</h1>
          <p className="text-gray-400">Manage team groups and communication channels</p>
        </div>
        {session?.user?.role === "ADMIN" && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-400 text-slate-900 rounded-lg font-medium hover:bg-teal-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Group
          </button>
        )}
      </div>

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Groups Yet</h3>
          <p className="text-gray-400 mb-4">
            {session?.user?.role === "ADMIN" 
              ? "Create your first group to start organizing team communication."
              : "No groups have been created yet. Contact an administrator to create groups."
            }
          </p>
          {session?.user?.role === "ADMIN" && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-teal-400 text-slate-900 rounded-lg font-medium hover:bg-teal-300 transition-colors"
            >
              Create First Group
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => {
            const userRole = getUserRole(group);
            const isMember = !!userRole;
            
            return (
              <div
                key={group.id}
                className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:bg-gray-800/70 transition-colors"
              >
                {/* Group Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-blue-400 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-semibold">{group.name}</h3>
                        {group.isPrivate ? (
                          <Lock className="w-4 h-4 text-yellow-400" />
                        ) : (
                          <Globe className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                      {userRole && (
                        <div className="flex items-center gap-1 mt-1">
                          {getRoleIcon(userRole)}
                          <span className="text-xs text-gray-400 capitalize">{userRole.toLowerCase()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {canManageGroup(group) && (
                    <button
                      onClick={() => handleManageMembers(group)}
                      className="p-1 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Description */}
                {group.description && (
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{group.description}</p>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{group.memberCount} members</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      <span>{group.messageCount} messages</span>
                    </div>
                  </div>
                </div>

                {/* Members Preview */}
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {group.members.slice(0, 4).map((member, index) => (
                      <div
                        key={member.id}
                        className="w-8 h-8 bg-gray-600 rounded-full border-2 border-gray-800 flex items-center justify-center"
                        title={member.user.name || member.user.email}
                      >
                        <span className="text-white text-xs font-medium">
                          {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    ))}
                    {group.memberCount > 4 && (
                      <div className="w-8 h-8 bg-gray-700 rounded-full border-2 border-gray-800 flex items-center justify-center">
                        <span className="text-gray-300 text-xs">+{group.memberCount - 4}</span>
                      </div>
                    )}
                  </div>
                  
                  {isMember ? (
                    <button className="px-3 py-1 bg-teal-400/10 border border-teal-400/20 text-teal-400 rounded-lg text-sm hover:bg-teal-400/20 transition-colors">
                      Open Chat
                    </button>
                  ) : (
                    <button className="px-3 py-1 bg-gray-600 text-gray-300 rounded-lg text-sm hover:bg-gray-500 transition-colors">
                      Request Access
                    </button>
                  )}
                </div>

                {/* Created Info */}
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <p className="text-xs text-gray-500">
                    Created by {group.createdBy.name || group.createdBy.email} • {new Date(group.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onGroupCreated={handleGroupCreated}
      />

      {selectedGroup && (
        <GroupMembersModal
          isOpen={showMembersModal}
          onClose={() => {
            setShowMembersModal(false);
            setSelectedGroup(null);
          }}
          group={selectedGroup}
          onMembersUpdated={fetchGroups}
        />
      )}
    </div>
  );
};
