import type { Metadata, Viewport } from "next";
import { Unbounded, Space_Grotesk } from "next/font/google";
import { PaperGrain } from "@/components/marks/PaperGrain";
import { AppProviders } from "@/components/providers/AppProviders";
import { CallsignPrompt } from "@/components/CallsignPrompt";
import "./globals.css";

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AZIMUTH — Find what nobody can see",
  description:
    "An onchain hunt for coordinates nobody knows. The contract answers questions about them without revealing them: public warmer/colder, bearings only your wallet can decrypt.",
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
        <AppProviders>
          <CallsignPrompt />
          {children}
        </AppProviders>
        <PaperGrain />
      </body>
    </html>
  );
}
