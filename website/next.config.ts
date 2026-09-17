import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  redirects: async () => [
    /*
     * The plugin's "Compare plans" button links to /pricing; the comparison
     * lives on the home page. A dedicated page can replace this later without
     * touching the plugin.
     */
    { source: "/pricing", destination: "/#pricing", permanent: false },
    // The plugin's older builds link here; the page it held was a waitlist.
    { source: "/subscribe", destination: "/checkout", permanent: false },
  ],
};

export default nextConfig;
