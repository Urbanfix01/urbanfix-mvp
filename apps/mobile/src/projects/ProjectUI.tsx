import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, LAYOUT, FORM } from '../utils/theme';
import { ScreenHeader } from '../components/molecules/ScreenHeader';

export const INK = COLORS.text, TEAL = COLORS.brand, MUTED = COLORS.textSecondary, BORDER = COLORS.border, PAPER = COLORS.background;
export type IconName = React.ComponentProps<typeof Ionicons>['name'];
export function ProjectHeader({ title, subtitle, back, action }: { title: string; subtitle?: string; back?: () => void; action?: React.ReactNode }) {
  return <ScreenHeader title={title} subtitle={subtitle} showBack={!!back} onBack={back} rightAction={action} />;
}
export function IconButton({ name, label, onPress, disabled = false, inverse = false }: { name: IconName; label: string; onPress: () => void; disabled?: boolean; inverse?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [ui.iconButton, inverse && ui.inverseButton, pressed && ui.pressed, disabled && ui.disabled]}><Ionicons name={name} size={21} color={inverse ? COLORS.white : TEAL} /></Pressable>;
}
export function Action({ title, icon, onPress, disabled = false, primary = false, busy = false }: { title: string; icon?: IconName; onPress: () => void; disabled?: boolean; primary?: boolean; busy?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [ui.action, primary && ui.primary, pressed && ui.pressed, (disabled || busy) && ui.disabled]}>{busy ? <ActivityIndicator size="small" color={TEAL} /> : icon ? <Ionicons name={icon} size={19} color={TEAL} /> : null}<Text style={ui.actionText}>{title}</Text></Pressable>;
}
export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return <View style={{ minWidth: 0, marginBottom: 18 }}><Text style={ui.label}>{label}</Text><TextInput accessibilityLabel={label} accessibilityHint={error} placeholderTextColor="#7d9297" {...props} style={[ui.input, props.multiline && { minHeight: 76, textAlignVertical: 'top' }, error && { borderColor: '#b54e18' }, props.style]} />{error ? <Text accessibilityRole="alert" style={ui.warning}>{error}</Text> : null}</View>;
}
export function Notice({ text }: { text?: string }) { return text ? <Text accessibilityRole="alert" style={ui.notice}>{text}</Text> : null; }
export const ui = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAPER },
  title: { fontFamily: FONTS.title, fontSize: 23, color: INK }, heading: { fontFamily: FONTS.title, fontSize: 16, color: INK, marginBottom: 12 },
  text: { fontFamily: FONTS.body, fontSize: 15, lineHeight: 23, color: INK }, muted: { fontFamily: FONTS.body, fontSize: 12, lineHeight: 19, color: MUTED },
  label: { fontFamily: FONTS.subtitle, fontSize: 12, color: MUTED, marginBottom: 8 },
  input: FORM.input,
  iconButton: { minWidth: LAYOUT.touchTarget, minHeight: LAYOUT.touchTarget, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER, backgroundColor: COLORS.white, borderRadius: LAYOUT.controlRadius },
  inverseButton: { borderColor: 'transparent', backgroundColor: 'rgba(255,255,255,.1)' },
  action: { minHeight: LAYOUT.controlHeight, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 13, gap: 8, borderWidth: 1, borderColor: BORDER, borderRadius: LAYOUT.controlRadius, backgroundColor: COLORS.white },
  actionText: { flexShrink: 1, fontFamily: FONTS.subtitle, fontSize: 14, color: TEAL }, primary: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pressed: { opacity: .7 }, disabled: { opacity: .45 }, content: { padding: LAYOUT.pageInset, paddingBottom: LAYOUT.pageBottom },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, band: { borderBottomWidth: 1, borderBottomColor: BORDER, paddingVertical: 18 },
  notice: { color: '#8b4f16', backgroundColor: '#fff3e5', borderLeftWidth: 2, borderLeftColor: '#bd681c', padding: 12, fontFamily: FONTS.body, fontSize: 12, lineHeight: 19, marginVertical: 10 },
  warning: { color: '#a34619', fontSize: 12, lineHeight: 18, marginTop: 6 }, footer: { padding: LAYOUT.pageInset, borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: COLORS.white, flexDirection: 'row', gap: 10 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '85%', backgroundColor: PAPER, padding: LAYOUT.pageInset, borderTopLeftRadius: LAYOUT.cardRadius, borderTopRightRadius: LAYOUT.cardRadius },
});
