import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  // Plakietka trybu deweloperskiego zasłania przycisk konta na telefonie.
  devIndicators: false,
  // Zdjęcia produktów serwuje API pod /uploads; panel pokazuje je pod tym samym adresem.
  async rewrites() {
    return [{ source: "/uploads/:path*", destination: `${apiUrl}/uploads/:path*` }];
  },
  experimental: {
    optimizePackageImports: ["@mantine/core", "@mantine/hooks", "@tabler/icons-react"],
  },
};

export default nextConfig;
