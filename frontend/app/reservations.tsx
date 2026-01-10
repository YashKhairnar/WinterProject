import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReservation } from "../context/ReservationContext";
import { Colors, Shadows, Typography } from "../constants/theme";
import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";

export default function ReservationsPage() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { reservations } = useReservation();

    const activeReservations = reservations.filter(r => r.status === 'pending' || r.status === 'confirmed');
    const pastReservations = reservations.filter(r => r.status === 'completed' || r.status === 'cancelled');

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="dark" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <AntDesign name="arrow-left" size={24} color={Colors.primary} />
                </Pressable>
                <Text style={styles.headerTitle}>Reservation History</Text>
                <View style={styles.backBtn} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {activeReservations.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Upcoming</Text>
                        {activeReservations.map((reservation) => (
                            <Pressable
                                key={reservation.id}
                                style={styles.reservationCard}
                                onPress={() => router.push(`/cafe/${reservation.cafeId}` as any)}
                            >
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cafeName}>{reservation.cafeName || 'Cafe'}</Text>
                                    <View style={[
                                        styles.statusBadge,
                                        reservation.status === 'confirmed' ? styles.confirmedBadge : styles.pendingBadge
                                    ]}>
                                        <Text style={[
                                            styles.statusText,
                                            reservation.status === 'confirmed' ? styles.confirmedText : styles.pendingText
                                        ]}>
                                            {reservation.status}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.detailsRow}>
                                    <Feather name="calendar" size={14} color={Colors.textSecondary} />
                                    <Text style={styles.detailText}>
                                        {reservation.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </Text>
                                </View>

                                <View style={styles.detailsRow}>
                                    <Feather name="clock" size={14} color={Colors.textSecondary} />
                                    <Text style={styles.detailText}>{reservation.time}</Text>
                                </View>

                                <View style={styles.detailsRow}>
                                    <Feather name="users" size={14} color={Colors.textSecondary} />
                                    <Text style={styles.detailText}>{reservation.partySize} people</Text>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>History</Text>
                    {pastReservations.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Feather name="calendar" size={48} color={Colors.textSecondary} />
                            <Text style={styles.emptyTitle}>No Past Reservations</Text>
                            <Text style={styles.emptyText}>Your completed and cancelled reservations will appear here.</Text>
                        </View>
                    ) : (
                        pastReservations.map((reservation) => (
                            <Pressable
                                key={reservation.id}
                                style={styles.reservationCard}
                                onPress={() => router.push(`/cafe/${reservation.cafeId}` as any)}
                            >
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cafeName}>{reservation.cafeName || 'Cafe'}</Text>
                                    <View style={[
                                        styles.statusBadge,
                                        reservation.status === 'completed' ? styles.completedBadge : styles.cancelledBadge
                                    ]}>
                                        <Text style={[
                                            styles.statusText,
                                            reservation.status === 'completed' ? styles.completedText : styles.cancelledText
                                        ]}>
                                            {reservation.status === 'completed'
                                                ? 'Completed'
                                                : (reservation.cancellation_reason ? 'Cancelled (Cafe)' : 'Cancelled (You)')}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.detailsRow}>
                                    <Feather name="calendar" size={14} color={Colors.textSecondary} />
                                    <Text style={styles.detailText}>
                                        {reservation.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </Text>
                                </View>

                                <View style={styles.detailsRow}>
                                    <Feather name="clock" size={14} color={Colors.textSecondary} />
                                    <Text style={styles.detailText}>{reservation.time}</Text>
                                </View>

                                <View style={styles.detailsRow}>
                                    <Feather name="users" size={14} color={Colors.textSecondary} />
                                    <Text style={styles.detailText}>{reservation.partySize} people</Text>
                                </View>

                                {reservation.status === 'cancelled' && reservation.cancellation_reason && (
                                    <View style={styles.reasonContainer}>
                                        <Text style={styles.reasonLabel}>Cancellation Reason:</Text>
                                        <Text style={styles.reasonText}>{reservation.cancellation_reason}</Text>
                                    </View>
                                )}
                            </Pressable>
                        ))
                    )}
                </View>
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
    reservationCard: {
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        ...Shadows.medium,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    cafeName: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.textPrimary,
        flex: 1,
        marginRight: 12,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    completedBadge: {
        backgroundColor: Colors.accent + '15',
    },
    cancelledBadge: {
        backgroundColor: Colors.error + '15',
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    completedText: {
        color: Colors.accent,
    },
    cancelledText: {
        color: Colors.error,
    },
    confirmedBadge: {
        backgroundColor: Colors.success + '15',
    },
    confirmedText: {
        color: Colors.success,
    },
    pendingBadge: {
        backgroundColor: Colors.cta + '15',
    },
    pendingText: {
        color: Colors.cta,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: 12,
        marginLeft: 4,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    detailText: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    reasonContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
    },
    reasonLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.textSecondary,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    reasonText: {
        fontSize: 14,
        color: Colors.error,
        fontStyle: 'italic',
        lineHeight: 20,
    },
});
