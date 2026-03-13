import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ArticleHistoryProvider } from "@/components/history/ArticleHistoryProvider";
import { AppLayout } from "@/components/layout/AppLayout";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PoliSight",
  description: "Political literacy app that analyzes policy articles to help you understand how policies affect you personally",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <ArticleHistoryProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </ArticleHistoryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
