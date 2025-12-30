import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import LabelClient from './LabelClient';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function LabelPage({ params }: PageProps) {
  const { id } = await params;

  const shipment = await prisma.shipment.findUnique({
    where: { id },
    include: {
      customer: true,
    },
  });

  if (!shipment) {
    notFound();
  }

  return <LabelClient shipment={shipment} />;
}
