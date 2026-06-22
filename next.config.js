/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'img.youtube.com',
      'cdn.freesound.org',
      'images.unsplash.com',
      'plus.unsplash.com',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
    ],
  },
  async headers() {
    return [
      {
        // 블로그 페이지에서 Unsplash 이미지 로드 허용
        source: '/blog/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "img-src 'self' data: https://images.unsplash.com https://plus.unsplash.com https://img.youtube.com https://cdn.freesound.org;",
          },
        ],
      },
    ]
  },
}
module.exports = nextConfig
