import { prisma } from "@/lib/prisma"

export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "TASK_ASSIGNED" | "MEETING_REMINDER" | "INVITATION"

export interface CreateNotificationData {
  title: string
  message: string
  type?: NotificationType
  actionUrl?: string
  userId: string
}

export async function createNotification(data: CreateNotificationData) {
  try {
    const notification = await prisma.notification.create({
      data: {
        title: data.title,
        message: data.message,
        type: data.type || "INFO",
        actionUrl: data.actionUrl,
        userId: data.userId,
        isRead: false
      }
    })

    return notification
  } catch (error) {
    console.error("Error creating notification:", error)
    throw error
  }
}

export async function createTaskAssignmentNotification(
  assigneeId: string,
  assignerName: string,
  taskTitle: string,
  taskId: string
) {
  return createNotification({
    title: "New Task Assigned",
    message: `${assignerName} assigned you a new task: "${taskTitle}"`,
    type: "TASK_ASSIGNED",
    actionUrl: `/dashboard/tasks?task=${taskId}`,
    userId: assigneeId
  })
}

export async function createMeetingReminderNotification(
  userId: string,
  meetingTitle: string,
  meetingTime: Date,
  meetingId: string
) {
  const timeString = meetingTime.toLocaleString()
  
  return createNotification({
    title: "Meeting Reminder",
    message: `"${meetingTitle}" is scheduled for ${timeString}`,
    type: "MEETING_REMINDER",
    actionUrl: `/dashboard/meetings?meeting=${meetingId}`,
    userId
  })
}

export async function createInvitationNotification(
  userId: string,
  inviterName: string,
  workspaceName: string
) {
  return createNotification({
    title: "Workspace Invitation",
    message: `${inviterName} invited you to join "${workspaceName}"`,
    type: "INVITATION",
    actionUrl: "/dashboard/team",
    userId
  })
}

export async function createTaskCompletionNotification(
  creatorId: string,
  completedByName: string,
  taskTitle: string,
  taskId: string
) {
  return createNotification({
    title: "Task Completed",
    message: `${completedByName} completed the task: "${taskTitle}"`,
    type: "SUCCESS",
    actionUrl: `/dashboard/tasks?task=${taskId}`,
    userId: creatorId
  })
}

export async function createMentionNotification(
  userId: string,
  mentionedByName: string,
  context: string,
  actionUrl: string
) {
  return createNotification({
    title: "You were mentioned",
    message: `${mentionedByName} mentioned you in ${context}`,
    type: "INFO",
    actionUrl,
    userId
  })
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    })

    return count
  } catch (error) {
    console.error("Error getting unread notification count:", error)
    return 0
  }
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  try {
    const notification = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId
      },
      data: {
        isRead: true
      }
    })

    return notification
  } catch (error) {
    console.error("Error marking notification as read:", error)
    throw error
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: {
        isRead: true
      }
    })

    return result
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    throw error
  }
}

export async function deleteOldNotifications(daysOld: number = 30) {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        },
        isRead: true
      }
    })

    console.log(`Deleted ${result.count} old notifications`)
    return result
  } catch (error) {
    console.error("Error deleting old notifications:", error)
    throw error
  }
}
