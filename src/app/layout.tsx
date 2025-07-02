import type { Metadata } from "next";
import { Inter } from "next/font/google";
import KaTeXProvider from "@/components/KaTeXProvider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "O²DES Studio",
    description: "A web-based simulation platform for O²DES",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body className={`${inter.className} antialiased`}>
                <KaTeXProvider>{children}</KaTeXProvider>
                <Toaster richColors />
            </body>
        </html>
    );
}
