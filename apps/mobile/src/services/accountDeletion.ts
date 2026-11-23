import { supabase } from '../lib/supabase';
import { workflowRequest } from '../api/workflows';

export const DELETION_WARNING = 'Se registrará una solicitud de eliminación. El equipo verificará el pedido antes de borrar la cuenta; la eliminación no es inmediata.';
export const DELETION_SUCCESS = 'Solicitud de eliminación registrada. Podés consultar su estado en Preferencias de UrbanFix Web.';

export const deleteCurrentAccount = async () => {
  const { data, error } = await supabase.auth.getSession();
  const owner = data.session?.user.id;
  if (error || !owner) throw new Error('Iniciá sesión nuevamente para solicitar la eliminación.');
  const result = await workflowRequest({ owner }, 'account-workflow', {
    action: 'request_deletion', data: { scope: 'full_account', details: 'Solicitud desde la app móvil.' },
  });
  if (!result.request?.id || !['pending', 'verified', 'processing'].includes(result.request.status)) {
    throw new Error('El servidor no confirmó la solicitud de eliminación. Consultá Preferencias antes de reintentar.');
  }
  // A queued request is not deletion; keep the session so it can be consulted/cancelled.
  return result.request;
};
