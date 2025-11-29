import { useState, useMemo } from 'react';
import { MasterItem } from '../types/database';

export interface JobItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  isActive: boolean;
  type: 'labor' | 'material' | 'consumable';
}

export const useJobCalculator = (initialItems: JobItem[] = []) => {
  const [items, setItems] = useState<JobItem[]>(initialItems);
  const [discount, setDiscount] = useState(0);
  const [applyTax, setApplyTax] = useState(false); // <--- NUEVO: Estado del IVA

  // 1. Acciones Básicas
  const updateQuantity = (id: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQ };
      }
      return item;
    }));
  };

  // 2. NUEVO: Actualizar Precio (Para Fletes/Otros)
  const updatePrice = (id: string, newPrice: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) return { ...item, price: newPrice };
      return item;
    }));
  };

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) return { ...item, isActive: !item.isActive };
      return item;
    }));
  };

  const addItem = (masterItem: MasterItem) => {
    const newItem: JobItem = {
      id: `${masterItem.id}-${Date.now()}`, 
      name: masterItem.name,
      price: masterItem.suggested_price,
      quantity: 1,
      isActive: true,
      type: masterItem.type,
    };
    setItems(prev => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  // 3. Cálculos Actualizados
  const totals = useMemo(() => {
    // A. Subtotal
    const subtotal = items.reduce((acc, item) => {
      return item.isActive ? acc + (item.price * item.quantity) : acc;
    }, 0);

    // B. Descuentos
    const totalAfterDiscount = Math.max(0, subtotal - discount);
    
    // C. IVA (21%)
    const taxAmount = applyTax ? totalAfterDiscount * 0.21 : 0;

    // D. Total Final
    const total = totalAfterDiscount + taxAmount;
    
    // Regla de riesgo (sin contar IVA)
    const isRisk = discount > (subtotal * 0.15); 

    return { subtotal, taxAmount, total, isRisk };
  }, [items, discount, applyTax]);

  return {
    items,
    setItems,
    updateQuantity,
    updatePrice, // <--- Exportamos
    toggleItem,
    addItem,
    removeItem,
    discount,
    setDiscount,
    applyTax,    // <--- Exportamos
    setApplyTax, // <--- Exportamos
    totals
  };
};