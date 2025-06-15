import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const meetings = await prisma.meeting.findMany({
      where: {
        workspaceId: session.user.workspaceId
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        startTime: "asc"
      }
    })

    // Transform meetings to match frontend interface
    const transformedMeetings = meetings.map(meeting => ({
      id: meeting.id,
      title: meeting.title,
      description: meeting.description,
      startTime: meeting.startTime.toISOString(),
      endTime: meeting.endTime.toISOString(),
      participants: meeting.participants.map(p => ({
        id: p.user.id,
        name: p.user.name || p.user.email,
        email: p.user.email
      })),
      summary: meeting.summary,
      createdAt: meeting.createdAt.toISOString(),
    }))

    return NextResponse.json(transformedMeetings)

  } catch (error) {
    console.error("Get meetings error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log("Received meeting data:", body)

    const { title, description, date, startTime, endTime, participants } = body

    if (!title || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Title, date, start time, and end time are required" },
        { status: 400 }
      )
    }

    // Combine date and time
    const startDateTime = new Date(`${date}T${startTime}`)
    const endDateTime = new Date(`${date}T${endTime}`)

    console.log("Parsed dates:", { startDateTime, endDateTime })

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return NextResponse.json(
        { error: "Invalid date or time format" },
        { status: 400 }
      )
    }

    if (startDateTime >= endDateTime) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      )
    }

    // Create meeting
    const meeting = await prisma.meeting.create({
      data: {
        title,
        description,
        startTime: startDateTime,
        endTime: endDateTime,
        createdById: session.user.id,
        workspaceId: session.user.workspaceId
      }
    })

    // Add participants
    if (participants && participants.length > 0) {
      await prisma.meetingParticipant.createMany({
        data: participants.map((participantId: string) => ({
          meetingId: meeting.id,
          userId: participantId
        }))
      })
    }

    // Fetch the complete meeting with participants
    const completeMeeting = await prisma.meeting.findUnique({
      where: { id: meeting.id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!completeMeeting) {
      throw new Error("Failed to fetch created meeting")
    }

    // Transform meeting to match frontend interface
    const transformedMeeting = {
      id: completeMeeting.id,
      title: completeMeeting.title,
      description: completeMeeting.description,
      startTime: completeMeeting.startTime.toISOString(),
      endTime: completeMeeting.endTime.toISOString(),
      participants: completeMeeting.participants.map(p => ({
        id: p.user.id,
        name: p.user.name || p.user.email,
        email: p.user.email
      })),
      summary: completeMeeting.summary,
      createdAt: completeMeeting.createdAt.toISOString(),
    }

    return NextResponse.json(transformedMeeting)

  } catch (error) {
    console.error("Create meeting error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
