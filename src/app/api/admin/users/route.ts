import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-middleware'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const getUsersQuerySchema = z.object({
  role: z.enum(['FREELANCER', 'HIRER', 'ADMIN']).optional(),
  status: z.enum(['active', 'inactive', 'verified', 'unverified']).optional(),
  search: z.string().optional(),
  page: z.string().default('1'),
  limit: z.string().default('20'),
  sortBy: z.enum(['createdAt', 'name', 'username', 'totalEarned', 'totalSpent', 'rating']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

const updateUserSchema = z.object({
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  role: z.enum(['FREELANCER', 'HIRER', 'ADMIN']).optional(),
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
})

// GET /api/admin/users - Get all users with admin filters
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin()
    if (adminCheck) return adminCheck

    const { searchParams } = new URL(request.url)
    const query = getUsersQuerySchema.parse({
      role: searchParams.get('role'),
      status: searchParams.get('status'),
      search: searchParams.get('search'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    })

    const page = parseInt(query.page)
    const limit = Math.min(parseInt(query.limit), 100)
    const skip = (page - 1) * limit

    const where: any = {}

    if (query.role) {
      where.role = query.role
    }

    if (query.status === 'active') {
      where.isActive = true
    } else if (query.status === 'inactive') {
      where.isActive = false
    } else if (query.status === 'verified') {
      where.isVerified = true
    } else if (query.status === 'unverified') {
      where.isVerified = false
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { username: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { walletAddress: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const orderBy: any = {}
    orderBy[query.sortBy] = query.sortOrder

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          avatarUrl: true,
          bio: true,
          walletAddress: true,
          rating: true,
          isVerified: true,
          isActive: true,
          totalEarned: true,
          totalSpent: true,
          completedJobs: true,
          createdAt: true,
          lastActiveAt: true,
          _count: {
            select: {
              gigsAsFreelancer: true,
              jobsAsHirer: true,
              jobApplications: true,
              payments: true,
              reviews: true,
              notifications: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.user.count({ where }),
    ])

    // Calculate platform statistics
    const stats = await prisma.user.aggregate({
      where,
      _count: { id: true },
      _sum: {
        totalEarned: true,
        totalSpent: true,
        completedJobs: true,
      },
      _avg: {
        rating: true,
      },
    })

    const roleStats = await prisma.user.groupBy({
      by: ['role'],
      where,
      _count: { id: true },
    })

    const statusStats = {
      active: await prisma.user.count({ where: { ...where, isActive: true } }),
      inactive: await prisma.user.count({ where: { ...where, isActive: false } }),
      verified: await prisma.user.count({ where: { ...where, isVerified: true } }),
      unverified: await prisma.user.count({ where: { ...where, isVerified: false } }),
    }

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: {
        total: stats._count.id,
        totalEarnings: stats._sum.totalEarned || 0,
        totalSpending: stats._sum.totalSpent || 0,
        totalCompletedJobs: stats._sum.completedJobs || 0,
        averageRating: stats._avg.rating || 0,
        roleBreakdown: roleStats.reduce((acc, curr) => {
          acc[curr.role] = curr._count.id
          return acc
        }, {} as Record<string, number>),
        statusBreakdown: statusStats,
      },
    });
    } catch (error) {
    if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Internal server error" }, { status: 400 });
    }

    console.error('Admin get users error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/admin/users - Bulk update users
export async function PUT(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin()
    if (adminCheck) return adminCheck

    const body = await request.json()
    const { userIds, updates } = body

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "Internal server error" }, { status: 400 });
    }

    if (userIds.length > 100) {
      return NextResponse.json({ error: "Internal server error" }, { status: 400 });
    }

    const updateData = updateUserSchema.parse(updates)

    // Verify all users exist
    const existingUsers = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, role: true },
    })

    if (existingUsers.length !== userIds.length) {
      return NextResponse.json({ error: "Internal server error" }, { status: 404 });
    }

    // Don't allow changing admin roles unless there are other admins
    if (updateData.role && updateData.role !== 'ADMIN') {
      const adminUsers = existingUsers.filter(u => u.role === 'ADMIN')
      if (adminUsers.length > 0) {
        const remainingAdmins = await prisma.user.count({
          where: { 
            role: 'ADMIN', 
            id: { notIn: adminUsers.map(u => u.id) }
          }
        })

        if (remainingAdmins === 0) {
          return NextResponse.json({ error: "Internal server error" }, { status: 400 });
        }
      }
    }

    // Perform bulk update
    const updatedUsers = await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: updateData,
    })

    // Log admin action
    console.log(`Admin bulk update: ${updatedUsers.count} users updated`)

    return NextResponse.json({
      message: `Successfully updated ${updatedUsers.count} users`,
      updatedCount: updatedUsers.count,
    });
    } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
    return NextResponse.json({ error: "Internal server error" }, { status: 400 });
    }

    console.error('Admin bulk update users error:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
