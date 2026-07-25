import type { Metadata } from "next";
import { SiteFooter } from "./components/site-footer";
import { SiteHeader } from "./components/site-header";
import { MotionObserver } from "./components/motion-observer";
import { SplashScreen } from "./components/splash-screen";
import { requestOrigin } from "./lib/request-origin";
import "./globals.css";

const title = "Frizzybets | Stake Leaderboard and Bonuses";
const description =
  "Join Frizzybets' $10,000 monthly Stake leaderboard under code FRIZZ, claim exclusive Stake and Stake.us bonuses, and watch Frizzybets live.";

export async function generateMetadata(): Promise<Metadata> {
  const origin = requestOrigin();

  return {
    metadataBase: new URL(origin),
    title: {
      default: title,
      template: "%s | Frizzybets",
    },
    description,
    applicationName: "Frizzybets",
    keywords: [
      "Frizzybets",
      "Frizzybets leaderboard",
      "Stake leaderboard",
      "code FRIZZ",
      "Stake.us bonus",
      "Stake bonus",
      "wager leaderboard",
      "monthly Stake wager race",
    ],
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: {
      icon: [
        { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      shortcut: "/icon-32.png",
      apple: "/apple-touch-icon.png",
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      title,
      description,
      siteName: "Frizzybets",
      url: origin,
      images: [
        {
          url: `${origin}/og.png`,
          width: 1200,
          height: 630,
          alt: "Frizzybets $10,000 monthly Stake leaderboard",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${origin}/og.png`],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const origin = requestOrigin();
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Frizzybets",
      url: origin,
      logo: `${origin}/frizzybets-wordmark.png`,
      sameAs: [
        "https://kick.com/frizzybets",
        "https://www.twitch.tv/frizzable",
        "https://www.youtube.com/@frizzybets",
        "https://x.com/Frizzable",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Frizzybets",
      url: origin,
      description,
    },
  ];
  const structuredDataJson = JSON.stringify(structuredData).replace(
    /</g,
    "\\u003c",
  );

  return (
    <html lang="en">
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: structuredDataJson }}
        />
        <SplashScreen />
        <MotionObserver />
        <SiteHeader />
        <div className="appMain">
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
