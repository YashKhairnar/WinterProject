"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "aws-amplify/auth";
import Sidebar from "../components/Sidebar";
import MobileHeader from "../components/MobileHeader";

export default function PrivacyPolicyPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            await getCurrentUser();
            setIsAuthenticated(true);
        } catch (e) {
            setIsAuthenticated(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {isAuthenticated && <Sidebar profileCompleted={true} />}

            <div className={`flex-1 ${isAuthenticated ? "md:ml-64" : ""}`}>
                {isAuthenticated ? <MobileHeader /> : (
                    <header className="p-6 border-b border-border/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img src="/icon.png" alt="nook" className="w-8 h-8 rounded-lg" />
                            <span className="font-bold text-xl tracking-tight">nook</span>
                        </div>
                        <a href="/login" className="text-sm font-bold text-primary hover:underline">Back to Login</a>
                    </header>
                )}

                <main className="p-6 md:p-12 max-w-4xl mx-auto">
                    <h1 className="text-4xl font-black tracking-tight mb-2 text-foreground">Privacy Policy</h1>
                    <p className="text-muted-foreground mb-12 font-medium">Last updated: January 09, 2026</p>

                    <div className="space-y-12">
                        <section>
                            <p className="text-lg leading-relaxed text-muted-foreground">
                                This Privacy Policy describes how Nook ("we," "us," or "our") collects, uses, and shares your personal information when you use our mobile application (the "App").
                            </p>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-2xl font-bold border-b border-border pb-2">1. Information We Collect</h2>

                            <div className="space-y-4">
                                <h3 className="text-xl font-bold text-primary">A. Information You Provide to Us</h3>
                                <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
                                    <li><span className="font-bold text-foreground">Account Information:</span> When you create an account, we collect your name, email address, and authentication data via AWS Cognito.</li>
                                    <li><span className="font-bold text-foreground">Content:</span> Information you provide when writing reviews, uploading stories, or making reservations.</li>
                                </ul>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-xl font-bold text-primary">B. Information Collected Automatically</h3>
                                <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
                                    <li><span className="font-bold text-foreground">Location Information:</span> With your permission, we collect precise location data to show you nearby cafes and calculate distances. This is essential for the core functionality of discovering cafes near you.</li>
                                    <li><span className="font-bold text-foreground">Camera Access:</span> We access your camera only when you explicitly choose to take a photo for a "Check-in" or "Story" update.</li>
                                    <li><span className="font-bold text-foreground">Device Information:</span> We may collect information about the mobile device you use, including the hardware model, operating system, and unique device identifiers.</li>
                                </ul>
                            </div>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-2xl font-bold border-b border-border pb-2">2. How We Use Your Information</h2>
                            <p className="text-muted-foreground">We use the information we collect to:</p>
                            <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
                                <li>Provide, maintain, and improve the App.</li>
                                <li>Facilitate cafe discoveries and reservations.</li>
                                <li>Display "Live Updates" and stories to other users.</li>
                                <li>Authenticate your account and ensure security.</li>
                                <li>Communicate with you about updates or support.</li>
                            </ul>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-2xl font-bold border-b border-border pb-2">3. Sharing of Information</h2>
                            <p className="text-muted-foreground">We do not sell your personal information. We may share information as follows:</p>
                            <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
                                <li><span className="font-bold text-foreground">With Other Users:</span> Your name, profile photo, and public stories or reviews are visible to other Nook users.</li>
                                <li><span className="font-bold text-foreground">Service Providers:</span> We use third-party services like AWS (Cognito, RDS, S3) to host our data and infrastructure.</li>
                                <li><span className="font-bold text-foreground">Legal Requirements:</span> We may disclose information if required by law or in response to valid requests by public authorities.</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold border-b border-border pb-2">4. Data Retention</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                We retain your personal information for as long as necessary to provide the services you have requested, or for other essential purposes such as complying with legal obligations.
                            </p>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-2xl font-bold border-b border-border pb-2">5. Your Choices</h2>
                            <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
                                <li><span className="font-bold text-foreground">Location Services:</span> You can opt-out of location collection at any time through your device settings, but this will limit the App's usefulness.</li>
                                <li><span className="font-bold text-foreground">Camera Permissions:</span> You can manage camera access via your device settings.</li>
                                <li><span className="font-bold text-foreground">Account Deletion:</span> You may contact us or use in-app features to request account deletion.</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold border-b border-border pb-2">6. Security</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                We take reasonable measures to protect your personal information from loss, theft, and unauthorized access. However, no internet transmission is 100% secure.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold border-b border-border pb-2">7. Contact Us</h2>
                            <p className="text-muted-foreground">
                                If you have any questions about this Privacy Policy, please contact us.
                            </p>
                        </section>

                        <footer className="mt-20 pt-8 border-t border-border text-center text-sm text-muted-foreground pb-12">
                            © 2026 Nook. All rights reserved.
                        </footer>
                    </div>
                </main>
            </div>
        </div>
    );
}
