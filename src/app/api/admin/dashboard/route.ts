import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-middleware'
import { prisma } from '@/lib/prisma'

// GET /api/admin/dashboard - Get comprehensive platform statistics
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin()
    if (adminCheck) return adminCheck

    // Get date ranges for analytics
    const now = new Date()
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const lastDay = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Parallel queries for performance
    const [
      userStats,
      userGrowth,
      jobStats,
      gigStats,
      paymentStats,
      recentUsers,
      recentJobs,
      recentGigs,
      disputedPayments,
      topFreelancers,
      topHirers,
      categoryStats,
      platformHealth,
    ] = await Promise.all([
      // User statistics
      prisma.user.aggregate({
        _count: { id: true },
        _avg: { rating: true },
      }),

      // User growth analytics
      Promise.all([
        prisma.user.count({ where: { createdAt: { gte: last30Days } } }),
        prisma.user.count({ where: { createdAt: { gte: last7Days } } }),
        prisma.user.count({ where: { createdAt: { gte: lastDay } } }),
      ]),

      // Job statistics
      prisma.job.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { budget: true },
      }),

      // Gig statistics  
      prisma.gig.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { orderCount: true },
      }),

      // Payment statistics
      prisma.payment.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { amount: true },
      }),

      // Recent users (last 10)
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          isVerified: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Recent jobs (last 10)
      prisma.job.findMany({
        select: {
          id: true,
          title: true,
          budget: true,
          status: true,
          createdAt: true,
          hirer: {
            select: { name: true, username: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Recent gigs (last 10)
      prisma.gig.findMany({
        select: {
          id: true,
          title: true,
          status: true,
          rating: true,
          orderCount: true,
          createdAt: true,
          freelancer: {
            select: { name: true, username: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Disputed payments needing attention
      prisma.payment.findMany({
        where: { status: 'DISPUTED' },
        select: {
          id: true,
          amount: true,
          currency: true,
          disputeReason: true,
          createdAt: true,
          payer: {
            select: { name: true, username: true },
          },
          job: {
            select: { 
              title: true,
              freelancer: {
                select: { name: true, username: true },
              },
            },
          },
          gig: {
            select: { 
              title: true,
              freelancer: {
                select: { name: true, username: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      // Top freelancers by earnings
      prisma.user.findMany({
        where: { role: 'FREELANCER', isActive: true },
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
          rating: true,
          totalEarned: true,
          completedJobs: true,
          isVerified: true,
        },
        orderBy: { totalEarned: 'desc' },
        take: 10,
      }),

      // Top hirers by spending
      prisma.user.findMany({
        where: { role: 'HIRER', isActive: true },
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
          rating: true,
          totalSpent: true,
          isVerified: true,
        },
        orderBy: { totalSpent: 'desc' },
        take: 10,
      }),

      // Category popularity
      prisma.category.findMany({
        select: {
          id: true,
          name: true,
          icon: true,
          _count: {
            select: {
              jobs: true,
              gigs: true,
            },
          },
        },
        orderBy: {
          jobs: {
            _count: 'desc',
          },
        },
        take: 10,
      }),

      // Platform health metrics
      Promise.all([
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({ where: { isActive: false } }),
        prisma.user.count({ where: { isVerified: true } }),
        prisma.job.count({ where: { status: 'OPEN' } }),
        prisma.job.count({ where: { status: 'IN_PROGRESS' } }),
        prisma.gig.count({ where: { status: 'ACTIVE' } }),
        prisma.payment.count({ where: { status: 'ESCROW' } }),
        prisma.payment.count({ where: { status: 'DISPUTED' } }),
      ]),
    ])

    // Process user role breakdown
    const roleBreakdown = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    })

    // Calculate revenue and transaction volume
    const revenueStats = {
      totalVolume: paymentStats.reduce((sum, p) => sum + (p._sum.amount || 0), 0),
      totalTransactions: paymentStats.reduce((sum, p) => sum + p._count.id, 0),
      byStatus: paymentStats.reduce((acc, p) => {
        acc[p.status] = {
          count: p._count.id,
          volume: p._sum.amount || 0,
        }
        return acc
      }, {} as Record<string, { count: number; volume: number }>),
    }

    // Calculate job success rate
    const totalJobs = jobStats.reduce((sum, j) => sum + j._count.id, 0)
    const completedJobs = jobStats.find(j => j.status === 'COMPLETED')?._count.id || 0
    const jobSuccessRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0

    // Platform health score (0-100)
    const [
      activeUsers,
      inactiveUsers,
      verifiedUsers,
      openJobs,
      inProgressJobs,
      activeGigs,
      escrowPayments,
      disputedPayments_count,
    ] = platformHealth

    const totalUsers = activeUsers + inactiveUsers
    const healthScore = Math.round(
      (activeUsers / totalUsers) * 30 + // Active users (30%)
      (verifiedUsers / totalUsers) * 25 + // Verified users (25%)
      Math.min((openJobs + inProgressJobs) / 100, 1) * 20 + // Job activity (20%)
      Math.min(activeGigs / 50, 1) * 15 + // Gig activity (15%)
      Math.max(1 - (disputedPayments_count / Math.max(escrowPayments, 1)), 0) * 10 // Low disputes (10%)
    )

    return NextResponse.json({
      overview: {
        totalUsers: userStats._count.id,
        averageRating: userStats._avg.rating || 0,
        userGrowth: {
          last30Days: userGrowth[0],
          last7Days: userGrowth[1],
          lastDay: userGrowth[2],
        },
        roleBreakdown: roleBreakdown.reduce((acc, r) => {
          acc[r.role] = r._count.id
          return acc
        }, {} as Record<string, number>),
        healthScore,
      },
      jobs: {
        total: totalJobs,
        successRate: jobSuccessRate,
        byStatus: jobStats.reduce((acc, j) => {
          acc[j.status] = {
            count: j._count.id,
            budget: j._sum.budget || 0,
          }
          return acc
        }, {} as Record<string, { count: number; budget: number }>),
      },
      gigs: {
        total: gigStats.reduce((sum, g) => sum + g._count.id, 0),
        totalOrders: gigStats.reduce((sum, g) => sum + (g._sum.orderCount || 0), 0),
        byStatus: gigStats.reduce((acc, g) => {
          acc[g.status] = {
            count: g._count.id,
            orders: g._sum.orderCount || 0,
          }
          return acc
        }, {} as Record<string, { count: number; orders: number }>),
      },
      finance: revenueStats,
      recent: {
        users: recentUsers,
        jobs: recentJobs,
        gigs: recentGigs,
      },
      urgent: {
        disputedPayments,
        disputeCount: disputedPayments.length,
      },
      leaderboards: {
        topFreelancers,
        topHirers,
      },
      categories: categoryStats,
      health: {
        activeUsers,
        inactiveUsers,
        verifiedUsers,
        openJobs,
        inProgressJobs,
        activeGigs,
        escrowPayments,
        disputedPayments: disputedPayments_count,
        score: healthScore,
      },
    })
    } catch (error) {
    console.error('Admin dashboard error:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
