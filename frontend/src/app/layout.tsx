import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: '--font-inter',
    display: 'swap',
});

export const metadata: Metadata = {
    title: "VulnX-Ray - CMS Security Audit Platform",
    description: "Modern web application for auditing CMS security and compliance. Identify outdated versions and misconfigurations through passive reconnaissance.",
    keywords: ["security", "audit", "CMS", "vulnerability", "WordPress", "Joomla", "Drupal"],
    authors: [{ name: "VulnX-Ray Team" }],
    viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={inter.variable}>
            <body className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                {children}
            </body>
        </html>
    );
}
