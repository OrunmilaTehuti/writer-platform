const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@writer-platform/editor", "@writer-platform/db"],
  // In a pnpm monorepo, Next.js's file tracer needs to be told the real
  // repo root - otherwise it can fail to bundle files that live outside
  // apps/web (like the Prisma query engine binary in packages/db's
  // node_modules), causing "Query Engine not found" errors in production.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // Prisma loads its engine binary dynamically at runtime rather than via
  // a normal import/require, so Next's static bundler can't auto-detect
  // it needs packaging - this forces it to be included regardless.
  experimental: {
    outputFileTracingIncludes: {
      "/*": ["../../packages/db/generated/client/**/*"],
    },
  },
};

module.exports = nextConfig;
