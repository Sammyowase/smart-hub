"use client";

import { GroupsList } from "@/components/groups/GroupsList";

export default function GroupsPage() {
  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <GroupsList />
      </div>
    </div>
  );
}
