import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { generateInvitationToken } from "@/lib/utils"
import { sendEnhancedInvitationEmail, verifyEmailService } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session?.user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    if (!session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { emails } = body

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: "Email addresses are required" },
        { status: 400 }
      )
    }

    const results = []
    const errors = []
    const emailFailures = []

    // Verify email service before sending invitations
    console.log('Verifying email service before sending invitations...');
    const emailServiceCheck = await verifyEmailService();
    if (!emailServiceCheck.success) {
      console.error('Email service verification failed:', emailServiceCheck.error);
      return NextResponse.json(
        {
          error: "Email service not configured properly",
          details: emailServiceCheck.error,
          suggestion: "Please check your SMTP configuration in environment variables"
        },
        { status: 500 }
      );
    }
    console.log('✅ Email service verified successfully');

    for (const email of emails) {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email }
        })

        if (existingUser) {
          errors.push(`User with email ${email} already exists`)
          continue
        }

        // Check if invitation already exists
        const existingInvitation = await prisma.invitation.findFirst({
          where: {
            email,
            workspaceId: session.user.workspaceId,
            status: "PENDING"
          }
        })

        if (existingInvitation) {
          errors.push(`Invitation already sent to ${email}`)
          continue
        }

        // Create invitation
        const token = generateInvitationToken()
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

        const invitation = await prisma.invitation.create({
          data: {
            email,
            workspaceId: session.user.workspaceId,
            invitedById: session.user.id,
            token,
            expiresAt,
            status: "PENDING"
          }
        })

        // Get workspace name
        const workspace = await prisma.workspace.findUnique({
          where: { id: session.user.workspaceId }
        })

        // Send enhanced email invitation with dark theme
        let emailSent = false;
        let emailError = null;

        try {
          console.log(`Sending invitation email to ${email}...`);

          const emailResult = await sendEnhancedInvitationEmail(
            email,
            email.split('@')[0], // Use email prefix as recipient name
            session.user.name || session.user.email,
            workspace?.name || "Your Workspace",
            token
          );

          if (emailResult.success) {
            console.log(`✅ Invitation email sent successfully to ${email}`);
            emailSent = true;
          } else {
            console.error(`❌ Failed to send invitation email to ${email}:`, emailResult.error);
            emailError = emailResult.error;
            emailFailures.push({
              email,
              error: emailResult.error || 'Unknown email error'
            });
          }
        } catch (exception: any) {
          console.error(`❌ Exception sending invitation email to ${email}:`, exception);
          emailError = exception.message || 'Email sending exception';
          emailFailures.push({
            email,
            error: emailError
          });
        }

        results.push({
          email,
          invitationId: invitation.id,
          status: emailSent ? "sent" : "created",
          emailSent,
          emailError
        })

      } catch (error: unknown) {
        console.error(`Error inviting ${email}:`, error)
        errors.push(`Failed to invite ${email}`)
      }
    }

    const successfulEmails = results.filter(r => r.emailSent).length;
    const failedEmails = emailFailures.length;

    return NextResponse.json({
      message: `Processed ${results.length} invitation(s). ${successfulEmails} emails sent successfully.`,
      results,
      emailFailures: failedEmails.length > 0 ? emailFailures : undefined,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: results.length,
        emailsSent: successfulEmails,
        emailsFailed: failedEmails,
        invitationsCreated: results.length,
        processingErrors: errors.length
      }
    })

  } catch (error) {
    console.error("Invite users error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
