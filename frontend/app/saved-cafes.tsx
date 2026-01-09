import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSavedCafes } from "../context/SavedCafesContext";
import { Colors, Shadows, Typography } from "../constants/theme";
import AntDesign from "@expo/vector-icons/AntDesign";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function SavedCafesPage() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { savedCafes, toggleSaved } = useSavedCafes();

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="dark" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <AntDesign name="arrow-left" size={24} color={Colors.primary} />
                </Pressable>
                <Text style={styles.headerTitle}>Saved Cafes</Text>
                <View style={styles.backBtn} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {savedCafes.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="favorite-border" size={48} color={Colors.textSecondary} />
                        <Text style={styles.emptyTitle}>No Saved Cafes</Text>
                        <Text style={styles.emptyText}>Cafes you save will appear here for easy access.</Text>
                    </View>
                ) : (
                    savedCafes.map((cafe) => (
                        <Pressable
                            key={cafe.id}
                            style={styles.cafeCard}
                            onPress={() => router.push(`/cafe/${cafe.id}` as any)}
                        >
                            <Image source={{ uri: cafe.image }} style={styles.cafeImage} />
                            <View style={styles.cafeInfo}>
                                <Text style={styles.cafeName}>{cafe.name}</Text>
                                <Text style={styles.cafeAddress}>{cafe.address}</Text>
                            </View>
                            <Pressable
                                style={styles.favoriteBtn}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    toggleSaved(cafe);
                                }}
                            >
                                <MaterialIcons name="favorite" size={24} color={Colors.error} />
                            </Pressable>
                        </Pressable>
                    ))
                )}
            </ScrollView>
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
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    cafeCard: {
        flexDirection: 'row',
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 12,
        marginBottom: 16,
        alignItems: 'center',
        ...Shadows.medium,
    },
    cafeImage: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: Colors.borderLight,
    },
    cafeInfo: {
        flex: 1,
        marginLeft: 16,
        marginRight: 12,
    },
    cafeName: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    cafeAddress: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    cafeDistance: {
        fontSize: 12,
        color: Colors.accent,
        fontWeight: '600',
    },
    favoriteBtn: {
        padding: 8,
    },
});
