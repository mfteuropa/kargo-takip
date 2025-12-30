import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { verify } from '@/lib/auth'
import { toUpperCaseTR } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function generateTrackingNumber() {
    const random = Math.floor(10000000 + Math.random() * 90000000);
    return `TR-${random}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const trackingNumber = searchParams.get('trackingNumber')
  const customerCode = searchParams.get('customerCode')
  const phoneNumber = searchParams.get('phoneNumber')
  const id = searchParams.get('id')

  try {
    // 1. Durum: Sadece Takip Numarası ile Sorgulama (Public)
    if (trackingNumber) {
        // Case-insensitive handling: Normalize input since our system generates Uppercase TR-.
        const normalizedTrackingNumber = trackingNumber.toUpperCase();
        
        const shipment = await prisma.shipment.findUnique({
             where: { trackingNumber: normalizedTrackingNumber },
             include: {
                manifest: true,
                events: { orderBy: { timestamp: 'desc' } },
             },
        });
    
        if (!shipment) {
          return NextResponse.json(
            { error: 'Kargo bulunamadı.' },
            { status: 404 }
          )
        }
    
        return NextResponse.json({ type: 'single', data: shipment })
    }

    // 2. Durum: Müşteri Kodu ve Telefon Numarası ile Sorgulama (Public)
    if (customerCode && phoneNumber) {
        // Normalize Customer Code (MFT- is prefix)
        // Check if user entered mft- or MFT-
        // Our DB stores MFT-XXXX.
        // Let's uppercase the prefix part or whole thing if it follows that pattern.
        // But MFT- numbers are simple ASCII. Uppercase is safe.
        const normalizedCustomerCode = customerCode.toUpperCase();

        const customer = await prisma.customer.findUnique({
            where: { customerCode: normalizedCustomerCode },
            include: {
                shipments: {
                    include: {
                        manifest: true,
                        events: {
                            orderBy: {
                                timestamp: 'desc'
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        })

        if (!customer) {
            return NextResponse.json(
                { error: 'Müşteri bulunamadı.' },
                { status: 404 }
            )
        }

        // Telefon numarası doğrulaması
        if (customer.phoneNumber !== phoneNumber) {
             return NextResponse.json(
                { error: 'Müşteri kodu ve telefon numarası eşleşmiyor.' },
                { status: 401 }
            )
        }

        return NextResponse.json({ type: 'list', data: customer.shipments })
    }

    // Admin Kontrolü
    const token = request.cookies.get('token')?.value
    const verifiedToken = token ? await verify(token) : null

    if (!verifiedToken) {
        return NextResponse.json(
            { error: 'Yetkisiz erişim.' },
            { status: 401 }
        )
    }

    // 3. Durum: ID ile Sorgulama (Admin)
    if (id) {
        const shipment = await prisma.shipment.findUnique({
            where: { id },
            include: {
                customer: true,
                manifest: true,
                events: {
                    orderBy: {
                        timestamp: 'desc'
                    }
                }
            }
        })

        if (!shipment) {
            return NextResponse.json(
                { error: 'Kargo bulunamadı.' },
                { status: 404 }
            )
        }

        return NextResponse.json({ type: 'detail', data: shipment })
    }

    // 4. Durum: Tüm Kargoları Listeleme (Admin)
    const unassigned = searchParams.get('unassigned')
    if (unassigned === 'true') {
        const shipments = await prisma.shipment.findMany({
            where: { manifestId: null },
            orderBy: { createdAt: 'desc' },
            include: { customer: true }
        })
        return NextResponse.json({ type: 'list', data: shipments })
    }

    const shipments = await prisma.shipment.findMany({
        include: {
            customer: true,
            manifest: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    return NextResponse.json({ type: 'list', data: shipments })

  } catch (error) {
    console.error('Shipment fetch error:', error)
    return NextResponse.json(
      { error: 'Bir hata oluştu.' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    const verifiedToken = token ? await verify(token) : null

    if (!verifiedToken) {
        return NextResponse.json(
            { error: 'Yetkisiz erişim.' },
            { status: 401 }
        )
    }

    const {
      senderName,
      senderPhone,
      receiverName,
      receiverAddress,
      receiverCompany,
      receiverPhone,
      country,
      dimensions,
      weight,
      volume,
      paymentMethod,
      customerCode,
      phoneNumber,
      quantity,
      manifestId
    } = await req.json()

    // Otomatik Takip No
    let trackingNumber = generateTrackingNumber();
    // Unique kontrolü (basit döngü)
    let isUnique = false;
    while (!isUnique) {
        const exists = await prisma.shipment.findUnique({ where: { trackingNumber } });
        if (!exists) isUnique = true;
        else trackingNumber = generateTrackingNumber();
    }

    // 1. Müşteri var mı kontrol et, yoksa oluştur
    let customerId = null
    if (customerCode) {
        const upperCode = customerCode.toUpperCase();
        const fullCustomerCode = upperCode.startsWith('MFT-') ? upperCode : `MFT-${upperCode}`
        
        // Müşteri güncelleme veya oluşturma
        // Telefon varsa güncelle
        const customerData: any = {
            customerCode: fullCustomerCode,
            name: receiverName || 'İsimsiz Müşteri'
        };
        if (phoneNumber) customerData.phoneNumber = phoneNumber;
        if (country) customerData.country = country;
        if (receiverAddress) customerData.address = receiverAddress;

        const customer = await prisma.customer.upsert({
            where: { customerCode: fullCustomerCode },
            update: customerData,
            create: customerData
        })
        customerId = customer.id
    }

    const shipment = await prisma.shipment.create({
      data: {
        trackingNumber,
        senderName,
        senderPhone,
        receiverName,
        receiverAddress,
        receiverCompany,
        receiverPhone,
        country,
        dimensions,
        weight: weight ? parseFloat(weight) : null,
        volume: volume ? parseFloat(volume) : null,
        paymentMethod,
        currentStatus: 'MERKEZ_DEPO',
        customerId,
        manifestId,
        quantity: quantity ? parseInt(quantity) : 1
      },
    })

    // İlk hareket kaydı: İstanbul Merkez Depo
    await prisma.shipmentEvent.create({
        data: {
            shipmentId: shipment.id,
            status: 'MERKEZ_DEPO',
            description: 'Kargo İstanbul Merkez Depoya Ulaştı',
            location: 'İstanbul',
            timestamp: new Date()
        }
    })

    return NextResponse.json(shipment)
  } catch (error) {
    console.error('Shipment create error:', error)
    return NextResponse.json(
      { error: 'Bir hata oluştu.' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    const verifiedToken = token ? await verify(token) : null

    if (!verifiedToken) {
        return NextResponse.json(
            { error: 'Yetkisiz erişim.' },
            { status: 401 }
        )
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Kargo ID gerekli.' },
        { status: 400 }
      )
    }

    // Önce ilişkili olayları sil (Cascade yoksa)
    await prisma.shipmentEvent.deleteMany({
        where: { shipmentId: id }
    })

    const shipment = await prisma.shipment.delete({
      where: { id },
    })

    return NextResponse.json(shipment)
  } catch (error) {
    console.error('Shipment delete error:', error)
    return NextResponse.json(
      { error: 'Bir hata oluştu.' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    const verifiedToken = token ? await verify(token) : null

    if (!verifiedToken) {
        return NextResponse.json(
            { error: 'Yetkisiz erişim.' },
            { status: 401 }
        )
    }

    const {
      id,
      trackingNumber, // Opsiyonel, genelde değişmez
      senderName,
      senderPhone,
      receiverName,
      receiverAddress,
      receiverCompany,
      receiverPhone,
      country,
      dimensions,
      weight,
      volume,
      paymentMethod,
      currentStatus,
      phoneNumber,
      customerCode,
      quantity,
      manifestId
    } = await req.json()

    if (!id) {
        return NextResponse.json(
            { error: 'Kargo ID gerekli.' },
            { status: 400 }
        )
    }

    // Telefon numarası güncellenmişse müşteriyi de güncelle
    const existingShipment = await prisma.shipment.findUnique({
        where: { id },
        include: { customer: true }
    })

    if (existingShipment?.customer && phoneNumber) {
        await prisma.customer.update({
            where: { id: existingShipment.customerId! },
            data: { phoneNumber }
        })
    }

    const shipment = await prisma.shipment.update({
      where: { id },
      data: {
        trackingNumber,
        senderName: toUpperCaseTR(senderName),
        senderPhone,
        receiverName: toUpperCaseTR(receiverName),
        receiverAddress: toUpperCaseTR(receiverAddress),
        receiverCompany: toUpperCaseTR(receiverCompany),
        receiverPhone,
        country: toUpperCaseTR(country),
        dimensions,
        weight: weight ? parseFloat(weight) : null,
        volume: volume ? parseFloat(volume) : null,
        paymentMethod: toUpperCaseTR(paymentMethod),
        currentStatus,
        quantity: quantity ? parseInt(quantity) : 1,
        manifestId
      },
    })
    
    // Durum değiştiyse olay günlüğüne ekle
    if (existingShipment?.currentStatus !== currentStatus) {
        await prisma.shipmentEvent.create({
            data: {
                shipmentId: id,
                status: currentStatus,
                description: currentStatus,
                location: '', // Admin paneli
                timestamp: new Date()
            }
        })
    }

    return NextResponse.json(shipment)
  } catch (error) {
    console.error('Shipment update error:', error)
    return NextResponse.json(
      { error: 'Bir hata oluştu.' },
      { status: 500 }
    )
  }
}
