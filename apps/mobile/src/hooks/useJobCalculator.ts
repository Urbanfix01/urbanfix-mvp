import { useState, useMemo } from 'react';

export interface JobItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  isActive: boolean;
  type: 'labor' | 'material' | 'consumable';
  // Agregamos 'category' opcional para compatibilidad con la UI nueva
  category?: 'labor' | 'material' | 'consumable';
  unit?: string | null;
  technicalNotes?: string | null;
  sourceRef?: string | null;
  masterItemId?: string | null;
}

export const useJobCalculator = (initialItems: JobItem[] = []) => {
  const [items, setItems] = useState<JobItem[]>(initialItems);
  
  // DATOS DEL CLIENTE
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  
  // FECHA
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  
  // FINANCIEROS
  // Descuento en porcentaje (0-100)
  const [discount, setDiscount] = useState(0);
  const [applyTax, setApplyTax] = useState(false);

  // 1. Actualizar Cantidad
  const updateQuantity = (id: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQ };
      }
      return item;
    }));
  };

  // 2. Actualizar Precio (RENOMBRADO para claridad en la UI)
  const updateItemPrice = (id: string, newPrice: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) return { ...item, price: newPrice };
      return item;
    }));
  };

  // 2.1 Actualizar Nombre
  const updateItemName = (id: string, newName: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) return { ...item, name: newName };
      return item;
    }));
  };

  // 3. Activar/Desactivar
  const toggleItem = (id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) return { ...item, isActive: !item.isActive };
      return item;
    }));
  };

  // 4. Agregar Ítem (MEJORADO: Acepta ítems personalizados)
  const addItem = (item: any) => {
    setItems(prev => {
        // Determinamos el tipo: si viene de DB es 'type', si es manual 'category'
        const itemType = item.category || item.type || 'labor';
        const basePrice = item.price !== undefined ? item.price : (item.suggested_price || 0);
        const normalizedPrice = Number(basePrice);
        const rawQuantity = Number(item.quantity ?? 1);
        const safeQuantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 1;
        const technicalNotes = String(item.technicalNotes ?? item.technical_notes ?? '').trim();
        const sourceRef = String(item.sourceRef ?? item.source_ref ?? '').trim();
        const unit = String(item.unit ?? '').trim();
        const masterItemId =
          typeof item.masterItemId === 'string' && item.masterItemId.trim()
            ? item.masterItemId.trim()
            : typeof item.id === 'string' && item.id.length > 5
              ? item.id
              : '';

        // Generamos un ID único si no existe
        const newItemId = item.id && item.id.length > 5 ? item.id : `custom-${Date.now()}`;

        // Verificamos si ya existe para sumar cantidad en lugar de duplicar
        const existingIndex = prev.findIndex(i => {
            if (i.type !== itemType) return false;
            if (i.name !== item.name) return false;
            if (Number(i.price || 0) !== normalizedPrice) return false;
            if (masterItemId && i.masterItemId) return i.masterItemId === masterItemId;
            if (technicalNotes && i.technicalNotes) return i.technicalNotes === technicalNotes;
            return !masterItemId && !technicalNotes;
        });

        if (existingIndex >= 0) {
            const newItems = [...prev];
            newItems[existingIndex].quantity += safeQuantity;
            return newItems;
        }

        const newItem: JobItem = {
            id: newItemId,
            name: item.name,
            price: normalizedPrice,
            quantity: safeQuantity,
            isActive: true,
            type: itemType,
            category: itemType, // Guardamos ambos por compatibilidad
            unit: unit || null,
            technicalNotes: technicalNotes || null,
            sourceRef: sourceRef || null,
            masterItemId: masterItemId || null,
        };
        return [...prev, newItem];
    });
  };

  // 5. Eliminar
  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  // CÁLCULOS
  const totals = useMemo(() => {
    const subtotal = items.reduce((acc, item) => {
      return item.isActive ? acc + (item.price * item.quantity) : acc;
    }, 0);

    const discountPercent = Math.min(100, Math.max(0, discount));
    const discountAmount = subtotal * (discountPercent / 100);
    const totalAfterDiscount = Math.max(0, subtotal - discountAmount);
    const taxAmount = applyTax ? totalAfterDiscount * 0.21 : 0;
    const total = totalAfterDiscount + taxAmount;
    
    return { subtotal, discountPercent, discountAmount, taxAmount, total };
  }, [items, discount, applyTax]);

  return {
    items, setItems,
    clientName, setClientName,
    clientAddress, setClientAddress,
    scheduledDate, setScheduledDate,
    // Acciones
    updateQuantity, updateItemPrice, updateItemName, toggleItem, addItem, removeItem,
    // Dinero
    discount, setDiscount, applyTax, setApplyTax, totals
  };
};
