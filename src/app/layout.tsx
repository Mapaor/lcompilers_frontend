import type { Metadata, Viewport } from "next";
import "antd/dist/antd.css";
import "../styles/globals.css";

import MyLayout from "../components/MyLayout";

export const metadata: Metadata = {
    title: "LFortran",
    description: "This is LFortran Compiler",
    icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
            <body>
                <MyLayout>{children}</MyLayout>
            </body>
        </html>
    );
}
