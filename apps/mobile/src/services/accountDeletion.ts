import { supabase } from '../lib/supabase';
import { getWebApiUrl } from '../utils/config';

const DELETE_ACCOUNT_PATH = '/api/account/delete';

export const deleteCurrentAccount = async () => {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message || 'No se pudo validar la sesion.');
  }

  let accessToken = session?.access_token || '';
  if (!accessToken) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      throw new Error(refreshError.message || 'Sesion expirada. Ingresa nuevamente e intenta otra vez.');
    }
    accessToken = refreshData?.session?.access_token || '';
  }

  if (!accessToken) {
    throw new Error('Sesion expirada. Ingresa nuevamente e intenta otra vez.');
  }

  const response = await fetch(getWebApiUrl(DELETE_ACCOUNT_PATH), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ source: 'mobile_app' }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const apiMessage =
      payload && typeof payload.error === 'string'
        ? payload.error
        : 'No pudimos eliminar la cuenta por ahora.';
    throw new Error(apiMessage);
  }

  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) {
    const signOutMessage = String(signOutError.message || '');
    if (!/auth session missing/i.test(signOutMessage)) {
      throw new Error(signOutMessage || 'La cuenta se elimino, pero no se pudo cerrar sesion.');
    }
  }
};
