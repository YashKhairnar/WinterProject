import { View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from "react";
import AntDesign from "@expo/vector-icons/AntDesign";

const { width, height } = Dimensions.get('window');

export default function StoryView() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [progress, setProgress] = useState(0);

    // Mock story data
    const storyImage = 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=1000&auto=format&fit=crop';

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    router.back();
                    return 100;
                }
                return prev + 1; // 3 seconds duration closely
            });
        }, 30);

        return () => clearInterval(interval);
    }, []);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="light" />

            {/* Story Image */}
            <Image source={{ uri: storyImage }} style={styles.image} contentFit="cover" />

            {/* Overlay */}
            <View style={styles.overlay}>
                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: `${progress}%` }]} />
                </View>

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.userInfo}>
                        <Image
                            source={{ uri: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=100' }}
                            style={styles.avatar}
                        />
                        <Text style={styles.userName}>The Grind</Text>
                        <Text style={styles.timeAgo}>2h</Text>
                    </View>
                    <Pressable onPress={() => router.back()}>
                        <AntDesign name="close" size={24} color="#fff" />
                    </Pressable>
                </View>
            </View>

            {/* Touch areas for navigation (mock) */}
            <Pressable style={styles.touchArea} onPress={() => router.back()} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    image: {
        width: width,
        height: height,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 50,
        paddingHorizontal: 16,
    },
    progressContainer: {
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 1,
        marginBottom: 16,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    userName: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    timeAgo: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
    },
    touchArea: {
        position: 'absolute',
        top: 100,
        bottom: 0,
        left: 0,
        right: 0,
    }
});
