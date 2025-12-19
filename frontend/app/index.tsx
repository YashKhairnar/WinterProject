import { View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
import { Link, Stack, useRouter } from "expo-router";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { getCurrentUser } from "aws-amplify/auth";

const { width } = Dimensions.get("window");

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const user = await getCurrentUser();
      if (user) {
        router.replace('/home');
      }
    } catch (e) {
      // User is not signed in, stay on landing page
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />

      {/* Background decoration or gradient could go here */}
      <View style={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>The Cafe App</Text>
          <Text style={styles.subtitle}>Find your perfect spot</Text>
        </View>

        <View style={styles.buttonContainer}>
          <Link href="/auth/login" asChild>
            <Pressable style={styles.buttonPrimary}>
              <Text style={styles.buttonTextPrimary}>Login</Text>
            </Pressable>
          </Link>

          <Link href="/auth/signup" asChild>
            <Pressable style={styles.buttonSecondary}>
              <Text style={styles.buttonTextSecondary}>Sign Up</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A", // Very dark grey/black
    justifyContent: "space-between",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 100,
    paddingHorizontal: 20,
  },
  headerContainer: {
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 42,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#888888",
    fontWeight: "500",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  buttonContainer: {
    width: "100%",
    gap: 16,
    maxWidth: 400,
  },
  buttonPrimary: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#FFFFFF",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  buttonTextPrimary: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333333",
  },
  buttonTextSecondary: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
