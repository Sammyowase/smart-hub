import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Create sample notifications for testing
    const sampleNotifications = [
      {
        title: "Welcome to SmartHub!",
        message: "Your account has been set up successfully. Start by creating your first task.",
        type: "SUCCESS",
        actionUrl: "/dashboard/tasks",
        userId: session.user.id
      },
      {
        title: "Task Assigned",
        message: "You have been assigned a new task: 'Complete dashboard improvements'",
        type: "TASK_ASSIGNED",
        actionUrl: "/dashboard/tasks",
        userId: session.user.id
      },
      {
        title: "Meeting Reminder",
        message: "Team standup meeting starts in 15 minutes",
        type: "MEETING_REMINDER",
        actionUrl: "/dashboard/meetings",
        userId: session.user.id
      },
      {
        title: "Performance Update",
        message: "Your dashboard performance has improved by 60%! Great work on the optimizations.",
        type: "INFO",
        actionUrl: "/dashboard/analytics",
        userId: session.user.id
      },
      {
        title: "AI Enhancement Ready",
        message: "AI task description enhancement is now available. Try it on your next task!",
        type: "INFO",
        actionUrl: "/dashboard/tasks",
        userId: session.user.id
      }
    ];

    // Create notifications in database
    const createdNotifications = await prisma.notification.createMany({
      data: sampleNotifications
    });

    console.log(`Created ${createdNotifications.count} test notifications for user ${session.user.id}`);

    return NextResponse.json({
      success: true,
      message: `Created ${createdNotifications.count} test notifications`,
      count: createdNotifications.count
    });

  } catch (error) {
    console.error("Create test notifications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Delete all notifications for the user
    const deletedNotifications = await prisma.notification.deleteMany({
      where: {
        userId: session.user.id
      }
    });

    console.log(`Deleted ${deletedNotifications.count} notifications for user ${session.user.id}`);

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedNotifications.count} notifications`,
      count: deletedNotifications.count
    });

  } catch (error) {
    console.error("Delete test notifications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
