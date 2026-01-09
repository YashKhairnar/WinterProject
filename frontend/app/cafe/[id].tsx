import { View, Text, StyleSheet, ScrollView, Platform, Pressable, FlatList, Dimensions, Share, Alert, Modal, TextInput, ActivityIndicator, Linking, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from "react-native";
import Svg, { Path, Defs, LinearGradient as RNSvgLinearGradient, Stop, Circle } from 'react-native-svg';
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
import { useState, useEffect, useRef } from "react";
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getImageUrl } from "../../utils/image";
import { Colors, Shadows } from "../../constants/theme";

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
    cover_photo?: string;
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
    two_tables?: number;
    four_tables?: number;
    latitude: number;
    longitude: number;
}

interface LiveUpdate {
    id: string;
    cafe_id: string;
    user_id: string;
    image_url: string;
    created_at: string;
    expires_at: string;
}

export default function CafeProfile() {
    const { id, autoShowStory } = useLocalSearchParams();
    const router = useRouter();
    const { toggleSaved, isSaved } = useSavedCafes();
    const { isCheckedIn, loading: checkInLoading } = useCheckIn();
    const cafeId = Array.isArray(id) ? id[0] : id; // Handle potential array from search params
    const insets = useSafeAreaInsets();
    const { reserveTable, cancelReservation, hasReservation, getReservation, loading: reservationLoading } = useReservation();
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

    const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

    // Gallery State
    const [galleryVisible, setGalleryVisible] = useState(false);
    const [galleryIndex, setGalleryIndex] = useState(0);
    const [menuVisible, setMenuVisible] = useState(false);
    const [menuIndex, setMenuIndex] = useState(0);

    // Live Updates State
    const [liveUpdates, setLiveUpdates] = useState<LiveUpdate[]>([]);
    const [selectedStory, setSelectedStory] = useState<LiveUpdate | null>(null);
    const [storyProgress, setStoryProgress] = useState(0);

    // Camera State for Story Upload
    const [cameraVisible, setCameraVisible] = useState(false);
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const cameraRef = useRef<CameraView>(null);

    // Review State
    const [reviews, setReviews] = useState<any[]>([]);
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewText, setReviewText] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);

    // Occupancy History State
    const [occupancyHistory, setOccupancyHistory] = useState<any[]>([]);


    // Auto-close timer for stories
    useEffect(() => {
        if (!selectedStory) return;

        const timer = setTimeout(() => {
            setSelectedStory(null);
        }, 5000); // 5 seconds      

        return () => clearTimeout(timer); // cleanup if story changes/closes early
    }, [selectedStory]);


    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationMsg('Permission to access location was denied');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setUserLocation(location);
        })();
    }, []);

    useEffect(() => {
        if (userLocation && cafe) {
            const dist = calculateDistance(
                userLocation.coords.latitude,
                userLocation.coords.longitude,
                cafe.latitude,
                cafe.longitude
            );
            // Allow check-in within 500km
            const d = dist == 0 ? Infinity : dist;
            setIsNearCafe(d <= 0.5);
        }
    }, [userLocation, cafe]);

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

    useEffect(() => {
        if (cafeId) {
            fetchCafeDetails();
            fetchLiveUpdates();
            fetchReviews();
            fetchOccupancyHistory(); // Fetch occupancy history on component mount

            // Poll for updates
            const interval = setInterval(() => {
                fetchCafeDetails(true);
                fetchLiveUpdates(true);
                fetchReviews(); // Might as well poll reviews too
                fetchOccupancyHistory(); // Poll occupancy history too
            }, 30000); // Poll every 30 seconds

            return () => clearInterval(interval);
        }
    }, [cafeId]);
    const fetchCafeDetails = async (isBackground = false) => {
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
            if (!isBackground) setLoading(false);
        }
    };

    const fetchLiveUpdates = async (isBackground = false) => {
        try {
            const res = await fetch(`${API_URL}/liveUpdates/cafe/${cafeId}`);
            if (res.ok) {
                const data = await res.json();
                setLiveUpdates(data);

                // Auto-open story if requested and not yet opened
                if (autoShowStory === 'true' && !isBackground && data.length > 0 && !selectedStory) {
                    // small delay to ensure UI is ready?
                    setTimeout(() => {
                        setSelectedStory(data[0]);
                    }, 500);
                }
            }
        } catch (err) {
            console.error("Failed to fetch live updates", err);
        }
    };

    const fetchReviews = async () => {
        try {
            const response = await fetch(`${API_URL}/reviews/cafe/${cafeId}`);
            if (response.ok) {
                const data = await response.json();
                setReviews(data);
            }
        } catch (error) {
            console.error("Error fetching reviews:", error);
        }
    };

    const fetchOccupancyHistory = async () => {
        try {
            const response = await fetch(`${API_URL}/occupancy/history/${cafeId}`);
            if (response.ok) {
                const data = await response.json();
                setOccupancyHistory(data);
            }
        } catch (error) {
            console.error("Error fetching occupancy history:", error);
        }
    };

    const renderOccupancyTrend = () => {
        if (!occupancyHistory || occupancyHistory.length < 2) {
            return (
                <View style={[styles.trendContainer, { justifyContent: 'center', alignItems: 'center', height: 180 }]}>
                    <Text style={styles.infoText}>Not enough data for trend graph yet.</Text>
                </View>
            );
        }

        const chartWidth = width - 88; // infoContainer padding (48) + yAxisLabels (40) = 88
        const chartHeight = 120;
        const now = new Date().getTime();
        const past12h = now - (12 * 60 * 60 * 1000);

        // Filter and sort data for last 12h
        const displayData = occupancyHistory
            .filter(p => new Date(p.created_at).getTime() > past12h)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        if (displayData.length < 2) {
            return (
                <View style={[styles.trendContainer, { justifyContent: 'center', alignItems: 'center', height: 180 }]}>
                    <Text style={styles.infoText}>Recording data for your graph...</Text>
                </View>
            );
        }

        const getX = (timestamp: string) => {
            const time = new Date(timestamp).getTime();
            const x = ((time - past12h) / (12 * 60 * 60 * 1000)) * chartWidth;
            return Math.max(0, Math.min(chartWidth, x)); // Clamp x to chart bounds
        };

        const getY = (level: number) => {
            const clampedLevel = Math.max(0, Math.min(100, level));
            return chartHeight - (clampedLevel / 100) * chartHeight;
        };

        // Smoothing logic - Simple Bezier approach
        const points = displayData.map(p => ({ x: getX(p.created_at), y: getY(p.occupancy_level) }));

        const getBezierCommand = (point: { x: number, y: number }, i: number, a: { x: number, y: number }[]) => {
            // Helper to get control point for smoothness
            const smoothing = 0.15;
            const line = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                return { length: Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2)), angle: Math.atan2(dy, dx) };
            };
            const controlPoint = (current: { x: number, y: number }, previous: { x: number, y: number }, next: { x: number, y: number }, reverse?: boolean) => {
                const p = previous || current;
                const n = next || current;
                const o = line(p, n);
                const angle = o.angle + (reverse ? Math.PI : 0);
                const length = o.length * smoothing;
                const x = Math.max(0, Math.min(chartWidth, current.x + Math.cos(angle) * length)); // Clamp x to chart bounds
                const y = Math.max(0, Math.min(chartHeight, current.y + Math.sin(angle) * length)); // Clamp y to chart bounds
                return [x, y];
            };

            const [cpsX, cpsY] = controlPoint(a[i - 1], a[i - 2], point);
            const [cpeX, cpeY] = controlPoint(point, a[i - 1], a[i + 1], true);
            return `C ${cpsX},${cpsY} ${cpeX},${cpeY} ${point.x},${point.y}`;
        };

        let linePath = `M ${points[0].x} ${points[0].y}`;
        points.forEach((p, i) => {
            if (i > 0) {
                linePath += ` ${getBezierCommand(p, i, points)}`;
            }
        });

        // Create area path (closed polygon)
        // Ensure the area fills up to the last x point and then closes precisely at the chart bottom
        const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

        const format12h = (date: Date) => {
            let hours = date.getHours();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            return `${hours} ${ampm}`;
        };

        // Generate intervals: Now, 2h ago, 4h ago, ..., 12h ago
        const timeLabels = [];
        for (let i = 0; i <= 6; i++) {
            const time = new Date(now - (12 - i * 2) * 60 * 60 * 1000);
            timeLabels.push(format12h(time));
        }

        return (
            <View style={styles.trendContainer}>
                <View style={{ height: chartHeight + 20, width: chartWidth + 40, flexDirection: 'row' }}>
                    {/* Y-Axis Labels */}
                    <View style={styles.yAxisLabels}>
                        <Text style={styles.yAxisText}>Busy</Text>
                        <Text style={styles.yAxisText}>Mod</Text>
                        <Text style={styles.yAxisText}>Low</Text>
                    </View>

                    <Svg width={chartWidth} height={chartHeight + 20}>
                        <Defs>
                            <RNSvgLinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor={Colors.primary} stopOpacity="0.4" />
                                <Stop offset="1" stopColor={Colors.primary} stopOpacity="0.05" />
                            </RNSvgLinearGradient>
                        </Defs>

                        {/* Area Fill */}
                        <Path d={areaPath} fill="url(#areaGradient)" />

                        {/* Line */}
                        <Path
                            d={linePath}
                            fill="none"
                            stroke={Colors.primary}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />

                        {/* Data Points */}
                        {points.map((p, i) => (
                            <Circle
                                key={i}
                                cx={p.x}
                                cy={p.y}
                                r="3"
                                fill={Colors.white}
                                stroke={Colors.primary}
                                strokeWidth="1.5"
                            />
                        ))}
                    </Svg>
                </View>

                {/* X-Axis Labels */}
                <View style={[styles.trendTimeLabels, { marginLeft: 40 }]}>
                    {timeLabels.map((label, idx) => (
                        <Text key={idx} style={styles.trendBarLabel}>{label}</Text>
                    ))}
                </View>
            </View>
        );
    };

    const submitReview = async () => {
        if (!reviewText.trim()) {
            Alert.alert("Error", "Please enter a review.");
            return;
        }

        setSubmittingReview(true);
        try {
            const userAttr = await import('aws-amplify/auth').then(m => m.fetchUserAttributes());
            const payload = {
                cafe_id: cafeId,
                user_sub: userAttr.sub,
                rating: reviewRating,
                review_text: reviewText
            };

            const response = await fetch(`${API_URL}/reviews/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                Alert.alert("Success", "Review submitted!");
                setReviewModalVisible(false);
                setReviewText('');
                setReviewRating(5);
                fetchReviews();
                // Refresh cafe data to get new avg_rating
                fetchCafeDetails(true);
            } else {
                const errorData = await response.json();
                Alert.alert("Error", errorData.detail || "Failed to submit review.");
            }
        } catch (error) {
            console.error("Error submitting review:", error);
            Alert.alert("Error", "An error occurred. Please try again.");
        } finally {
            setSubmittingReview(false);
        }
    };

    // Render Stories Section
    const handleAddStory = async () => {
        if (!isCheckedIn(cafeId)) {
            Alert.alert('Check-in Required', 'Please check in to this cafe before adding a story.');
            return;
        }

        if (!cameraPermission?.granted) {
            const result = await requestCameraPermission();
            if (!result.granted) {
                Alert.alert('Camera Permission', 'Camera access is required to add stories.');
                return;
            }
        }

        setCameraVisible(true);
    };

    const renderStories = () => {
        // Always show the section if user is checked in OR there are stories
        if (!isCheckedIn(cafeId) && (!liveUpdates || liveUpdates.length === 0)) return null;

        return (
            <View style={styles.storiesSection}>
                <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Happening Now</Text>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={[styles.storiesScroll, { paddingRight: 16 }]}
                        style={{ flex: 1 }}
                    >
                        {liveUpdates.length === 0 && isCheckedIn(cafeId) ? (
                            <Text style={{ fontSize: 14, color: Colors.textSecondary, fontStyle: 'italic', marginTop: 10 }}>
                                Share what's happening now!
                            </Text>
                        ) : (
                            liveUpdates.map((update, index) => (
                                <Pressable key={update.id} onPress={() => setSelectedStory(update)} style={styles.storyItem}>
                                    <View style={styles.storyRing}>
                                        <Image source={{ uri: getImageUrl(update.image_url) || update.image_url }} style={styles.storyThumb} />
                                    </View>
                                    <Text style={styles.storyTime}>
                                        {new Date(update.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </Pressable>
                            ))
                        )}
                    </ScrollView>

                    {/* Add Story Button (Sticky Right) */}
                    {isCheckedIn(cafeId) && (
                        <View style={{
                            paddingLeft: 12,
                            paddingRight: 0,
                            borderLeftWidth: 1,
                            borderLeftColor: Colors.borderLight,
                            backgroundColor: Colors.background, // Ensure opaque background if stories scroll behind (though they won't with flex)
                            zIndex: 10
                        }}>
                            <Pressable onPress={handleAddStory} style={styles.storyItem}>
                                <View style={styles.addStoryRing}>
                                    <Feather name="plus" size={30} color={Colors.primary} />
                                </View>
                                <Text style={styles.storyTime}>Add</Text>
                            </Pressable>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    const handleReservePress = () => {
        const currentRes = getReservation(cafeId);
        if (currentRes && currentRes.id) {
            Alert.alert(
                "Cancel Reservation?",
                "Are you sure you want to cancel your table?",
                [
                    { text: "No", style: "cancel" },
                    {
                        text: "Yes", onPress: async () => {
                            try {
                                await cancelReservation(currentRes.id!);
                                Alert.alert("Success", "Reservation Cancelled");
                            } catch (error: any) {
                                Alert.alert("Error", error.message || "Failed to cancel reservation");
                            }
                        }, style: 'destructive'
                    }
                ]
            );
        } else {
            setModalVisible(true);
        }
    };

    const confirmReservation = async () => {
        try {
            await reserveTable({
                cafeId,
                date: selectedDate,
                time: selectedTime,
                partySize
            });
            setModalVisible(false);
            Alert.alert("Table Reserved!", `Your table for ${partySize} at ${selectedTime} is confirmed.`);
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to reserve table. Please try again.");
        }
    };

    const handleShare = async () => {
        if (!cafe) return;

        try {
            await Share.share({
                message: `☕ Found this great spot called ${cafe.name} on Nook! ✨\n\n⭐ Rating: ${cafe.avg_rating || 'N/A'}/5\n📍 ${cafe.address}, ${cafe.city}\n\nCheck it out: https://nookstudio.online`,
                title: `Check out ${cafe.name}`
            });
        } catch (error: any) {
            Alert.alert(error.message);
        }
    };

    const handleWebsitePress = () => {
        if (cafe?.website_link) {
            let url = cafe.website_link;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            Linking.openURL(url).catch(err => {
                Alert.alert("Error", "Could not open website");
                console.error(err);
            });
        } else {
            Alert.alert("Info", "No website link available for this cafe.");
        }
    };

    const handleInstagramPress = () => {
        if (cafe?.instagram_url) {
            let url = cafe.instagram_url;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            Linking.openURL(url).catch(err => {
                Alert.alert("Error", "Could not open Instagram");
                console.error(err);
            });
        } else {
            Alert.alert("Info", "No Instagram link available.");
        }
    };

    const handlePhonePress = () => {
        if (cafe?.phone_number) {
            Linking.openURL(`tel:${cafe.phone_number}`).catch(err => {
                Alert.alert("Error", "Could not initiate call");
                console.error(err);
            });
        } else {
            Alert.alert("Info", "No phone number available.");
        }
    };

    const handleMapPress = () => {
        if (!cafe) return;
        const scheme = Platform.select({ ios: 'maps:', android: 'geo:' });
        const lat = cafe.latitude;
        const lng = cafe.longitude;
        const label = cafe.name;

        const url = Platform.select({
            ios: `${scheme}?q=${label}&ll=${lat},${lng}`,
            android: `${scheme}0,0?q=${lat},${lng}(${label})`
        });

        if (url) {
            Linking.openURL(url).catch(err => {
                Alert.alert("Error", "Could not open maps");
                console.error(err);
            });
        }
    };


    // Helper functions
    const getOccupancyColor = (level: number) => {
        if (level > 80) return Colors.error; // High/Busy
        if (level > 40) return Colors.cta; // Moderate
        return Colors.accent; // Low/Green
    };

    const getOccupancyStatus = (level: number) => {
        if (level > 80) return 'Busy';
        if (level > 40) return 'Moderate';
        return 'Low';
    };

    const formatHours = () => {
        if (!cafe?.working_hours) return { text: "Hours not set", status: 'Closed' };
        const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const now = new Date();
        const today = days[now.getDay()];
        const todayHours = cafe.working_hours[today];

        if (!todayHours) return { text: "Hours unavailable", status: 'Closed' };
        if (todayHours.closed) return { text: "Closed Today", status: 'Closed' };

        // Basic open/closed check
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const [openH, openM] = todayHours.open.split(':').map(Number);
        const [closeH, closeM] = todayHours.close.split(':').map(Number);
        const openTotal = openH * 60 + openM;
        const closeTotal = closeH * 60 + closeM;

        const isOpen = currentTime >= openTotal && currentTime < closeTotal;
        return {
            text: `${todayHours.open} - ${todayHours.close}`,
            status: isOpen ? 'Open' : 'Closed'
        };
    };



    const canCheckIn = hasReservation(cafeId) || isNearCafe;

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.backgroundLight }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (error || !cafe) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: Colors.backgroundLight }]}>
                <Text style={{ fontSize: 16, color: Colors.error }}>{error || "Cafe not found"}</Text>
                <Pressable onPress={() => router.back()} style={{ marginTop: 20, padding: 10 }}>
                    <Text style={{ color: Colors.primary }}>Go Back</Text>
                </Pressable>
            </View>
        );
    }



    const coverImage = getImageUrl(cafe.cover_photo) || (cafe.cafe_photos && cafe.cafe_photos.length > 0 ? getImageUrl(cafe.cafe_photos[0]) : null);
    console.log('[DEBUG] Final coverImage:', coverImage);
    const occupancyLevel = cafe.occupancy_level || 0;
    const occupancyStatus = getOccupancyStatus(occupancyLevel);
    const totalCapacity = (cafe.two_tables || 0) * 2 + (cafe.four_tables || 0) * 4;
    const occupiedSeats = Math.round((occupancyLevel / 100) * totalCapacity);

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
                    <AntDesign name="arrow-left" size={24} color={Colors.white} />
                </View>
            </Pressable>

            {/* Share Button (Absolute Top-Right) */}
            <View style={[styles.headerBtnRow, { top: insets.top + 10 }]}>
                <Pressable
                    style={styles.headerBtn}
                    onPress={handleShare}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <View style={styles.backButtonBlur}>
                        <Feather name="share" size={20} color={Colors.white} />
                    </View>
                </Pressable>

                {/* Like Button */}
                <Pressable
                    style={styles.headerBtn}
                    onPress={() => cafe && toggleSaved({
                        id: cafeId,
                        name: cafe.name,
                        address: cafe.address,
                        image: coverImage || ''
                    })}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <View style={styles.backButtonBlur}>
                        <MaterialIcons
                            name={isSaved(cafeId) ? "favorite" : "favorite-border"}
                            size={24}
                            color={isSaved(cafeId) ? Colors.error : Colors.white}
                        />
                    </View>
                </Pressable>
            </View>

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
                    {/* Title Block */}
                    <View style={styles.titleBlock}>
                        <View style={styles.titleRow}>
                            <View style={styles.titleNameContainer}>
                                <Text style={styles.name}>{cafe.name}</Text>
                                <View style={[
                                    styles.headerStatusBadge,
                                    { backgroundColor: formatHours().status === 'Open' ? Colors.accent + '20' : Colors.error + '10' }
                                ]}>
                                    <Text style={[
                                        styles.headerStatusText,
                                        { color: formatHours().status === 'Open' ? Colors.accent : Colors.error }
                                    ]}>
                                        {formatHours().status}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.ratingBadge}>
                                <AntDesign name="star" size={12} color={Colors.white} />
                                <Text style={styles.ratingBadgeText}>{cafe.avg_rating || "N/A"}</Text>
                            </View>
                        </View>
                        <Text style={styles.addressText}>{cafe.address}, {cafe.city}</Text>
                    </View>

                    {/* Secondary Action Strip */}
                    <View style={styles.secondaryActionRow}>
                        {cafe.phone_number && (
                            <Pressable style={styles.iconActionBtn} onPress={handlePhonePress}>
                                <Feather name="phone" size={20} color={Colors.textPrimary} />
                            </Pressable>
                        )}
                        <Pressable
                            style={styles.iconActionBtn}
                            onPress={handleMapPress}
                        >
                            <Feather name="map-pin" size={20} color={Colors.textPrimary} />
                        </Pressable>
                        {cafe.website_link && (
                            <Pressable style={styles.iconActionBtn} onPress={handleWebsitePress}>
                                <Feather name="globe" size={20} color={Colors.textPrimary} />
                            </Pressable>
                        )}
                        {cafe.instagram_url && (
                            <Pressable style={styles.iconActionBtn} onPress={handleInstagramPress}>
                                <AntDesign name="instagram" size={20} color={Colors.textPrimary} />
                            </Pressable>
                        )}
                    </View>

                    {/* Live Updates (Stories) */}
                    {renderStories()}

                    {/* Action Buttons */}

                    {/* Stats */}
                    <View style={styles.statsCard}>
                        <View style={styles.statItem}>
                            <MaterialIcons name="event-seat" size={24} color={Colors.textSecondary} />
                            <View>
                                <Text style={styles.statValue}>{totalCapacity || '-'}</Text>
                                <Text style={styles.statLabel}>Total Seats</Text>
                            </View>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <MaterialIcons name="people-outline" size={24} color={getOccupancyColor(occupancyLevel)} />
                            <View>
                                <Text style={[styles.statValue, { color: getOccupancyColor(occupancyLevel) }]}>
                                    {occupancyLevel}%
                                </Text>
                                <Text style={styles.statLabel}>Crowd: {occupancyStatus}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Description (Clean) */}
                    {cafe.description && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>The Essence</Text>
                            <Text style={styles.descriptionText}>{cafe.description}</Text>
                        </View>
                    )}


                    <View style={styles.divider} />

                    {/* Gallery - Only show if photos exist */}
                    {/* Gallery */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Visual Moments</Text>
                        {cafe.cafe_photos && cafe.cafe_photos.length > 0 ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
                                {cafe.cafe_photos.map((img, idx) => (
                                    <Pressable key={idx} onPress={() => {
                                        setGalleryIndex(idx);
                                        setGalleryVisible(true);
                                    }}>
                                        <Image source={{ uri: getImageUrl(img) || img }} style={styles.galleryImg} contentFit="cover" />
                                    </Pressable>
                                ))}
                            </ScrollView>
                        ) : (
                            <Text style={styles.infoText}>No photos available.</Text>
                        )}
                    </View>

                    {/* Today's Offers */}
                    {/* <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Today's Offers</Text>
                        <Text style={styles.infoText}>No active offers at the moment.</Text>
                    </View> */}

                    {/* Menu */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Sips & Bites</Text>
                        {cafe.menu_photos && cafe.menu_photos.length > 0 ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
                                {cafe.menu_photos.map((img, idx) => (
                                    <Pressable key={idx} onPress={() => {
                                        setMenuIndex(idx);
                                        setMenuVisible(true);
                                    }}>
                                        <Image source={{ uri: getImageUrl(img) || img }} style={styles.galleryImg} contentFit="cover" />
                                    </Pressable>
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
                        <Text style={styles.sectionTitle}>Comforts & Perks</Text>
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
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionTitle}>When to Visit</Text>
                            <View style={[
                                styles.statusBadge,
                                { backgroundColor: formatHours().status === 'Open' ? Colors.accent + '20' : Colors.error + '10' }
                            ]}>
                                <View style={[
                                    styles.statusDot,
                                    { backgroundColor: formatHours().status === 'Open' ? Colors.accent : Colors.error }
                                ]} />
                                <Text style={[
                                    styles.statusBadgeText,
                                    { color: formatHours().status === 'Open' ? Colors.accent : Colors.error }
                                ]}>
                                    {formatHours().status}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.hoursCard}>
                            <View style={styles.infoRow}>
                                <Feather name="clock" size={16} color={Colors.textSecondary} />
                                <Text style={styles.infoText}>Today: {formatHours().text}</Text>
                            </View>

                            <View style={styles.hoursDivider} />


                            <View style={styles.hoursBreakdown}>
                                {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => {
                                    const dayHours = cafe.working_hours[day];
                                    const isToday = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()] === day;

                                    return (
                                        <View key={day} style={[styles.hourDayRow, isToday && styles.todayRow]}>
                                            <Text style={[styles.hourDayText, isToday && styles.todayText]}>
                                                {day === 'sun' ? 'Sunday' : day === 'mon' ? 'Monday' : day === 'tue' ? 'Tuesday' : day === 'wed' ? 'Wednesday' : day === 'thu' ? 'Thursday' : day === 'fri' ? 'Friday' : 'Saturday'}
                                            </Text>
                                            <Text style={[styles.hourTimeText, isToday && styles.todayText]}>
                                                {dayHours ? (dayHours.closed ? 'Closed' : `${dayHours.open} - ${dayHours.close}`) : 'N/A'}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    </View>


                    {/* Occupancy Trend */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Crowd Trends</Text>
                        {renderOccupancyTrend()}
                    </View>

                    {/* Reviews */}
                    <View style={styles.section}>
                        <View style={styles.rowBetween}>
                            <Text style={styles.sectionTitle}>Community Voice</Text>
                            {isCheckedIn(cafeId) && (
                                <Pressable
                                    style={styles.addReviewBtn}
                                    onPress={() => setReviewModalVisible(true)}
                                >
                                    <Feather name="plus" size={16} color={Colors.white} />
                                    <Text style={styles.addReviewText}>Add Review</Text>
                                </Pressable>
                            )}
                        </View>

                        {reviews.length === 0 ? (
                            <Text style={styles.infoText}>No reviews yet. {isCheckedIn(cafeId) ? "Be the first!" : ""}</Text>
                        ) : (
                            reviews.map((review) => (
                                <View key={review.id} style={styles.reviewCard}>
                                    <View style={styles.reviewHeader}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                            <Text style={styles.reviewUser} numberOfLines={1}>{review.username}</Text>
                                            <Text style={styles.reviewDate}>
                                                • {new Date(review.created_at).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        <View style={styles.reviewRating}>
                                            <MaterialIcons name="star" size={14} color={Colors.cta} />
                                            <Text style={styles.reviewRatingText}>{review.rating}.0</Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.reviewText, { width: width - 72 }]}>{review.review_text}</Text>
                                </View>
                            ))
                        )}
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
                                    <Feather name="x" size={24} color={Colors.primary} />
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
                                    <Feather name="minus" size={20} color={Colors.primary} />
                                </Pressable>
                                <Text style={styles.partyValue}>{partySize} People</Text>
                                <Pressable onPress={() => setPartySize(Math.min(10, partySize + 1))} style={styles.counterBtn}>
                                    <Feather name="plus" size={20} color={Colors.primary} />
                                </Pressable>
                            </View>

                            <Pressable
                                style={[styles.confirmBtn, reservationLoading && { opacity: 0.7 }]}
                                onPress={confirmReservation}
                                disabled={reservationLoading}
                            >
                                {reservationLoading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.confirmBtnText}>Confirm Reservation</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </Modal>

                {/* Story Viewer Modal */}
                <Modal
                    visible={!!selectedStory}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setSelectedStory(null)}
                >
                    <View style={styles.storyModalContainer}>
                        <StatusBar style="light" />

                        {/* Progress Bar */}
                        {selectedStory && (
                            <View style={[styles.progressBarContainer, { top: insets.top + 20 }]}>
                                <View style={[styles.progressBar, { width: `${storyProgress}%` }]} />
                            </View>
                        )}

                        <Pressable style={styles.storyCloseArea} onPress={() => setSelectedStory(null)} />

                        {selectedStory && (
                            <View style={styles.storyContent}>
                                <Pressable style={{ flex: 1 }} onPress={() => setSelectedStory(null)}>
                                    <Image
                                        source={{ uri: getImageUrl(selectedStory.image_url) || selectedStory.image_url }}
                                        style={styles.fullStoryImage}
                                        contentFit="contain"
                                        cachePolicy="memory-disk"
                                        priority="high"
                                        recyclingKey={selectedStory.id}
                                    />
                                </Pressable>

                                <View style={[styles.storyHeader, { top: insets.top + 40 }]}>
                                    <View style={styles.storyInfoRow}>
                                        <Text style={styles.storyTimestamp}>
                                            {new Date(selectedStory.created_at).toLocaleString()}
                                        </Text>
                                    </View>

                                    <Pressable onPress={() => setSelectedStory(null)} style={styles.closeBtn}>
                                        <AntDesign name="close" size={24} color={Colors.white} />
                                    </Pressable>
                                </View>
                            </View>
                        )}
                    </View>
                </Modal>

                {/* Camera Modal for Story Upload */}
                <Modal
                    visible={cameraVisible}
                    transparent={false}
                    animationType="slide"
                    onRequestClose={() => {
                        setCameraVisible(false);
                        setCapturedPhoto(null);
                    }}
                >
                    <View style={{ flex: 1, backgroundColor: Colors.black }}>
                        <StatusBar style="light" />

                        {!capturedPhoto ? (
                            <>
                                <CameraView
                                    ref={cameraRef}
                                    style={{ flex: 1 }}
                                    facing="back"
                                >
                                    <View style={{ flex: 1, justifyContent: 'space-between' }}>
                                        {/* Header */}
                                        <View style={[{ paddingTop: insets.top + 10, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between' }]}>
                                            <Pressable onPress={() => setCameraVisible(false)} style={{ padding: 10 }}>
                                                <Feather name="x" size={28} color={Colors.white} />
                                            </Pressable>
                                            <Text style={{ color: Colors.white, fontSize: 18, fontWeight: '600' }}>Add Story</Text>
                                            <View style={{ width: 48 }} />
                                        </View>

                                        {/* Capture Button */}
                                        <View style={{ paddingBottom: insets.bottom + 30, alignItems: 'center' }}>
                                            <Pressable
                                                onPress={async () => {
                                                    if (cameraRef.current) {
                                                        const photo = await cameraRef.current.takePictureAsync();
                                                        if (photo) {
                                                            setCapturedPhoto(photo.uri);
                                                        }
                                                    }
                                                }}
                                                style={{
                                                    width: 70,
                                                    height: 70,
                                                    borderRadius: 35,
                                                    borderWidth: 4,
                                                    borderColor: Colors.white,
                                                    backgroundColor: 'transparent',
                                                }}
                                            />
                                        </View>
                                    </View>
                                </CameraView>
                            </>
                        ) : (
                            <View style={{ flex: 1 }}>
                                {/* Preview */}
                                <Image source={{ uri: capturedPhoto }} style={{ flex: 1 }} contentFit="contain" />

                                {/* Actions */}
                                <View style={[{ position: 'absolute', bottom: insets.bottom + 20, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 40 }]}>
                                    <Pressable
                                        onPress={() => setCapturedPhoto(null)}
                                        style={{ backgroundColor: Colors.white, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 25 }}
                                    >
                                        <Text style={{ color: Colors.black, fontWeight: '600' }}>Retake</Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={async () => {
                                            if (!capturedPhoto) return;

                                            setUploading(true);
                                            try {
                                                const user = await import('aws-amplify/auth').then(m => m.fetchUserAttributes());

                                                const formData = new FormData();
                                                formData.append('cafe_id', cafeId);
                                                formData.append('user_id', user.sub || '');

                                                const filename = capturedPhoto.split('/').pop() || 'photo.jpg';
                                                formData.append('photo', {
                                                    uri: capturedPhoto,
                                                    type: 'image/jpeg',
                                                    name: filename,
                                                } as any);

                                                const API_URL = process.env.EXPO_PUBLIC_API_URL;
                                                const response = await fetch(`${API_URL}/liveUpdates`, {
                                                    method: 'POST',
                                                    body: formData,
                                                });

                                                if (response.ok) {
                                                    Alert.alert('Success', 'Story uploaded!');
                                                    setCameraVisible(false);
                                                    setCapturedPhoto(null);
                                                    // Refresh stories
                                                    fetchLiveUpdates();
                                                } else {
                                                    const error = await response.text();
                                                    Alert.alert('Error', `Failed to upload: ${error}`);
                                                }
                                            } catch (error) {
                                                console.error('Upload error:', error);
                                                Alert.alert('Error', 'Failed to upload story');
                                            } finally {
                                                setUploading(false);
                                            }
                                        }}
                                        disabled={uploading}
                                        style={{ backgroundColor: Colors.cta, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 25 }}
                                    >
                                        {uploading ? (
                                            <ActivityIndicator color={Colors.white} />
                                        ) : (
                                            <Text style={{ color: Colors.white, fontWeight: '600' }}>Upload</Text>
                                        )}
                                    </Pressable>
                                </View>
                            </View>
                        )}
                    </View>
                </Modal>

                {/* Gallery Viewer Modal */}
                <Modal
                    visible={galleryVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setGalleryVisible(false)}
                >
                    <View style={styles.galleryModalContainer}>
                        <StatusBar style="light" />
                        <Pressable style={styles.closeGalleryBtn} onPress={() => setGalleryVisible(false)}>
                            <Feather name="x" size={24} color={Colors.white} />
                        </Pressable>

                        {cafe && cafe.cafe_photos && (
                            <FlatList
                                data={cafe.cafe_photos}
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                initialScrollIndex={galleryIndex}
                                getItemLayout={(data, index) => (
                                    { length: width, offset: width * index, index }
                                )}
                                renderItem={({ item }) => (
                                    <View style={{ width: width, height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                                        <Image
                                            source={{ uri: getImageUrl(item) || item }}
                                            style={{ width: '100%', height: '80%' }}
                                            contentFit="contain"
                                            cachePolicy="memory-disk"
                                            priority="high"
                                        />
                                    </View>
                                )}
                                keyExtractor={(item, index) => index.toString()}
                            />
                        )}
                    </View>
                </Modal>

                {/* Review Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={reviewModalVisible}
                    onRequestClose={() => setReviewModalVisible(false)}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={{ flex: 1 }}
                    >
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={styles.modalOverlay}>
                                <Pressable
                                    style={styles.modalContent}
                                    onPress={(e) => e.stopPropagation()}
                                >
                                    <View style={styles.modalHeader}>
                                        <Text style={styles.modalTitle}>Rate & Review</Text>
                                        <Pressable onPress={() => setReviewModalVisible(false)}>
                                            <Feather name="x" size={24} color={Colors.primary} />
                                        </Pressable>
                                    </View>

                                    <Text style={styles.label}>Rating</Text>
                                    <View style={styles.starsRow}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Pressable key={star} onPress={() => setReviewRating(star)}>
                                                <MaterialIcons
                                                    name={star <= reviewRating ? "star" : "star-border"}
                                                    size={32}
                                                    color={star <= reviewRating ? Colors.cta : Colors.textSecondary}
                                                />
                                            </Pressable>
                                        ))}
                                    </View>

                                    <Text style={styles.label}>Your Review</Text>
                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        placeholder="Share your experience..."
                                        placeholderTextColor={Colors.textSecondary}
                                        multiline
                                        numberOfLines={4}
                                        value={reviewText}
                                        onChangeText={setReviewText}
                                    />

                                    <Pressable
                                        style={[styles.confirmBtn, submittingReview && { opacity: 0.7 }]}
                                        onPress={submitReview}
                                        disabled={submittingReview}
                                    >
                                        {submittingReview ? (
                                            <ActivityIndicator color={Colors.white} />
                                        ) : (
                                            <Text style={styles.confirmBtnText}>Submit Review</Text>
                                        )}
                                    </Pressable>
                                </Pressable>
                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </Modal>

                {/* Menu Photo Viewer Modal */}
                <Modal
                    visible={menuVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setMenuVisible(false)}
                >
                    <View style={styles.galleryModalContainer}>
                        <StatusBar style="light" />
                        <Pressable style={styles.closeGalleryBtn} onPress={() => setMenuVisible(false)}>
                            <Feather name="x" size={24} color={Colors.white} />
                        </Pressable>

                        {cafe && cafe.menu_photos && (
                            <FlatList
                                data={cafe.menu_photos}
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                initialScrollIndex={menuIndex}
                                getItemLayout={(data, index) => (
                                    { length: width, offset: width * index, index }
                                )}
                                renderItem={({ item }) => (
                                    <View style={{ width: width, height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                                        <Image
                                            source={{ uri: getImageUrl(item) || item }}
                                            style={{ width: '100%', height: '80%' }}
                                            contentFit="contain"
                                            cachePolicy="memory-disk"
                                            priority="high"
                                        />
                                    </View>
                                )}
                                keyExtractor={(item, index) => index.toString()}
                            />
                        )}
                    </View>
                </Modal>

            </ScrollView>

            {/* Sticky Bottom Action Bar */}
            <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + 16, flexDirection: 'column' }]}>
                {hasReservation(cafeId) && (
                    <View style={styles.reservationBanner}>
                        <Feather name="calendar" size={14} color={Colors.accent} />
                        <Text style={styles.reservationBannerText}>
                            {getReservation(cafeId)?.status === 'pending' ? 'Pending' : getReservation(cafeId)?.status === 'cancelled' ? 'Cancelled' : 'Confirmed'}
                            : Reserved for {getReservation(cafeId)?.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {getReservation(cafeId)?.time} for {getReservation(cafeId)?.partySize} people
                            {getReservation(cafeId)?.status === 'cancelled' && getReservation(cafeId)?.cancellation_reason && (
                                <Text style={styles.cancellationReasonText}>
                                    {'\n'}Reason: {getReservation(cafeId)?.cancellation_reason}
                                </Text>
                            )}
                        </Text>
                    </View>
                )}
                <View style={styles.footerActions}>
                    <Pressable
                        style={[
                            styles.footerBtn,
                            styles.reserveBtn,
                            hasReservation(cafeId) && styles.cancelBtn
                        ]}
                        onPress={handleReservePress}
                    >
                        {!hasReservation(cafeId) && (
                            <MaterialIcons
                                name="restaurant"
                                size={20}
                                color={Colors.white}
                            />
                        )}

                        <Text style={[styles.footerBtnText, hasReservation(cafeId) && styles.cancelBtnText]}>
                            {hasReservation(cafeId) ? "Cancel Reservation" : "Reserve Table"}
                        </Text>
                    </Pressable>

                    {(canCheckIn || isCheckedIn(cafeId)) && (
                        <Pressable
                            style={[
                                styles.footerBtn,
                                styles.checkInBtn,
                                (isCheckedIn(cafeId) || checkInLoading) && styles.checkInBtnActive,
                                checkInLoading && { opacity: 0.7 }
                            ]}
                            onPress={() => !isCheckedIn(cafeId) && router.push(`/cafe/${cafeId}/checkin`)}
                            disabled={isCheckedIn(cafeId) || checkInLoading}
                        >
                            {checkInLoading ? (
                                <ActivityIndicator size="small" color={Colors.primary} />
                            ) : (
                                <>
                                    <MaterialIcons
                                        name={isCheckedIn(cafeId) ? "stars" : "location-on"}
                                        size={20}
                                        color={isCheckedIn(cafeId) ? Colors.white : Colors.textPrimary}
                                    />
                                    <Text style={[styles.footerBtnText, !isCheckedIn(cafeId) && { color: Colors.textPrimary }]}>
                                        {isCheckedIn(cafeId) ? "Checked In" : "Check In"}
                                    </Text>
                                </>
                            )}
                        </Pressable>
                    )}
                </View>
            </View>
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundLight,
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
        paddingBottom: 140,
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
        color: Colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    ratingText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    headerMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    headerDescription: {
        fontSize: 14,
        color: Colors.textSecondary,
        maxWidth: '80%',
    },
    metaDot: {
        marginHorizontal: 8,
        color: '#999',
        fontSize: 14,
    },
    shareButton: {
        // removed as replaced by headerBtnRow
    },
    headerBtnRow: {
        position: 'absolute',
        right: 20,
        zIndex: 100,
        flexDirection: 'row',
        gap: 12,
    },
    headerBtn: {
        // Individual button container
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
        color: Colors.textPrimary,
    },
    statsCard: {
        flexDirection: 'row',
        backgroundColor: Colors.backgroundLight,
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
        color: Colors.textPrimary,
    },
    statLabel: {
        fontSize: 11,
        color: '#666',
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: Colors.borderLight,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.borderLight,
        marginVertical: 24,
    },
    section: {
        gap: 12,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.primary,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    seeAll: {
        fontSize: 14,
        color: Colors.cta,
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
    storiesSection: {
        paddingVertical: 10,
        marginBottom: 10,
    },
    storiesScroll: {
        paddingLeft: 20,
        gap: 16,
    },
    storyItem: {
        alignItems: 'center',
        gap: 4,
    },
    storyRing: {
        width: 68,
        height: 68,
        borderRadius: 34,
        borderWidth: 2,
        borderColor: Colors.cta, // Caramel highlight
        justifyContent: 'center',
        alignItems: 'center',
        padding: 2,
    },
    addStoryRing: {
        width: 68,
        height: 68,
        borderRadius: 34,
        borderWidth: 2,
        borderColor: Colors.borderLight,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.backgroundLight,
    },
    storyThumb: {
        width: '100%',
        height: '100%',
        borderRadius: 32,
        backgroundColor: Colors.borderLight,
    },
    storyTime: {
        fontSize: 10,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    storyModalContainer: {
        flex: 1,
        backgroundColor: Colors.black,
        justifyContent: 'center',
    },
    storyCloseArea: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
    storyContent: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        zIndex: 2,
        pointerEvents: 'box-none',
    },
    fullStoryImage: {
        width: width,
        height: '100%',
        backgroundColor: Colors.black,
    },
    storyHeader: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    storyUserBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    storyUserName: {
        color: Colors.white,
        fontWeight: '600',
        fontSize: 14,
    },
    storyTimestamp: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
    },
    closeBtn: {
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    },
    offerExpires: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '600',
    },
    offerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.white,
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
        backgroundColor: Colors.borderLight,
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
        backgroundColor: Colors.borderLight,
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
        color: Colors.textSecondary,
        marginTop: 2,
    },
    addBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        backgroundColor: Colors.borderLight,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    tagText: {
        color: Colors.textPrimary,
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
        color: Colors.textPrimary,
    },
    infoContainer: {
        backgroundColor: Colors.backgroundLight,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        marginTop: -32,
    },
    titleBlock: {
        marginBottom: 16,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        fontSize: 26,
        fontWeight: '800',
        color: Colors.textPrimary,
        marginRight: 8,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    ratingBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.white,
    },
    addressText: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    secondaryActionRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 20,
    },
    iconActionBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.borderLight,
        ...Shadows.small,
    },
    headerAddressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    headerAddressText: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    reviewCard: {
        backgroundColor: Colors.white,
        padding: 12,
        borderRadius: 12,
        gap: 8,
        marginBottom: 8,
        ...Shadows.small,
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    reviewUser: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    reviewRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    reviewRatingText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    reviewText: {
        fontSize: 13,
        color: Colors.textSecondary,
        lineHeight: 18,
        flexWrap: 'wrap',
    },
    reviewDate: {
        fontSize: 11,
        color: Colors.textSecondary,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.accent + '20',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.accent,
    },
    liveText: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.accent,
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
        backgroundColor: Colors.white,
        padding: 2,
    },
    liveImg: {
        width: '100%',
        height: '100%',
        borderRadius: 30,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: Colors.black + '80', // 50% opacity
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.white,
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
        backgroundColor: Colors.borderLight,
        alignItems: 'center',
        minWidth: 70,
    },
    activeChip: {
        backgroundColor: Colors.primary,
    },
    dateText: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    dateNum: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    activeChipText: {
        color: Colors.white,
    },
    timeRow: {
        gap: 10,
    },
    timeChip: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: Colors.borderLight,
    },
    timeText: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.textPrimary,
    },
    partyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.borderLight,
        padding: 6,
        borderRadius: 12,
    },
    counterBtn: {
        padding: 12,
        backgroundColor: Colors.white,
        borderRadius: 8,
        ...Shadows.small,
    },
    partyValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    confirmBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 16,
    },
    confirmBtnText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '700',
    },
    liveTime: {
        fontSize: 10,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    hoursCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    hoursDivider: {
        height: 1,
        backgroundColor: Colors.borderLight,
        marginVertical: 12,
        marginLeft: 28,
    },
    hoursBreakdown: {
        paddingLeft: 28,
        gap: 6,
    },
    hourDayRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 2,
    },
    todayRow: {
        backgroundColor: Colors.borderLight,
        marginHorizontal: -8,
        paddingHorizontal: 8,
        borderRadius: 6,
    },
    hourDayText: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    hourTimeText: {
        fontSize: 13,
        color: Colors.textPrimary,
        fontWeight: '500',
    },
    todayText: {
        color: Colors.textPrimary,
        fontWeight: '700',
    },
    titleNameContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginRight: 8,
    },
    headerStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    headerStatusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    descriptionCard: {
        backgroundColor: Colors.white,
        borderRadius: 20,
        padding: 20,
        marginTop: 16,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        ...Shadows.small,
    },
    cardLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    descriptionText: {
        fontSize: 15,
        color: Colors.textPrimary,
        lineHeight: 22,
    },
    compactContactRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    compactContactBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        ...Shadows.small,
    },
    compactContactText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    addressSection: {
        marginTop: 24,
        marginBottom: 16,
    },
    stickyFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderColor: Colors.borderLight,
        paddingHorizontal: 20,
        paddingTop: 16,
        ...Shadows.medium,
    },
    footerActions: {
        flexDirection: 'row',
        gap: 12,
    },
    reservationBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F1F5F1', // Light mint/gray
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        marginBottom: 10,
        gap: 8,
        alignSelf: 'center',
        borderWidth: 1,
        borderColor: Colors.accent + '20',
    },
    reservationBannerText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.accent,
    },
    cancellationReasonText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.error,
        fontStyle: 'italic',
    },
    footerBtn: {
        flex: 1,
        height: 54,
        borderRadius: 27,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 16,
    },
    reserveBtn: {
        backgroundColor: Colors.primary,
    },
    cancelBtn: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    cancelBtnText: {
        color: Colors.primary,
    },
    reserveBtnActive: {
        backgroundColor: Colors.error,
    },
    checkInBtn: {
        backgroundColor: Colors.borderLight,
    },
    checkInBtnActive: {
        backgroundColor: Colors.accent,
    },
    footerBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.white,
        textAlign: 'center',
    },
    progressBarContainer: {
        position: 'absolute',
        // top is handled dynamically
        left: 10,
        right: 10,
        height: 4,
        backgroundColor: Colors.white + '4D', // 30% opacity
        borderRadius: 2,
        zIndex: 20,
        overflow: 'hidden',
    },
    storyInfoRow: {
        backgroundColor: Colors.black + '80', // 50% opacity
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    progressBar: {
        height: '100%',
        backgroundColor: Colors.white,
        borderRadius: 2,
    },
    galleryModalContainer: {
        flex: 1,
        backgroundColor: Colors.black,
        justifyContent: 'center',
    },
    closeGalleryBtn: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 10,
        backgroundColor: Colors.black + '80', // 50% opacity
        borderRadius: 20,
    },
    addReviewBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    addReviewText: {
        color: Colors.white,
        fontSize: 12,
        fontWeight: '700',
    },
    starsRow: {
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'center',
        marginVertical: 12,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    trendContainer: {
        paddingVertical: 10,
        marginTop: 12,
    },
    trendBarsRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 120,
        marginBottom: 16,
    },
    trendBarWrapper: {
        alignItems: 'center',
        flex: 1,
    },
    trendBar: {
        width: 8,
        borderRadius: 4,
        backgroundColor: Colors.primary,
    },
    trendBarLabel: {
        fontSize: 10,
        color: Colors.textSecondary,
        marginTop: 4,
        fontWeight: '600',
    },
    trendTimeLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    yAxisLabels: {
        width: 40,
        height: 120,
        justifyContent: 'space-between',
        paddingRight: 8,
        paddingVertical: 4,
    },
    yAxisText: {
        fontSize: 10,
        color: Colors.textSecondary,
        fontWeight: '700',
        textAlign: 'right',
    },
    trendLegend: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
    },
    trendLegendText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.textSecondary,
    },
    legendDots: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    legendDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    legendLabel: {
        fontSize: 10,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    input: {
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        borderRadius: 12,
        padding: 12,
        fontSize: 15,
        color: Colors.textPrimary,
    },
});






