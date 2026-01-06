import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import ConfigureAmplifyClient from "./components/ConfigureAmplifyClient";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "nook | Manage Your Business",
  description: "Comprehensive admin dashboard for cafe owners",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} antialiased font-sans`}>
        <ConfigureAmplifyClient />
        {children}
      </body>
    </html>
  );
}
