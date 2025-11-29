// src/utils/theme.ts

// 1. COLORES (Oficiales Brandbook)
export const COLORS = {
  primary: '#F39C12',      // Naranja Oficial
  secondary: '#2C3E50',    // Gris Oscuro Oficial
  background: '#F4F6F8',
  card: '#FFFFFF',
  
  // Textos
  text: '#2C3E50',
  textLight: '#95A5A6',
  
  // UI
  inputBg: '#2C3E50',
  white: '#FFFFFF',
  success: '#27AE60',
  danger: '#E74C3C',
  
  // ALIAS (Compatibilidad con el nuevo código)
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
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

// 3. FUENTES
export const FONTS = {
  title: 'Montserrat_700Bold',
  subtitle: 'Raleway_600SemiBold',
  body: 'Raleway_400Regular',
};

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