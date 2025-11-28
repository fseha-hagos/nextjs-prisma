import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

// GET - List all organizations for the current user
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

    // Get user's organizations from database
    const memberships = await prisma.organizationMember.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        organization: true,
      },
    });

    const organizations = memberships.map(m => m.organization);

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

    // Create organization using Better Auth
    const result = await auth.api.createOrganization({
      body: {
        name,
        slug,
      },
      headers: req.headers,
    });

    // Better Auth returns the organization directly or in a response object
    const organization = result || (result as any)?.response || (result as any)?.data;
    return NextResponse.json(organization);
  } catch (error: any) {
    console.error('Failed to create organization:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create organization' },
      { status: 500 }
    );
  }
}

