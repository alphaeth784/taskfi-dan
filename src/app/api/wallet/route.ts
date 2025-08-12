import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        walletAddress: true,
        totalEarned: true,
        totalSpent: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Calculate in-app wallet balance (earnings - withdrawals)
    const transactions = await prisma.payment.findMany({
      where: {
        OR: [
          { payerId: session.user.id },
          { job: { applications: { some: { freelancerId: session.user.id, isAccepted: true } } } },
          { gig: { freelancerId: session.user.id } }
        ]
      },
      select: {
        amount: true,
        status: true,
        payerId: true,
        job: {
          select: {
            applications: {
              where: { freelancerId: session.user.id, isAccepted: true },
              select: { freelancerId: true }
            }
          }
        },
        gig: {
          select: { freelancerId: true }
        }
      }
    })

    let walletBalance = 0
    transactions.forEach(transaction => {
      if (transaction.status === 'RELEASED') {
        // Check if user is the recipient (freelancer)
        const isRecipient = transaction.job?.applications.length > 0 || 
                           transaction.gig?.freelancerId === session.user.id
        
        if (isRecipient) {
          walletBalance += transaction.amount
        }
      }
    });

    return NextResponse.json({
      wallet: {
        ...user,
        walletBalance: Math.max(0, walletBalance),
      }
    });
    } catch (error) {
    console.error('Wallet fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { amount, type } = await request.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    if (type === 'deposit') {
      // Handle deposit to in-app wallet
      // This would typically involve blockchain transactions
      // For now, we'll create a pending transaction record
      
      const transaction = await prisma.payment.create({
        data: {
          amount,
          currency: 'USDC',
          status: 'PENDING',
          payerId: session.user.id
        }
      })

      return NextResponse.json({ 
        message: 'Deposit initiated', 
        transactionId: transaction.id 
      })
    }

    if (type === 'withdraw') {
      // Handle withdrawal from in-app wallet
      // Check if user has sufficient balance
      const userWallet = await fetch(`${request.url}`, {
        method: 'GET',
        headers: { 'Authorization': request.headers.get('Authorization') || '' }
      }).then(res => res.json())

      if (userWallet.wallet.walletBalance < amount) {
        return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
      }

      // Create withdrawal transaction
      const transaction = await prisma.payment.create({
        data: {
          amount: -amount, // Negative for withdrawal
          currency: 'USDC',
          status: 'PENDING',
          payerId: session.user.id
        }
      })

      // In a real implementation, this would trigger blockchain withdrawal
      // For now, we'll mark it as completed
      await prisma.payment.update({
        where: { id: transaction.id },
        data: { status: 'RELEASED' }
      })

      return NextResponse.json({ 
        message: 'Withdrawal processed', 
        transactionId: transaction.id 
      })
    }

    return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    } catch (error) {
    console.error('Wallet transaction error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }


}