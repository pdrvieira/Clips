import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // O binário do FFmpeg não é importado, então o tracing não o encontra sozinho.
  outputFileTracingIncludes: {
    "/api/clips": ["./node_modules/ffmpeg-static/ffmpeg"],
  },
};

export default nextConfig;
