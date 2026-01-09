import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Colors, Typography } from "../constants/theme";

export default function PrivacyPolicyPage() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />

            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="chevron-left" size={28} color={Colors.textPrimary} />
                </Pressable>
                <Text style={styles.headerTitle}>Privacy Policy</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Privacy Policy for Nook</Text>
                <Text style={styles.lastUpdated}>Last updated: January 09, 2026</Text>

                <Text style={styles.paragraph}>
                    This Privacy Policy describes how Nook ("we," "us," or "our") collects, uses, and shares your personal information when you use our mobile application (the "App").
                </Text>

                <Text style={styles.sectionTitle}>1. Information We Collect</Text>

                <Text style={styles.subSectionTitle}>A. Information You Provide to Us</Text>
                <Text style={styles.bulletItem}>• <Text style={styles.bold}>Account Information:</Text> When you create an account, we collect your name, email address, and authentication data via AWS Cognito.</Text>
                <Text style={styles.bulletItem}>• <Text style={styles.bold}>Content:</Text> Information you provide when writing reviews, uploading stories, or making reservations.</Text>

                <Text style={styles.subSectionTitle}>B. Information Collected Automatically</Text>
                <Text style={styles.bulletItem}>• <Text style={styles.bold}>Location Information:</Text> With your permission, we collect precise location data to show you nearby cafes and calculate distances. This is essential for the core functionality of discovering cafes near you.</Text>
                <Text style={styles.bulletItem}>• <Text style={styles.bold}>Camera Access:</Text> We access your camera only when you explicitly choose to take a photo for a "Check-in" or "Story" update.</Text>
                <Text style={styles.bulletItem}>• <Text style={styles.bold}>Device Information:</Text> We may collect information about the mobile device you use, including the hardware model, operating system, and unique device identifiers.</Text>

                <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
                <Text style={styles.paragraph}>We use the information we collect to:</Text>
                <Text style={styles.bulletItem}>• Provide, maintain, and improve the App.</Text>
                <Text style={styles.bulletItem}>• Facilitate cafe discoveries and reservations.</Text>
                <Text style={styles.bulletItem}>• Display "Live Updates" and stories to other users.</Text>
                <Text style={styles.bulletItem}>• Authenticate your account and ensure security.</Text>
                <Text style={styles.bulletItem}>• Communicate with you about updates or support.</Text>

                <Text style={styles.sectionTitle}>3. Sharing of Information</Text>
                <Text style={styles.paragraph}>We do not sell your personal information. We may share information as follows:</Text>
                <Text style={styles.bulletItem}>• <Text style={styles.bold}>With Other Users:</Text> Your name, profile photo, and public stories or reviews are visible to other Nook users.</Text>
                <Text style={styles.bulletItem}>• <Text style={styles.bold}>Service Providers:</Text> We use third-party services like AWS (Cognito, RDS, S3) to host our data and infrastructure.</Text>
                <Text style={styles.bulletItem}>• <Text style={styles.bold}>Legal Requirements:</Text> We may disclose information if required by law or in response to valid requests by public authorities.</Text>

                <Text style={styles.sectionTitle}>4. Data Retention</Text>
                <Text style={styles.paragraph}>
                    We retain your personal information for as long as necessary to provide the services you have requested, or for other essential purposes such as complying with legal obligations.
                </Text>

                <Text style={styles.sectionTitle}>5. Your Choices</Text>
                <Text style={styles.bulletItem}>• <Text style={styles.bold}>Location Services:</Text> You can opt-out of location collection at any time through your device settings, but this will limit the App's usefulness.</Text>
                <Text style={styles.bulletItem}>• <Text style={styles.bold}>Camera Permissions:</Text> You can manage camera access via your device settings.</Text>
                <Text style={styles.bulletItem}>• <Text style={styles.bold}>Account Deletion:</Text> You may contact us or use in-app features to request account deletion.</Text>

                <Text style={styles.sectionTitle}>6. Security</Text>
                <Text style={styles.paragraph}>
                    We take reasonable measures to protect your personal information from loss, theft, and unauthorized access. However, no internet transmission is 100% secure.
                </Text>

                <Text style={styles.sectionTitle}>7. Contact Us</Text>
                <Text style={styles.paragraph}>
                    If you have any questions about this Privacy Policy, please contact us.
                </Text>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>© 2026 Nook. All rights reserved.</Text>
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
        paddingTop: 60,
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
        padding: 24,
        paddingBottom: 60,
    },
    title: {
        fontSize: 24,
        fontFamily: Typography.black,
        color: Colors.textPrimary,
        marginBottom: 8,
    },
    lastUpdated: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 24,
        fontFamily: Typography.semiBold,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginTop: 32,
        marginBottom: 12,
    },
    subSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginTop: 16,
        marginBottom: 8,
    },
    paragraph: {
        fontSize: 15,
        lineHeight: 22,
        color: Colors.textSecondary,
        marginBottom: 16,
    },
    bulletItem: {
        fontSize: 15,
        lineHeight: 22,
        color: Colors.textSecondary,
        marginBottom: 12,
        paddingLeft: 8,
    },
    bold: {
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    footer: {
        marginTop: 48,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 13,
        color: Colors.textSecondary,
    }
});
