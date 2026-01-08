import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';

// Iniciar Sesión
export const signIn = async (email: string, pass: string) => {
  console.log(">>> INTENTANDO LOGIN:", email);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });

  if (error) {
    console.error(">>> ERROR LOGIN:", error.message);
    Alert.alert('Error al ingresar', error.message);
    return null;
  }
  
  console.log(">>> LOGIN EXITOSO:", data.user?.id);
  return data;
};

// Crear Cuenta Nueva
export const signUp = async (email: string, pass: string) => {
  console.log(">>> INTENTANDO REGISTRO:", email);

  const { data, error } = await supabase.auth.signUp({
    email,
    password: pass,
    options: {
      data: { full_name: 'Usuario Nuevo' }, 
    },
  });

  if (error) {
    console.error(">>> ERROR REGISTRO:", error.message);
    Alert.alert('Error Crítico', error.message);
    return null;
  }

  console.log(">>> RESPUESTA SUPABASE:", data);

  // Si no hay sesión, significa que Supabase TODAVÍA espera confirmación de email
  // o que la configuración no se aplicó bien.
  if (!data.session) {
    console.warn(">>> SIN SESIÓN: Supabase pide confirmar email");
    Alert.alert(
      'Atención', 
      'El usuario se creó, pero Supabase no devolvió la sesión. ¿Seguro desactivaste "Confirm Email" y guardaste?'
    );
    return null;
  }

  console.log(">>> REGISTRO EXITOSO CON SESIÓN");
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) Alert.alert('Error', error.message);
};