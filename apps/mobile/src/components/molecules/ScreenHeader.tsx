import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS, LAYOUT } from '../../utils/theme';

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode; // Por si queremos poner un icono a la derecha
  centerTitle?: boolean;
  onBack?: () => void;
}

export const ScreenHeader = memo(({ title, subtitle, showBack, rightAction, onBack }: Props) => {
  const navigation = useNavigation();

  return (
    <View style={styles.headerContainer} testID="screen-header">
      <SafeAreaView edges={['top']}>
        <View style={styles.headerContent}>
          
          <View style={styles.leftContainer}>
            {showBack && (
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver" onPress={onBack || (() => navigation.goBack())} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color="#FFF" />
              </TouchableOpacity>
            )}
            <View style={styles.headingText}>
              <Text accessibilityRole="header" style={styles.title}>{title}</Text>
              {subtitle && (
                <Text style={styles.subtitle}>
                  {subtitle}
                </Text>
              )}
            </View>
          </View>

          {rightAction && <View style={styles.rightContainer}>{rightAction}</View>}
          
        </View>
      </SafeAreaView>
    </View>
  );
});

export function HeaderIconButton({ name, label, onPress, disabled = false }: { name: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; disabled?: boolean }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.headerAction, disabled && { opacity: .45 }]}><Ionicons name={name} size={22} color={COLORS.white} /></TouchableOpacity>;
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: COLORS.secondary,
    paddingBottom: 18,
    borderBottomLeftRadius: LAYOUT.headerRadius,
    borderBottomRightRadius: LAYOUT.headerRadius,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 10,
  },
  headerContent: {
    paddingHorizontal: LAYOUT.pageInset,
    paddingTop: Platform.OS === 'android' ? 10 : 8,
    minHeight: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  rightContainer: {
    marginLeft: 8,
    flexShrink: 0,
  },
  headingText: { flex: 1, minWidth: 0 },
  backBtn: {
    marginRight: 8,
    width: LAYOUT.touchTarget,
    minHeight: LAYOUT.touchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: FONTS.title,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0,
    color: '#FFF',
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  headerAction: { width: LAYOUT.touchTarget, minHeight: LAYOUT.touchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: LAYOUT.controlRadius, backgroundColor: 'rgba(255,255,255,.1)' },
});
