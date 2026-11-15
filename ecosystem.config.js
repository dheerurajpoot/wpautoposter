module.exports = {
  apps: [
    {
      name: 'wp-autopilot-backend',
      script: 'dist/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3100,
      },
    },
    {
      name: 'wp-autopilot-frontend',
      cwd: './frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        BACKEND_API_URL: 'http://localhost:3100',
      },
    },
  ],
};

