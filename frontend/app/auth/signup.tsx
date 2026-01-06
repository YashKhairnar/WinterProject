import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { Link, Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { signUp, confirmSignUp } from 'aws-amplify/auth';
import AntDesign from "@expo/vector-icons/AntDesign";
import { Colors, Shadows } from "../../constants/theme";


export default function Signup() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [code, setCode] = useState("");
    const [step, setStep] = useState(1); // 1: Sign Up, 2: Confirm
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState("");
    const API_URL = process.env.EXPO_PUBLIC_API_URL;

    async function handleSignUp() {
        if (loading) return;
        setLoading(true);
        try {
            const { userId } = await signUp({
                username: email,
                password,
                options: {
                    userAttributes: {
                        email,
                        name,
                    },
                },
            });
            if (userId) setUserId(userId);
            setStep(2);
            Alert.alert('Success', 'Check your email for the confirmation code.');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleConfirmSignUp() {
        if (loading) return;
        setLoading(true);
        try {
            const { isSignUpComplete } = await confirmSignUp({
                username: email,
                confirmationCode: code,
            });

            if (isSignUpComplete) {
                // Create user in backend
                const response = await fetch(`${API_URL}/users/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        cognito_sub: userId,
                        email: email,
                        username: name,
                    })
                });
                if (!response.ok) {
                    throw new Error('Failed to sync user with backend');
                }

                Alert.alert('Success', 'Account verified! Please log in.');
                router.replace('/auth/login');
            } else {
                Alert.alert('Info', 'Verification incomplete. Check your email for further steps.');
            }
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
                    <Text style={styles.title}>{step === 1 ? 'Create Account' : 'Confirm Email'}</Text>
                    <Text style={styles.subtitle}>
                        {step === 1 ? 'Your perfect nook, nearby.' : `Enter the code sent to ${email}`}
                    </Text>
                </View>

                <View style={styles.formContainer}>
                    {step === 1 && (
                        <>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Full Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your full name"
                                    placeholderTextColor="#666"
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>

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
                                    placeholder="Create a password"
                                    placeholderTextColor="#666"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                            </View>

                            <Pressable style={styles.buttonPrimary} onPress={handleSignUp} disabled={loading}>
                                <Text style={styles.buttonTextPrimary}>{loading ? "Signing Up..." : "Sign Up"}</Text>
                            </Pressable>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Confirmation Code</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Check your email"
                                    placeholderTextColor="#666"
                                    value={code}
                                    onChangeText={setCode}
                                    keyboardType="number-pad"
                                />
                            </View>

                            <Pressable style={styles.buttonPrimary} onPress={handleConfirmSignUp} disabled={loading}>
                                <Text style={styles.buttonTextPrimary}>{loading ? "Verifying..." : "Confirm"}</Text>
                            </Pressable>

                            <Pressable style={[styles.buttonPrimary, { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderLight, marginTop: 10 }]} onPress={() => setStep(1)}>
                                <Text style={[styles.buttonTextPrimary, { color: Colors.primary }]}>Back</Text>
                            </Pressable>
                        </>
                    )}

                    {step === 1 && (
                        <>
                            <View style={styles.dividerContainer}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>or</Text>
                                <View style={styles.dividerLine} />
                            </View>

                            <Pressable style={styles.buttonSocial}>
                                <AntDesign name="google" size={24} color={Colors.primary} />
                                <Text style={styles.buttonTextSocial}>Sign up with Google</Text>
                            </Pressable>
                        </>
                    )}
                </View>

                <View style={styles.footerContainer}>
                    <Text style={styles.footerText}>Already have an account? </Text>
                    <Link href="/auth/login" asChild>
                        <Pressable>
                            <Text style={styles.linkText}>Login</Text>
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
    dividerContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginTop: 8,
        marginBottom: 8,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.borderLight,
    },
    dividerText: {
        color: Colors.textSecondary,
        fontSize: 14,
    },
    buttonSocial: {
        backgroundColor: Colors.white,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        gap: 12,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    buttonTextSocial: {
        color: Colors.primary,
        fontSize: 16,
        fontWeight: "600",
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