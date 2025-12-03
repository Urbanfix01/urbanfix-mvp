import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
// Ajustamos la importación para subir 3 niveles: api -> app -> client-web -> components
import { QuoteDocument } from '../../../components/pdf/QuoteDocument';

export async function POST(req: Request) {
  try {
    // 1. Leer los datos que envía el botón desde el Frontend
    const body = await req.json();
    const { quote, items, profile } = body;

    if (!quote || !items) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    // 2. Generar el PDF en el servidor (Node.js Stream)
    // Esto es seguro y no choca con React 19
    const stream = await renderToStream(
      <QuoteDocument quote={quote} items={items} profile={profile} />
    );

    // 3. Devolver el archivo al navegador
    // 'as any' es necesario porque los tipos de React-PDF y Next.js a veces difieren en streams
    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        // Esto le dice al navegador "Descárgalo con este nombre"
        'Content-Disposition': `attachment; filename="Presupuesto-${quote.id.slice(0, 6).toUpperCase()}.pdf"`,
      },
    });

  } catch (error) {
    console.error('SERVER PDF ERROR:', error);
    return NextResponse.json(
      { error: 'Error generando el PDF en el servidor' },
      { status: 500 }
    );
  }
}