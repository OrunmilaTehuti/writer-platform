const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@writer-platform/editor", "@writer-platform/db"],
  experimental: {
    // In a pnpm monorepo, Next.js's file tracer needs to be told the real
    // repo root - otherwise it can fail to bundle files that live outside
    // apps/web (like the Prisma query engine binary in packages/db's
    // node_modules), causing "Query Engine not found" errors in production.
    // (In Next.js 14.x this must live under `experimental` - it was only
    // promoted to a top-level option in Next.js 15.)
    outputFileTracingRoot: path.join(__dirname, "../../"),
  },
};

module.exports = nextConfig;
