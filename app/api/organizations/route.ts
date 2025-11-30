import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

// GET - List organizations the current user is a member of
// Returns empty array if user has no memberships (frontend will show create/join page)
export async function GET(req: NextRequest) {
  try {
    // Pass request headers directly - Better Auth will extract cookies from them
    const session = await auth.api.getSession({ 
      headers: req.headers,
    });
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get only organizations where the user is a member
    // Order by creation date to ensure consistent first organization
    const memberships = await prisma.member.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        organization: true,
      },
      orderBy: {
        createdAt: 'asc', // First organization joined becomes default
      },
    });

    console.log('User ID:', session.user.id);
    console.log('Memberships found:', memberships.length);
    console.log('Memberships:', JSON.stringify(memberships, null, 2));

    const organizations = memberships.map(m => m.organization);

    console.log('Organizations to return:', organizations.length);
    return NextResponse.json(organizations);
  } catch (error: any) {
    console.error('Failed to fetch organizations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}

// POST - Create a new organization
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ 
      headers: req.headers,
    });
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    // Generate a slug from the name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 50);

    // Create organization and member atomically using a transaction
    // This ensures data integrity: if member creation fails, organization creation is rolled back
    const result = await prisma.$transaction(async (tx) => {
      // Create organization manually using Prisma to avoid Better Auth's activeOrganizationId issue
      // Better Auth tries to set activeOrganizationId on Session which doesn't exist in our schema
      const organization = await tx.organization.create({
        data: {
          name,
          slug,
        },
      });

      // Add the creator as a member with 'owner' role
      // If this fails, the organization creation above will be rolled back
      await tx.member.create({
        data: {
          userId: session.user.id,
          organizationId: organization.id,
          role: 'owner',
        },
      });

      return organization;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to create organization:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create organization' },
      { status: 500 }
    );
  }
}

