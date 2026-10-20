import { request, getInit } from './bridge.js';
export const loadQuotationCatalog = (country, owner, type) => request('catalog', { type });
export const loadQuotationLaborReferences = () => request('references');
export const useAuth = () => ({ user: { id: getInit().owner, user_type: 'tecnico' } });
