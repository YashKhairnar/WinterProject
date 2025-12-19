import { View, Text, StyleSheet, ScrollView, Platform, Pressable, FlatList, Dimensions, Share, Alert, Modal, TextInput, ActivityIndicator } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useSavedCafes } from "../../context/SavedCafesContext";
import { useCheckIn } from "../../context/CheckInContext";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReservation } from "../../context/ReservationContext";
import * as Location from 'expo-location';
import { useState, useEffect } from "react";

const { width } = Dimensions.get('window');

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface CafeData {
    id: string;
    name: string;
    description: string;
    address: string;
    city: string;
    avg_rating: number;
    cafe_photos: string[];
    menu_photos: string[];
    amenities: string[];
    occupancy_level: number;
    occupancy_capacity: number;
    total_tables: number;
    working_hours: Record<string, { open: string, close: string, closed: boolean }>;
    website_link?: string;
    instagram_url?: string;
    phone_number?: string;
    menu_link?: string;
}

export default function CafeProfile() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { toggleSaved, isSaved } = useSavedCafes();
    const { isCheckedIn } = useCheckIn();
    const cafeId = Array.isArray(id) ? id[0] : id; // Handle potential array from search params
    const insets = useSafeAreaInsets();
    const { reserveTable, cancelReservation, hasReservation } = useReservation();
    const [isNearCafe, setIsNearCafe] = useState(false);
    const [locationMsg, setLocationMsg] = useState('');

    // Data State
    const [cafe, setCafe] = useState<CafeData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Reservation State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTime, setSelectedTime] = useState('10:00 AM');
    const [partySize, setPartySize] = useState(2);

    const timeSlots = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];
    const dates = [new Date(), new Date(Date.now() + 86400000), new Date(Date.now() + 172800000)]; // Today, Tomorrow, Day After

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationMsg('Permission to access location was denied');
                return;
            }
            // Mock location logic for now
            setIsNearCafe(false);
        })();

        if (cafeId) {
            fetchCafeDetails();
        }
    }, [cafeId]);

    const fetchCafeDetails = async () => {
        try {
            const res = await fetch(`${API_URL}/cafes/${cafeId}`);
            if (res.ok) {
                const data = await res.json();
                setCafe(data);
            } else {
                setError("Cafe not found");
            }
        } catch (err) {
            console.error(err);
            setError("Failed to load cafe details");
        } finally {
            setLoading(false);
        }
    };

    const handleReservePress = () => {
        if (hasReservation(cafeId)) {
            Alert.alert(
                "Cancel Reservation?",
                "Are you sure you want to cancel your table?",
                [
                    { text: "No", style: "cancel" },
                    {
                        text: "Yes", onPress: () => {
                            cancelReservation();
                            Alert.alert("Reservation Cancelled");
                        }, style: 'destructive'
                    }
                ]
            );
        } else {
            setModalVisible(true);
        }
    };

    const confirmReservation = () => {
        reserveTable({
            cafeId,
            date: selectedDate,
            time: selectedTime,
            partySize
        });
        setModalVisible(false);
        Alert.alert("Table Reserved!", `Your table for ${partySize} at ${selectedTime} is confirmed.`);
    };

    const handleShare = async () => {
        if (!cafe) return;
        try {
            await Share.share({
                message: `Check out ${cafe.name}! It's a great spot for coffee. \nAddress: ${cafe.address}, ${cafe.city}`,
            });
        } catch (error: any) {
            Alert.alert(error.message);
        }
    };

    // Helper functions
    const getOccupancyColor = (level: number) => {
        if (level > 80) return '#F44336'; // High/Busy
        if (level > 40) return '#FF9800'; // Moderate
        return '#4CAF50'; // Low/Green
    };

    const getOccupancyStatus = (level: number) => {
        if (level > 80) return 'Busy';
        if (level > 40) return 'Moderate';
        return 'Low';
    };

    const formatHours = () => {
        if (!cafe?.working_hours) return "Hours not set";
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = days[new Date().getDay()];
        const todayHours = cafe.working_hours[today];
        if (!todayHours) return "Hours unavailable";
        if (todayHours.closed) return "Closed Today";
        return `${todayHours.open} - ${todayHours.close}`;
    };

    const canCheckIn = hasReservation(cafeId) || isNearCafe;

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    if (error || !cafe) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
                <Text style={{ fontSize: 16, color: 'red' }}>{error || "Cafe not found"}</Text>
                <Pressable onPress={() => router.back()} style={{ marginTop: 20, padding: 10 }}>
                    <Text style={{ color: 'blue' }}>Go Back</Text>
                </Pressable>
            </View>
        );
    }

    const coverImage = cafe.cafe_photos && cafe.cafe_photos.length > 0 ? cafe.cafe_photos[0] : null;
    const occupancyLevel = cafe.occupancy_level || 0;
    const occupancyStatus = getOccupancyStatus(occupancyLevel);
    const occupiedSeats = Math.round((occupancyLevel / 100) * (cafe.occupancy_capacity || 0));

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="light" />

            {/* Back Button */}
            <Pressable
                style={[styles.backButton, { top: insets.top + 10 }]}
                onPress={() => router.back()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <View style={styles.backButtonBlur}>
                    <AntDesign name="arrow-left" size={24} color="#fff" />
                </View>
            </Pressable>

            {/* Share Button (Absolute Top-Right) */}
            <Pressable
                style={[styles.shareButton, { top: insets.top + 10 }]}
                onPress={handleShare}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <View style={styles.backButtonBlur}>
                    <Feather name="share" size={20} color="#fff" />
                </View>
            </Pressable>

            <ScrollView contentContainerStyle={styles.scrollContent} bounces={false} showsVerticalScrollIndicator={false}>
                {/* Hero Image */}
                <View style={styles.imageContainer}>
                    <Pressable>
                        <Image
                            source={coverImage ? { uri: coverImage } : { uri: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=1000' }}
                            style={styles.image}
                            contentFit="cover"
                        />
                    </Pressable>
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.gradient}
                    />
                </View>

                {/* Info Container */}
                <View style={[styles.infoContainer, { top: -20 }]}>
                    <View style={styles.headerRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.name}>{cafe.name}</Text>
                            <View style={styles.headerMetaRow}>
                                {cafe.description ? (
                                    <Text style={styles.headerDescription} numberOfLines={1}>
                                        {cafe.description}
                                    </Text>
                                ) : null}
                                {cafe.description && <Text style={styles.metaDot}>•</Text>}
                                <View style={styles.ratingRow}>
                                    <AntDesign name="star" size={14} color="#FFD700" />
                                    <Text style={styles.ratingText}>{cafe.avg_rating || 0}</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionRow}>
                        <Pressable style={styles.actionBtn} onPress={() => {
                            Alert.alert("Directions", "Opening maps...");
                        }}>
                            <Feather name="navigation" size={22} color="#000" />
                            <Text style={styles.actionBtnText}>Directions</Text>
                        </Pressable>
                        <Pressable style={styles.actionBtn} onPress={handleReservePress}>
                            <MaterialIcons
                                name={hasReservation(cafeId) ? "event-busy" : "event-available"}
                                size={22}
                                color={hasReservation(cafeId) ? "#FF9800" : "#000"}
                            />
                            <Text style={[styles.actionBtnText, hasReservation(cafeId) && { color: "#FF9800" }]}>
                                {hasReservation(cafeId) ? "Cancel" : "Reserve"}
                            </Text>
                        </Pressable>
                        <Pressable
                            style={styles.actionBtn}
                            onPress={() => toggleSaved(cafeId)}
                        >
                            <MaterialIcons
                                name={isSaved(cafeId) ? "favorite" : "favorite-border"}
                                size={22}
                                color={isSaved(cafeId) ? "#FF0000" : "#000"}
                            />
                            <Text style={[
                                styles.actionBtnText,
                                isSaved(cafeId) && { color: "#FF0000" }
                            ]}>
                                {isSaved(cafeId) ? "Saved" : "Save"}
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[
                                styles.actionBtn,
                                isCheckedIn(cafeId) && { opacity: 1 }
                            ]}
                            onPress={() => !isCheckedIn(cafeId) && router.push(`/cafe/${id}/checkin`)}
                            disabled={isCheckedIn(cafeId) || (!canCheckIn && !isCheckedIn(cafeId))}
                        >
                            {isCheckedIn(cafeId) ? (
                                <>
                                    <MaterialIcons name="check-circle" size={22} color="#4CAF50" />
                                    <Text style={[styles.actionBtnText, { color: '#4CAF50' }]}>Checked In</Text>
                                </>
                            ) : (
                                <>
                                    <MaterialIcons name="check-circle-outline" size={22} color="#000" />
                                    <Text style={styles.actionBtnText}>Check-in</Text>
                                </>
                            )}
                        </Pressable>
                    </View>

                    {/* Stats */}
                    <View style={styles.statsCard}>
                        <View style={styles.statItem}>
                            <MaterialIcons name="event-seat" size={24} color="#666" />
                            <View>
                                <Text style={styles.statValue}>{cafe.occupancy_capacity || '-'}</Text>
                                <Text style={styles.statLabel}>Total Seats</Text>
                            </View>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <MaterialIcons name="people-outline" size={24} color={getOccupancyColor(occupancyLevel)} />
                            <View>
                                <Text style={[styles.statValue, { color: getOccupancyColor(occupancyLevel) }]}>
                                    {occupancyLevel}
                                </Text>
                                <Text style={styles.statLabel}>Status: {occupancyStatus}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Gallery - Only show if photos exist */}
                    {/* Gallery */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Gallery</Text>
                        {cafe.cafe_photos && cafe.cafe_photos.length > 0 ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
                                {cafe.cafe_photos.map((img, idx) => (
                                    <Image key={idx} source={{ uri: img }} style={styles.galleryImg} contentFit="cover" />
                                ))}
                            </ScrollView>
                        ) : (
                            <Text style={styles.infoText}>No photos available.</Text>
                        )}
                    </View>

                    {/* Today's Offers */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Today's Offers</Text>
                        <Text style={styles.infoText}>No active offers at the moment.</Text>
                    </View>

                    {/* Menu */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Menu</Text>
                        {cafe.menu_photos && cafe.menu_photos.length > 0 ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
                                {cafe.menu_photos.map((img, idx) => (
                                    <Image key={idx} source={{ uri: img }} style={styles.galleryImg} contentFit="cover" />
                                ))}
                            </ScrollView>
                        ) : (
                            <Text style={styles.infoText}>Menu photos coming soon.</Text>
                        )}
                        {cafe.menu_link && (
                            <Text style={[styles.infoText, { marginTop: 8, color: 'blue' }]}>View Full Menu Online</Text>
                        )}
                    </View>

                    {/* Amenities */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Amenities</Text>
                        {cafe.amenities && cafe.amenities.length > 0 ? (
                            <View style={styles.tagsContainer}>
                                {cafe.amenities.map((amenity, index) => (
                                    <View key={index} style={styles.tag}>
                                        <Text style={styles.tagText}>{amenity}</Text>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <Text style={styles.infoText}>No amenities listed.</Text>
                        )}
                    </View>

                    {/* Info */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Info</Text>
                        <View style={styles.infoRow}>
                            <Feather name="clock" size={16} color="#666" />
                            <Text style={styles.infoText}>{formatHours()}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Feather name="map-pin" size={16} color="#666" />
                            <Text style={styles.infoText}>{cafe.address}, {cafe.city}</Text>
                        </View>
                    </View>

                    {/* Reviews */}
                    <View style={styles.section}>
                        <View style={styles.rowBetween}>
                            <Text style={styles.sectionTitle}>Reviews</Text>
                        </View>
                        <Text style={styles.infoText}>No reviews yet.</Text>
                    </View>
                </View>

                {/* Reservation Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Reserve a Table</Text>
                                <Pressable onPress={() => setModalVisible(false)}>
                                    <Feather name="x" size={24} color="#000" />
                                </Pressable>
                            </View>

                            {/* Date Selection */}
                            <Text style={styles.label}>Select Date</Text>
                            <View style={styles.dateRow}>
                                {dates.map((date, index) => (
                                    <Pressable
                                        key={index}
                                        style={[styles.dateChip, selectedDate.getDate() === date.getDate() && styles.activeChip]}
                                        onPress={() => setSelectedDate(date)}
                                    >
                                        <Text style={[styles.dateText, selectedDate.getDate() === date.getDate() && styles.activeChipText]}>
                                            {index === 0 ? 'Today' : index === 1 ? 'Tmrw' : date.toLocaleDateString('en-US', { weekday: 'short' })}
                                        </Text>
                                        <Text style={[styles.dateNum, selectedDate.getDate() === date.getDate() && styles.activeChipText]}>
                                            {date.getDate()}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>

                            {/* Time Selection */}
                            <Text style={styles.label}>Select Time</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeRow}>
                                {timeSlots.map((time, index) => (
                                    <Pressable
                                        key={index}
                                        style={[styles.timeChip, selectedTime === time && styles.activeChip]}
                                        onPress={() => setSelectedTime(time)}
                                    >
                                        <Text style={[styles.timeText, selectedTime === time && styles.activeChipText]}>{time}</Text>
                                    </Pressable>
                                ))}
                            </ScrollView>

                            {/* Party Size */}
                            <Text style={styles.label}>Party Size</Text>
                            <View style={styles.partyRow}>
                                <Pressable onPress={() => setPartySize(Math.max(1, partySize - 1))} style={styles.counterBtn}>
                                    <Feather name="minus" size={20} color="#000" />
                                </Pressable>
                                <Text style={styles.partyValue}>{partySize} People</Text>
                                <Pressable onPress={() => setPartySize(Math.min(10, partySize + 1))} style={styles.counterBtn}>
                                    <Feather name="plus" size={20} color="#000" />
                                </Pressable>
                            </View>

                            <Pressable style={styles.confirmBtn} onPress={confirmReservation}>
                                <Text style={styles.confirmBtnText}>Confirm Reservation</Text>
                            </Pressable>
                        </View>
                    </View>
                </Modal>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    backButton: {
        position: 'absolute',
        left: 20,
        zIndex: 100,
    },
    backButtonBlur: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    imageContainer: {
        height: 300,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    storyBorder: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        opacity: 0,
    },
    gradient: {
        position: 'absolute',
        left: 0, right: 0, bottom: 0,
        height: 120,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    rating: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
    },
    ratingText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#444',
    },
    headerMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    headerDescription: {
        fontSize: 14,
        color: '#666',
        maxWidth: '80%',
    },
    metaDot: {
        marginHorizontal: 8,
        color: '#999',
        fontSize: 14,
    },
    shareButton: {
        position: 'absolute',
        right: 20,
        zIndex: 100,
    },
    reviewCount: {
        fontSize: 14,
        color: '#666',
    },
    detailsContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        gap: 24,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
    },
    actionBtn: {
        alignItems: 'center',
        gap: 8,
    },
    actionBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333',
    },
    statsCard: {
        flexDirection: 'row',
        backgroundColor: '#F9F9F9',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
    statLabel: {
        fontSize: 11,
        color: '#666',
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: '#E0E0E0',
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: 24,
    },
    section: {
        gap: 12,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    seeAll: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '500',
    },
    offersScroll: {
        paddingRight: 16,
        gap: 12,
    },
    offerCard: {
        width: 200,
        padding: 16,
        borderRadius: 12,
        gap: 6,
    },
    offerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    offerExpires: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '600',
    },
    offerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    offerDesc: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.9)',
    },
    galleryScroll: {
        paddingRight: 16,
        gap: 12,
    },
    galleryImg: {
        width: 140,
        height: 140,
        borderRadius: 12,
        backgroundColor: '#eee',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    menuImg: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: '#eee',
    },
    menuInfo: {
        flex: 1,
    },
    menuName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    menuPrice: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    addBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    tagText: {
        color: '#444',
        fontSize: 13,
        fontWeight: '500',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoText: {
        fontSize: 15,
        color: '#444',
    },
    infoContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        marginTop: -32,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    headerShareBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    name: {
        fontSize: 28,
        fontWeight: '800',
        color: '#333',
        marginBottom: 4,
        marginRight: 10,
    },
    address: {
        fontSize: 13,
        color: '#666',
        marginTop: 4,
    },
    reviewCard: {
        backgroundColor: '#F9F9F9',
        padding: 12,
        borderRadius: 12,
        gap: 8,
        marginBottom: 8,
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    reviewUser: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    reviewRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    reviewRatingText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333',
    },
    reviewText: {
        fontSize: 13,
        color: '#555',
        lineHeight: 18,
    },
    reviewDate: {
        fontSize: 11,
        color: '#999',
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'green',
    },
    liveText: {
        fontSize: 10,
        fontWeight: '700',
        color: 'green',
    },
    liveStoryItem: {
        alignItems: 'center',
        marginRight: 12,
    },
    liveRing: {
        width: 64,
        height: 64,
        borderRadius: 32,
        padding: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    liveInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#fff',
        padding: 2,
    },
    liveImg: {
        width: '100%',
        height: '100%',
        borderRadius: 30,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        gap: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 8,
    },
    dateRow: {
        flexDirection: 'row',
        gap: 12,
    },
    dateChip: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
        minWidth: 70,
    },
    activeChip: {
        backgroundColor: '#000',
    },
    dateText: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    dateNum: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
    activeChipText: {
        color: '#fff',
    },
    timeRow: {
        gap: 10,
    },
    timeChip: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
    },
    timeText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    partyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F9F9F9',
        padding: 6,
        borderRadius: 12,
    },
    counterBtn: {
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 8,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    partyValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    confirmBtn: {
        backgroundColor: '#000',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 16,
    },
    confirmBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    liveTime: {
        fontSize: 10,
        color: '#666',
        marginTop: 4,
    },
});
