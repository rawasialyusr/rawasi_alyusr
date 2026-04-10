/** @type {import('next').NextConfig} */
const nextConfig = {
  // إلغاء قيود CSP مؤقتاً للتطوير
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;