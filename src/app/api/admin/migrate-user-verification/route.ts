import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    console.log("=== MIGRATING EXISTING USERS FOR EMAIL VERIFICATION ===");
    
    // Get all users where isEmailVerified is null or undefined
    const usersToMigrate = await prisma.user.findMany({
      where: {
        OR: [
          { isEmailVerified: null },
          { isEmailVerified: { equals: undefined } }
        ]
      },
      select: {
        id: true,
        email: true,
        name: true,
        isEmailVerified: true,
        emailVerified: true,
        createdAt: true
      }
    });

    console.log(`Found ${usersToMigrate.length} users to migrate`);

    const migrationResults = {
      timestamp: new Date().toISOString(),
      status: "🔄 USER VERIFICATION MIGRATION",
      usersFound: usersToMigrate.length,
      migrationResults: [],
      summary: {
        migrated: 0,
        alreadySet: 0,
        errors: 0
      }
    };

    // Migrate each user
    for (const user of usersToMigrate) {
      try {
        // For existing users (created before email verification system), 
        // treat them as verified to maintain backward compatibility
        const shouldBeVerified = true; // Legacy users are considered verified
        
        const updateResult = await prisma.user.update({
          where: { id: user.id },
          data: {
            isEmailVerified: shouldBeVerified,
            emailVerified: user.emailVerified || new Date() // Set verification date if not already set
          }
        });

        migrationResults.migrationResults.push({
          userId: user.id,
          email: user.email,
          status: "✅ MIGRATED",
          action: `Set isEmailVerified to ${shouldBeVerified}`,
          previousValue: user.isEmailVerified,
          newValue: shouldBeVerified
        });

        migrationResults.summary.migrated++;
        console.log(`Migrated user ${user.email} - set isEmailVerified to ${shouldBeVerified}`);

      } catch (error) {
        migrationResults.migrationResults.push({
          userId: user.id,
          email: user.email,
          status: "❌ ERROR",
          error: error instanceof Error ? error.message : "Unknown error"
        });

        migrationResults.summary.errors++;
        console.error(`Failed to migrate user ${user.email}:`, error);
      }
    }

    // Also check for users who might have isEmailVerified as false but should be verified
    const potentiallyMismarkedUsers = await prisma.user.findMany({
      where: {
        isEmailVerified: false,
        emailVerified: { not: null } // They have an emailVerified date but isEmailVerified is false
      },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
        emailVerified: true
      }
    });

    if (potentiallyMismarkedUsers.length > 0) {
      console.log(`Found ${potentiallyMismarkedUsers.length} potentially mismarked users`);
      
      for (const user of potentiallyMismarkedUsers) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { isEmailVerified: true }
          });

          migrationResults.migrationResults.push({
            userId: user.id,
            email: user.email,
            status: "✅ CORRECTED",
            action: "Fixed mismarked verified user",
            previousValue: false,
            newValue: true
          });

          migrationResults.summary.migrated++;
          console.log(`Corrected user ${user.email} - had emailVerified date but isEmailVerified was false`);

        } catch (error) {
          migrationResults.migrationResults.push({
            userId: user.id,
            email: user.email,
            status: "❌ ERROR",
            error: error instanceof Error ? error.message : "Unknown error"
          });

          migrationResults.summary.errors++;
        }
      }
    }

    // Final verification count
    const verifiedCount = await prisma.user.count({
      where: { isEmailVerified: true }
    });

    const unverifiedCount = await prisma.user.count({
      where: { isEmailVerified: false }
    });

    const nullCount = await prisma.user.count({
      where: { isEmailVerified: null }
    });

    migrationResults.finalCounts = {
      verified: verifiedCount,
      unverified: unverifiedCount,
      null: nullCount,
      total: verifiedCount + unverifiedCount + nullCount
    };

    migrationResults.status = migrationResults.summary.errors === 0 
      ? "✅ MIGRATION COMPLETED SUCCESSFULLY" 
      : "⚠️ MIGRATION COMPLETED WITH ERRORS";

    console.log("Migration completed:", migrationResults.summary);

    return NextResponse.json(migrationResults);

  } catch (error) {
    console.error("❌ Migration error:", error);
    return NextResponse.json({
      status: "❌ MIGRATION FAILED",
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
