import { View, Text, StyleSheet, Pressable, TextInput, Alert } from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import { useCheckIn } from "../../../context/CheckInContext";

export default function CheckIn() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams();
    const { addCheckIn } = useCheckIn();
    const cafeId = Array.isArray(id) ? id[0] : id;

    const [step, setStep] = useState(1); // 1: Questions, 2: Camera, 3: Success
    const [answers, setAnswers] = useState({ vibe: '', crowded: '' });

    // Step 1: Questions
    const renderQuestions = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Step 1: How's it going?</Text>
            <Text style={styles.stepDesc}>Answer a few quick questions to unlock your discount.</Text>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>How is the vibe today?</Text>
                <View style={styles.optionsRow}>
                    {['Chill', 'Busy', 'Loud', 'Perfect'].map((opt) => (
                        <Pressable
                            key={opt}
                            style={[styles.optionChip, answers.vibe === opt && styles.optionChipActive]}
                            onPress={() => setAnswers({ ...answers, vibe: opt })}
                        >
                            <Text style={[styles.optionText, answers.vibe === opt && styles.optionTextActive]}>{opt}</Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>How crowded is it?</Text>
                <View style={styles.optionsRow}>
                    {['Empty', 'Moderate', 'Packed'].map((opt) => (
                        <Pressable
                            key={opt}
                            style={[styles.optionChip, answers.crowded === opt && styles.optionChipActive]}
                            onPress={() => setAnswers({ ...answers, crowded: opt })}
                        >
                            <Text style={[styles.optionText, answers.crowded === opt && styles.optionTextActive]}>{opt}</Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            <Pressable
                style={[styles.nextBtn, (!answers.vibe || !answers.crowded) && styles.disabledBtn]}
                disabled={!answers.vibe || !answers.crowded}
                onPress={() => setStep(2)}
            >
                <Text style={styles.btnText}>Next: Live Update</Text>
                <AntDesign name="arrow-right" size={20} color="#fff" />
            </Pressable>
        </View>
    );

    // Step 2: Camera Mock
    const renderCameraStep = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Step 2: Share the Moment</Text>
            <Text style={styles.stepDesc}>Take a quick photo or video of the current vibe. Or maybe tell us what are your ordering today ?</Text>

            <View style={styles.cameraPlaceholder}>
                <Feather name="camera" size={64} color="#ccc" />
                <Text style={{ color: '#999', marginTop: 16 }}>Camera Preview</Text>
            </View>

            <Pressable
                style={styles.shutterBtn}
                onPress={() => {
                    addCheckIn(cafeId);
                    setStep(3);
                }}
            >
                <View style={styles.shutterInner} />
            </Pressable>

            <Text style={styles.skipText}>Tap circle to capture</Text>
        </View>
    );

    // Step 3: Success
    const renderSuccess = () => (
        <View style={styles.stepContainer}>
            <View style={styles.successIcon}>
                <MaterialIcons name="check-circle" size={80} color="#4CAF50" />
            </View>
            <Text style={styles.stepTitle}>Discount Unlocked!</Text>
            <Text style={styles.stepDesc}>Show this code to the barista to get 10% off.</Text>

            <View style={styles.codeContainer}>
                <Text style={styles.codeText}>CAFE10-{Math.floor(1000 + Math.random() * 9000)}</Text>
                <Pressable onPress={() => {
                    Clipboard.setStringAsync(`CAFE10-${Math.floor(1000 + Math.random() * 9000)}`);
                    Alert.alert("Copied!", "Discount code copied to clipboard.");
                }} style={{ padding: 8 }}>
                    <Feather name="copy" size={24} color="#000" />
                </Pressable>
            </View>

            <Pressable style={styles.instaBtn} onPress={() => Alert.alert("Shared!", "Your check-in has been shared to Instagram Stories.")}>
                <LinearGradient
                    colors={['#833AB4', '#FD1D1D', '#FCAF45']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.instaGradient}
                >
                    <AntDesign name="instagram" size={20} color="#fff" />
                    <Text style={styles.instaText}>Share to Instagram</Text>
                </LinearGradient>
            </Pressable>

            <Pressable style={styles.nextBtn} onPress={() => router.back()}>
                <Text style={styles.btnText}>Done</Text>
            </Pressable>
        </View>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="dark" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <AntDesign name="close" size={24} color="#000" />
                </Pressable>
                <Text style={styles.headerTitle}>Check In</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${(step / 3) * 100}%` }]} />
            </View>

            <View style={styles.content}>
                {step === 1 && renderQuestions()}
                {step === 2 && renderCameraStep()}
                {step === 3 && renderSuccess()}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    backBtn: {
        padding: 4,
    },
    progressContainer: {
        height: 4,
        backgroundColor: '#f0f0f0',
        width: '100%',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#000',
    },
    content: {
        flex: 1,
        padding: 24,
    },
    stepContainer: {
        flex: 1,
        alignItems: 'center',
        gap: 24,
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: '800',
        textAlign: 'center',
        marginTop: 20,
    },
    stepDesc: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    inputGroup: {
        width: '100%',
        gap: 12,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    optionChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#eee',
    },
    optionChipActive: {
        backgroundColor: '#000',
        borderColor: '#000',
    },
    optionText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    optionTextActive: {
        color: '#fff',
    },
    nextBtn: {
        marginTop: 'auto',
        backgroundColor: '#000',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    disabledBtn: {
        opacity: 0.5,
    },
    btnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    cameraPlaceholder: {
        width: '100%',
        height: 300,
        backgroundColor: '#eee',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    shutterBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        borderColor: '#000',
        padding: 4,
    },
    shutterInner: {
        flex: 1,
        backgroundColor: '#000',
        borderRadius: 36,
    },
    skipText: {
        color: '#999',
        fontSize: 14,
    },
    successIcon: {
        marginTop: 40,
        marginBottom: 10,
    },
    codeContainer: {
        backgroundColor: '#f9f9f9',
        paddingHorizontal: 30,
        paddingVertical: 20,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#eee',
        borderStyle: 'dashed',
        marginTop: 20,
        flexDirection: 'row', // Align text and copy icon
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    codeText: {
        fontSize: 24,
        fontWeight: '800',
        color: '#000',
        letterSpacing: 1,
    },
    instaBtn: {
        width: '100%',
        marginBottom: 10,
        borderRadius: 12,
        overflow: 'hidden',
    },
    instaGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    instaText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
