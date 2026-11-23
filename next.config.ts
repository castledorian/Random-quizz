import type { NextConfig } from "next";

// Site 100 % statique, publié sur GitHub Pages sous /<nom-du-depot>.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
