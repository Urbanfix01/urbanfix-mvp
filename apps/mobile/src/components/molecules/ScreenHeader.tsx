import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS } from '../../utils/theme';

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode; // Por si queremos poner un icono a la derecha
  centerTitle?: boolean;
}

export const ScreenHeader = ({ title, subtitle, showBack, rightAction, centerTitle }: Props) => {
  const navigation = useNavigation();
  const isCentered = centerTitle && !showBack && !rightAction;

  return (
    <View style={styles.headerContainer}>
      <SafeAreaView edges={['top']}>
        <View style={[styles.headerContent, isCentered && styles.headerContentCentered]}>
          
          <View style={[styles.leftContainer, isCentered && styles.leftContainerCentered]}>
            {showBack && (
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color="#FFF" />
              </TouchableOpacity>
            )}
            <View>
              <Text style={[styles.title, isCentered && styles.titleCentered]}>{title}</Text>
              {subtitle && (
                <Text style={[styles.subtitle, isCentered && styles.titleCentered]}>
                  {subtitle}
                </Text>
              )}
            </View>
          </View>

          {!isCentered && rightAction && <View style={styles.rightContainer}>{rightAction}</View>}
          
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: COLORS.secondary,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 10,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 10 : 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContentCentered: {
    justifyContent: 'center',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  leftContainerCentered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightContainer: {
    marginLeft: 10,
  },
  backBtn: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    fontFamily: FONTS.title,
    fontSize: 22,
    color: '#FFF',
  },
  titleCentered: {
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
});
