// NEXT_PUBLIC_API_URL is replaced at build time by webpack DefinePlugin.
// Figma plugins cannot read process.env at runtime.
export const API_URL =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : 'https://your-vercel-deployment.vercel.app';
