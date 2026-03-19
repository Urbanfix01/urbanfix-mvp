import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Aquí definimos que el grupo "(tabs)" es la estructura principal.
        headerShown: false es CRÍTICO para no tener doble barra de título.
      */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}