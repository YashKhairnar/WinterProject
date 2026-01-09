import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Platform, Dimensions, FlatList, Modal } from "react-native";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import { fetchUserAttributes } from 'aws-amplify/auth';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import { useState, useEffect, useRef, useCallback } from "react";
import AntDesign from "@expo/vector-icons/AntDesign";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Feather from "@expo/vector-icons/Feather";
import { useSavedCafes } from "../context/SavedCafesContext";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getImageUrl } from "../utils/image";
import { logger } from "../utils/logger";
import { Colors, Shadows, Typography } from "../constants/theme";

const PREFERENCE_OPTIONS = {
    vibes: ['Chill', 'Busy', 'Loud', 'Perfect', 'Cozy', 'Minimalist', 'Lively', 'Outdoorsy'],
    purpose: ['Work', 'Study', 'Social', 'Date', 'Reading', 'Eating', 'Quick Coffee', 'Meeting', 'Writing'],
    dietary: ['Vegan Options', 'Gluten Free', 'Dairy Free'],
    amenities: ['WiFi', 'Power Outlets', 'Parking', 'Outdoor Seating', 'Pet Friendly']
};

const FILTER_OPTIONS = [
    "Saved",
    "Open Now",
];


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
    activeStories: { id: string, image_url: string, created_at: string, vibe?: string, visit_purpose?: string }[];
    raw: any;
    two_tables: number;
    four_tables: number;
    table_config?: any;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function Home() {
    const router = useRouter();
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilters, setActiveFilters] = useState<string[]>([]);
    const { isSaved } = useSavedCafes();
    const mapRef = useRef<MapView>(null);

    // State for cafes
    const [cafes, setCafes] = useState<Cafe[]>([]);
    const [loading, setLoading] = useState(true);

    // Advanced Filters State
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [radius, setRadius] = useState<number>(5); // km - default to 5km

    const [minRating, setMinRating] = useState<number>(0);
    const [filterOccupancy, setFilterOccupancy] = useState<string[]>([]);
    const [filterVibes, setFilterVibes] = useState<string[]>([]);
    const [filterPurpose, setFilterPurpose] = useState<string[]>([]);
    const [filterDietary, setFilterDietary] = useState<string[]>([]);
    const [filterAmenities, setFilterAmenities] = useState<string[]>([]);

    const [userInitial, setUserInitial] = useState("U");
    const [selectedCafeForStory, setSelectedCafeForStory] = useState<Cafe | null>(null);
    const [fullscreenStoryIndex, setFullscreenStoryIndex] = useState(0);
    const [storyProgress, setStoryProgress] = useState(0);
    const insets = useSafeAreaInsets();

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


    const fetchCafes = async (currentLocation: Location.LocationObject | null, isBackground = false) => {
        try {
            logger.info('Home', 'Fetching cafes...');
            logger.logFetch(`${API_URL}/cafes/`);
            if (!isBackground) setLoading(true);
            const response = await fetch(`${API_URL}/cafes/`);
            if (!response.ok) {
                console.log("Fetch cafes response not OK:", response.status);
                setCafes([]);
                return;
            }
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
                let level = item.occupancy_level || 0;

                if (Array.isArray(item.table_config) && item.table_config.length > 0) {
                    const totalOccupied = item.table_config.reduce((acc: number, seat: any) => acc + (seat.seats || 0), 0);
                    const totalCapacity = item.table_config.reduce((acc: number, seat: any) => acc + (seat.size || 0), 0);
                    if (totalCapacity > 0) {
                        level = (totalOccupied / totalCapacity) * 100;
                    }
                }

                if (level > 70) occStatus = 'High';
                else if (level > 30) occStatus = 'Moderate';

                // Image fallback
                const imageUrl = (item.cover_photo)
                    ? getImageUrl(item.cover_photo) || item.cover_photo
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
                    two_tables: item.two_tables || 0,
                    four_tables: item.four_tables || 0,
                    table_config: item.table_config,
                    amenities: item.amenities || [],
                    image: imageUrl,
                    hasStory: item.has_active_stories,
                    activeStories: item.active_stories || [],
                    raw: item
                };
            });

            setCafes(mappedCafes);
        } catch (err: any) {
            logger.error('Home', 'Failed to fetch cafes', { error: err.message });
            setErrorMsg("Failed to load cafes. Please try again later.");
        } finally {
            if (!isBackground) setLoading(false);
        }
    };


    useEffect(() => {
        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setErrorMsg('Permission to access location was denied');
                    fetchCafes(null);
                    return;
                }

                // Try to get last known position first (fast)
                let loc = await Location.getLastKnownPositionAsync({});

                // If we don't have a recent last known position, try getting current
                if (!loc) {
                    loc = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Highest
                    });
                }

                setLocation(loc);
                fetchCafes(loc);
            } catch (err) {
                logger.error('Home', 'Error getting location', { error: (err as any).message });
                // Fallback: fetch cafes without location
                fetchCafes(null);
            }
        })();
    }, []);


    // Polling for live updates
    useFocusEffect(
        useCallback(() => {
            const interval = setInterval(() => {
                fetchCafes(location, true);
            }, 10000); // Poll every 10 seconds

            return () => clearInterval(interval);
        }, [location])
    );

    // Fullscreen story progress logic
    useEffect(() => {
        if (!selectedCafeForStory) {
            setStoryProgress(0);
            return;
        }

        const duration = 5000; // 5 seconds per story
        const interval = 50; // Update every 50ms
        const increment = (interval / duration) * 100;

        const timer = setInterval(() => {
            setStoryProgress(prev => {
                if (prev >= 100) {
                    // Next story or close
                    if (fullscreenStoryIndex < selectedCafeForStory.activeStories.length - 1) {
                        setFullscreenStoryIndex(idx => idx + 1);
                        return 0;
                    } else {
                        setSelectedCafeForStory(null);
                        setFullscreenStoryIndex(0);
                        return 0;
                    }
                }
                return prev + increment;
            });
        }, interval);

        return () => clearInterval(timer);
    }, [selectedCafeForStory, fullscreenStoryIndex]);



    const isOpen = (workingHours: any) => {
        if (!workingHours) return true;
        const now = new Date();
        const dayPrefixes = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const day = dayPrefixes[now.getDay()];

        let hours = workingHours[day];
        if (!hours) {
            const longDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            hours = workingHours[longDays[now.getDay()]];
        }

        if (!hours || hours.closed) return false;

        const [openHour, openMin] = hours.open.split(':').map(Number);
        const [closeHour, closeMin] = hours.close.split(':').map(Number);
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const openTime = openHour * 60 + openMin;
        const closeTime = closeHour * 60 + closeMin;

        if (closeTime < openTime) {
            return currentTime >= openTime || currentTime < closeTime;
        }
        return currentTime >= openTime && currentTime < closeTime;
    };


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

    const togglePreference = (category: 'vibes' | 'purpose' | 'dietary' | 'amenities', value: string) => {
        const stateMap: Record<string, [string[], (v: string[]) => void]> = {
            vibes: [filterVibes, setFilterVibes],
            purpose: [filterPurpose, setFilterPurpose],
            dietary: [filterDietary, setFilterDietary],
            amenities: [filterAmenities, setFilterAmenities],
        };
        const [current, setter] = stateMap[category];
        if (current.includes(value)) {
            setter(current.filter(i => i !== value));
        } else {
            setter([...current, value]);
        }
    };


    const resetFilters = () => {
        setRadius(5);
        setMinRating(0);
        setFilterOccupancy([]);
        setFilterVibes([]);
        setFilterPurpose([]);
        setFilterDietary([]);
        setFilterAmenities([]);
        setActiveFilters([]);
        setShowFilterModal(false);
    };

    const getOccupancyColor = (status: string) => {
        switch (status) {
            case 'Low': return Colors.accent; // Green
            case 'Moderate': return Colors.cta; // Orange
            case 'High': return Colors.error; // Red
            default: return Colors.textSecondary;
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
        // 1. Search (Name)
        if (searchQuery && !cafe.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

        // 2. Radius (Distance) - Skip if location unknown or radius is "Any" (100)
        if (location && radius < 100 && cafe.distanceNum > radius) return false;

        // 3. Rating
        if (cafe.rating < minRating) return false;

        // 4. Occupancy status check
        if (filterOccupancy.length > 0 && !filterOccupancy.includes(cafe.occupancy)) return false;

        // 5. Visitor-provided Vibes & Purpose (Check Live Stories/Check-ins)
        const liveVibes = cafe.activeStories?.map(s => (s as any).vibe).filter(Boolean) || [];
        const livePurposes = cafe.activeStories?.map(s => (s as any).visit_purpose).filter(Boolean) || [];

        // Combine modal selection with quick-filter chips for live data check
        const activeVibeFilters = [...filterVibes, ...activeFilters.filter(f => PREFERENCE_OPTIONS.vibes.includes(f))];
        const activePurposeFilters = [...filterPurpose, ...activeFilters.filter(f => PREFERENCE_OPTIONS.purpose.includes(f))];

        if (activeVibeFilters.length > 0) {
            const hasVibeMatch = activeVibeFilters.some(fv =>
                liveVibes.some(lv => lv.toLowerCase() === fv.toLowerCase())
            );
            if (!hasVibeMatch) return false;
        }

        if (activePurposeFilters.length > 0) {
            const hasPurposeMatch = activePurposeFilters.some(fp =>
                livePurposes.some(lp => lp.toLowerCase() === fp.toLowerCase())
            );
            if (!hasPurposeMatch) return false;
        }

        // 6. Special quick-filter chips
        if (activeFilters.includes('Open Now') && !isOpen(cafe.raw.working_hours)) return false;

        if (activeFilters.includes('Saved') && !isSaved(cafe.id)) return false;

        if (activeFilters.includes('Work-friendly')) {
            const workMatches = ['work', 'study', 'wifi', 'power outlets', 'work-friendly', 'quiet'];
            const isWF = cafe.amenities.some(a => workMatches.some(m => a.toLowerCase().includes(m)));
            if (!isWF) return false;
        }

        if (activeFilters.includes('Quiet') && !filterOccupancy.includes('Low')) { // Avoid double-checking if modal set it
            const isQuiet = cafe.amenities.some(a => a.toLowerCase().includes('quiet'));
            if (!isQuiet) return false;
        }

        // 7. General Preferences (Modal + Other Chips) - Must match ALL selected categories
        const otherSelectedTags = [
            ...activeFilters.filter(f =>
                !['Saved', 'Open Now', 'Work-friendly', 'Quiet'].includes(f) &&
                !PREFERENCE_OPTIONS.vibes.includes(f) &&
                !PREFERENCE_OPTIONS.purpose.includes(f)
            ),
            ...filterDietary,
            ...filterAmenities
        ];

        if (otherSelectedTags.length > 0) {
            // AND logic across categories: cafe must have tags matching ALL selected filters
            const hasAllSelected = otherSelectedTags.every(filterTag =>
                cafe.amenities.some(amenity => amenity.toLowerCase().includes(filterTag.toLowerCase()))
            );
            if (!hasAllSelected) return false;
        }

        return true;
    });

    // Open Story
    const openStory = (cafeId: string) => {
        const cafe = cafes.find(c => c.id === cafeId);
        if (cafe && cafe.activeStories && cafe.activeStories.length > 0) {
            logger.info('Home', 'Opening story viewer', { cafeId, name: cafe.name });
            setSelectedCafeForStory(cafe); // Assuming this is the correct state to set
            setFullscreenStoryIndex(0);
            setStoryProgress(0);
        }
    };

    const renderCafeItem = ({ item }: { item: Cafe }) => (
        <Pressable
            style={styles.cafeCard}
            onPress={() => router.push(`/cafe/${item.id}`)}
        >
            <Pressable onPress={() => {
                if (item.hasStory && item.activeStories.length > 0) {
                    openStory(item.id);
                } else {
                    router.push(`/cafe/${item.id}`);
                }
            }}>
                {item.hasStory ? (
                    <LinearGradient
                        colors={['#C13584', '#E1306C', '#FD1D1D', '#F56040', '#F77737', '#FCAF45', '#FFDC80']}
                        start={{ x: 0, y: 1 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.storyRing}
                    >
                        <View style={styles.storyInner}>
                            <Image
                                source={{ uri: item.image }}
                                style={styles.cafeImage}
                                contentFit="cover"
                                transition={500}
                            />
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
                        <AntDesign name="star" size={12} color={Colors.cta} />
                        <Text style={styles.ratingText}>{item.rating > 0 ? item.rating.toFixed(1) : "New"}</Text>
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
                        <MaterialIcons name="event-seat" size={14} color={Colors.textSecondary} />
                        <Text style={styles.seatsText}>{item.two_tables * 2 + item.four_tables * 4}</Text>
                    </View>
                </View>
            </View>
        </Pressable>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyStateContainer}>
            <View style={styles.emptyStateIconBg}>
                <Feather name="coffee" size={48} color={Colors.borderLight} />
            </View>
            <Text style={styles.emptyStateTitle}>No Cafes Found</Text>
            <Text style={styles.emptyStateText}>
                We couldn't find any cafes matching your criteria. Try adjusting your filters or expanding your search radius.
            </Text>
            <Pressable style={styles.clearFiltersBtn} onPress={resetFilters}>
                <Text style={styles.clearFiltersText}>Clear All Filters</Text>
            </Pressable>
        </View>
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
                        showsMyLocationButton={false}
                    >
                        {filteredCafes.map(cafe => {
                            if (!cafe.latitude || !cafe.longitude) return null;
                            return (
                                <Marker
                                    key={cafe.id}
                                    coordinate={{
                                        latitude: Number(cafe.latitude),
                                        longitude: Number(cafe.longitude)
                                    }}
                                    title={cafe.name}
                                >
                                    <View style={styles.markerContainer}>
                                        <View style={[styles.markerDot, { backgroundColor: getOccupancyColor(cafe.occupancy) }]} />
                                    </View>
                                </Marker>
                            );
                        })}
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
                            <AntDesign name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search cafes..."
                                placeholderTextColor={Colors.textSecondary}
                                value={searchQuery}
                                onChangeText={(text) => {
                                    setSearchQuery(text);
                                    if (text.length > 2) {
                                        logger.debug('Home', 'User searching', { query: text });
                                    }
                                }}
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
                                <Feather name="sliders" size={18} color={showFilterModal ? Colors.white : Colors.primary} />
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
                                        {filter === "Saved" ? (
                                            <AntDesign
                                                name="heart"
                                                size={18}
                                                color={activeFilters.includes(filter) ? Colors.white : Colors.primary}
                                            />
                                        ) : filter === "Open Now" ? (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                <Feather
                                                    name="clock"
                                                    size={16}
                                                    color={activeFilters.includes(filter) ? Colors.white : Colors.primary}
                                                />
                                                <Text
                                                    style={[
                                                        styles.filterText,
                                                        activeFilters.includes(filter) && styles.filterTextActive,
                                                    ]}
                                                >
                                                    Open
                                                </Text>
                                            </View>
                                        ) : (
                                            <Text
                                                style={[
                                                    styles.filterText,
                                                    activeFilters.includes(filter) && styles.filterTextActive,
                                                ]}
                                            >
                                                {filter}
                                            </Text>
                                        )}
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

                            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                                <View style={styles.modalSection}>
                                    <Text style={styles.modalLabel}>Radius (km)</Text>
                                    <View style={styles.optionRow}>
                                        {[1, 5, 20, 100].map(r => (
                                            <Pressable
                                                key={r}
                                                style={[styles.optionBtn, radius === r && styles.optionBtnActive]}
                                                onPress={() => setRadius(r)}
                                            >
                                                <Text style={[styles.optionText, radius === r && styles.optionTextActive]}>{r === 100 ? 'Any' : `${r} km`}</Text>
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
                                                <Text style={[styles.optionText, minRating === r && styles.optionTextActive]}>{r.toFixed(1)}+</Text>
                                                <AntDesign name="star" size={12} color={minRating === r ? Colors.white : Colors.cta} />
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

                                <View style={styles.modalSection}>
                                    <Text style={styles.modalLabel}>Vibes</Text>
                                    <View style={styles.optionRow}>
                                        {PREFERENCE_OPTIONS.vibes.map(v => (
                                            <Pressable
                                                key={v}
                                                style={[styles.optionBtn, filterVibes.includes(v) && styles.optionBtnActive]}
                                                onPress={() => togglePreference('vibes', v)}
                                            >
                                                <Text style={[styles.optionText, filterVibes.includes(v) && styles.optionTextActive]}>{v}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.modalSection}>
                                    <Text style={styles.modalLabel}>Visit Purpose</Text>
                                    <View style={styles.optionRow}>
                                        {PREFERENCE_OPTIONS.purpose.map(p => (
                                            <Pressable
                                                key={p}
                                                style={[styles.optionBtn, filterPurpose.includes(p) && styles.optionBtnActive]}
                                                onPress={() => togglePreference('purpose', p)}
                                            >
                                                <Text style={[styles.optionText, filterPurpose.includes(p) && styles.optionTextActive]}>{p}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.modalSection}>
                                    <Text style={styles.modalLabel}>Dietary</Text>
                                    <View style={styles.optionRow}>
                                        {PREFERENCE_OPTIONS.dietary.map(d => (
                                            <Pressable
                                                key={d}
                                                style={[styles.optionBtn, filterDietary.includes(d) && styles.optionBtnActive]}
                                                onPress={() => togglePreference('dietary', d)}
                                            >
                                                <Text style={[styles.optionText, filterDietary.includes(d) && styles.optionTextActive]}>{d}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.modalSection}>
                                    <Text style={styles.modalLabel}>Other Amenities</Text>
                                    <View style={styles.optionRow}>
                                        {PREFERENCE_OPTIONS.amenities.map(a => (
                                            <Pressable
                                                key={a}
                                                style={[styles.optionBtn, filterAmenities.includes(a) && styles.optionBtnActive]}
                                                onPress={() => togglePreference('amenities', a)}
                                            >
                                                <Text style={[styles.optionText, filterAmenities.includes(a) && styles.optionTextActive]}>{a}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>
                            </ScrollView>

                            <Pressable style={styles.applyBtn} onPress={() => setShowFilterModal(false)}>
                                <Text style={styles.applyText}>Apply Filters</Text>
                            </Pressable>
                        </View>
                    )}
                </View>

                {/* Recenter Button */}
                {
                    location && (
                        <Pressable style={styles.recenterBtn} onPress={recenterMap}>
                            <MaterialIcons name="my-location" size={24} color={Colors.primary} />
                        </Pressable>
                    )
                }
            </View >

            {/* Bottom Half: List */}
            < View style={styles.listContainer} >
                <View style={styles.listHeader}>
                    <Text style={styles.listTitle}>Nearby Cafes ({filteredCafes.length})</Text>
                </View>
                <FlatList
                    data={filteredCafes}
                    renderItem={renderCafeItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[styles.listContent, filteredCafes.length === 0 && styles.listContentEmpty]}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={renderEmptyState}
                />
            </View >

            {/* Direct Story Viewer Modal */}
            < Modal
                visible={!!selectedCafeForStory
                }
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedCafeForStory(null)}
            >
                <View style={styles.storyModalContainer}>
                    <StatusBar style="light" />

                    {selectedCafeForStory && (
                        <>
                            {/* Progress Bars */}
                            <View style={[styles.progressBarContainer, { top: insets.top + 20 }]}>
                                {selectedCafeForStory.activeStories.map((_, idx) => (
                                    <View key={idx} style={[styles.progressTrack, { flex: 1 }]}>
                                        <View style={[
                                            styles.progressBar,
                                            {
                                                width: idx < fullscreenStoryIndex ? '100%' : (idx === fullscreenStoryIndex ? `${storyProgress}%` : '0%')
                                            }
                                        ]} />
                                    </View>
                                ))}
                            </View>

                            <Pressable style={styles.storyCloseArea} onPress={() => setSelectedCafeForStory(null)} />

                            <View style={styles.storyContent}>
                                <Image
                                    source={{
                                        uri: getImageUrl(selectedCafeForStory.activeStories[fullscreenStoryIndex].image_url) ||
                                            selectedCafeForStory.activeStories[fullscreenStoryIndex].image_url
                                    }}
                                    style={styles.fullStoryImage}
                                    contentFit="contain"
                                />

                                <View style={[styles.storyHeader, { top: insets.top + 40 }]}>
                                    <View style={styles.storyInfoRow}>
                                        <View style={styles.storyAvatar}>
                                            <Text style={styles.storyAvatarText}>{selectedCafeForStory.name.charAt(0)}</Text>
                                        </View>
                                        <View>
                                            <Text style={styles.storyCafeName}>{selectedCafeForStory.name}</Text>
                                            <Text style={styles.storyTimestamp}>
                                                {new Date(selectedCafeForStory.activeStories[fullscreenStoryIndex].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                        </View>
                                    </View>

                                    <Pressable onPress={() => setSelectedCafeForStory(null)} style={styles.closeBtn}>
                                        <AntDesign name="close" size={24} color={Colors.white} />
                                    </Pressable>
                                </View>

                                {/* Story Tags */}
                                <View style={[styles.storyTagsContainer, { bottom: 40 }]}>
                                    {selectedCafeForStory.activeStories[fullscreenStoryIndex].vibe && (
                                        <View style={styles.storyTagPill}>
                                            <AntDesign name="rocket" size={14} color={Colors.white} />
                                            <Text style={styles.storyTagText}>{selectedCafeForStory.activeStories[fullscreenStoryIndex].vibe}</Text>
                                        </View>
                                    )}
                                    {selectedCafeForStory.activeStories[fullscreenStoryIndex].visit_purpose && (
                                        <View style={styles.storyTagPill}>
                                            <Feather name="coffee" size={14} color={Colors.white} />
                                            <Text style={styles.storyTagText}>{selectedCafeForStory.activeStories[fullscreenStoryIndex].visit_purpose}</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Navigation Taps */}
                                <View style={styles.storyNavContainer}>
                                    <Pressable
                                        style={styles.storyNavBtn}
                                        onPress={() => {
                                            if (fullscreenStoryIndex > 0) {
                                                setFullscreenStoryIndex(idx => idx - 1);
                                                setStoryProgress(0);
                                            }
                                        }}
                                    />
                                    <Pressable
                                        style={styles.storyNavBtn}
                                        onPress={() => {
                                            if (fullscreenStoryIndex < selectedCafeForStory.activeStories.length - 1) {
                                                setFullscreenStoryIndex(idx => idx + 1);
                                                setStoryProgress(0);
                                            } else {
                                                setSelectedCafeForStory(null);
                                            }
                                        }}
                                    />
                                </View>
                            </View>
                        </>
                    )}
                </View>
            </Modal >
        </View >
    );
}





















const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundLight,
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
        backgroundColor: Colors.backgroundLight,
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
        backgroundColor: Colors.white,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        ...Shadows.small,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: Colors.textPrimary,
    },
    profileBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.white,
        padding: 2,
        ...Shadows.small,
    },
    profileAvatarPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
        backgroundColor: Colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileAvatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.textPrimary,
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
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.small,
    },
    filterBtnActive: {
        backgroundColor: Colors.primary,
    },
    filtersContainer: {
        gap: 8,
        paddingRight: 16,
        alignItems: 'center',
    },
    filterChip: {
        backgroundColor: Colors.white,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        ...Shadows.small,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    filterChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    filterText: {
        fontSize: 14,
        color: Colors.textPrimary,
        fontWeight: "500",
    },
    filterTextActive: {
        color: Colors.white,
    },
    filterModal: {
        position: 'absolute',
        top: 130, // Below filters
        left: 16,
        right: 16,
        maxHeight: Dimensions.get('window').height * 0.6,
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        ...Shadows.medium,
    },
    modalScroll: {
        marginBottom: 10,
    },
    recenterBtn: {
        position: 'absolute',
        right: 16,
        bottom: 30, // Positioned above the list container overlap area
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.small,
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
        color: Colors.error,
        fontSize: 14,
        fontWeight: '500',
    },
    modalSection: {
        marginBottom: 16,
    },
    modalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textSecondary,
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
        backgroundColor: Colors.borderLight,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    optionBtnActive: {
        backgroundColor: Colors.primary,
    },
    optionText: {
        fontSize: 13,
        color: Colors.textPrimary,
    },
    optionTextActive: {
        color: Colors.white,
    },
    applyBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    applyText: {
        color: Colors.white,
        fontWeight: '700',
        fontSize: 16,
    },
    listContainer: {
        flex: 1,
        backgroundColor: Colors.backgroundLight,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -20,
        ...Shadows.medium,
        overflow: "hidden",
    },
    listHeader: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
        backgroundColor: Colors.backgroundLight,
    },
    listTitle: {
        fontSize: 20,
        fontFamily: Typography.black,
        color: Colors.textPrimary,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 40,
    },
    listContentEmpty: {
        flex: 1,
        justifyContent: 'center',
    },
    cafeCard: {
        flexDirection: "row",
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 12,
        marginBottom: 16,
        ...Shadows.small,
    },
    emptyStateContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        marginTop: 40,
    },
    emptyStateIconBg: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.borderLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyStateTitle: {
        fontSize: 20,
        fontFamily: Typography.black,
        color: Colors.textPrimary,
        marginBottom: 12,
        textAlign: 'center',
    },
    emptyStateText: {
        fontSize: 16,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    clearFiltersBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: Colors.primary,
        borderRadius: 30,
    },
    clearFiltersText: {
        color: Colors.white,
        fontSize: 16,
        fontFamily: Typography.bold,
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
        backgroundColor: Colors.white,
        padding: 2,
    },
    cafeImage: {
        width: '100%',
        height: '100%',
        borderRadius: 38,
        backgroundColor: Colors.borderLight,
    },
    cafeImageNormal: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.borderLight,
    },
    cafeInfo: {
        flex: 1,
        justifyContent: "space-between",
        paddingVertical: 4,
        marginLeft: 16,
    },
    cafeHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    cafeName: {
        fontSize: 16,
        fontFamily: Typography.bold,
        color: Colors.textPrimary,
        flex: 1,
    },
    ratingContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: Colors.cta + '20', // Low opacity caramel
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: "700",
        color: Colors.cta,
    },
    cafeAddress: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    metaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    cafeDistance: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: "500",
    },
    dotSeparator: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: Colors.borderLight,
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
        color: Colors.textSecondary,
        fontWeight: "500",
    },
    markerContainer: {
        padding: 4,
        backgroundColor: Colors.white,
        borderRadius: 12,
        ...Shadows.small,
    },
    markerDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: Colors.white,
    },
    // Story Viewer Styles
    storyModalContainer: {
        flex: 1,
        backgroundColor: Colors.backgroundDark,
    },
    progressBarContainer: {
        position: 'absolute',
        left: 10,
        right: 10,
        flexDirection: 'row',
        gap: 5,
        zIndex: 100,
    },
    progressTrack: {
        flex: 1,
        height: 3,
        backgroundColor: Colors.white + '4D', // 30% opacity
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: Colors.white,
    },
    storyCloseArea: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
    },
    storyContent: {
        flex: 1,
        justifyContent: 'center',
    },
    fullStoryImage: {
        width: '100%',
        height: '100%',
    },
    storyHeader: {
        position: 'absolute',
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
    },
    storyInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    storyAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
    storyAvatarText: {
        fontWeight: '700',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    storyCafeName: {
        color: Colors.white,
        fontSize: 14,
        fontWeight: '700',
    },
    storyTimestamp: {
        color: Colors.white + 'CC', // 80% opacity
        fontSize: 12,
        marginTop: 1,
    },
    closeBtn: {
        padding: 8,
    },
    storyNavContainer: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        flexDirection: 'row',
    },
    storyNavBtn: {
        flex: 1,
    },
    storyTagsContainer: {
        position: 'absolute',
        left: 20,
        right: 20,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        zIndex: 100,
    },
    storyTagPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    storyTagText: {
        color: Colors.white,
        fontSize: 13,
        fontWeight: '600',
    },
});
