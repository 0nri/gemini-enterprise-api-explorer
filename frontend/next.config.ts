import type { NextConfig } from "next";

// Server-side only (not NEXT_PUBLIC_*): where the FastAPI backend actually
// listens. Never sent to the browser, so it's safe to leave as localhost -
// this process and the backend always share the same host.
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api-explorer/:path*", destination: `${BACKEND_URL}/api-explorer/:path*` },
      { source: "/agents/:path*", destination: `${BACKEND_URL}/agents/:path*` },
      { source: "/search/:path*", destination: `${BACKEND_URL}/search/:path*` },
      { source: "/conversations/:path*", destination: `${BACKEND_URL}/conversations/:path*` },
      // Proxy NotebookLM Enterprise API routes to the FastAPI backend
      { source: "/notebooks/:path*", destination: `${BACKEND_URL}/notebooks/:path*` },
    ];
  },
};

export default nextConfig;
