"use client";

import { useState, useCallback, useRef } from 'react';
import { useDataCache } from './useDataCache';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  dueDate?: string;
  createdAt: string;
  updatedAt?: string;
}

interface OptimisticUpdate {
  taskId: string;
  originalStatus: string;
  newStatus: string;
  timestamp: number;
}

export function useOptimisticTasks() {
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, OptimisticUpdate>>(new Map());
  const rollbackTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const {
    data: tasks,
    isLoading,
    error,
    refetch,
    invalidate
  } = useDataCache<Task[]>(
    'tasks-list',
    async () => {
      const response = await fetch('/api/tasks');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
    { ttl: 30 * 1000 } // 30 seconds cache for tasks
  );

  // Apply optimistic updates to tasks
  const getOptimisticTasks = useCallback((): Task[] => {
    if (!tasks) return [];

    return tasks.map(task => {
      const optimisticUpdate = optimisticUpdates.get(task.id);
      if (optimisticUpdate) {
        return {
          ...task,
          status: optimisticUpdate.newStatus as Task['status'],
          updatedAt: new Date().toISOString()
        };
      }
      return task;
    });
  }, [tasks, optimisticUpdates]);

  // Update task status with optimistic UI and improved error handling
  const updateTaskStatus = useCallback(async (
    taskId: string,
    newStatus: Task['status']
  ): Promise<boolean> => {
    const task = tasks?.find(t => t.id === taskId);
    if (!task) {
      console.error(`Task ${taskId} not found in local state`);
      return false;
    }

    const originalStatus = task.status;

    // Don't update if status is the same
    if (originalStatus === newStatus) {
      console.log(`Task ${taskId} already has status ${newStatus}`);
      return true;
    }

    // Apply optimistic update immediately
    const optimisticUpdate: OptimisticUpdate = {
      taskId,
      originalStatus,
      newStatus,
      timestamp: Date.now()
    };

    setOptimisticUpdates(prev => new Map(prev).set(taskId, optimisticUpdate));

    // Clear any existing rollback timeout
    const existingTimeout = rollbackTimeouts.current.get(taskId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    try {
      console.log(`Updating task ${taskId} from ${originalStatus} to ${newStatus}`);

      // Make API call with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const updatedTask = await response.json();
      console.log(`Task ${taskId} updated successfully:`, updatedTask);

      // Success - remove optimistic update and refresh data
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(taskId);
        return newMap;
      });

      // Refresh cache in background
      setTimeout(() => {
        invalidate();
        refetch();
      }, 100);

      return true;

    } catch (error) {
      console.error(`Task status update failed for ${taskId}:`, error);

      // Determine error type for better user feedback
      let errorMessage = 'Failed to update task status';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Update timed out - please try again';
        } else if (error.message.includes('Unauthorized')) {
          errorMessage = 'Not authorized to update this task';
        } else if (error.message.includes('not found')) {
          errorMessage = 'Task not found or was deleted';
        } else if (error.message.includes('Invalid status')) {
          errorMessage = 'Invalid status value';
        } else {
          errorMessage = error.message;
        }
      }

      // Set rollback timeout with error context
      const rollbackTimeout = setTimeout(() => {
        console.log(`Rolling back optimistic update for task ${taskId}`);
        setOptimisticUpdates(prev => {
          const newMap = new Map(prev);
          newMap.delete(taskId);
          return newMap;
        });
        rollbackTimeouts.current.delete(taskId);

        // Show user-friendly error notification
        if (typeof window !== 'undefined') {
          console.error(`Task update failed: ${errorMessage}`);
        }
      }, 5000); // Longer timeout for better UX

      rollbackTimeouts.current.set(taskId, rollbackTimeout);

      return false;
    }
  }, [tasks, invalidate, refetch]);

  // Manually rollback an optimistic update
  const rollbackUpdate = useCallback((taskId: string) => {
    setOptimisticUpdates(prev => {
      const newMap = new Map(prev);
      newMap.delete(taskId);
      return newMap;
    });

    const timeout = rollbackTimeouts.current.get(taskId);
    if (timeout) {
      clearTimeout(timeout);
      rollbackTimeouts.current.delete(taskId);
    }
  }, []);

  // Retry a failed update
  const retryUpdate = useCallback(async (taskId: string): Promise<boolean> => {
    const optimisticUpdate = optimisticUpdates.get(taskId);
    if (!optimisticUpdate) return false;

    // Clear the current optimistic update
    rollbackUpdate(taskId);

    // Retry the update
    return updateTaskStatus(taskId, optimisticUpdate.newStatus as Task['status']);
  }, [optimisticUpdates, rollbackUpdate, updateTaskStatus]);

  // Get pending updates (for showing retry UI)
  const getPendingUpdates = useCallback((): OptimisticUpdate[] => {
    return Array.from(optimisticUpdates.values());
  }, [optimisticUpdates]);

  // Check if a task has a pending update
  const hasPendingUpdate = useCallback((taskId: string): boolean => {
    return optimisticUpdates.has(taskId);
  }, [optimisticUpdates]);

  // Bulk status update for multiple tasks
  const updateMultipleTaskStatus = useCallback(async (
    updates: Array<{ taskId: string; newStatus: Task['status'] }>
  ): Promise<{ success: string[]; failed: string[] }> => {
    const results = await Promise.allSettled(
      updates.map(({ taskId, newStatus }) => updateTaskStatus(taskId, newStatus))
    );

    const success: string[] = [];
    const failed: string[] = [];

    results.forEach((result, index) => {
      const taskId = updates[index].taskId;
      if (result.status === 'fulfilled' && result.value) {
        success.push(taskId);
      } else {
        failed.push(taskId);
      }
    });

    return { success, failed };
  }, [updateTaskStatus]);

  return {
    tasks: getOptimisticTasks(),
    isLoading,
    error,
    updateTaskStatus,
    rollbackUpdate,
    retryUpdate,
    getPendingUpdates,
    hasPendingUpdate,
    updateMultipleTaskStatus,
    refetch
  };
}

// Hook for individual task operations
export function useTaskOperations() {
  const { updateTaskStatus, hasPendingUpdate } = useOptimisticTasks();

  const moveTask = useCallback(async (
    taskId: string,
    fromStatus: Task['status'],
    toStatus: Task['status']
  ) => {
    // Immediate UI feedback
    const success = await updateTaskStatus(taskId, toStatus);

    if (!success) {
      // Show error toast or notification
      console.error(`Failed to move task from ${fromStatus} to ${toStatus}`);
    }

    return success;
  }, [updateTaskStatus]);

  return {
    moveTask,
    hasPendingUpdate,
    updateTaskStatus
  };
}
