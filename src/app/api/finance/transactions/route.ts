import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { verify } from '@/lib/auth'
import { toUpperCaseTR } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value
        const verifiedToken = token ? await verify(token) : null
        if (!verifiedToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url)
        const manifestId = searchParams.get('manifestId')
        const shipmentId = searchParams.get('shipmentId')
        const type = searchParams.get('type')
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        const where: any = {}
        if (manifestId) where.manifestId = manifestId
        if (shipmentId) where.shipmentId = shipmentId
        if (type) where.type = type
        
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            }
        }

        const transactions = await prisma.transaction.findMany({
            where,
            orderBy: { date: 'desc' },
            include: {
                manifest: { select: { name: true } },
                shipment: { select: { trackingNumber: true } }
            }
        })

        return NextResponse.json(transactions)
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching transactions' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value
        const verifiedToken = token ? await verify(token) : null
        if (!verifiedToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json()
        const { type, category, amount, currency, description, date, manifestId, shipmentId } = body

        if (!type || !amount || !currency) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const transaction = await prisma.transaction.create({
            data: {
                type,
                category: toUpperCaseTR(category),
                amount: parseFloat(amount),
                currency,
                description: toUpperCaseTR(description),
                date: date ? new Date(date) : new Date(),
                manifestId: manifestId || null,
                shipmentId: shipmentId || null
            }
        })

        return NextResponse.json(transaction)
    } catch (error) {
        return NextResponse.json({ error: 'Error creating transaction' }, { status: 500 })
    }
}
