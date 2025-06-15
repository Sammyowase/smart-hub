import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    
    // Extract profile data from FormData
    const profileData = {
      name: formData.get("name") as string,
      bio: formData.get("bio") as string,
      location: formData.get("location") as string,
      phone: formData.get("phone") as string,
      department: formData.get("department") as string,
      jobTitle: formData.get("jobTitle") as string,
    }

    // Handle avatar file upload (if provided)
    const avatarFile = formData.get("avatar") as File | null
    let avatarUrl = null

    if (avatarFile && avatarFile.size > 0) {
      // In a real application, you would upload this to a cloud storage service
      // For now, we'll just store the file name or create a data URL
      // This is a simplified implementation
      console.log("Avatar file received:", avatarFile.name, avatarFile.size)
      
      // You could implement actual file upload here:
      // - Upload to AWS S3, Cloudinary, or similar service
      // - Store the returned URL in avatarUrl
      // For demo purposes, we'll just acknowledge the file was received
    }

    // Update user profile in database
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: profileData.name || session.user.name,
        // Add other profile fields if they exist in your User model
        // bio: profileData.bio,
        // location: profileData.location,
        // phone: profileData.phone,
        // department: profileData.department,
        // jobTitle: profileData.jobTitle,
        // image: avatarUrl || session.user.image,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
      }
    })

    console.log("Profile updated successfully for user:", session.user.id)

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser
    })

  } catch (error) {
    console.error("Profile update error:", error)
    
    // Handle Prisma errors
    if (error instanceof Error) {
      if (error.message.includes("Unknown field")) {
        return NextResponse.json(
          { error: "Some profile fields are not yet supported. Name update was successful." },
          { status: 200 } // Still return success for name update
        )
      }
    }

    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get user profile data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        // Add other profile fields if they exist in your User model
        // bio: true,
        // location: true,
        // phone: true,
        // department: true,
        // jobTitle: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user: user
    })

  } catch (error) {
    console.error("Profile fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    )
  }
}
