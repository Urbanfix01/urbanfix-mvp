import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { QuoteDocument } from '../../../components/pdf/QuoteDocument';

// --- CONFIGURACIÓN CRÍTICA ---
// Esto obliga a Vercel a usar un servidor Node.js real para esta ruta.
// Sin esto, React-PDF falla con error 500.
export const runtime = 'nodejs'; 

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { quote, items, profile } = body;

    console.log('Iniciando generación de PDF para:', quote.id); // Log para Vercel

    // Generamos el stream
    const stream = await renderToStream(
      <QuoteDocument quote={quote} items={items} profile={profile} />
    );

    // Devolvemos la respuesta
    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Presupuesto-${quote.id.slice(0, 6)}.pdf"`,
      },
    });

  } catch (error) {
    // Este log aparecerá en el panel de Vercel si vuelve a fallar
    console.error('CRASH GENERANDO PDF:', error);
    
    return NextResponse.json(
      { error: 'Error interno generando el PDF', details: String(error) },
      { status: 500 }
    );
  }
}