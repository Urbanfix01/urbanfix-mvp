import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '../utils/theme';

export const INK = '#26444c', TEAL = '#006e68', MUTED = '#536e76', BORDER = '#d5dfdf', PAPER = '#f7f8f8';
export type IconName = React.ComponentProps<typeof Ionicons>['name'];
export function ProjectHeader({ title, subtitle, back, action }: { title: string; subtitle?: string; back?: () => void; action?: React.ReactNode }) {
  return <View style={ui.header}>
    <View style={ui.headerTop}>{back ? <IconButton name="arrow-back" label="Volver" onPress={back} /> : <Image source={require('../../assets/icon.png')} style={ui.logo} accessibilityLabel="UrbanFix" />}<Text style={ui.brand}>URBAN<Text style={{ color: '#e87917' }}>FIX</Text></Text><View style={{ marginLeft: 'auto' }}>{action}</View></View>
    <Text accessibilityRole="header" style={ui.title}>{title}</Text>{subtitle ? <Text style={ui.muted}>{subtitle}</Text> : null}
  </View>;
}
export function IconButton({ name, label, onPress, disabled = false }: { name: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [ui.iconButton, pressed && ui.pressed, disabled && ui.disabled]}><Ionicons name={name} size={21} color={TEAL} /></Pressable>;
}
export function Action({ title, icon, onPress, disabled = false, primary = false, busy = false }: { title: string; icon?: IconName; onPress: () => void; disabled?: boolean; primary?: boolean; busy?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [ui.action, primary && ui.primary, pressed && ui.pressed, (disabled || busy) && ui.disabled]}>{busy ? <ActivityIndicator size="small" color={primary ? '#fff' : TEAL} /> : icon ? <Ionicons name={icon} size={19} color={primary ? '#fff' : TEAL} /> : null}<Text style={[ui.actionText, primary && { color: '#fff' }]}>{title}</Text></Pressable>;
}
export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return <View style={{ minWidth: 0, marginBottom: 18 }}><Text style={ui.label}>{label}</Text><TextInput accessibilityLabel={label} accessibilityHint={error} placeholderTextColor="#7d9297" {...props} style={[ui.input, props.multiline && { minHeight: 76, textAlignVertical: 'top' }, error && { borderColor: '#b54e18' }, props.style]} />{error ? <Text accessibilityRole="alert" style={ui.warning}>{error}</Text> : null}</View>;
}
export function Notice({ text }: { text?: string }) { return text ? <Text accessibilityRole="alert" style={ui.notice}>{text}</Text> : null; }
export const ui = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAPER },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: '#fff', gap: 6 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 44, marginBottom: 6 },
  logo: { width: 32, height: 32, borderRadius: 5 }, brand: { fontFamily: FONTS.title, fontSize: 18, color: INK },
  title: { fontFamily: FONTS.title, fontSize: 23, color: INK }, heading: { fontFamily: FONTS.title, fontSize: 16, color: INK, marginBottom: 12 },
  text: { fontFamily: FONTS.body, fontSize: 15, lineHeight: 23, color: INK }, muted: { fontFamily: FONTS.body, fontSize: 12, lineHeight: 19, color: MUTED },
  label: { fontFamily: FONTS.subtitle, fontSize: 12, color: MUTED, marginBottom: 8 },
  input: { minHeight: 48, minWidth: 0, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, fontFamily: FONTS.body, fontSize: 16, color: INK, borderRadius: 3 },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff', borderRadius: 3 },
  action: { minHeight: 48, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 13, gap: 8, borderWidth: 1, borderColor: BORDER, borderRadius: 3, backgroundColor: '#fff' },
  actionText: { flexShrink: 1, fontFamily: FONTS.subtitle, fontSize: 13, color: TEAL }, primary: { backgroundColor: TEAL, borderColor: TEAL },
  pressed: { opacity: .7 }, disabled: { opacity: .45 }, content: { padding: 16, paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, band: { borderBottomWidth: 1, borderBottomColor: BORDER, paddingVertical: 18 },
  notice: { color: '#8b4f16', backgroundColor: '#fff3e5', borderLeftWidth: 2, borderLeftColor: '#bd681c', padding: 12, fontFamily: FONTS.body, fontSize: 12, lineHeight: 19, marginVertical: 10 },
  warning: { color: '#a34619', fontSize: 12, lineHeight: 18, marginTop: 6 }, footer: { padding: 16, borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: PAPER, flexDirection: 'row', gap: 10 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '85%', backgroundColor: PAPER, padding: 16, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
});
