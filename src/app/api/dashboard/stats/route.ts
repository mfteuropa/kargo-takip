import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { verify } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    const verifiedToken = token ? await verify(token) : null

    if (!verifiedToken) {
        return NextResponse.json(
            { error: 'Yetkisiz erişim.' },
            { status: 401 }
        )
    }

    // İstatistikleri hesapla
    const totalShipments = await prisma.shipment.count()
    
    const activeShipments = await prisma.shipment.count({
        where: {
            currentStatus: {
                not: 'TESLIM_EDILDI'
            }
        }
    })

    const deliveredShipments = await prisma.shipment.count({
        where: {
            currentStatus: 'TESLIM_EDILDI'
        }
    })

    // Son eklenen 5 kargo
    const recentShipments = await prisma.shipment.findMany({
        take: 5,
        orderBy: {
            createdAt: 'desc'
        },
        include: {
            customer: true
        }
    })

    return NextResponse.json({
        totalShipments,
        activeShipments,
        deliveredShipments,
        recentShipments
    })

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Bir hata oluştu.' },
      { status: 500 }
    )
  }
}
