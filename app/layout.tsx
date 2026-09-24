import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import "./globals.css";

const sans = Nunito_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ślad węglowy — GO GLOBAL GROUP",
  description:
    "System do obliczania i monitorowania śladu węglowego GO GLOBAL GROUP",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" className={sans.variable}>
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
