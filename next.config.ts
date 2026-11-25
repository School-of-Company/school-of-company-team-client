import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // 서비스와 장애는 운영 화면의 탭이 됐다. 쿼리(?view=graph, ?status=resolved)는 그대로 넘어간다. 상세 주소는 그대로다.
  async redirects() {
    return [
      {
        source: "/services",
        destination: "/ops?tab=services",
        permanent: false,
      },
      {
        source: "/incidents",
        destination: "/ops?tab=incidents",
        permanent: false,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
