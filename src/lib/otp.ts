import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export type OTPType = 'EMAIL_VERIFICATION' | 'PASSWORD_CHANGE' | 'ACCOUNT_RECOVERY';

interface OTPResult {
  success: boolean;
  otp?: string;
  error?: string;
}

interface OTPVerificationResult {
  success: boolean;
  error?: string;
}

// Generate a 6-digit numeric OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Hash OTP for secure storage
export async function hashOTP(otp: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(otp, saltRounds);
}

// Verify OTP against hash
export async function verifyOTP(otp: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(otp, hash);
}

// Create and store OTP in database
export async function createOTP(
  email: string, 
  type: OTPType = 'EMAIL_VERIFICATION'
): Promise<OTPResult> {
  try {
    // Check rate limiting - max 3 attempts per 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    const recentOTPs = await prisma.oTPVerification.count({
      where: {
        email: email.toLowerCase(),
        type,
        createdAt: {
          gte: fifteenMinutesAgo
        }
      }
    });

    if (recentOTPs >= 3) {
      return {
        success: false,
        error: 'Too many OTP requests. Please wait 15 minutes before requesting again.'
      };
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    
    // Set expiration to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Invalidate any existing OTPs for this email and type
    await prisma.oTPVerification.updateMany({
      where: {
        email: email.toLowerCase(),
        type,
        isUsed: false
      },
      data: {
        isUsed: true
      }
    });

    // Create new OTP record
    await prisma.oTPVerification.create({
      data: {
        email: email.toLowerCase(),
        otpHash,
        type,
        expiresAt,
        attempts: 0,
        isUsed: false
      }
    });

    console.log(`OTP created for ${email} (type: ${type}): ${otp}`);
    
    return {
      success: true,
      otp
    };

  } catch (error) {
    console.error('Error creating OTP:', error);
    return {
      success: false,
      error: 'Failed to generate OTP. Please try again.'
    };
  }
}

// Verify OTP from user input
export async function verifyOTPCode(
  email: string,
  otpCode: string,
  type: OTPType = 'EMAIL_VERIFICATION'
): Promise<OTPVerificationResult> {
  try {
    // Find the most recent unused OTP for this email and type
    const otpRecord = await prisma.oTPVerification.findFirst({
      where: {
        email: email.toLowerCase(),
        type,
        isUsed: false,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!otpRecord) {
      return {
        success: false,
        error: 'Invalid or expired OTP. Please request a new one.'
      };
    }

    // Check if too many attempts
    if (otpRecord.attempts >= 3) {
      // Mark as used to prevent further attempts
      await prisma.oTPVerification.update({
        where: { id: otpRecord.id },
        data: { isUsed: true }
      });

      return {
        success: false,
        error: 'Too many failed attempts. Please request a new OTP.'
      };
    }

    // Verify the OTP
    const isValid = await verifyOTP(otpCode, otpRecord.otpHash);

    if (!isValid) {
      // Increment attempt counter
      await prisma.oTPVerification.update({
        where: { id: otpRecord.id },
        data: { 
          attempts: otpRecord.attempts + 1 
        }
      });

      const remainingAttempts = 3 - (otpRecord.attempts + 1);
      return {
        success: false,
        error: `Invalid OTP. ${remainingAttempts} attempts remaining.`
      };
    }

    // OTP is valid - mark as used
    await prisma.oTPVerification.update({
      where: { id: otpRecord.id },
      data: { isUsed: true }
    });

    // If this is email verification, update user's email verification status
    if (type === 'EMAIL_VERIFICATION') {
      await prisma.user.updateMany({
        where: { 
          email: email.toLowerCase() 
        },
        data: { 
          isEmailVerified: true,
          emailVerified: new Date()
        }
      });
    }

    console.log(`OTP verified successfully for ${email} (type: ${type})`);

    return {
      success: true
    };

  } catch (error) {
    console.error('Error verifying OTP:', error);
    return {
      success: false,
      error: 'Failed to verify OTP. Please try again.'
    };
  }
}

// Clean up expired OTPs (should be run periodically)
export async function cleanupExpiredOTPs(): Promise<void> {
  try {
    const result = await prisma.oTPVerification.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isUsed: true }
        ]
      }
    });

    console.log(`Cleaned up ${result.count} expired/used OTP records`);
  } catch (error) {
    console.error('Error cleaning up OTPs:', error);
  }
}

// Check if user's email is verified
export async function isEmailVerified(email: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { isEmailVerified: true }
    });

    return user?.isEmailVerified || false;
  } catch (error) {
    console.error('Error checking email verification status:', error);
    return false;
  }
}

// Get OTP verification status for debugging
export async function getOTPStatus(email: string, type: OTPType = 'EMAIL_VERIFICATION') {
  try {
    const otpRecord = await prisma.oTPVerification.findFirst({
      where: {
        email: email.toLowerCase(),
        type,
        isUsed: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!otpRecord) {
      return { exists: false };
    }

    const isExpired = otpRecord.expiresAt < new Date();
    const timeRemaining = Math.max(0, otpRecord.expiresAt.getTime() - Date.now());

    return {
      exists: true,
      isExpired,
      attempts: otpRecord.attempts,
      timeRemaining: Math.ceil(timeRemaining / 1000), // seconds
      createdAt: otpRecord.createdAt
    };
  } catch (error) {
    console.error('Error getting OTP status:', error);
    return { exists: false, error: 'Failed to check OTP status' };
  }
}
