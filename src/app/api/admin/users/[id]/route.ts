import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-middleware'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  username: z.string().min(3).max(30).optional(),
  email: z.string().email().optional(),
  bio: z.string().max(500).optional(),
  role: z.enum(['FREELANCER', 'HIRER', 'ADMIN']).optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  avatarUrl: z.string().url().optional(),
  categories: z.array(z.string()).max(5).optional(),
})

// GET /api/admin/users/[id] - Get detailed user information
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const adminCheck = await requireAdmin()
    if (adminCheck) return adminCheck

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        gigsAsFreelancer: {
          select: {
            id: true,
            title: true,
            status: true,
            rating: true,
            orderCount: true,
            packages: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        jobsAsHirer: {
          select: {
            id: true,
            title: true,
            status: true,
            budget: true,
            createdAt: true,
            _count: {
              select: { applications: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        jobApplications: {
          select: {
            id: true,
            isAccepted: true,
            proposedBudget: true,
            createdAt: true,
            job: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        payments: {
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            createdAt: true,
            job: {
              select: { id: true, title: true },
            },
            gig: {
              select: { id: true, title: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            comment: true,
            isPublic: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        receivedReviews: {
          select: {
            id: true,
            rating: true,
            comment: true,
            isPublic: true,
            createdAt: true,
            target: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        notifications: {
          select: {
            id: true,
            type: true,
            title: true,
            message: true,
            isRead: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: {
          select: {
            gigsAsFreelancer: true,
            jobsAsHirer: true,
            jobApplications: true,
            payments: true,
            reviews: true,
            receivedReviews: true,
            sentMessages: true,
            receivedMessages: true,
            notifications: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    // Calculate additional statistics
    const paymentStats = {
      totalPayments: user.payments.length,
      totalAmount: user.payments.reduce((sum, p) => sum + p.amount, 0),
      pendingPayments: user.payments.filter(p => p.status === 'PENDING').length,
      escrowPayments: user.payments.filter(p => p.status === 'ESCROW').length,
      releasedPayments: user.payments.filter(p => p.status === 'RELEASED').length,
      disputedPayments: user.payments.filter(p => p.status === 'DISPUTED').length,
    };

    const reviewStats = {
      givenReviews: user.reviews.length,
      receivedReviews: user.receivedReviews.length,
      averageGivenRating: user.reviews.length > 0 
        ? user.reviews.reduce((sum, r) => sum + r.rating, 0) / user.reviews.length 
        : 0,
      averageReceivedRating: user.receivedReviews.length > 0 
        ? user.receivedReviews.reduce((sum, r) => sum + r.rating, 0) / user.receivedReviews.length 
        : user.rating,
    };

    const activityStats = {
      unreadNotifications: user.notifications.filter(n => !n.isRead).length,
      recentActivity: user.lastActiveAt,
      accountAge: Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)), // days
    };

    return NextResponse.json({
      user,
      stats: {
        payments: paymentStats,
        reviews: reviewStats,
        activity: activityStats,
        counts: user._count,
      },
    });
  } catch (error) {
    console.error('Admin get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/[id] - Update user details
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const adminCheck = await requireAdmin()
    if (adminCheck) return adminCheck

    const body = await request.json()
    const updateData = updateUserSchema.parse(body)

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true, username: true, email: true },
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    // Check for role change restrictions
    if (updateData.role && updateData.role !== existingUser.role) {
      // If changing from ADMIN, ensure there are other admins
      if (existingUser.role === 'ADMIN') {
        const adminCount = await prisma.user.count({
          where: { role: 'ADMIN', id: { not: params.id } }
        })

        if (adminCount === 0) {
          return NextResponse.json(
            { error: 'Cannot remove admin role from the last administrator' },
            { status: 400 }
          )
        }
      }
    // Check for username uniqueness
    if (updateData.username && updateData.username !== existingUser.username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username: updateData.username },
      })

      if (existingUsername) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 400 }
        )
      }
    // Check for email uniqueness
    if (updateData.email && updateData.email !== existingUser.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: updateData.email },
      })

      if (existingEmail) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        )
      }
    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        avatarUrl: true,
        bio: true,
        isActive: true,
        isVerified: true,
        categories: true,
        rating: true,
        totalEarned: true,
        totalSpent: true,
        completedJobs: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Create notification for user about admin changes
    await prisma.notification.create({
      data: {
        userId: params.id,
        type: 'ACCOUNT_UPDATED',
        title: 'Account Updated by Admin',
        message: 'Your account details have been updated by an administrator.',
        data: {
          changes: Object.keys(updateData),
          updatedAt: new Date().toISOString(),
        },
      },
    })

    // Log admin action
    console.log(`Admin updated user ${params.id}:`, updateData);

    return NextResponse.json({ 
      user: updatedUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Admin update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Deactivate user (soft delete)
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const adminCheck = await requireAdmin()
    if (adminCheck) return adminCheck

    // Check if user exists and is not an admin
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true, isActive: true, username: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (user.role === 'ADMIN') {
      // Check if this is the last admin
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN', id: { not: params.id } }
      })

      if (adminCount === 0) {
        return NextResponse.json(
          { error: 'Cannot deactivate the last administrator' },
          { status: 400 }
        )
      }
    // Check for active jobs/gigs
    const activeJobs = await prisma.job.count({
      where: {
        OR: [
          { hirerId: params.id, status: { in: ['OPEN', 'IN_PROGRESS'] } },
          { freelancerId: params.id, status: 'IN_PROGRESS' },
        ],
      },
    })

    const activeGigs = await prisma.gig.count({
      where: {
        freelancerId: params.id,
        status: 'ACTIVE',
      },
    })

    const activePayments = await prisma.payment.count({
      where: {
        payerId: params.id,
        status: { in: ['PENDING', 'ESCROW'] },
      },
    })

    if (activeJobs > 0 || activeGigs > 0 || activePayments > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot deactivate user with active jobs, gigs, or payments',
          details: {
            activeJobs,
            activeGigs,
            activePayments,
          }
        },
        { status: 400 }
      )
    // Soft delete - deactivate user
    const deactivatedUser = await prisma.$transaction(async (tx) => {
      // Deactivate user
      const updated = await tx.user.update({
        where: { id: params.id },
        data: { isActive: false },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          isActive: true,
        },
      })

      // Deactivate all user's gigs
      await tx.gig.updateMany({
        where: { freelancerId: params.id },
        data: { status: 'INACTIVE' },
      })

      // Cancel open jobs posted by user
      await tx.job.updateMany({
        where: { 
          hirerId: params.id, 
          status: 'OPEN' 
        },
        data: { status: 'CANCELLED' },
      })

      // Create notification
      await tx.notification.create({
        data: {
          userId: params.id,
          type: 'ACCOUNT_DEACTIVATED',
          title: 'Account Deactivated',
          message: 'Your account has been deactivated by an administrator.',
          data: {
            deactivatedAt: new Date().toISOString(),
          },
        },
      })

      return updated
    })

    console.log(`Admin deactivated user: ${user.username} (${params.id})`)

    return NextResponse.json({
      message: 'User deactivated successfully',
      user: deactivatedUser,
    })
  } catch (error) {
    console.error('Admin deactivate user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
