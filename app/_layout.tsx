import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function Layout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        {/* headerShown: false esconde a barra superior padrão */}
        <Stack.Screen name="index" />
      </Stack>
    </>
  );
}