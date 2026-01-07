import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { useShareIntent } from 'expo-share-intent';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  // Listen for share intents from other apps
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent({
    debug: true, // Enable debug logs during development
    resetOnBackground: true,
  });

  useEffect(() => {
    // When an image is shared to your app
    if (hasShareIntent && shareIntent) {
      console.log('Share intent received:', shareIntent);

      // Check if it's an image being shared
      if (shareIntent.type === 'media' && shareIntent.files && shareIntent.files.length > 0) {
        const sharedImageUri = shareIntent.files[0].path;

        console.log('Shared image URI:', sharedImageUri);

        // Navigate to the analyze screen with the image
        router.push({
          pathname: '/analyze',
          params: { imageUri: sharedImageUri },
        });

        // Reset the share intent after handling
        resetShareIntent();
      } else if (shareIntent.type === 'text' && shareIntent.text) {
        // Handle shared text/URLs if needed
        console.log('Shared text:', shareIntent.text);
        resetShareIntent();
      }
    }
  }, [hasShareIntent, shareIntent]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="analyze"
          options={{
            presentation: 'modal',
            title: 'Analyze Image',
            headerShown: false,
          }}
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
