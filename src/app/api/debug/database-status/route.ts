import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_request: NextRequest) {
  try {
    console.log("=== DATABASE STATUS CHECK ===");
    
    const status = {
      timestamp: new Date().toISOString(),
      title: "📊 Database Status Report",
      
      connection: {
        status: "unknown",
        error: null
      },
      
      userStats: {
        totalUsers: 0,
        verifiedUsers: 0,
        usersWithPasswords: 0,
        recentUsers: [] as any[]
      },
      
      workspaceStats: {
        totalWorkspaces: 0,
        workspacesWithUsers: 0
      },
      
      sampleData: {
        users: [] as any[],
        workspaces: [] as any[]
      }
    };

    // Test database connection
    try {
      await prisma.$connect();
      status.connection.status = "✅ Connected";
      
      // Get user statistics
      const totalUsers = await prisma.user.count();
      const verifiedUsers = await prisma.user.count({
        where: {
          OR: [
            { emailVerified: { not: null } },
            { isEmailVerified: true }
          ]
        }
      });
      const usersWithPasswords = await prisma.user.count({
        where: {
          password: { not: null }
        }
      });
      
      status.userStats = {
        totalUsers,
        verifiedUsers,
        usersWithPasswords,
        recentUsers: []
      };
      
      // Get recent users
      const recentUsers = await prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          isEmailVerified: true,
          isTemporaryPassword: true,
          role: true,
          workspaceId: true,
          createdAt: true
        }
      });
      
      status.userStats.recentUsers = recentUsers;
      
      // Get workspace statistics
      const totalWorkspaces = await prisma.workspace.count();
      const workspacesWithUsers = await prisma.workspace.count({
        where: {
          users: {
            some: {}
          }
        }
      });
      
      status.workspaceStats = {
        totalWorkspaces,
        workspacesWithUsers
      };
      
      // Get sample workspaces
      const sampleWorkspaces = await prisma.workspace.findMany({
        take: 3,
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          _count: {
            select: {
              users: true
            }
          }
        }
      });
      
      status.sampleData = {
        users: recentUsers.map(user => ({
          id: user.id,
          email: user.email,
          name: user.name,
          hasEmailVerified: !!user.emailVerified,
          isEmailVerified: user.isEmailVerified,
          isTemporaryPassword: user.isTemporaryPassword,
          role: user.role,
          hasWorkspace: !!user.workspaceId,
          createdAt: user.createdAt
        })),
        workspaces: sampleWorkspaces
      };
      
      console.log(`✅ Database status: ${totalUsers} users, ${verifiedUsers} verified, ${totalWorkspaces} workspaces`);
      
    } catch (error: any) {
      status.connection.status = "❌ Failed";
      status.connection.error = error.message;
      console.error("❌ Database connection failed:", error);
    } finally {
      await prisma.$disconnect();
    }

    return NextResponse.json(status);

  } catch (error) {
    console.error("❌ Database status check error:", error);
    return NextResponse.json({
      status: "❌ CHECK FAILED",
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
