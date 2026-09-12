/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;

// Dev-time Cloudflare bindings (D1 etc.) for `next dev` — no-op in production builds.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
