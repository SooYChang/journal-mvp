import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
});

export const metadata: Metadata = {
  title: "Journals and proceedings",
  description: "Sharing journals and proceedings",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${sourceSerif.variable} antialiased`}>
        <AuthProvider>
          <div className="shell">
            <Header />
            <main className="main">
              <div className="page-wrap">{children}</div>
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
