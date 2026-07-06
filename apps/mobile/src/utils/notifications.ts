import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type * as ExpoNotifications from 'expo-notifications';

type NotificationsModule = typeof ExpoNotifications;

let notificationsLoader: Promise<NotificationsModule> | null = null;
let notificationHandlerReady = false;

const isExpoGo = () => {
  const runtimeConstants = Constants as typeof Constants & { executionEnvironment?: string };
  return Constants.appOwnership === 'expo' || runtimeConstants.executionEnvironment === 'storeClient';
};

const getNotificationsAsync = async (): Promise<NotificationsModule | null> => {
  if (isExpoGo()) {
    return null;
  }

  notificationsLoader ??= import('expo-notifications');
  const Notifications = await notificationsLoader;

  if (!notificationHandlerReady) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    notificationHandlerReady = true;
  }

  return Notifications;
};

export const ensureAndroidChannel = async () => {
  if (Platform.OS !== 'android') return;
  const Notifications = await getNotificationsAsync();
  if (!Notifications) return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
};

export const registerForPushNotificationsAsync = async (): Promise<string | null> => {
  if (isExpoGo()) {
    return null;
  }

  await ensureAndroidChannel();
  const Notifications = await getNotificationsAsync();
  if (!Notifications) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
};

export const showLocalNotification = async (title: string, body: string) => {
  const Notifications = await getNotificationsAsync();
  if (!Notifications) return;

  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
};
