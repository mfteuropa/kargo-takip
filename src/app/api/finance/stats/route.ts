import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { verify } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value
        const verifiedToken = token ? await verify(token) : null
        if (!verifiedToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url)
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        const where: any = {}
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            }
        }

        const transactions = await prisma.transaction.findMany({
            where,
            select: {
                type: true,
                amount: true,
                currency: true
            }
        })

        // Group by currency and type
        const stats = {
            TRY: { income: 0, expense: 0, balance: 0 },
            EUR: { income: 0, expense: 0, balance: 0 },
            USD: { income: 0, expense: 0, balance: 0 }
        }

        transactions.forEach(t => {
            const currency = t.currency as keyof typeof stats
            if (stats[currency]) {
                if (t.type === 'INCOME') {
                    stats[currency].income += t.amount
                } else {
                    stats[currency].expense += t.amount
                }
            }
        })

        // Calculate balances
        Object.keys(stats).forEach(curr => {
            const c = curr as keyof typeof stats
            stats[c].balance = stats[c].income - stats[c].expense
        })

        return NextResponse.json(stats)
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching stats' }, { status: 500 })
    }
}
