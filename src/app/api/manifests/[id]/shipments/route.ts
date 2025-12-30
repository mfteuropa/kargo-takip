import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { verify } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const token = request.cookies.get('token')?.value
        const verifiedToken = token ? await verify(token) : null
        if (!verifiedToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { shipmentIds } = await request.json();

        if (!Array.isArray(shipmentIds) || shipmentIds.length === 0) {
            return NextResponse.json({ error: 'No shipments provided' }, { status: 400 });
        }

        // Get manifest current stage
        const manifest = await prisma.manifest.findUnique({
            where: { id },
            select: { currentStage: true }
        });

        if (!manifest) {
            return NextResponse.json({ error: 'Manifest not found' }, { status: 404 });
        }

        // Prepare update data
        const updateData: any = { manifestId: id };
        if (manifest.currentStage) {
            updateData.currentStatus = manifest.currentStage;
        }

        const updated = await prisma.shipment.updateMany({
            where: { id: { in: shipmentIds } },
            data: updateData
        });

        // If stage changed, add history
        if (manifest.currentStage) {
             const currentStage = manifest.currentStage
             const statusMap: {[key: string]: string} = {
                'TURKIYE_GUMRUK': 'Türkiye Gümrük Kapısı',
                'BULGARISTAN': 'Bulgaristan',
                'ROMANYA': 'Romanya',
                'HIRVATISTAN': 'Hırvatistan',
                'SLOVENYA': 'Slovenya',
                'AVUSTURYA': 'Avusturya',
                'ALMANYA_GUMRUK': 'Almanya Gümrük Kapısı',
                'ALMANYA_MERKEZ_DEPO': 'Almanya Merkez Depo',
                'DAGITIMDA': 'Dağıtımda',
                'TESLIM_EDILDI': 'Teslim Edildi'
            }
            
            const description = statusMap[currentStage] || currentStage

            const eventsData = shipmentIds.map((shipmentId: string) => ({
                shipmentId,
                status: currentStage,
                description: description,
                location: '',
                timestamp: new Date()
            }))

            await prisma.shipmentEvent.createMany({
                data: eventsData
            })
        }

        return NextResponse.json({ count: updated.count });
    } catch (error) {
        return NextResponse.json({ error: 'Error adding shipments' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
     try {
        const { id } = await params;
        const token = request.cookies.get('token')?.value
        const verifiedToken = token ? await verify(token) : null
        if (!verifiedToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { shipmentIds } = await request.json();

        if (!Array.isArray(shipmentIds) || shipmentIds.length === 0) {
            return NextResponse.json({ error: 'No shipments provided' }, { status: 400 });
        }

        const updated = await prisma.shipment.updateMany({
            where: { 
                id: { in: shipmentIds },
                manifestId: id
            },
            data: { manifestId: null }
        });

        return NextResponse.json({ count: updated.count });
     } catch (error) {
         return NextResponse.json({ error: 'Error removing shipments' }, { status: 500 });
     }
}
