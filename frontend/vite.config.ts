import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const backendUrl = env.BACKEND_URL || 'http://localhost:8000';

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      proxy: { '/health': backendUrl, '/integrations': backendUrl },
    },
  };
});
