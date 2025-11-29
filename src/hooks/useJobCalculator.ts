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
  
  // NUEVOS ESTADOS PARA EL CLIENTE
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  
  const [discount, setDiscount] = useState(0);
  const [applyTax, setApplyTax] = useState(false);

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

  // Cálculos
  const totals = useMemo(() => {
    const subtotal = items.reduce((acc, item) => {
      return item.isActive ? acc + (item.price * item.quantity) : acc;
    }, 0);

    const totalAfterDiscount = Math.max(0, subtotal - discount);
    const taxAmount = applyTax ? totalAfterDiscount * 0.21 : 0;
    const total = totalAfterDiscount + taxAmount;
    
    const isRisk = discount > (subtotal * 0.15); 

    return { subtotal, taxAmount, total, isRisk };
  }, [items, discount, applyTax]);

  return {
    items,
    setItems,
    // Exportamos los nuevos setters
    clientName, setClientName,
    clientAddress, setClientAddress,
    // Resto igual
    updateQuantity, updatePrice, toggleItem, addItem, removeItem,
    discount, setDiscount, applyTax, setApplyTax, totals
  };
};