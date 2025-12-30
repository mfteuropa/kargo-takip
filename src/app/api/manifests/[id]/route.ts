import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { verify } from '@/lib/auth'
import { toUpperCaseTR } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const token = request.cookies.get('token')?.value
        const verifiedToken = token ? await verify(token) : null
        if (!verifiedToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const manifest = await prisma.manifest.findUnique({
            where: { id },
            include: {
                shipments: {
                    include: { customer: true },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!manifest) return NextResponse.json({ error: 'Manifest not found' }, { status: 404 });

        return NextResponse.json(manifest);
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching manifest' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
         const token = request.cookies.get('token')?.value
        const verifiedToken = token ? await verify(token) : null
        if (!verifiedToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { status, currentStage, truckPlate, notes, startDate, endDate } = await request.json();
        
        // Update manifest
        const currentManifest = await prisma.manifest.findUnique({ where: { id } })
        
        const manifest = await prisma.manifest.update({
            where: { id },
            data: { 
                status,
                currentStage,
                truckPlate: toUpperCaseTR(truckPlate), 
                notes: toUpperCaseTR(notes),
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null
            }
        })

        // Auto-update status of all shipments in this manifest
        // If currentStage is provided, ensure all shipments in this manifest match this stage
        if (currentStage) {
            // Find shipments that need updating (where status is different)
            // This handles both new stage updates AND fixing desynchronized shipments
            const shipmentsToUpdate = await prisma.shipment.findMany({
                where: { 
                    manifestId: id,
                    currentStatus: { not: currentStage }
                },
                select: { id: true }
            })

            if (shipmentsToUpdate.length > 0) {
                // 1. Update these shipments
                await prisma.shipment.updateMany({
                    where: { 
                        id: { in: shipmentsToUpdate.map(s => s.id) }
                    },
                    data: { currentStatus: currentStage }
                })

                // 2. Add movement history (ShipmentEvent) for updated shipments
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

                const eventsData = shipmentsToUpdate.map(s => ({
                    shipmentId: s.id,
                    status: currentStage,
                    description: description,
                    location: '',
                    timestamp: new Date()
                }))

                await prisma.shipmentEvent.createMany({
                    data: eventsData
                })
            }
        }
        
        return NextResponse.json(manifest);
    } catch (error) {
         return NextResponse.json({ error: 'Error updating manifest' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const token = request.cookies.get('token')?.value
        const verifiedToken = token ? await verify(token) : null
        if (!verifiedToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Unassign shipments first
        await prisma.shipment.updateMany({
            where: { manifestId: id },
            data: { manifestId: null }
        });

        // Delete manifest
        await prisma.manifest.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Error deleting manifest' }, { status: 500 });
    }
}
