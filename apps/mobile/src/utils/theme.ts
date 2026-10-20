// src/utils/theme.ts

// 1. COLORES (Oficiales Brandbook)
export const COLORS = {
  primary: '#FF8F1F',
  secondary: '#2C3E50',    // Gris Oscuro Oficial
  brand: '#2D0438',
  background: '#F7F2EC',
  surfaceMuted: '#F3ECE7',
  border: '#E9DCD1',
  accentSoft: '#FFF2DE',
  card: '#FFFFFF',
  
  // Textos
  text: '#17001F',
  textLight: '#6B6170',
  
  // UI
  inputBg: '#2C3E50',
  white: '#FFFFFF',
  success: '#27AE60',
  danger: '#E74C3C',
  
  // ALIAS (Compatibilidad con el nuevo código)
  textPrimary: '#17001F',
  textSecondary: '#6B6170',
  error: '#E74C3C',
  headerBg: '#2C3E50',
  cardBg: '#FFFFFF',
};

// 2. ESPACIADO
export const SPACING = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
  cardRadius: 12,
};

export const LAYOUT = {
  pageInset: 16,
  pageBottom: 32,
  controlHeight: 48,
  touchTarget: 44,
  controlRadius: 12,
  cardRadius: 20,
  headerRadius: 24,
};

// 3. FUENTES
export const FONTS = {
  title: 'Montserrat_700Bold',
  subtitle: 'Raleway_600SemiBold',
  body: 'Raleway_400Regular',
};

export const FORM = {
  input: { minWidth: 0, minHeight: LAYOUT.controlHeight, borderWidth: 1, borderColor: COLORS.border, borderRadius: LAYOUT.controlRadius, paddingHorizontal: 12, paddingVertical: 10, fontFamily: FONTS.body, fontSize: 16, color: COLORS.text, backgroundColor: COLORS.white },
  button: { minHeight: LAYOUT.controlHeight, borderRadius: LAYOUT.controlRadius, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: COLORS.text, fontFamily: FONTS.subtitle, fontSize: 14 },
} as const;

// 4. THEME OBJECT (Aquí estaba el error de sintaxis)
export const THEME = {
  colors: COLORS,
  spacing: SPACING,
  fonts: FONTS,
shadows: {
    default: {
      shadowColor: COLORS.secondary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
  },
};
