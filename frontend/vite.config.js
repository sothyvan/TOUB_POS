import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { frontendCspPlugin } from './config/csp.js';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:3000/api';

  return {
    plugins: [
      frontendCspPlugin({ apiBaseUrl, isDevelopment: mode === 'development' }),
      react(),
      tailwindcss(),
    ],
  };
});
