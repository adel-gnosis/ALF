import "./../i18n"; // Higher level i18n initialization
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { setTokenProvider, setApiBaseUrl } from '@alf/shared';
import storage from '../services/storage';
import { API_URL } from '../services/api';

import { AuthProvider } from '../context/AuthContext';

// Initialize shared package API with mobile configuration
setApiBaseUrl(API_URL);
setTokenProvider(async () => {
    return await storage.getItem('access_token');
});

const queryClient = new QueryClient();

export default function RootLayout() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <SafeAreaProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen name="index" options={{ headerShown: false }} />
                        <Stack.Screen name="session/[id]" options={{ headerShown: false }} />
                        <Stack.Screen name="session-complete" options={{ headerShown: false }} />
                        <Stack.Screen name="placement/start" options={{ headerShown: false }} />
                        <Stack.Screen name="placement/[id]" options={{ headerShown: false }} />
                        <Stack.Screen name="placement/complete" options={{ headerShown: false }} />
                        <Stack.Screen name="lesson/[id]" />
                    </Stack>
                </SafeAreaProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
}
