import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { handleApiRequest } from './backend/apiRouter.js';

function campusFindApiPlugin() {
  const middleware = (req, res, next) => {
    if (req.url && req.url.startsWith('/api/')) {
      handleApiRequest(req, res);
      return;
    }
    next();
  };

  return {
    name: 'campusfind-fullstack-api',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  plugins: [react(), campusFindApiPlugin()],
});
