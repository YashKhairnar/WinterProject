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
import { signOut, fetchUserAttributes } from 'aws-amplify/auth';
import { getImageUrl } from "../utils/image";
import { Colors, Shadows } from "../constants/theme";
import { logger } from "../utils/logger";


export default function Profile() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { savedCafes, toggleSaved } = useSavedCafes();
    const savedCafesList = savedCafes;

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
    const [updates, setUpdates] = useState<any[]>([]);
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    const [updated, setUpdated] = useState(false);

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

    const loadUserInfo = async () => {
        try {
            const attributes = await fetchUserAttributes();
            const name = attributes.name || attributes.email?.split('@')[0] || 'User';
            const handle = attributes.email || '@user';

            logger.info('Profile', 'Loading user info', { sub: attributes.sub });

            // Fetch user from Users Table
            logger.logFetch(`${apiUrl}/users/${attributes.sub}`);
            const response = await fetch(`${apiUrl}/users/${attributes.sub}`);

            let data;
            if (response.status === 404) {
                logger.info('Profile', 'User not found in DB, creating new record', { sub: attributes.sub });
                const createRes = await fetch(`${apiUrl}/users/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        cognito_sub: attributes.sub,
                        email: attributes.email,
                        username: name
                    })
                });
                if (createRes.ok) {
                    data = await createRes.json();
                    logger.info('Profile', 'Successfully created user record');
                } else {
                    const err = await createRes.text();
                    logger.error('Profile', 'Failed to create user record', { err });
                }
            } else if (response.ok) {
                data = await response.json();
            }

            if (data) {
                setUser(data);
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

            // Fetch user's live updates
            logger.info('Profile', 'Fetching live updates', { sub: attributes.sub });
            logger.logFetch(`${apiUrl}/liveUpdates/user/${attributes.sub}`);
            const updatesRes = await fetch(`${apiUrl}/liveUpdates/user/${attributes.sub}`);
            console.log('Live updates response status:', updatesRes.status);
            if (updatesRes.ok) {
                const updatesData = await updatesRes.json();
                console.log('Live updates data:', updatesData);
                const mappedUpdates = updatesData.map((u: any) => ({
                    id: u.id,
                    cafe: u.cafe_name || 'Cafe',
                    time: new Date(u.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    image: getImageUrl(u.image_url) || u.image_url
                }));
                console.log('Mapped updates:', mappedUpdates);
                setUpdates(mappedUpdates);
            } else {
                const errorText = await updatesRes.text();
                console.log('Failed to fetch live updates:', errorText);
            }
        } catch (error: any) {
            logger.error('Profile', 'Error fetching user info', { error: error.message });
            setUserProfile(prev => ({ ...prev, name: 'Guest', handle: '@guest' }));
        }
    };

    useEffect(() => {
        loadUserInfo();
    }, [updated]);




    const [isEditModalVisible, setEditModalVisible] = useState(false);
    const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

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
                username: tempProfile.name,
                work_friendly: tempPreferences.work_friendly,
                noise_preference: tempPreferences.noise_preference,
                vibe_preferences: tempPreferences.vibe_preferences,
                visit_purpose: tempPreferences.visit_purpose,
                dietary_preferences: tempPreferences.dietary,
                amenities: tempPreferences.amenities,
                push_notifications: tempPreferences.notifications
            };

            logger.info('Profile', 'Saving profile changes', { payload });
            logger.logFetch(`${apiUrl}/users/${user.cognito_sub}`, { method: 'PATCH' });

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

    const handleDeleteAccount = async () => {
        try {
            if (!user?.cognito_sub) return;

            setIsDeleting(true);
            logger.info('Profile', 'Deleting user account', { sub: user.cognito_sub });

            const response = await fetch(`${apiUrl}/users/${user.cognito_sub}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(err || 'Failed to delete account');
            }

            // If success, sign out and redirect
            await signOut();
            router.replace('/auth/login');

        } catch (error: any) {
            logger.error('Profile', 'Error deleting account', { error: error.message });
            alert('Failed to delete account: ' + error.message);
        } finally {
            setIsDeleting(false);
            setDeleteModalVisible(false);
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
                    <AntDesign name="arrow-left" size={24} color={Colors.primary} />
                </Pressable>
                <Text style={styles.headerTitle}>My Profile</Text>
                <Pressable style={styles.backBtn}>
                    <Feather name="settings" size={24} color={Colors.primary} />
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
                        <View style={[styles.statIconContainer, { backgroundColor: Colors.accent + '15' }]}>
                            <FontAwesome5 name="map-marker-alt" size={20} color={Colors.accent} />
                        </View>
                        <Text style={styles.statValue}>{user?.total_checkins || 0}</Text>
                        <Text style={styles.statLabel}>Cafes Visited</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <View style={[styles.statIconContainer, { backgroundColor: Colors.cta + '15' }]}>
                            <FontAwesome5 name="star" size={20} color={Colors.cta} />
                        </View>
                        <Text style={styles.statValue}>{user?.total_reviews || 0}</Text>
                        <Text style={styles.statLabel}>Reviews</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>My Stories</Text>
                    {updates.length === 0 ? (
                        <Text style={styles.emptyText}>No active stories.</Text>
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                            {updates.map((update) => (
                                <View key={update.id} style={styles.updateCard}>
                                    <Image source={{ uri: update.image }} style={styles.updateImg} />
                                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.updateGradient} />
                                    <View style={styles.updateInfo}>
                                        <Text style={styles.updateCafe}>{update.cafe}</Text>
                                        <Text style={styles.updateTime}>{update.time}</Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    )}
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
                                onPress={() => router.push(`/cafe/${cafe.id}` as any)}
                            >
                                <Image source={{ uri: cafe.image }} style={styles.cafeThumb} />
                                <View style={styles.cafeDetails}>
                                    <Text style={styles.cafeTitle}>{cafe.name}</Text>
                                    <Text style={styles.cafeSubtitle}>{cafe.address}</Text>
                                </View>
                                <Pressable
                                    style={styles.iconBtn}
                                    onPress={() => toggleSaved(cafe)}
                                >
                                    <MaterialIcons name="favorite" size={20} color={Colors.error} />
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
                    <Feather name="log-out" size={20} color={Colors.error} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </Pressable>

                <Pressable
                    style={[styles.logoutBtn, { backgroundColor: Colors.error + '05', borderColor: Colors.error + '10', marginTop: 10 }]}
                    onPress={() => setDeleteModalVisible(true)}
                >
                    <AntDesign name="delete" size={20} color={Colors.error} />
                    <Text style={styles.logoutText}>Delete Account Permanently</Text>
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
                            <Feather name="x" size={24} color={Colors.primary} />
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
                                trackColor={{ false: Colors.borderLight, true: Colors.primary }}
                            />
                        </View>

                        <View style={styles.switchRow}>
                            <Text style={styles.switchLabel}>Push Notifications</Text>
                            <Switch
                                value={tempPreferences.notifications}
                                onValueChange={(val) => setTempPreferences(prev => ({ ...prev, notifications: val }))}
                                trackColor={{ false: Colors.borderLight, true: Colors.primary }}
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

            {/* Delete Account Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={isDeleteModalVisible}
                onRequestClose={() => setDeleteModalVisible(false)}
            >
                <View style={styles.centeredModal}>
                    <View style={styles.confirmModal}>
                        <View style={styles.warningIcon}>
                            <Feather name="alert-triangle" size={32} color={Colors.error} />
                        </View>
                        <Text style={styles.confirmTitle}>Delete Account?</Text>
                        <Text style={styles.confirmDesc}>
                            This action is permanent and cannot be undone. All your check-ins, reviews, and saved cafes will be deleted.
                        </Text>
                        <View style={styles.confirmBtns}>
                            <Pressable
                                style={[styles.confirmBtn, styles.cancelBtn]}
                                onPress={() => setDeleteModalVisible(false)}
                                disabled={isDeleting}
                            >
                                <Text style={styles.cancelBtnText}>Keep Account</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.confirmBtn, styles.deleteBtn]}
                                onPress={handleDeleteAccount}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <View style={styles.loaderSmall} />
                                ) : (
                                    <Text style={styles.deleteBtnText}>Yes, Delete</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View >
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
        backgroundColor: Colors.card,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        ...Shadows.small,
    },
    avatarText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: Colors.textPrimary,
    },
    username: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.textPrimary,
    },
    userHandle: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    editBtn: {
        marginTop: 12,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        backgroundColor: Colors.card,
        ...Shadows.small,
    },
    editBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 24,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    statItem: {
        alignItems: 'center',
        width: '30%',
    },
    statIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.textPrimary,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        height: '80%',
        backgroundColor: Colors.borderLight,
        alignSelf: 'center',
    },
    section: {
        marginTop: 24,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.textPrimary,
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
        backgroundColor: Colors.card,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.small,
    },
    badgeName: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.textPrimary,
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
        backgroundColor: Colors.card,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    tagText: {
        fontSize: 14,
        color: Colors.textSecondary,
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
        color: Colors.cta,
        fontWeight: '600',
    },
    cafeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: Colors.card,
        borderRadius: 12,
        marginBottom: 12,
        gap: 12,
        ...Shadows.small,
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
        color: Colors.textPrimary,
    },
    cafeSubtitle: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    iconBtn: {
        padding: 8,
    },
    emptyText: {
        color: Colors.textSecondary,
        fontStyle: 'italic',
        marginTop: 8,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 40,
        marginBottom: 40,
        paddingVertical: 16,
        marginHorizontal: 24,
        backgroundColor: Colors.error + '10',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.error + '20',
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.error,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: Colors.backgroundLight,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
        backgroundColor: Colors.backgroundLight,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.textPrimary,
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
        color: Colors.textSecondary,
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: Colors.card,
        padding: 16,
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        color: Colors.textPrimary,
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
        color: Colors.textPrimary,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        backgroundColor: Colors.card,
        padding: 16,
        borderRadius: 12,
        ...Shadows.small,
    },
    switchLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: Colors.textPrimary,
    },
    saveBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 40,
    },
    saveBtnText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '700',
    },
    activeTag: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    activeTagText: {
        color: Colors.white,
    },
    centeredModal: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    confirmModal: {
        backgroundColor: Colors.card,
        borderRadius: 24,
        padding: 30,
        width: '100%',
        alignItems: 'center',
        ...Shadows.medium,
    },
    warningIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.error + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    confirmTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.textPrimary,
        marginBottom: 10,
    },
    confirmDesc: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 20,
    },
    confirmBtns: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    confirmBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtn: {
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    deleteBtn: {
        backgroundColor: Colors.error,
    },
    cancelBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    deleteBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.white,
    },
    loaderSmall: {
        width: 20,
        height: 20,
        borderWidth: 2,
        borderColor: Colors.white + '30',
        borderTopColor: Colors.white,
        borderRadius: 10,
    }
});
