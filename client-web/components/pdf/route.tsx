import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { QuoteDocument } from '@/components/pdf/QuoteDocument'; // Ajusta la ruta si es necesario

export async function POST(req: Request) {
  try {
    // 1. Recibimos los datos desde el Frontend
    const body = await req.json();
    const { quote, items, profile } = body;

    // 2. Generamos el PDF como un Stream de datos (Server Side)
    const stream = await renderToStream(
      <QuoteDocument quote={quote} items={items} profile={profile} />
    );

    // 3. Convertimos el stream a un formato que el navegador entienda
    // (Next.js v13+ way to handle streams)
    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Presupuesto-${quote.id.slice(0, 6)}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generando PDF en servidor:', error);
    return NextResponse.json({ error: 'Error generando PDF' }, { status: 500 });
  }
}