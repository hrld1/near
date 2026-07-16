/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone: build autocontenida para la imagen Docker de producción
  // (node .next/standalone/server.js, sin node_modules completos).
  output: "standalone",
  experimental: {
    serverActions: { bodySizeLimit: "4mb" }
  }
};

export default nextConfig;
