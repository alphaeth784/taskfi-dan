import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, PermissionService } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
})

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
})

// GET /api/categories - Get all categories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const where = includeInactive ? {} : { isActive: true }

    const categories = await prisma.category.findMany({
      where,
      include: {
        _count: {
          select: {
            jobs: { where: { status: 'OPEN' } },
            gigs: { where: { status: 'ACTIVE' } },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/categories - Create new category (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!PermissionService.canManageCategories(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const categoryData = createCategorySchema.parse(body)

    // Check if category name already exists
    const existingCategory = await prisma.category.findUnique({
      where: { name: categoryData.name },
    })

    if (existingCategory) {
      return NextResponse.json({ error: "Internal server error" }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: categoryData,
    })

    return NextResponse.json({ category }, { status: 201 });
    } catch (error) {
    if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Internal server error" }, { status: 400 });
    }

    console.error('Create category error:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
