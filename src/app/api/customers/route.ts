import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { verify } from '@/lib/auth'

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value
        const verifiedToken = token ? await verify(token) : null
        if (!verifiedToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');
        const next = searchParams.get('next');

        // Generate next customer code
        if (next === 'true') {
            const allCustomers = await prisma.customer.findMany({
                select: { customerCode: true }
            });

            let maxCode = 3999; // Default start from 4000
            
            allCustomers.forEach(c => {
                const match = c.customerCode.match(/MFT-(\d+)/);
                if (match) {
                    const num = parseInt(match[1]);
                    if (!isNaN(num) && num > maxCode) {
                        maxCode = num;
                    }
                }
            });

            return NextResponse.json({ nextCode: maxCode + 1 });
        }

        // If query is provided, search (Client-side filtering for Turkish chars support in SQLite)
        if (query) {
             const allCustomers = await prisma.customer.findMany({
                orderBy: { createdAt: 'desc' }
            });

            const lowerQuery = query.toLocaleLowerCase('tr-TR');
            
            const customers = allCustomers.filter(c => 
                (c.name && c.name.toLocaleLowerCase('tr-TR').includes(lowerQuery)) ||
                (c.customerCode && c.customerCode.toLocaleLowerCase('tr-TR').includes(lowerQuery))
            ); // Removed slice limit for full search results in management page

            return NextResponse.json(customers);
        }

        // If no query, return all (or latest)
        const customers = await prisma.customer.findMany({
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(customers);

    } catch (error) {
        return NextResponse.json({ error: 'Error searching customers' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value
        const verifiedToken = token ? await verify(token) : null
        if (!verifiedToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        
        // Auto-generate code if not provided
        if (!body.customerCode) {
             const allCustomers = await prisma.customer.findMany({
                select: { customerCode: true }
            });

            let maxCode = 3999;
            allCustomers.forEach(c => {
                const match = c.customerCode.match(/MFT-(\d+)/);
                if (match) {
                    const num = parseInt(match[1]);
                    if (!isNaN(num) && num > maxCode) {
                        maxCode = num;
                    }
                }
            });
            body.customerCode = `MFT-${maxCode + 1}`;
        }

        const customer = await prisma.customer.create({
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
        console.error('Error creating customer:', error);
        return NextResponse.json({ error: 'Error creating customer' }, { status: 500 });
    }
}
