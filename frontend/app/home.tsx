import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Platform, Dimensions, FlatList } from "react-native";
import { Stack, useRouter } from "expo-router";
import { fetchUserAttributes } from 'aws-amplify/auth';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import { useState, useEffect, useRef } from "react";
import AntDesign from "@expo/vector-icons/AntDesign";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Feather from "@expo/vector-icons/Feather";
import { useSavedCafes } from "../context/SavedCafesContext";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { LinearGradient } from 'expo-linear-gradient';

const FILTER_OPTIONS = [
    "Saved",
    "Work-friendly",
    "Quiet",
    "Good WiFi",
    "Trending Now",
    "Food quality",
    "Open Now",
    "Offers available",
];

// import { DUMMY_CAFES } from "../data/cafes";

interface Cafe {
    id: string; // UUID from backend is string
    name: string;
    address: string;
    city: string;
    latitude: number;
    longitude: number;
    rating: number; // mapped from avg_rating
    distance: string;
    distanceNum: number;
    occupancy: 'Low' | 'Moderate' | 'High';
    seats: number; // mapped from occupancy_capacity
    amenities: string[];
    image: string;
    hasStory: boolean;
    // backend fields kept for reference if needed
    raw: any;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function Home() {
    const router = useRouter();
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilters, setActiveFilters] = useState<string[]>([]);
    const { savedCafeIds } = useSavedCafes();
    const mapRef = useRef<MapView>(null);

    // State for cafes
    const [cafes, setCafes] = useState<Cafe[]>([]);
    const [loading, setLoading] = useState(true);

    // Advanced Filters State
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [radius, setRadius] = useState<number>(50); // km - increased default for testing
    const [minRating, setMinRating] = useState<number>(0);
    const [filterOccupancy, setFilterOccupancy] = useState<string[]>([]);
    const [userInitial, setUserInitial] = useState("U");

