import { View, Text, StyleSheet, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState, useRef, useEffect } from "react";
import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useCheckIn } from "../../../context/CheckInContext";
import { CameraView, useCameraPermissions } from 'expo-camera';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { Colors, Shadows } from "../../../constants/theme";
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { logger } from "../../../utils/logger";



export default function CheckIn() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams();
    const { addCheckIn } = useCheckIn();
    const cafeId = Array.isArray(id) ? id[0] : id;
    const [step, setStep] = useState(1); // 1: Questions, 2: Camera, 3: Success
    const [answers, setAnswers] = useState({ vibe: '', visit_purpose: '' });
    const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const cameraRef = useRef<CameraView>(null);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const getUser = async () => {
            try {
                const attributes = await fetchUserAttributes();
                if (attributes.sub) {
                    setUserId(attributes.sub);
                }
            } catch (error) {
                console.error("Error fetching user:", error);
            }
        };
        getUser();
    }, []);


    // Step 1: Questions
    const renderQuestions = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Step 1: How's it going?</Text>
            <Text style={styles.stepDesc}>Answer a few quick questions to unlock your discount.</Text>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>How is the vibe today?</Text>
                <View style={styles.optionsRow}>
                    {['Chill', 'Busy', 'Loud', 'Perfect', 'Cozy', 'Minimalist', 'Lively', 'Outdoorsy'].map((opt) => (
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
                <Text style={styles.label}>What's your main purpose today?</Text>
                <View style={styles.optionsRow}>
                    {['Work', 'Study', 'Social', 'Date', 'Reading', 'Eating', 'Quick Coffee', 'Meeting', 'Writing'].map((opt) => (
                        <Pressable
                            key={opt}
                            style={[styles.optionChip, answers.visit_purpose === opt && styles.optionChipActive]}
                            onPress={() => setAnswers({ ...answers, visit_purpose: opt })}
                        >
                            <Text style={[styles.optionText, answers.visit_purpose === opt && styles.optionTextActive]}>{opt}</Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            <Pressable
                style={[styles.nextBtn, (!answers.vibe || !answers.visit_purpose) && styles.disabledBtn]}
                disabled={!answers.vibe || !answers.visit_purpose}
                onPress={() => setStep(2)}
            >
                <Text style={styles.btnText}>Next: Live Update</Text>
                <AntDesign name="arrow-right" size={20} color={Colors.white} />
            </Pressable>
        </View>
    );



    // Step 2: Camera
    const [permission, requestPermission] = useCameraPermissions();

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.7,
                    base64: false,
                });
                if (photo && photo.uri) {
                    setCapturedPhotoUri(photo.uri);
                    // Don't auto-advance. Stay on step 2 to show upload button.
                }
            } catch (error) {
                console.error('Error taking picture:', error);
                Alert.alert("Error", "Failed to capture photo. Please try again.");
            }
        }
    };

    const renderCameraStep = () => {
        if (!permission) {
            return <View />;
        }

        if (!permission.granted) {
            return (
                <View style={styles.stepContainer}>
                    <Text style={styles.stepTitle}>Camera Access Required</Text>
                    <Text style={styles.stepDesc}>We need your permission to verify your check-in with a photo.</Text>
                    <Pressable style={styles.nextBtn} onPress={requestPermission}>
                        <Text style={styles.btnText}>Grant Permission</Text>
                    </Pressable>
                </View>
            );
        }

        return (
            <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>Step 2: Share the Moment</Text>
                <Text style={styles.stepDesc}>Take a quick photo of the vibe!</Text>

                <View style={styles.cameraContainer}>
                    {capturedPhotoUri ? (
                        <Image source={{ uri: capturedPhotoUri }} style={styles.camera} />
                    ) : (
                        <CameraView ref={cameraRef} style={styles.camera} facing="back" />
                    )}

                    {/* Overlay Controls */}
                    <View style={styles.cameraOverlay}>
                        {!capturedPhotoUri ? (
                            <Pressable
                                style={styles.shutterBtn}
                                onPress={takePicture}
                            >
                                <View style={styles.shutterInner} />
                            </Pressable>
                        ) : (
                            <View style={styles.capturedControls}>
                                <Pressable
                                    style={styles.retakeBtn}
                                    onPress={() => setCapturedPhotoUri(null)}
                                >
                                    <Feather name="refresh-ccw" size={24} color={Colors.white} />
                                    <Text style={styles.retakeText}>Retake</Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                </View>

                {capturedPhotoUri ? (
                    <Pressable
                        style={[styles.uploadStoryBtn, uploading && styles.disabledBtn]}
                        onPress={uploadStory}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <>
                                <ActivityIndicator color={Colors.white} size="small" />
                                <Text style={styles.btnText}>Uploading...</Text>
                            </>
                        ) : (
                            <>
                                <MaterialIcons name="cloud-upload" size={24} color={Colors.white} />
                                <Text style={styles.btnText}>Upload & Get Discount</Text>
                            </>
                        )}
                    </Pressable>
                ) : (
                    <Text style={styles.skipText}>Tap circle to capture</Text>
                )}
            </View>
        );
    };

    // Upload photo to backend
    const uploadStory = async () => {
        if (!capturedPhotoUri) {
            Alert.alert("Error", "No photo to upload");
            return;
        }

        if (!userId) {
            Alert.alert("Error", "User not logged in");
            return;
        }

        setUploading(true);
        try {
            const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
            const cleanURL = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;

            // 1. Get Pre-signed URL
            const filename = capturedPhotoUri.split('/').pop() || 'photo.jpg';
            const presignedResponse = await fetch(`${cleanURL}/upload/presigned-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename,
                    file_type: 'image/jpeg',
                    category: 'live_update'
                })
            });

            if (!presignedResponse.ok) {
                const error = await presignedResponse.text();
                throw new Error(`Failed to get upload URL: ${error}`);
            }

            const { upload_url, file_url } = await presignedResponse.json();

            // 2. Upload to S3
            // Expo ImagePicker/Camera URIs need to be read as blobs
            const photoData = await fetch(capturedPhotoUri);
            const blob = await photoData.blob();

            const s3Response = await fetch(upload_url, {
                method: 'PUT',
                body: blob,
                headers: { 'Content-Type': 'image/jpeg' }
            });

            if (!s3Response.ok) {
                throw new Error('Failed to upload image to S3');
            }

            // 3. Submit metadata to Backend
            const payload = {
                cafe_id: cafeId,
                user_sub: userId,
                vibe: answers.vibe,
                visit_purpose: answers.visit_purpose,
                image_url: file_url
            };

            const response = await fetch(`${cleanURL}/liveUpdates/direct`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                setUploadSuccess(true);
                await addCheckIn(cafeId);
                setStep(3);
            } else {
                const error = await response.json();
                console.error("DEBUG: Direct upload error:", error);
                Alert.alert("Upload Failed", error.detail || "Failed to save story");
            }
        } catch (error: any) {
            console.error('Upload error:', error);
            Alert.alert("Error", error.message || "Failed to upload story. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const handleShareToInstagram = async () => {
        if (!capturedPhotoUri) return;

        try {
            const isSharingAvailable = await Sharing.isAvailableAsync();
            if (!isSharingAvailable) {
                Alert.alert("Sharing Not Available", "Sharing is not supported on this device.");
                return;
            }

            logger.info('CheckIn', 'Starting Instagram share', { capturedPhotoUri });

            // Since it's already a local URI from the camera, we can share it directly!
            // But sometimes Sharing.shareAsync works better with a cache copy or certain extensions.
            // We'll trust the camera URI for now.
            await Sharing.shareAsync(capturedPhotoUri, {
                mimeType: 'image/jpeg',
                dialogTitle: 'Share your Nook Story',
                UTI: 'public.jpeg'
            });

        } catch (error: any) {
            logger.error('CheckIn', 'Error sharing to Instagram', { error: error.message });
            Alert.alert("Error", "Could not share story: " + error.message);
        }
    };

    // Step 3: Success
    const renderSuccess = () => (
        <View style={styles.stepContainer}>
            <View style={styles.successIcon}>
                <MaterialIcons name="check-circle" size={80} color={Colors.success} />
            </View>
            <Text style={styles.stepTitle}>Discount Unlocked!</Text>
            <Text style={styles.stepDesc}>Show this code to the barista to get 10% off.</Text>

            <View style={styles.codeContainer}>
                <Text style={styles.codeText}>CAFE10-{Math.floor(1000 + Math.random() * 9000)}</Text>
                <Pressable onPress={() => {
                    Clipboard.setStringAsync(`CAFE10-${Math.floor(1000 + Math.random() * 9000)}`);
                    Alert.alert("Copied!", "Discount code copied to clipboard.");
                }} style={{ padding: 8 }}>
                    <Feather name="copy" size={24} color={Colors.primary} />
                </Pressable>
            </View>

            <View style={styles.successBadge}>
                <MaterialIcons name="check" size={20} color={Colors.success} />
                <Text style={styles.successText}>Story uploaded successfully!</Text>
            </View>

            <Pressable style={styles.instaBtn} onPress={handleShareToInstagram}>
                <LinearGradient
                    colors={['#833AB4', '#F56040', '#FCAF45']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.instaGradient}
                >
                    <AntDesign name="instagram" size={20} color={Colors.white} />
                    <Text style={styles.instaText}>Share to Instagram Stories</Text>
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
                    <AntDesign name="close" size={24} color={Colors.primary} />
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
        backgroundColor: Colors.backgroundLight,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
        backgroundColor: Colors.backgroundLight,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    backBtn: {
        padding: 4,
    },
    progressContainer: {
        height: 4,
        backgroundColor: Colors.borderLight,
        width: '100%',
    },
    progressBar: {
        height: '100%',
        backgroundColor: Colors.primary,
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
        color: Colors.textPrimary,
    },
    stepDesc: {
        fontSize: 16,
        color: Colors.textSecondary,
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
        color: Colors.textPrimary,
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
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        ...Shadows.small,
    },
    optionChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    optionText: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.textPrimary,
    },
    optionTextActive: {
        color: Colors.white,
    },
    nextBtn: {
        marginTop: 'auto',
        backgroundColor: Colors.primary,
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
        color: Colors.white,
        fontSize: 18,
        fontWeight: '700',
    },
    cameraContainer: {
        width: '100%',
        height: 400,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: Colors.black,
        position: 'relative',
    },
    camera: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    cameraOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 20,
        zIndex: 1,
    },
    shutterBtn: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 4,
        borderColor: Colors.white,
        padding: 4,
        backgroundColor: 'transparent',
    },
    shutterInner: {
        flex: 1,
        backgroundColor: Colors.white,
        borderRadius: 32,
    },
    capturedControls: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    retakeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.black + '99', // 60% opacity
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 8,
    },
    retakeText: {
        color: Colors.white,
        fontWeight: '600',
    },
    skipText: {
        color: Colors.textSecondary,
        fontSize: 14,
    },
    successIcon: {
        marginTop: 40,
        marginBottom: 10,
    },
    codeContainer: {
        backgroundColor: Colors.white,
        paddingHorizontal: 30,
        paddingVertical: 20,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: Colors.borderLight,
        borderStyle: 'dashed',
        marginTop: 20,
        flexDirection: 'row', // Align text and copy icon
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        ...Shadows.small,
    },
    codeText: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.primary,
        letterSpacing: 1,
    },
    uploadStoryBtn: {
        width: '100%',
        backgroundColor: Colors.cta,
        paddingVertical: 16,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    successBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: Colors.accent + '20',
        borderRadius: 12,
        marginBottom: 10,
        width: '100%',
        justifyContent: 'center',
    },
    successText: {
        color: Colors.accent,
        fontSize: 16,
        fontWeight: '600',
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
        color: Colors.white,
        fontSize: 16,
        fontWeight: '700',
    },
});
