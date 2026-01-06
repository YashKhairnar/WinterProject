import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { Link, Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { signIn } from 'aws-amplify/auth';
import { Colors, Shadows } from "../../constants/theme";

export default function Login() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSignIn() {
        if (loading) return;
        setLoading(true);
        try {
            await signIn({ username: email, password });
            router.replace('/home'); // Redirect to your home screen
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="dark" />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.contentContainer}
            >
                <View style={styles.headerContainer}>
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Sign in to continue</Text>
                </View>

                <View style={styles.formContainer}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your email"
                            placeholderTextColor="#666"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your password"
                            placeholderTextColor="#666"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <Pressable style={styles.buttonPrimary} onPress={handleSignIn} disabled={loading}>
                        <Text style={styles.buttonTextPrimary}>{loading ? "Signing in..." : "Login"}</Text>
                    </Pressable>
                </View>

                <View style={styles.footerContainer}>
                    <Text style={styles.footerText}>Don't have an account? </Text>
                    <Link href="/auth/signup" asChild>
                        <Pressable>
                            <Text style={styles.linkText}>Sign Up</Text>
                        </Pressable>
                    </Link>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundLight,
    },
    contentContainer: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    headerContainer: {
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: "800",
        color: Colors.primary,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.textSecondary,
    },
    formContainer: {
        gap: 20,
        marginBottom: 40,
    },
    inputContainer: {
        gap: 8,
    },
    label: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: "600",
        marginLeft: 4,
        opacity: 0.8,
    },
    input: {
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: 16,
        color: Colors.primary,
        fontSize: 16,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    buttonPrimary: {
        backgroundColor: Colors.primary,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: "center",
        marginTop: 12,
        ...Shadows.medium,
    },
    buttonTextPrimary: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: "700",
    },
    footerContainer: {
        flexDirection: "row",
        justifyContent: "center",
    },
    footerText: {
        color: Colors.textSecondary,
        fontSize: 14,
    },
    linkText: {
        color: Colors.cta,
        fontSize: 14,
        fontWeight: "700",
    },
});