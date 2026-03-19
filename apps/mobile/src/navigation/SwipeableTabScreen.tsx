import React, { PropsWithChildren, useMemo } from 'react';
import { PanResponder, Platform, View } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';

const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 0.35;
const SWIPE_MIN_DX = 26;
const SWIPE_SLOPE_RATIO = 2;

export default function SwipeableTabScreen({ children }: PropsWithChildren) {
  const navigation = useNavigation();
  const state = useNavigationState((navState) => navState);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gesture) => {
          if (Platform.OS === 'web') return false;
          const { dx, dy, numberActiveTouches } = gesture;
          if (numberActiveTouches && numberActiveTouches > 1) return false;
          if (Math.abs(dx) < SWIPE_MIN_DX) return false;
          return Math.abs(dx) > Math.abs(dy) * SWIPE_SLOPE_RATIO;
        },
        onPanResponderRelease: (_evt, gesture) => {
          if (!state || !state.routes?.length) return;
          const { dx, vx } = gesture;
          if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(vx) < SWIPE_VELOCITY) return;
          const direction = dx > 0 ? -1 : 1;
          const nextIndex = state.index + direction;
          if (nextIndex < 0 || nextIndex >= state.routes.length) return;
          const nextRoute = state.routes[nextIndex];
          if (!nextRoute?.name) return;
          navigation.navigate(nextRoute.name as never);
        },
      }),
    [navigation, state]
  );

  if (Platform.OS === 'web') {
    return <>{children}</>;
  }

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      {children}
    </View>
  );
}
