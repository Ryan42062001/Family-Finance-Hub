import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Family Finance Hub",
  description: "A private-first household financial planning hub.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
