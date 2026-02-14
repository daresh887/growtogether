import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
      {
  protocol: "https",
    hostname: "khfnmacecokmwqqwuyud.supabase.co",
      pathname: "/storage/v1/object/public/**",
      },
{
  protocol: "https",
    hostname: "lh3.googleusercontent.com",
      },
    ],
  },
experimental: {
  serverActions: {
    bodySizeLimit: '5mb',
    },
},
};

export default nextConfig;
