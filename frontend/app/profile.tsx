import { View, Text, StyleSheet, ScrollView, Pressable, FlatList, Modal, TextInput, Switch } from "react-native";
import { useState, useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSavedCafes } from "../context/SavedCafesContext";
import { DUMMY_CAFES } from "../data/cafes";
import { signOut, fetchUserAttributes } from 'aws-amplify/auth';


export default function Profile() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { savedCafeIds, toggleSaved } = useSavedCafes();
    const savedCafesList = DUMMY_CAFES.filter(c => savedCafeIds.includes(c.id));

    interface User {
        id: string;
        cognito_sub: string;
        username: string;
        email: string;
        total_reviews: number;
        total_checkins: number;
        preferences: {
            work_friendly: boolean | null;
            noise_preference: string | null;
            vibe_preferences: string[];
            visit_purpose: string[];
            dietary_preferences: string[];
            amenities: string[];
        };
    }
    const [user, setUser] = useState<User>();
    // Profile State
    const [userProfile, setUserProfile] = useState({
        name: 'Loading...',
        handle: '...'
    });
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    const [updated, setUpdated] = useState(false);

    const loadUserInfo = async () => {
        try {
            const attributes = await fetchUserAttributes();
            const name = attributes.name || attributes.email?.split('@')[0] || 'User';
            const handle = attributes.email || '@user';

            //create a user in the Users Table
            const response = await fetch(`${apiUrl}/users/${attributes.sub}`);
            const data = await response.json();
            setUser(data);

            // Update profile state from backend data
            if (data) {
                setUserProfile(prev => ({
                    ...prev,
                    name: data.username || name,
                    handle: data.email || handle
                }));
                if (data.preferences) {
                    setPreferences(prev => ({
                        ...prev,
                        ...data.preferences,
                        // Map backend dietary_preferences to frontend dietary
                        dietary: data.preferences.dietary_preferences || prev.dietary
                    }));
                }
            }
        } catch (error) {
            console.log('Error fetching user info', error);
            setUserProfile(prev => ({ ...prev, name: 'Guest', handle: '@guest' }));
        }
    };

    useEffect(() => {
        loadUserInfo();
    }, [updated]);

    // Preferences State
    const [preferences, setPreferences] = useState<{
        notifications: boolean;
        newsletter: boolean;
        work_friendly: boolean | null;
        noise_preference: string | null;
        vibe_preferences: string[];
        visit_purpose: string[];
        dietary: string[];
        amenities: string[];
    }>({
        notifications: true,
        newsletter: false,
        work_friendly: true,
        noise_preference: 'Moderate',
        vibe_preferences: ['Cozy'],
        visit_purpose: ['Work'],
        dietary: ['Vegan Options'],
        amenities: ['WiFi']
    });


    const [isEditModalVisible, setEditModalVisible] = useState(false);

    // Temp state for editing
    const [tempProfile, setTempProfile] = useState(userProfile);
    const [tempPreferences, setTempPreferences] = useState(preferences);

    const handleEditPress = () => {
        setTempProfile(userProfile);
        setTempPreferences(preferences);
        setEditModalVisible(true);
    };

    const handleSaveProfile = async () => {
        try {
            if (!user?.cognito_sub) return;

            const payload = {
                work_friendly: tempPreferences.work_friendly,
                noise_preference: tempPreferences.noise_preference,
                vibe_preferences: tempPreferences.vibe_preferences,
                visit_purpose: tempPreferences.visit_purpose,
                dietary_preferences: tempPreferences.dietary,
                amenities: tempPreferences.amenities,
                push_notifications: tempPreferences.notifications
            };

            const response = await fetch(`${apiUrl}/users/${user.cognito_sub}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(err || 'Failed to update profile');
            }

            if (response.ok) {
                // Refresh data from backend to be sure
                await loadUserInfo();
                setEditModalVisible(false);
                setUpdated(true);
                alert('Profile updated!');
            }

        } catch (error) {
            console.error("Error updating profile:", error);
            alert('Failed to save profile');
        }
    };

    const toggleListPreference = (category: 'vibe_preferences' | 'visit_purpose' | 'dietary' | 'amenities', value: string) => {
        setTempPreferences(prev => {
            const list = prev[category];
            if (list.includes(value)) {
                return { ...prev, [category]: list.filter(item => item !== value) };
            } else {
                return { ...prev, [category]: [...list, value] };
            }
        });
    };

    const stats = {
        cafesVisited: 42,
        streak: 12, // days
        reviews: 28,
    };

    const recentUpdates = [
        { id: '1', cafe: 'The Grind', time: '2h ago', image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=500' },
        { id: '2', cafe: 'Morning Brew', time: '1d ago', image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?q=80&w=500' },
    ];

    const allPreferences = {
        noise: ['Quiet', 'Moderate', 'Lively'],
        vibes: ['Cozy', 'Modern', 'Industrial', 'Minimalist', 'Rustic'],
        purpose: ['Work', 'Study', 'Social', 'Date', 'Reading'],
        dietary: ['Vegan Options', 'Gluten Free', 'Dairy Free'],
        amenities: ['WiFi', 'Power Outlets', 'Parking', 'Outdoor Seating', 'Pet Friendly']
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="dark" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <AntDesign name="arrow-left" size={24} color="#000" />
                </Pressable>
                <Text style={styles.headerTitle}>My Profile</Text>
                <Pressable>
                    <Feather name="settings" size={24} color="#000" />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* User Info */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>
                            {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
                        </Text>
                    </View>
                    <Text style={styles.username}>{userProfile.name}</Text>
                    <Text style={styles.userHandle}>{userProfile.handle}</Text>
                    <Pressable style={styles.editBtn} onPress={handleEditPress}>
                        <Text style={styles.editBtnText}>Edit Profile</Text>
                    </Pressable>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#E3F2FD' }]}>
                            <FontAwesome5 name="map-marker-alt" size={20} color="#2196F3" />
                        </View>
                        <Text style={styles.statValue}>{user?.total_checkins || 0}</Text>
                        <Text style={styles.statLabel}>Cafes Visited</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#FFF8E1' }]}>
                            <FontAwesome5 name="star" size={20} color="#FFC107" />
                        </View>
                        <Text style={styles.statValue}>{user?.total_reviews || 0}</Text>
                        <Text style={styles.statLabel}>Reviews</Text>
                    </View>
                </View>

                {/* Recent Updates */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recent Updates</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                        {recentUpdates.map((update) => (
                            <View key={update.id} style={styles.updateCard}>
                                <Image source={{ uri: update.image }} style={styles.updateImg} />
                                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.updateGradient} />
                                <View style={styles.updateInfo}>
                                    <Text style={styles.updateCafe}>{update.cafe}</Text>
                                    <Text style={styles.updateTime}>{update.time}</Text>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* Preferences */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>My Preferences</Text>
                    <View style={styles.tagsContainer}>
                        {preferences.dietary.map((pref, index) => (
                            <View key={index} style={styles.tag}>
                                <Text style={styles.tagText}>{pref}</Text>
                            </View>
                        ))}
                        {preferences.vibe_preferences.map((pref, index) => (
                            <View key={`vibe-${index}`} style={styles.tag}>
                                <Text style={styles.tagText}>{pref}</Text>
                            </View>
                        ))}
                        {preferences.amenities.map((pref, index) => (
                            <View key={`amenity-${index}`} style={styles.tag}>
                                <Text style={styles.tagText}>{pref}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Saved Cafes */}
                <View style={styles.section}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.sectionTitle}>Saved Cafes</Text>
                        <Text style={styles.seeAll}>See All</Text>
                    </View>
                    {savedCafesList.length === 0 ? (
                        <Text style={styles.emptyText}>No saved cafes yet.</Text>
                    ) : (
                        savedCafesList.map((cafe) => (
                            <Pressable
                                key={cafe.id}
                                style={styles.cafeRow}
                                onPress={() => router.push(`/cafe/${cafe.id}`)}
                            >
                                <Image source={{ uri: cafe.image }} style={styles.cafeThumb} />
                                <View style={styles.cafeDetails}>
                                    <Text style={styles.cafeTitle}>{cafe.name}</Text>
                                    <Text style={styles.cafeSubtitle}>{cafe.address}</Text>
                                </View>
                                <Pressable
                                    style={styles.iconBtn}
                                    onPress={() => toggleSaved(cafe.id)}
                                >
                                    <MaterialIcons name="favorite" size={20} color="#FF0000" />
                                </Pressable>
                            </Pressable>
                        ))
                    )}
                </View>

                {/* Logout Button */}
                <Pressable style={styles.logoutBtn} onPress={async () => {
                    try {
                        await signOut();
                        router.replace('/auth/login');
                    } catch (error) {
                        console.error("Error signing out: ", error);
                    }
                }}>
                    <Feather name="log-out" size={20} color="#FF3B30" />
                    <Text style={styles.logoutText}>Log Out</Text>
                </Pressable>

            </ScrollView>

            {/* Edit Profile Modal */}
            <Modal
                animationType="slide"
                presentationStyle="pageSheet"
                visible={isEditModalVisible}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Edit Profile</Text>
                        <Pressable onPress={() => setEditModalVisible(false)} style={styles.closeModalBtn}>
                            <Feather name="x" size={24} color="#000" />
                        </Pressable>
                    </View>

                    <ScrollView contentContainerStyle={styles.modalContent}>
                        {/* Profile Info Section */}
                        <Text style={styles.inputLabel}>Display Name</Text>
                        <TextInput
                            style={styles.input}
                            value={tempProfile.name}
                            onChangeText={(text) => setTempProfile(prev => ({ ...prev, name: text }))}
                        />

                        {/* Preferences Section */}
                        <Text style={styles.modalSectionTitle}>Preferences</Text>

                        <View style={styles.switchRow}>
                            <Text style={styles.switchLabel}>Work Friendly</Text>
                            <Switch
                                value={!!tempPreferences.work_friendly}
                                onValueChange={(val) => setTempPreferences(prev => ({ ...prev, work_friendly: val }))}
                                trackColor={{ false: "#767577", true: "#000" }}
                            />
                        </View>

                        <View style={styles.switchRow}>
                            <Text style={styles.switchLabel}>Push Notifications</Text>
                            <Switch
                                value={tempPreferences.notifications}
                                onValueChange={(val) => setTempPreferences(prev => ({ ...prev, notifications: val }))}
                                trackColor={{ false: "#767577", true: "#000" }}
                            />
                        </View>

                        <Text style={styles.inputLabel}>Noise Level</Text>
                        <View style={styles.tagsContainer}>
                            {allPreferences.noise.map((level) => (
                                <Pressable
                                    key={level}
                                    style={[styles.tag, tempPreferences.noise_preference === level && styles.activeTag]}
                                    onPress={() => setTempPreferences(prev => ({ ...prev, noise_preference: level }))}
                                >
                                    <Text style={[styles.tagText, tempPreferences.noise_preference === level && styles.activeTagText]}>{level}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <Text style={styles.inputLabel}>Vibes</Text>
                        <View style={styles.tagsContainer}>
                            {allPreferences.vibes.map((vibe) => (
                                <Pressable
                                    key={vibe}
                                    style={[styles.tag, tempPreferences.vibe_preferences.includes(vibe) && styles.activeTag]}
                                    onPress={() => toggleListPreference('vibe_preferences', vibe)}
                                >
                                    <Text style={[styles.tagText, tempPreferences.vibe_preferences.includes(vibe) && styles.activeTagText]}>{vibe}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <Text style={styles.inputLabel}>Visit Purpose</Text>
                        <View style={styles.tagsContainer}>
                            {allPreferences.purpose.map((item) => (
                                <Pressable
                                    key={item}
                                    style={[styles.tag, tempPreferences.visit_purpose.includes(item) && styles.activeTag]}
                                    onPress={() => toggleListPreference('visit_purpose', item)}
                                >
                                    <Text style={[styles.tagText, tempPreferences.visit_purpose.includes(item) && styles.activeTagText]}>{item}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <Text style={styles.inputLabel}>Amenities</Text>
                        <View style={styles.tagsContainer}>
                            {allPreferences.amenities.map((item) => (
                                <Pressable
                                    key={item}
                                    style={[styles.tag, tempPreferences.amenities.includes(item) && styles.activeTag]}
                                    onPress={() => toggleListPreference('amenities', item)}
                                >
                                    <Text style={[styles.tagText, tempPreferences.amenities.includes(item) && styles.activeTagText]}>{item}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <Text style={styles.inputLabel}>Dietary</Text>
                        <View style={styles.tagsContainer}>
                            {allPreferences.dietary.map((item) => (
                                <Pressable
                                    key={item}
                                    style={[styles.tag, tempPreferences.dietary.includes(item) && styles.activeTag]}
                                    onPress={() => toggleListPreference('dietary', item)}
                                >
                                    <Text style={[styles.tagText, tempPreferences.dietary.includes(item) && styles.activeTagText]}>{item}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <Pressable style={styles.saveBtn} onPress={handleSaveProfile}>
                            <Text style={styles.saveBtnText}>Save Changes</Text>
                        </Pressable>
                    </ScrollView>
                </View>
            </Modal>
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
        backgroundColor: '#fff',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    backBtn: { padding: 4 },
    scrollContent: {
        paddingBottom: 40,
    },
    profileHeader: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#666',
    },
    username: {
        fontSize: 24,
        fontWeight: '800',
        color: '#000',
    },
    userHandle: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    editBtn: {
        marginTop: 12,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ddd',
        backgroundColor: '#fff',
    },
    editBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    statItem: {
        alignItems: 'center',
        width: '30%',
    },
    statIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFEBEE',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#000',
    },
    statLabel: {
        fontSize: 12,
        color: '#888',
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        height: '80%',
        backgroundColor: '#E0E0E0',
        alignSelf: 'center',
    },
    section: {
        marginTop: 24,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
        marginBottom: 16,
    },
    badgesScroll: {
        gap: 16,
        paddingRight: 20,
    },
    badgeCard: {
        alignItems: 'center',
        gap: 8,
    },
    badgeIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    badgeName: {
        fontSize: 12,
        fontWeight: '500',
        color: '#333',
    },
    horizontalScroll: {
        paddingRight: 20,
        gap: 12,
    },
    updateCard: {
        width: 140,
        height: 180,
        borderRadius: 12,
        overflow: 'hidden',
    },
    updateImg: {
        width: '100%',
        height: '100%',
    },
    updateGradient: {
        position: 'absolute',
        left: 0, right: 0, bottom: 0,
        height: 80,
    },
    updateInfo: {
        position: 'absolute',
        bottom: 12,
        left: 12,
    },
    updateCafe: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    updateTime: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    tag: {
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    tagText: {
        fontSize: 14,
        color: '#444',
        fontWeight: '500',
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    seeAll: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '600',
    },
    cafeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F9F9F9',
        borderRadius: 12,
        marginBottom: 12,
        gap: 12,
    },
    cafeThumb: {
        width: 50,
        height: 50,
        borderRadius: 8,
    },
    cafeDetails: {
        flex: 1,
    },
    cafeTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    cafeSubtitle: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
    },
    iconBtn: {
        padding: 8,
    },
    emptyText: {
        color: '#888',
        fontStyle: 'italic',
        marginTop: 8,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 40,
        marginBottom: 20,
        paddingVertical: 16,
        marginHorizontal: 20,
        backgroundColor: '#FFF5F5',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FFE5E5',
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FF3B30',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    closeModalBtn: {
        padding: 4,
    },
    modalContent: {
        padding: 24,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: '#F5F5F5',
        padding: 16,
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    modalSectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginTop: 32,
        marginBottom: 16,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        backgroundColor: '#F9F9F9',
        padding: 16,
        borderRadius: 12,
    },
    switchLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    saveBtn: {
        backgroundColor: '#000',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 40,
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    activeTag: {
        backgroundColor: '#000',
    },
    activeTagText: {
        color: '#fff',
    },
});
