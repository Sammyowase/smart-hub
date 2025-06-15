"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { 
  UserPlus, 
  Mail, 
  Send, 
  Copy, 
  Check, 
  X, 
  Loader2,
  Users,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface Invitation {
  id: string;
  email: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED";
  invitedAt: string;
  expiresAt: string;
  invitedBy: string;
}

export default function InviteUsersPage() {
  const { data: session } = useSession();
  const [inviteForm, setInviteForm] = useState({
    emails: "",
    role: "USER",
    message: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [copiedLink, setCopiedLink] = useState("");

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const emailList = inviteForm.emails
        .split(/[,\n]/)
        .map(email => email.trim())
        .filter(email => email && email.includes("@"));

      if (emailList.length === 0) {
        alert("Please enter valid email addresses");
        return;
      }

      const response = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: emailList,
          role: inviteForm.role,
          message: inviteForm.message,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send invitations");
      }

      const result = await response.json();
      
      // Reset form
      setInviteForm({ emails: "", role: "USER", message: "" });
      
      // Refresh invitations list
      fetchInvitations();
      
      alert(`Successfully sent ${emailList.length} invitation(s)`);
    } catch (error) {
      console.error("Error sending invitations:", error);
      alert("Failed to send invitations. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvitations = async () => {
    try {
      const response = await fetch("/api/team/invitations");
      if (response.ok) {
        const data = await response.json();
        setInvitations(data);
      }
    } catch (error) {
      console.error("Error fetching invitations:", error);
    }
  };

  const copyInviteLink = async (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(link);
    setCopiedLink(token);
    setTimeout(() => setCopiedLink(""), 2000);
  };

  const resendInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/team/invitations/${invitationId}/resend`, {
        method: "POST",
      });
      
      if (response.ok) {
        alert("Invitation resent successfully");
        fetchInvitations();
      }
    } catch (error) {
      console.error("Error resending invitation:", error);
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    if (!confirm("Are you sure you want to cancel this invitation?")) return;
    
    try {
      const response = await fetch(`/api/team/invitations/${invitationId}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      }
    } catch (error) {
      console.error("Error canceling invitation:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case "ACCEPTED":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "EXPIRED":
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "ACCEPTED":
        return "text-green-400 bg-green-400/10 border-green-400/20";
      case "EXPIRED":
        return "text-red-400 bg-red-400/10 border-red-400/20";
      default:
        return "text-gray-400 bg-gray-400/10 border-gray-400/20";
    }
  };

  // Check if user is admin
  if (session?.user?.role !== "ADMIN") {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-400 mb-2">Access Denied</h3>
        <p className="text-gray-500">Only administrators can invite new team members.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Invite Team Members</h1>
        <p className="text-gray-400">Send invitations to new team members to join your workspace</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Invite Form */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <UserPlus className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-semibold text-white">Send Invitations</h2>
          </div>

          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Addresses *
              </label>
              <textarea
                value={inviteForm.emails}
                onChange={(e) => setInviteForm(prev => ({ ...prev, emails: e.target.value }))}
                placeholder="Enter email addresses (one per line or comma-separated)&#10;john@example.com&#10;jane@example.com"
                rows={4}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Role
              </label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Users can access all features. Admins can also manage team members and settings.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Personal Message (Optional)
              </label>
              <textarea
                value={inviteForm.message}
                onChange={(e) => setInviteForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Add a personal message to the invitation email..."
                rows={3}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-teal-400 text-slate-900 py-3 rounded-lg font-medium hover:bg-teal-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending Invitations...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Invitations
                </>
              )}
            </button>
          </form>
        </div>

        {/* Pending Invitations */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Mail className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Pending Invitations</h2>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {invitations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Mail className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                <p>No pending invitations</p>
              </div>
            ) : (
              invitations.map((invitation) => (
                <div key={invitation.id} className="p-4 bg-gray-900/30 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium">{invitation.email}</span>
                        <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getStatusColor(invitation.status)}`}>
                          {invitation.status}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">
                        Invited {new Date(invitation.invitedAt).toLocaleDateString()}
                      </p>
                      {invitation.status === "PENDING" && (
                        <p className="text-gray-500 text-xs">
                          Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {getStatusIcon(invitation.status)}
                      {invitation.status === "PENDING" && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => copyInviteLink(invitation.id)}
                            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                            title="Copy invite link"
                          >
                            {copiedLink === invitation.id ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => resendInvitation(invitation.id)}
                            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                            title="Resend invitation"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => cancelInvitation(invitation.id)}
                            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400"
                            title="Cancel invitation"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
