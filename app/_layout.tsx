import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../lib/auth';
import { LifelistProvider } from '../lib/lifelist-store';
import { CaptureSessionProvider } from '../lib/capture-session';
import { OnboardingGate, OnboardingProvider } from '../lib/onboarding';
import { colors } from '../lib/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <LifelistProvider>
            <OnboardingProvider>
              <CaptureSessionProvider>
                <StatusBar style="dark" />
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="onboarding/welcome" />
                  <Stack.Screen name="onboarding/look" />
                  <Stack.Screen name="onboarding/name" />
                  <Stack.Screen name="onboarding/first-capture" />
                  <Stack.Screen name="account" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="auth/sign-in" />
                  <Stack.Screen name="auth/create-account" />
                  <Stack.Screen name="auth/forgot-password" />
                  <Stack.Screen name="auth/verify" />
                  <Stack.Screen name="capture/index" />
                  <Stack.Screen name="capture/identify" />
                  <Stack.Screen name="capture/result" />
                  <Stack.Screen name="species/[id]" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="ama/[id]" options={{ presentation: 'modal' }} />
                </Stack>
                {/* Sits above the stack so the lifelist cannot flash before we
                    know whether this user still owes us onboarding. */}
                <OnboardingGate />
              </CaptureSessionProvider>
            </OnboardingProvider>
          </LifelistProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
