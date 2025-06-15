"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  Users, 
  Search, 
  Filter, 
  MoreHorizontal, 
  UserPlus, 
  Crown,
  Mail,
  Calendar,
  Activity,
  Shield,
  Edit,
  Trash2
} from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  isOnline: boolean;
  lastActive: string;
  joinedAt: string;
  tasksCount: number;
  completedTasks: number;
}

export default function TeamPage() {
  const { data: session } = useSession();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch("/api/team/members");
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data);
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = async (memberId: string, newRole: "ADMIN" | "USER") => {
    try {
      const response = await fetch(`/api/team/members/${memberId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      
      if (response.ok) {
        setTeamMembers(prev => 
          prev.map(member => 
            member.id === memberId ? { ...member, role: newRole } : member
          )
        );
      }
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this team member?")) return;
    
    try {
      const response = await fetch(`/api/team/members/${memberId}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        setTeamMembers(prev => prev.filter(member => member.id !== memberId));
      }
    } catch (error) {
      console.error("Error removing member:", error);
    }
  };

  const isAdmin = session?.user?.role === "ADMIN";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Team Members</h1>
          <p className="text-gray-400">Manage your workspace team and permissions</p>
        </div>
        {isAdmin && (
          <button className="bg-teal-400 text-slate-900 px-4 py-2 rounded-lg font-medium hover:bg-teal-300 transition-colors flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Invite Member
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-400/10 rounded-lg">
              <Users className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Members</p>
              <p className="text-white text-xl font-bold">{teamMembers.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-400/10 rounded-lg">
              <Activity className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Online Now</p>
              <p className="text-white text-xl font-bold">
                {teamMembers.filter(m => m.isOnline).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-400/10 rounded-lg">
              <Crown className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Admins</p>
              <p className="text-white text-xl font-bold">
                {teamMembers.filter(m => m.role === "ADMIN").length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-400/10 rounded-lg">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Users</p>
              <p className="text-white text-xl font-bold">
                {teamMembers.filter(m => m.role === "USER").length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search team members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option value="all">All Roles</option>
            <option value="ADMIN">Admins</option>
            <option value="USER">Users</option>
          </select>
        </div>
      </div>

      {/* Team Members List */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        {filteredMembers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <p>No team members found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredMembers.map((member) => (
              <div key={member.id} className="p-6 hover:bg-gray-700/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-lg">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {member.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-gray-800"></div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-medium">{member.name}</h3>
                        {member.role === "ADMIN" && (
                          <Crown className="w-4 h-4 text-yellow-400" />
                        )}
                      </div>
                      <p className="text-gray-400 text-sm">{member.email}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </span>
                        <span>
                          {member.isOnline ? "Online" : `Last active ${member.lastActive}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-white text-sm font-medium">
                        {member.completedTasks}/{member.tasksCount} tasks
                      </p>
                      <p className="text-gray-400 text-xs">
                        {member.tasksCount > 0 
                          ? `${Math.round((member.completedTasks / member.tasksCount) * 100)}% complete`
                          : "No tasks"
                        }
                      </p>
                    </div>
                    
                    {isAdmin && member.id !== session?.user?.id && (
                      <div className="relative">
                        <button className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {/* Dropdown menu would go here */}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
