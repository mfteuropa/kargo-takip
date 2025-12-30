import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { verify } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const token = request.cookies.get('token')?.value
        const verifiedToken = token ? await verify(token) : null
        if (!verifiedToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();

        const customer = await prisma.customer.update({
            where: { id },
            data: {
                customerCode: body.customerCode,
                name: body.name,
                phoneNumber: body.phoneNumber,
                address: body.address,
                city: body.city,
                country: body.country
            }
        });

        return NextResponse.json(customer);
    } catch (error) {
        console.error('Error updating customer:', error);
        return NextResponse.json({ error: 'Error updating customer' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const token = request.cookies.get('token')?.value
        const verifiedToken = token ? await verify(token) : null
        if (!verifiedToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Check if customer has shipments
        const shipmentCount = await prisma.shipment.count({
            where: { customerId: id }
        });

        if (shipmentCount > 0) {
            return NextResponse.json({ 
                error: 'Bu müşteriye ait kargolar bulunduğu için silinemez.' 
            }, { status: 400 });
        }

        await prisma.customer.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting customer:', error);
        return NextResponse.json({ error: 'Error deleting customer' }, { status: 500 });
    }
}
