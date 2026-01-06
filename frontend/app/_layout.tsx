import { Stack } from "expo-router";
import { SavedCafesProvider } from "../context/SavedCafesContext";
import { CheckInProvider } from "../context/CheckInContext";
import { ReservationProvider } from "../context/ReservationContext";
import { Amplify } from 'aws-amplify'

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.EXPO_PUBLIC_USER_POOL_ID!,
      userPoolClientId: process.env.EXPO_PUBLIC_USER_POOL_CLIENT_ID!,
    }
  }
})


export default function Layout() {
  return (
    <SavedCafesProvider>
      <CheckInProvider>
        <ReservationProvider>
          <Stack />
        </ReservationProvider>
      </CheckInProvider>
    </SavedCafesProvider>
  );
}
