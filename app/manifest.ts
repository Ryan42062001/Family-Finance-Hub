import type { MetadataRoute } from "next";

// FFH-P05: lets people add Family Finance Hub to their phone's home screen. Contains only
// the app's name, colours and icons; no user or household data. Public on purpose (see
// lib/supabase/proxy.ts) so the browser can read it before anyone signs in.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Family Finance Hub",
    short_name: "Finance Hub",
    description: "A private money plan for your family.",
    start_url: "/plan",
    scope: "/",
    display: "standalone",
    background_color: "#f6f7f9",
    theme_color: "#0e7c66",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
