import type { Metadata } from "next";
import AppHeader from "@/components/AppHeader";
import NumericInputWheelGuard from "@/components/NumericInputWheelGuard";
import "./globals.css";

// Applies a saved light/dark choice before the first paint (no flash). Only reads
// a display preference from this browser's localStorage; nothing is sent anywhere.
const themeScript = `(function(){try{var t=localStorage.getItem("ffh-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}})();`;

export const metadata: Metadata = {
  title: "Family Finance Hub",
  description: "A private-first household financial planning hub.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <NumericInputWheelGuard />
        <AppHeader />
        <div id="main-content">{children}</div>
      </body>
    </html>
  );
}
