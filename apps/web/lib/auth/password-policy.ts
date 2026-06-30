export const PASSWORD_POLICY_MESSAGE =
  'La contrasena debe tener al menos 8 caracteres, una minuscula, una mayuscula y un numero.';

export const getPasswordPolicyError = (password: string) => {
  const value = String(password || '').trim();
  if (value.length < 8) return PASSWORD_POLICY_MESSAGE;
  if (!/[a-z]/.test(value)) return PASSWORD_POLICY_MESSAGE;
  if (!/[A-Z]/.test(value)) return PASSWORD_POLICY_MESSAGE;
  if (!/\d/.test(value)) return PASSWORD_POLICY_MESSAGE;
  return '';
};
