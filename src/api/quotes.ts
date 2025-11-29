import { supabase } from '../lib/supabase';
import { JobItem } from '../hooks/useJobCalculator';

interface CreateQuoteParams {
  userId: string;
  clientName?: string; // Opcional por ahora, o hardcodeado
  totalAmount: number;
  items: JobItem[];
  blueprintName: string; // Para usarlo como título
}

export const createQuote = async ({ userId, clientName, totalAmount, items, blueprintName }: CreateQuoteParams) => {
  
  // 1. CREAR CABECERA (Tabla 'quotes')
  const { data: quoteData, error: quoteError } = await supabase
    .from('quotes')
    .insert({
      user_id: userId,
      total_amount: totalAmount,
      status: 'draft', // Arranca como borrador
      // En V2 agregaremos columna 'title' o 'client_name' a la tabla quotes
      // Por ahora asumimos que el esquema es el básico del Prompt Maestro
    })
    .select()
    .single();

  if (quoteError) {
    console.error('Error creando cabecera de presupuesto:', quoteError);
    throw new Error('No se pudo iniciar el guardado del presupuesto.');
  }

  const quoteId = quoteData.id;

  // 2. PREPARAR ITEMS (Filtrar solo los activos y formatear para SQL)
  const quoteItems = items
    .filter(item => item.isActive) // Solo guardamos lo que sí se usa
    .map(item => ({
      quote_id: quoteId,
      description: item.name,
      unit_price: item.price,
      quantity: item.quantity,
      // En el futuro: guardar referencia al item_id original si es necesario
    }));

  if (quoteItems.length === 0) {
    // Si no hay items, terminamos aquí (raro, pero posible)
    return quoteData;
  }

  // 3. INSERTAR ITEMS EN LOTE (Tabla 'quote_items')
  const { error: itemsError } = await supabase
    .from('quote_items')
    .insert(quoteItems);

  if (itemsError) {
    console.error('Error guardando items:', itemsError);
    // Opcional: Borrar la quote creada si fallan los items (Rollback manual)
    await supabase.from('quotes').delete().eq('id', quoteId); 
    throw new Error('Error al guardar los detalles del trabajo.');
  }

  return quoteData;
};