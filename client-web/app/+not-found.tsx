import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <Text style={styles.text}>Esta pantalla no existe.</Text>
      <Link href="/" style={styles.link}>
        <Text style={styles.linkText}>Volver al Inicio</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  text: { fontSize: 20, fontWeight: 'bold' },
  link: { marginTop: 15, paddingVertical: 15 },
  linkText: { fontSize: 14, color: '#2e78b7' },
});