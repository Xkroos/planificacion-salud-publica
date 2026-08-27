module.exports = {
  apps: [
    {
      name: "sistema-unerg",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: "max", // Utiliza todos los núcleos del procesador disponibles
      exec_mode: "cluster", // Permite balanceo de carga
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
