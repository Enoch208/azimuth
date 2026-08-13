import type { Metadata, Viewport } from "next";
import { Unbounded, Space_Grotesk } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { PaperGrain } from "@/components/marks/PaperGrain";
import { AppProviders } from "@/components/providers/AppProviders";
import { CallsignPrompt } from "@/components/CallsignPrompt";
import "./globals.css";

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["300", "500"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AZIMUTH — The chain knows. You don't.",
  description:
    "One treasure is buried on the same map for everyone, every day, encrypted so nobody can read it. You get six digs, and each one tells only you how close you are. The map opens at midnight.",
};

export const viewport: Viewport = {
  themeColor: "#f4f2e9",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${unbounded.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-paper text-ink">
        <NextTopLoader color="#e5a00d" height={3} showSpinner={false} shadow={false} zIndex={200} />
        <AppProviders>
          <CallsignPrompt />
          {children}
        </AppProviders>
        <PaperGrain />
      </body>
    </html>
  );
}
