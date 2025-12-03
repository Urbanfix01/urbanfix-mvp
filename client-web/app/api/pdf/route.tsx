import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { QuoteDocument } from '../../../components/pdf/QuoteDocument';

export const runtime = 'nodejs'; // <--- ESTO EVITA EL ERROR 500

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const stream = await renderToStream(<QuoteDocument {...body} />);
    return new NextResponse(stream as any, {
      headers: { 'Content-Type': 'application/pdf' },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error generando PDF' }, { status: 500 });
  }
}