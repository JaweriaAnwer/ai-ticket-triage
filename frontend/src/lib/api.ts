// Central place for the backend's base URL.
//
// Locally: falls back to http://localhost:8000 automatically, so nothing
// changes for local dev — no .env file needed on your machine.
//
// In production (Vercel): set VITE_API_URL in the Vercel project's
// Environment Variables to your deployed backend's URL, e.g.
// https://your-backend.onrender.com  (no trailing slash).
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
