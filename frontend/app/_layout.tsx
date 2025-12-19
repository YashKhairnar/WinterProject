import { Stack } from "expo-router";
import { SavedCafesProvider } from "../context/SavedCafesContext";
import { CheckInProvider } from "../context/CheckInContext";
import { ReservationProvider } from "../context/ReservationContext";
import { Amplify } from 'aws-amplify'

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_PfEHaXh6n',
      userPoolClientId: '6e7uuueuip2a7v0nt44prekib0',
      loginWith: {
        oauth: {
          domain: 'us-east-1pfehaxh6n.auth.us-east-1.amazoncognito.com',
          scopes: ['email', 'openid'],
          redirectSignIn: ['frontend://'],
          redirectSignOut: ['frontend://'],
          responseType: 'code',
        }
      }
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
