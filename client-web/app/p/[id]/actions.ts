'use server';

import { createAnonClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function acceptQuote(quoteId: string) {
  const supabase = createAnonClient();

  // 1. Actualizamos el estado a 'accepted'
  const { error } = await supabase
    .from('quotes')
    .update({ status: 'accepted' })
    .eq('id', quoteId);

  if (error) {
    console.error('Error accepting quote:', error);
    throw new Error('No se pudo aceptar el presupuesto');
  }

  // 2. Recargamos la página para que el cliente vea el cambio al instante
  revalidatePath(`/p/${quoteId}`);
}