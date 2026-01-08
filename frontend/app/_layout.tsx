import { Stack } from "expo-router";
import { SavedCafesProvider } from "../context/SavedCafesContext";
import { CheckInProvider } from "../context/CheckInContext";
import { ReservationProvider } from "../context/ReservationContext";
import { Amplify } from 'aws-amplify'
import { useFonts, Outfit_400Regular, Outfit_600SemiBold, Outfit_700Bold, Outfit_900Black } from '@expo-google-fonts/outfit';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.EXPO_PUBLIC_USER_POOL_ID!,
      userPoolClientId: process.env.EXPO_PUBLIC_USER_POOL_CLIENT_ID!,
    }
  }
})


export default function Layout() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_900Black,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SavedCafesProvider>
      <CheckInProvider>
        <ReservationProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </ReservationProvider>
      </CheckInProvider>
    </SavedCafesProvider>
  );
}
