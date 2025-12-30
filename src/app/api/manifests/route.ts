import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { verify } from '@/lib/auth'
import { toUpperCaseTR } from '@/lib/utils'

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value
        const verifiedToken = token ? await verify(token) : null
        if (!verifiedToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const manifests = await prisma.manifest.findMany({
            include: {
                shipments: {
                    select: {
                        id: true,
                        trackingNumber: true,
                        receiverName: true,
                        quantity: true,
                        weight: true,
                        volume: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(manifests);
    } catch (error) {
        console.error('Manifest fetch error:', error);
        return NextResponse.json({ error: 'Error fetching manifests' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value
        const verifiedToken = token ? await verify(token) : null
        if (!verifiedToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { name, notes, truckPlate, startDate, endDate } = await req.json();

        const manifest = await prisma.manifest.create({
            data: {
                name: toUpperCaseTR(name),
                notes: toUpperCaseTR(notes),
                truckPlate: toUpperCaseTR(truckPlate),
                status: 'ACIK',
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined
            }
        });

        return NextResponse.json(manifest);
    } catch (error) {
        console.error('Manifest create error:', error);
        return NextResponse.json({ 
            error: 'Defter oluşturulurken hata oluştu.', 
            details: error instanceof Error ? error.message : String(error) 
        }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value
        const verifiedToken = token ? await verify(token) : null
        if (!verifiedToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id, status, truckPlate, notes } = await req.json();

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const manifest = await prisma.manifest.update({
            where: { id },
            data: {
                status,
                truckPlate,
                notes
            }
        });

        return NextResponse.json(manifest);
    } catch (error) {
        console.error('Manifest update error:', error);
        return NextResponse.json({ error: 'Error updating manifest' }, { status: 500 });
    }
}
