import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash('admin123', 10)
  
  // Admin kullanıcısı oluştur
  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password,
      role: 'ADMIN',
    },
  })
  console.log({ user })

  // 4. Müşteri Oluştur/Güncelle (MFT-4000)
  const customer = await prisma.customer.upsert({
    where: { customerCode: 'MFT-4000' },
    update: {},
    create: {
        customerCode: 'MFT-4000',
        name: 'Ahmet Yılmaz',
        phoneNumber: '5551234567',
    }
  })

  // 5. Müşteri için farklı senaryolar (Çoklu kargo örneği)
  const shipmentsData = [
    {
        trackingNumber: 'TR123456789',
        senderName: 'Zara Giyim A.Ş.',
        senderAddress: 'İstanbul Tekstil Kent',
        receiverName: 'Ahmet Yılmaz',
        receiverAddress: 'Berlin, Almanya',
        supplierName: 'Zara',
        truckNumber: '34 ZARA 01',
        shippingWeek: '2025-01',
        quantity: 50, // 50 Koli
        currentStatus: 'DAGITIMDA',
        customerId: customer.id,
        events: [
            { status: 'ALINDI', description: 'Kargo teslim alındı', location: 'İstanbul Depo' },
            { status: 'MERKEZ_DEPO', description: 'Merkez depoya ulaştı', location: 'İstanbul Merkez' },
            { status: 'GUMRUK_TR', description: 'Gümrük işlemleri tamamlandı', location: 'Kapıkule Sınır Kapısı' },
            { status: 'TRANSIT', description: 'Bulgaristan geçişi', location: 'Sofya' },
            { status: 'TRANSIT', description: 'Sırbistan geçişi', location: 'Belgrad' },
            { status: 'GUMRUK_DE', description: 'Almanya gümrük işlemleri', location: 'Münih Gümrük' },
            { status: 'DEPO_DE', description: 'Almanya merkez depoya ulaştı', location: 'Frankfurt Depo' },
            { status: 'DAGITIMDA', description: 'Dağıtıma çıkarıldı', location: 'Berlin' },
        ]
    },
    {
        trackingNumber: 'TR987654321',
        senderName: 'Bershka Giyim',
        senderAddress: 'Bursa OSB',
        receiverName: 'Ahmet Yılmaz',
        receiverAddress: 'Berlin, Almanya',
        supplierName: 'Bershka',
        truckNumber: '34 ZARA 01', // Aynı tır
        shippingWeek: '2025-01',
        quantity: 30, // 30 Koli
        currentStatus: 'DAGITIMDA',
        customerId: customer.id,
        events: [
            { status: 'ALINDI', description: 'Kargo teslim alındı', location: 'Bursa Depo' },
            { status: 'MERKEZ_DEPO', description: 'Merkez depoya ulaştı', location: 'İstanbul Merkez' },
            { status: 'GUMRUK_TR', description: 'Gümrük işlemleri tamamlandı', location: 'Kapıkule Sınır Kapısı' },
            { status: 'TRANSIT', description: 'Bulgaristan geçişi', location: 'Sofya' },
            { status: 'TRANSIT', description: 'Sırbistan geçişi', location: 'Belgrad' },
            { status: 'GUMRUK_DE', description: 'Almanya gümrük işlemleri', location: 'Münih Gümrük' },
            { status: 'DEPO_DE', description: 'Almanya merkez depoya ulaştı', location: 'Frankfurt Depo' },
            { status: 'DAGITIMDA', description: 'Dağıtıma çıkarıldı', location: 'Berlin' },
        ]
    },
    {
        trackingNumber: 'TR456123789',
        senderName: 'LC Waikiki',
        senderAddress: 'Esenyurt Depo',
        receiverName: 'Ahmet Yılmaz',
        receiverAddress: 'Berlin, Almanya',
        supplierName: 'LC Waikiki',
        truckNumber: '34 LCW 99', // Farklı tır
        shippingWeek: '2025-02',
        quantity: 120, // 120 Koli
        currentStatus: 'GUMRUK_DE',
        customerId: customer.id,
        events: [
             { status: 'ALINDI', description: 'Kargo teslim alındı', location: 'Esenyurt Depo' },
            { status: 'MERKEZ_DEPO', description: 'Merkez depoya ulaştı', location: 'İstanbul Merkez' },
            { status: 'GUMRUK_TR', description: 'Gümrük işlemleri tamamlandı', location: 'Kapıkule Sınır Kapısı' },
            { status: 'TRANSIT', description: 'Avusturya geçişi', location: 'Viyana' },
            { status: 'GUMRUK_DE', description: 'Almanya gümrük işlemleri başladı', location: 'Münih Gümrük' },
        ]
    }
  ]

  for (const data of shipmentsData) {
      const { events, ...shipmentInfo } = data
      
      const shipment = await prisma.shipment.upsert({
          where: { trackingNumber: shipmentInfo.trackingNumber },
          update: shipmentInfo,
          create: shipmentInfo
      })

      // Olayları temizle ve yeniden ekle (basitlik için)
      await prisma.shipmentEvent.deleteMany({ where: { shipmentId: shipment.id } })
      
      for (const event of events) {
          await prisma.shipmentEvent.create({
              data: {
                  ...event,
                  shipmentId: shipment.id
              }
          })
      }
  }

  console.log('Seed data created successfully')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
