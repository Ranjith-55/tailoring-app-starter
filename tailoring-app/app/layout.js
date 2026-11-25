import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "../components/ToastProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata = {
  title: "StitchFlow — Tailoring Studio",
  description: "Private admin & staff panel for managing customers, measurements and orders.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-surface font-sans text-ink">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
