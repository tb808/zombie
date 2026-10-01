import type { NextConfig } from 'next';

const isGitHubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = isGitHubPages
  ? {
      output: 'export',
      basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '/zombie',
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {};

export default nextConfig;
