import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, FONTS, LAYOUT } from '../../utils/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader, HeaderIconButton } from './ScreenHeader';
import type { GeoOption } from '../../utils/argentinaGeo';

type Props = {
  visible: boolean;
  title: string;
  options: GeoOption[];
  loading?: boolean;
  searchPlaceholder: string;
  emptyText: string;
  onClose: () => void;
  onSelect: (option: GeoOption) => void;
};

const normalize = (value: string) =>
  value
    .toLocaleLowerCase('es-AR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export function OptionSelectModal({
  visible,
  title,
  options,
  loading = false,
  searchPlaceholder,
  emptyText,
  onClose,
  onSelect,
}: Props) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) {
      setSearch('');
      return;
    }

    const timeout = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(timeout);
  }, [visible]);

  const filteredOptions = useMemo(() => {
    const term = normalize(search.trim());
    if (!term) return options;
    return options.filter((option) => normalize(option.label).includes(term));
  }, [options, search]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView edges={['bottom']} style={styles.container}>
        <ScreenHeader title={title} rightAction={<HeaderIconButton name="close" label="Cerrar" onPress={onClose} />} />

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#7F8792" />
          <TextInput
            ref={inputRef}
            accessibilityLabel={searchPlaceholder}
            value={search}
            onChangeText={setSearch}
            placeholder={searchPlaceholder}
            placeholderTextColor="#7F8792"
            style={styles.input}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#7F8792" />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.helperText}>Cargando opciones...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredOptions}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={filteredOptions.length ? styles.listContent : styles.emptyContent}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.optionRow} onPress={() => onSelect(item)} activeOpacity={0.85}>
                <Text style={styles.optionText}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.helperText}>{emptyText}</Text>}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: LAYOUT.pageInset,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    borderRadius: LAYOUT.controlRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    minHeight: LAYOUT.controlHeight,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontFamily: FONTS.body,
    fontSize: 15,
    paddingVertical: 12,
  },
  listContent: {
    paddingHorizontal: LAYOUT.pageInset,
    paddingBottom: LAYOUT.pageBottom,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 10,
    borderRadius: LAYOUT.controlRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  optionText: {
    flex: 1,
    color: COLORS.text,
    fontFamily: FONTS.subtitle,
    fontSize: 15,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  emptyContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  helperText: {
    color: '#7F8792',
    fontFamily: FONTS.body,
    fontSize: 14,
    textAlign: 'center',
  },
});
