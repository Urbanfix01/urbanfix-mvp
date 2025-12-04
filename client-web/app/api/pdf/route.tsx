import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { QuoteDocument } from '../../../components/pdf/QuoteDocument';

export const runtime = 'nodejs';

// 1. Función auxiliar para convertir el Stream a Buffer en memoria
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', (err) => reject(err)); // <--- Aquí capturamos el error real del PDF
  });
}

export async function POST(req: Request) {
  console.log("1. 🏁 Inicio request PDF");

  try {
    const body = await req.json();
    console.log("2. 📦 Datos recibidos:", body?.client_name || 'Sin nombre');

    // Generamos el stream
    const stream = await renderToStream(<QuoteDocument {...body} />);
    
    // 3. 🛑 FORZAMOS la conversión a Buffer aquí mismo.
    // Si hay un error de imagen/fuente, explotará AHORA, no después.
    console.log("3. ⚙️ Renderizando PDF en memoria...");
    const pdfBuffer = await streamToBuffer(stream);
    console.log("4. ✅ PDF Generado con éxito. Tamaño:", pdfBuffer.length);

   return new NextResponse(pdfBuffer as any, { 
  headers: {
    'Content-Type': 'application/pdf',
  },
});

  } catch (err: any) {
    // AHORA SÍ verás el error aquí
    console.error("🔥🔥🔥 ERROR CRÍTICO GENERANDO PDF:");
    console.error(err); // Muestra el objeto error
    if (err.message) console.error("Mensaje:", err.message);
    if (err.stack) console.error("Stack:", err.stack);

    return NextResponse.json(
      { error: 'Error generando PDF', details: err.message }, 
      { status: 500 }
    );
  }
}