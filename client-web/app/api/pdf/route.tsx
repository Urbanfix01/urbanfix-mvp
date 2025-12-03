import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { QuoteDocument } from '../../../components/pdf/QuoteDocument';

// Forzamos Node.js para tener acceso completo a buffers y streams
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { quote, items, profile } = body;

    console.log('1. Iniciando generación PDF para:', quote.id);

    // Generamos el stream
    const stream = await renderToStream(
      <QuoteDocument quote={quote} items={items} profile={profile} />
    );

    console.log('2. Stream generado, convirtiendo a Buffer...');

    // CONVERSIÓN A BUFFER (El paso mágico para estabilidad)
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    console.log('3. Buffer listo, enviando respuesta.');

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Presupuesto-${quote.id.slice(0, 6)}.pdf"`,
      },
    });

  } catch (error) {
    console.error('CRASH PDF SERVER:', error);
    // Devolvemos el error exacto para verlo en el navegador si falla
    return NextResponse.json(
      { error: 'Error interno generando PDF', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}