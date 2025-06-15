import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Enhanced Prisma client initialization with better error handling
function createPrismaClient(): PrismaClient {
  try {
    console.log('🔄 Initializing Prisma client...');

    // Check if DATABASE_URL is available
    if (!process.env.DATABASE_URL) {
      const error = 'DATABASE_URL environment variable is not set';
      console.error('❌', error);
      throw new Error(error);
    }

    console.log('✅ DATABASE_URL found, creating PrismaClient...');

    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      errorFormat: 'pretty',
    });

    console.log('✅ Prisma client created successfully');

    // Test that the client has the expected methods
    if (!client.user || typeof client.user.findMany !== 'function') {
      throw new Error('Prisma client missing expected models - run npx prisma generate');
    }

    console.log('✅ Prisma client validation passed');
    return client;
  } catch (error) {
    console.error('❌ Failed to initialize Prisma client:', error);
    throw error;
  }
}

// Lazy initialization function
function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  try {
    const client = createPrismaClient();

    // Store in global for development hot reloading
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = client;
    }

    return client;
  } catch (error) {
    console.error('❌ Critical error: Failed to create Prisma client instance:', error);

    // Create a proxy that throws meaningful errors for any property access
    return new Proxy({} as PrismaClient, {
      get(_, prop) {
        const errorMsg = `Prisma client not initialized: Cannot access '${String(prop)}'. Original error: ${error}`;
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
      }
    });
  }
}

// Export the prisma client using lazy initialization
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    const client = getPrismaClient();
    const value = (client as any)[prop];

    if (typeof value === 'function') {
      return value.bind(client);
    }

    return value;
  }
});

// Export a function to test the connection
export async function testPrismaConnection(): Promise<boolean> {
  try {
    const client = getPrismaClient();
    await client.$connect();
    await client.$disconnect();
    return true;
  } catch (error) {
    console.error('❌ Prisma connection test failed:', error);
    return false;
  }
}

// Export a function to get the raw client (for debugging)
export function getRawPrismaClient(): PrismaClient {
  return getPrismaClient();
}
