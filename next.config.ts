import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@anthropic-ai/tokenizer', 'tiktoken'],
};

export default nextConfig;
