"use client";

import { useState } from 'react';
import { Users, Plus, Settings, UserPlus, Crown, Shield } from 'lucide-react';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface Group {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  role: 'owner' | 'admin' | 'member';
  isPrivate: boolean;
  createdAt: string;
}

interface GroupsManagerProps {
  className?: string;
}

export const GroupsManager = ({ className = '' }: GroupsManagerProps) => {
  const { isMobile } = useMobileDetection();
  const [groups] = useState<Group[]>([
    {
      id: '1',
      name: 'Development Team',
      description: 'Main development team for the project',
      memberCount: 8,
      role: 'admin',
      isPrivate: false,
      createdAt: '2024-01-01'
    },
    {
      id: '2',
      name: 'Design Team',
      description: 'UI/UX design team',
      memberCount: 4,
      role: 'member',
      isPrivate: true,
      createdAt: '2024-01-05'
    },
    {
      id: '3',
      name: 'Project Managers',
      description: 'Project management and coordination',
      memberCount: 3,
      role: 'owner',
      isPrivate: false,
      createdAt: '2024-01-10'
    }
  ]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-400" />;
      case 'admin': return <Shield className="w-4 h-4 text-blue-400" />;
      default: return <Users className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'text-yellow-400';
      case 'admin': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-400/10 rounded-lg">
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Groups</h2>
            <p className="text-gray-400 text-sm">Manage your team groups and permissions</p>
          </div>
        </div>
        
        <button className="flex items-center gap-2 px-3 py-2 bg-purple-400 text-slate-900 rounded-lg font-medium hover:bg-purple-300 transition-colors">
          <Plus className="w-4 h-4" />
          {!isMobile && "Create Group"}
        </button>
      </div>

      {/* Groups List */}
      <div className="space-y-4">
        {groups.map((group) => (
          <div
            key={group.id}
            className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:bg-gray-700/30 transition-colors"
          >
            <div className={`${isMobile ? 'space-y-3' : 'flex items-start justify-between'}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-white">{group.name}</h3>
                  {group.isPrivate && (
                    <span className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded-full">
                      Private
                    </span>
                  )}
                  <div className="flex items-center gap-1">
                    {getRoleIcon(group.role)}
                    <span className={`text-xs font-medium ${getRoleColor(group.role)}`}>
                      {group.role.charAt(0).toUpperCase() + group.role.slice(1)}
                    </span>
                  </div>
                </div>
                
                {group.description && (
                  <p className="text-gray-400 text-sm mb-3">{group.description}</p>
                )}
                
                <div className="flex items-center gap-4 text-sm text-gray-300">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{group.memberCount} members</span>
                  </div>
                  <div>
                    Created {new Date(group.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              {!isMobile && (
                <div className="flex gap-2 ml-4">
                  {(group.role === 'owner' || group.role === 'admin') && (
                    <>
                      <button className="flex items-center gap-1 px-3 py-1 text-sm bg-green-500/10 border border-green-500/20 text-green-400 rounded hover:bg-green-500/20 transition-colors">
                        <UserPlus className="w-3 h-3" />
                        Invite
                      </button>
                      <button className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors">
                        <Settings className="w-3 h-3" />
                        Settings
                      </button>
                    </>
                  )}
                  <button className="px-3 py-1 text-sm bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded hover:bg-blue-500/20 transition-colors">
                    View
                  </button>
                </div>
              )}
            </div>
            
            {isMobile && (
              <div className="flex gap-2 mt-3">
                <button className="flex-1 px-3 py-2 text-sm bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded hover:bg-blue-500/20 transition-colors">
                  View Group
                </button>
                {(group.role === 'owner' || group.role === 'admin') && (
                  <>
                    <button className="px-3 py-2 text-sm bg-green-500/10 border border-green-500/20 text-green-400 rounded hover:bg-green-500/20 transition-colors">
                      <UserPlus className="w-4 h-4" />
                    </button>
                    <button className="px-3 py-2 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors">
                      <Settings className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {groups.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No groups found</p>
          <p className="text-sm">Create your first group to get started</p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{groups.length}</div>
            <div className="text-xs text-gray-400">Total Groups</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {groups.filter(g => g.role === 'owner' || g.role === 'admin').length}
            </div>
            <div className="text-xs text-gray-400">Admin Rights</div>
          </div>
          {!isMobile && (
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {groups.reduce((sum, g) => sum + g.memberCount, 0)}
              </div>
              <div className="text-xs text-gray-400">Total Members</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
