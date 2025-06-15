"use client";

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Loading component for lazy-loaded components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
    <span className="ml-3 text-gray-400">Loading...</span>
  </div>
);

// Dashboard Components
export const LazyAttendanceWidget = dynamic(
  () => import('@/components/dashboard/AttendanceWidget').then(mod => ({ default: mod.AttendanceWidget })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

export const LazyDailyTipsWidget = dynamic(
  () => import('@/components/dashboard/DailyTipsWidget').then(mod => ({ default: mod.DailyTipsWidget })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

export const LazyAICommandsWidget = dynamic(
  () => import('@/components/dashboard/AICommandsWidget').then(mod => ({ default: mod.AICommandsWidget })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

// Task Components
export const LazyTaskBoard = dynamic(
  () => import('@/components/tasks/TaskBoard').then(mod => ({ default: mod.TaskBoard })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

export const LazyTaskList = dynamic(
  () => import('@/components/tasks/TaskList').then(mod => ({ default: mod.TaskList })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

export const LazyCreateTaskModal = dynamic(
  () => import('@/components/tasks/CreateTaskModal').then(mod => ({ default: mod.CreateTaskModal })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

// Chat Components
export const LazyChatInterface = dynamic(
  () => import('@/components/chat/ChatInterface').then(mod => ({ default: mod.ChatInterface })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

// Notes Components
export const LazyNotesEditor = dynamic(
  () => import('@/components/notes/NotesEditor').then(mod => ({ default: mod.NotesEditor })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

// Analytics Components
export const LazyAnalyticsDashboard = dynamic(
  () => import('@/components/analytics/AnalyticsDashboard').then(mod => ({ default: mod.AnalyticsDashboard })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

// Meetings Components
export const LazyMeetingsCalendar = dynamic(
  () => import('@/components/meetings/MeetingsCalendar').then(mod => ({ default: mod.MeetingsCalendar })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

// Groups Components
export const LazyGroupsManager = dynamic(
  () => import('@/components/groups/GroupsManager').then(mod => ({ default: mod.GroupsManager })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

// Attendance Components
export const LazyAttendanceTracker = dynamic(
  () => import('@/components/attendance/AttendanceTracker').then(mod => ({ default: mod.AttendanceTracker })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

// Higher-order component for lazy loading with error boundary
export function withLazyLoading<T extends object>(
  Component: ComponentType<T>,
  displayName: string = 'LazyComponent'
) {
  const LazyComponent = dynamic(
    () => Promise.resolve({ default: Component }),
    {
      loading: () => <LoadingSpinner />,
      ssr: false
    }
  );
  
  LazyComponent.displayName = displayName;
  return LazyComponent;
}

// Preload function for critical components
export const preloadCriticalComponents = () => {
  // Preload components that are likely to be used soon
  import('@/components/dashboard/AttendanceWidget');
  import('@/components/dashboard/DailyTipsWidget');
  import('@/components/tasks/TaskBoard');
  import('@/components/tasks/TaskList');
};

// Component registry for dynamic imports
export const componentRegistry = {
  AttendanceWidget: LazyAttendanceWidget,
  DailyTipsWidget: LazyDailyTipsWidget,
  AICommandsWidget: LazyAICommandsWidget,
  TaskBoard: LazyTaskBoard,
  TaskList: LazyTaskList,
  CreateTaskModal: LazyCreateTaskModal,
  ChatInterface: LazyChatInterface,
  NotesEditor: LazyNotesEditor,
  AnalyticsDashboard: LazyAnalyticsDashboard,
  MeetingsCalendar: LazyMeetingsCalendar,
  GroupsManager: LazyGroupsManager,
  AttendanceTracker: LazyAttendanceTracker,
};
