import { View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
import { Link, Stack, useRouter } from "expo-router";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { getCurrentUser } from "aws-amplify/auth";
import { Colors, Shadows, Typography } from "../constants/theme";

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
      <StatusBar style="dark" />

      <View style={styles.outerContainer}>
        {/* Top Section: Branding */}
        <View style={styles.headerSection}>
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.logo}
            contentFit="contain"
          />
          <View style={styles.welcomeContainer}>
            <View style={styles.welcomeLine} />
            <Text style={styles.welcomeText}>WELCOME TO</Text>
            <View style={styles.welcomeLine} />
          </View>
          <Text style={styles.title}>nook</Text>
          <Text style={styles.subtitle}>Your perfect nook, nearby.</Text>
        </View>

        {/* Middle Section: Artistic Sketch */}
        <View style={styles.imageSection}>
          <Image
            source={require("../assets/images/hero.png")}
            style={styles.heroImage}
            contentFit="contain" // Proportions are preserved
            transition={1000}
          />
        </View>

        {/* Bottom Section: Actions */}
        <View style={styles.footerSection}>
          <Link href="/auth/login" asChild>
            <Pressable style={styles.buttonPrimary}>
              <Text style={styles.buttonTextPrimary}>Log In</Text>
            </Pressable>
          </Link>

          <Link href="/auth/signup" asChild>
            <Pressable style={styles.buttonSecondary}>
              <Text style={styles.buttonTextSecondary}>Get Started</Text>
            </Pressable>
          </Link>

          <Text style={styles.footerText}>
            Join the collective of premier focus spaces.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  outerContainer: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 70,
    paddingHorizontal: 32,
  },
  headerSection: {
    alignItems: "center",
    width: "100%",
  },
  welcomeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  welcomeLine: {
    width: 16,
    height: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  welcomeText: {
    color: "rgba(0,0,0,0.3)",
    fontSize: 10,
    fontFamily: Typography.black,
    letterSpacing: 2,
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: 20,
    borderRadius: 16,
  },
  title: {
    fontSize: 56,
    fontFamily: Typography.black,
    color: "#1A1A1A",
    letterSpacing: -2,
    lineHeight: 56,
  },
  subtitle: {
    fontSize: 17,
    color: "rgba(0,0,0,0.5)",
    fontFamily: Typography.semiBold,
    marginTop: 0,
    letterSpacing: -0.3,
  },
  imageSection: {
    flex: 2, // Give the image more weight in the vertical stack
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 0, // Tighten up to let the image grow
  },
  heroImage: {
    width: "110%", // Allow it to bleed slightly for a more artistic feel
    height: "100%",
    maxHeight: 480,
  },
  footerSection: {
    width: "100%",
    gap: 12,
  },
  buttonPrimary: {
    backgroundColor: "#3D2B1F", // Mocha/Umbar tone matching the sketch lines
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  buttonTextPrimary: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: Typography.black,
    letterSpacing: 0.5,
  },
  buttonSecondary: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#F5F5F3",
  },
  buttonTextSecondary: {
    color: "#1A1A1A",
    fontSize: 18,
    fontFamily: Typography.bold,
    letterSpacing: 0.5,
  },
  footerText: {
    color: "rgba(0,0,0,0.2)",
    fontSize: 11,
    textAlign: "center",
    marginTop: 16,
    fontFamily: Typography.semiBold,
  },
});
