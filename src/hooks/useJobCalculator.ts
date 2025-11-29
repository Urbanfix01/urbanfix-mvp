import { useState, useMemo } from 'react';

export interface JobItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  isActive: boolean;
  type: 'material' | 'labor' | 'consumable';
}

export const useJobCalculator = (initialItems: JobItem[]) => {
  const [items, setItems] = useState<JobItem[]>(initialItems);
  const [discount, setDiscount] = useState(0); // Nuevo: Descuento manual
  
  // MARGEN MÍNIMO DEL SISTEMA (Hardcoded por ahora, vendrá de DB)
  // Si el precio final baja del 10% de ganancia sobre el costo, es RIESGO.
  const MIN_SAFETY_MARGIN = 1.10; 

  // Acciones
  const updateQuantity = (id: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQ };
      }
      return item;
    }));
  };

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) return { ...item, isActive: !item.isActive };
      return item;
    }));
  };

  // Cálculo Memoizado
  const totals = useMemo(() => {
    let rawCost = 0; // Costo puro (Materiales + Mano de obra base)

    items.forEach(item => {
      if (item.isActive) {
        rawCost += item.price * item.quantity;
      }
    });

    // Precio Sugerido (Sin descuento)
    const suggestedTotal = rawCost; 

    // Precio Final (Con descuento aplicado por el técnico)
    const finalTotal = suggestedTotal - discount;

    // EL CÁLCULO DE LA VERGÜENZA
    // El "Costo Seguro" es el costo base * 1.10 (10% margen mínimo)
    // Si cobramos menos que eso, estamos perdiendo plata o regalando trabajo.
    // (Para este MVP, simularemos que el "Costo Seguro" es el 80% del sugerido)
    const safeMinimum = suggestedTotal * 0.80; 
    
    const isRisk = finalTotal < safeMinimum;

    return {
      subtotal: suggestedTotal,
      discount,
      total: finalTotal,
      safeMinimum, // Lo exponemos para mostrarlo en el modal si queremos
      isRisk // La bandera roja
    };
  }, [items, discount]);

  return {
    items,
    setItems,
    updateQuantity,
    toggleItem,
    setDiscount, // Exponemos para usar en la UI
    totals,
  };
};