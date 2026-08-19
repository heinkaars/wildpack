import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../lib/auth';
import { LifelistProvider } from '../lib/lifelist-store';
import { CaptureSessionProvider } from '../lib/capture-session';
import { colors } from '../lib/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <LifelistProvider>
            <CaptureSessionProvider>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="capture/index" />
                <Stack.Screen name="capture/identify" />
                <Stack.Screen name="capture/result" />
                <Stack.Screen name="species/[id]" options={{ presentation: 'modal' }} />
                <Stack.Screen name="ama/[id]" options={{ presentation: 'modal' }} />
              </Stack>
            </CaptureSessionProvider>
          </LifelistProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