    useEffect(() => {
        const loadUserInitial = async () => {
            try {
                const attributes = await fetchUserAttributes();
                const name = attributes.name || attributes.email || 'U';
                setUserInitial(name.charAt(0).toUpperCase());
            } catch (error) {
                // ignore
            }
        };
        loadUserInitial();
    }, []);

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const fetchCafes = async (currentLocation: Location.LocationObject | null) => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/cafes/`);
            if (!response.ok) throw new Error('Failed to fetch cafes');
            const data = await response.json();

            const mappedCafes = data.map((item: any) => {
                // Calculate distance
                const distKm = currentLocation
                    ? calculateDistance(
                        currentLocation.coords.latitude,
                        currentLocation.coords.longitude,
                        item.latitude,
                        item.longitude
                    )
                    : 0;

                // Map occupancy
                let occStatus: 'Low' | 'Moderate' | 'High' = 'Low';
                const level = item.occupancy_level || 0;
                if (level > 70) occStatus = 'High';
                else if (level > 30) occStatus = 'Moderate';

                // Image fallback
                const imageUrl = (item.cafe_photos && item.cafe_photos.length > 0)
                    ? item.cafe_photos[0]
                    : "https://images.unsplash.com/photo-1509042239860-f550ce710b93"; // Fallback image

                return {
                    id: item.id,
                    name: item.name,
                    address: item.address,
                    city: item.city,
                    latitude: item.latitude,
                    longitude: item.longitude,
                    rating: item.avg_rating || 0,
                    distance: distKm > 0 ? `${distKm.toFixed(1)} km` : "Unknown",
                    distanceNum: distKm,
                    occupancy: occStatus,
                    seats: item.occupancy_capacity || item.total_tables * 4 || 0,
                    amenities: item.amenities || [],
                    image: imageUrl,
                    hasStory: false, // Default for now
                    raw: item
                };
            });

            setCafes(mappedCafes);
        } catch (error) {
            console.error("Error fetching cafes:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                // Still fetch cafes even if location denied (distance will be 0)
                fetchCafes(null);
                return;
            }

            let loc = await Location.getCurrentPositionAsync({});
            setLocation(loc);
            fetchCafes(loc);
        })();
    }, []);

    const toggleFilter = (filter: string) => {
        if (activeFilters.includes(filter)) {
            setActiveFilters(activeFilters.filter((f) => f !== filter));
        } else {
            setActiveFilters([...activeFilters, filter]);
        }
    };

    // Advanced Filter Toggles
    const toggleOccupancy = (status: string) => {
        if (filterOccupancy.includes(status)) {
            setFilterOccupancy(filterOccupancy.filter(s => s !== status));
        } else {
            setFilterOccupancy([...filterOccupancy, status]);
        }
    };

    const resetFilters = () => {
        setRadius(50);
        setMinRating(0);
        setFilterOccupancy([]);
        setActiveFilters([]);
        setShowFilterModal(false);
    };

    const getOccupancyColor = (status: string) => {
        switch (status) {
            case 'Low': return '#4CAF50'; // Green
            case 'Moderate': return '#FF9800'; // Orange
            case 'High': return '#F44336'; // Red
            default: return '#999';
        }
    };

    const recenterMap = () => {
        if (location && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
            }, 1000);
        }
    };

    // Filter Logic
    const filteredCafes = cafes.filter(cafe => {
        // Search
        if (searchQuery && !cafe.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

        // Chip Filters (Amenities)
        if (activeFilters.length > 0) {
            // Check for 'Saved' filter first
            if (activeFilters.includes('Saved') && !savedCafeIds.includes(cafe.id)) {
                return false;
            }

            // Check other filters (amenities)
            const amenityFilters = activeFilters.filter(f => f !== 'Saved');
            if (amenityFilters.length > 0) {
                const hasMatch = amenityFilters.some(f => cafe.amenities.includes(f));
                if (!hasMatch) return false;
            }
        }

        // Radius (Only apply if we have location)
        if (location && cafe.distanceNum > radius) return false;

        // Rating
        if (cafe.rating < minRating) return false;

        // Occupancy
        if (filterOccupancy.length > 0 && !filterOccupancy.includes(cafe.occupancy)) return false;

        return true;
    });

    const renderCafeItem = ({ item }: { item: Cafe }) => (
        <Pressable
            style={styles.cafeCard}
            onPress={() => router.push(`/cafe/${item.id}`)}
        >
            <Pressable onPress={() => item.hasStory && router.push(`/story/${item.id}`)}>
                {item.hasStory ? (
                    <LinearGradient
                        colors={['#C13584', '#E1306C', '#FD1D1D', '#F56040', '#F77737', '#FCAF45', '#FFDC80']}
                        start={{ x: 0, y: 1 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.storyRing}
                    >
                        <View style={styles.storyInner}>
                            <Image source={{ uri: item.image }} style={styles.cafeImage} contentFit="cover" transition={500} />
                        </View>
                    </LinearGradient>
                ) : (
                    <Image source={{ uri: item.image }} style={styles.cafeImageNormal} contentFit="cover" transition={500} />
                )}
            </Pressable>

            <View style={styles.cafeInfo}>
                <View style={styles.cafeHeader}>
                    <Text style={styles.cafeName}>{item.name}</Text>
                    <View style={styles.ratingContainer}>
                        <AntDesign name="star" size={12} color="#FFD700" />
                        <Text style={styles.ratingText}>{item.rating}</Text>
                    </View>
                </View>
                <Text style={styles.cafeAddress}>{item.address}</Text>

                <View style={styles.metaContainer}>
                    <Text style={styles.cafeDistance}>{item.distance}</Text>
                    <View style={styles.dotSeparator} />
                    <View style={styles.occupancyContainer}>
                        <View style={[styles.occupancyDot, { backgroundColor: getOccupancyColor(item.occupancy) }]} />
                        <Text style={[styles.occupancyText, { color: getOccupancyColor(item.occupancy) }]}>
                            {item.occupancy === 'Low' ? 'Quiet' : item.occupancy === 'High' ? 'Busy' : 'Moderate'}
                        </Text>
                    </View>
                    <View style={styles.dotSeparator} />
                    <View style={styles.seatsContainer}>
                        <MaterialIcons name="event-seat" size={14} color="#666" />
                        <Text style={styles.seatsText}>{item.seats}</Text>
                    </View>
                </View>
            </View>
        </Pressable>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="dark" />

            {/* Top Half: Map */}
            <View style={styles.mapContainer}>
                {location ? (
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        provider={Platform.OS === 'ios' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE}
                        initialRegion={{
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                            latitudeDelta: 0.0922,
                            longitudeDelta: 0.0421,
                        }}
                        showsUserLocation
                        showsMyLocationButton
                    >
                        {filteredCafes.map(cafe => (
                            <Marker
                                key={cafe.id}
                                coordinate={{ latitude: location.coords.latitude + (Math.random() * 0.02 - 0.01), longitude: location.coords.longitude + (Math.random() * 0.02 - 0.01) }}
                                title={cafe.name}
                            >
                                <View style={styles.markerContainer}>
                                    <View style={[styles.markerDot, { backgroundColor: getOccupancyColor(cafe.occupancy) }]} />
                                </View>
                            </Marker>
                        ))}
                    </MapView>
                ) : (
                    <View style={styles.loadingContainer}>
                        <Text>{errorMsg ? errorMsg : "Fetching location..."}</Text>
                    </View>
                )}

                {/* Overlay UI (Search + Filters) */}
                <View style={styles.overlayContainer} pointerEvents="box-none">
                    <View style={styles.headerRow}>
                        <View style={styles.searchContainer}>
                            <AntDesign name="search" size={20} color="#666" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search cafes..."
                                placeholderTextColor="#666"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>
                        <Pressable style={styles.profileBtn} onPress={() => router.push('/profile')}>
                            <View style={styles.profileAvatarPlaceholder}>
                                <Text style={styles.profileAvatarText}>{userInitial}</Text>
                            </View>
                        </Pressable>
                    </View>

                    <View style={styles.filtersWrapper}>
                        <View style={styles.filterRow}>
                            <Pressable
                                style={[styles.filterBtn, showFilterModal && styles.filterBtnActive]}
                                onPress={() => setShowFilterModal(!showFilterModal)}
                            >
                                <Feather name="sliders" size={18} color={showFilterModal ? "#fff" : "#333"} />
                            </Pressable>

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.filtersContainer}
                                keyboardShouldPersistTaps="handled"
                            >
                                {FILTER_OPTIONS.map((filter, index) => (
                                    <Pressable
                                        key={index}
                                        style={[
                                            styles.filterChip,
                                            activeFilters.includes(filter) && styles.filterChipActive,
                                        ]}
                                        onPress={() => toggleFilter(filter)}
                                    >
                                        <Text
                                            style={[
                                                styles.filterText,
                                                activeFilters.includes(filter) && styles.filterTextActive,
                                            ]}
                                        >
                                            {filter}
                                        </Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>
                    </View>

                    {/* Advanced Filter Modal */}
                    {showFilterModal && (
                        <View style={styles.filterModal}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Filters</Text>
                                <Pressable onPress={resetFilters}>
                                    <Text style={styles.resetText}>Reset</Text>
                                </Pressable>
                            </View>

                            <View style={styles.modalSection}>
                                <Text style={styles.modalLabel}>Radius (km)</Text>
                                <View style={styles.optionRow}>
                                    {[1, 3, 5, 10].map(r => (
                                        <Pressable
                                            key={r}
                                            style={[styles.optionBtn, radius === r && styles.optionBtnActive]}
                                            onPress={() => setRadius(r)}
                                        >
                                            <Text style={[styles.optionText, radius === r && styles.optionTextActive]}>{r} km</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.modalSection}>
                                <Text style={styles.modalLabel}>Min Rating</Text>
                                <View style={styles.optionRow}>
                                    {[4.0, 4.2, 4.5, 4.8].map(r => (
                                        <Pressable
                                            key={r}
                                            style={[styles.optionBtn, minRating === r && styles.optionBtnActive]}
                                            onPress={() => setMinRating(r)}
                                        >
                                            <Text style={[styles.optionText, minRating === r && styles.optionTextActive]}>{r}+</Text>
                                            <AntDesign name="star" size={12} color={minRating === r ? "#fff" : "#FFD700"} />
                                        </Pressable>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.modalSection}>
                                <Text style={styles.modalLabel}>Occupancy</Text>
                                <View style={styles.optionRow}>
                                    {['Low', 'Moderate', 'High'].map(o => (
                                        <Pressable
                                            key={o}
                                            style={[styles.optionBtn, filterOccupancy.includes(o) && styles.optionBtnActive]}
                                            onPress={() => toggleOccupancy(o)}
                                        >
                                            <Text style={[styles.optionText, filterOccupancy.includes(o) && styles.optionTextActive]}>
                                                {o === 'Low' ? 'Quiet' : o === 'High' ? 'Busy' : 'Moderate'}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>

                            <Pressable style={styles.applyBtn} onPress={() => setShowFilterModal(false)}>
                                <Text style={styles.applyText}>Apply Filters</Text>
                            </Pressable>
                        </View>
                    )}
                </View>

                {/* Recenter Button */}
                {location && (
                    <Pressable style={styles.recenterBtn} onPress={recenterMap}>
                        <MaterialIcons name="my-location" size={24} color="#000" />
                    </Pressable>
                )}
            </View>

            {/* Bottom Half: List */}
            <View style={styles.listContainer}>
                <View style={styles.listHeader}>
                    <Text style={styles.listTitle}>Nearby Cafes ({filteredCafes.length})</Text>
                </View>
                <FlatList
                    data={filteredCafes}
                    renderItem={renderCafeItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F5F5F5",
    },
    mapContainer: {
        flex: 1,
        position: "relative",
    },
    map: {
        width: "100%",
        height: "100%",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#E0E0E0",
    },
    overlayContainer: {
        position: "absolute",
        top: 60,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        zIndex: 10,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    searchContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: "#000",
    },
    profileBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fff',
        padding: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    profileAvatarPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
        backgroundColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileAvatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    filtersWrapper: {
        height: 40,
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    filterBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    filterBtnActive: {
        backgroundColor: '#000',
    },
    filtersContainer: {
        gap: 8,
        paddingRight: 16,
        alignItems: 'center',
    },
    filterChip: {
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
    },
    filterChipActive: {
        backgroundColor: "#000000",
        borderColor: "#000000",
    },
    filterText: {
        fontSize: 14,
        color: "#333333",
        fontWeight: "500",
    },
    filterTextActive: {
        color: "#FFFFFF",
    },
    filterModal: {
        position: 'absolute',
        top: 130, // Below filters
        left: 16,
        right: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 10,
    },
    recenterBtn: {
        position: 'absolute',
        right: 16,
        bottom: 30, // Positioned above the list container overlap area
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    resetText: {
        color: '#F44336',
        fontSize: 14,
        fontWeight: '500',
    },
    modalSection: {
        marginBottom: 16,
    },
    modalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
    optionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    optionBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#F5F5F5',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    optionBtnActive: {
        backgroundColor: '#000',
    },
    optionText: {
        fontSize: 13,
        color: '#333',
    },
    optionTextActive: {
        color: '#fff',
    },
    applyBtn: {
        backgroundColor: '#000',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    applyText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    listContainer: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
        overflow: "hidden",
    },
    listHeader: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
    },
    listTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#000",
    },
    listContent: {
        padding: 16,
        gap: 16,
        paddingBottom: 40,
    },
    cafeCard: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 12,
        gap: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: "#F0F0F0",
    },
    storyRing: {
        width: 86,
        height: 86,
        borderRadius: 43,
        padding: 3,
        justifyContent: 'center',
        alignItems: 'center',
    },
    storyInner: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fff',
        padding: 2,
    },
    cafeImage: {
        width: '100%',
        height: '100%',
        borderRadius: 38,
        backgroundColor: "#E0E0E0",
    },
    cafeImageNormal: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: "#E0E0E0",
    },
    cafeInfo: {
        flex: 1,
        justifyContent: "space-between",
        paddingVertical: 4,
    },
    cafeHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    cafeName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#000",
        flex: 1,
    },
    ratingContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#FFF9C4",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#333",
    },
    cafeAddress: {
        fontSize: 13,
        color: "#666",
        marginTop: 4,
    },
    metaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    cafeDistance: {
        fontSize: 12,
        color: "#888",
        fontWeight: "500",
    },
    dotSeparator: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#ccc',
        marginHorizontal: 8,
    },
    occupancyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    occupancyDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    occupancyText: {
        fontSize: 12,
        fontWeight: '600',
    },
    seatsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    seatsText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    markerContainer: {
        padding: 4,
        backgroundColor: '#fff',
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    markerDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#fff',
    },
});
