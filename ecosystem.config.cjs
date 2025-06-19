// Configuración PM2 para WeatherApp Backend CON PROXY AGENTS
// IMPORTANTE: Este archivo debe ser .cjs porque el proyecto usa "type": "module"
// PROYECTO UBICADO EN: D:\nginx\weather-app\

module.exports = {
  apps: [{
    name: 'weather-backend',
    script: './backend/server.js',
    cwd: 'D:/nginx/weather-app',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    
    // Variables de entorno para PRODUCCIÓN
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      
      // ===== CONFIGURACIÓN DE PROXY HTTP/HTTPS =====
      // ⚠️ CONFIGURA AQUÍ TU PROXY REAL:
      // Formato sin auth: http://servidor:puerto
      // Formato con auth: http://usuario:password@servidor:puerto
      HTTP_PROXY: 'http://proxy.tuempresa.com:8080',
      HTTPS_PROXY: 'http://proxy.tuempresa.com:8080',
      NO_PROXY: 'localhost,127.0.0.1,*.local,10.*,192.168.*',
      
      // ===== CONFIGURACIÓN DE IP DE SERVICIO (OPCIONAL) =====
      // Si también necesitas especificar la IP local de salida:
      SERVICE_IP: '192.168.1.100',  // Reemplaza con tu IP de servicio real
      
      // Configuraciones adicionales
      NODE_OPTIONS: '--max-old-space-size=1024',
      UV_THREADPOOL_SIZE: '4'
    },
    
    // Variables de entorno para DESARROLLO
    env_development: {
      NODE_ENV: 'development',
      PORT: 3001,
      
      // ===== CONFIGURACIÓN DE PROXY PARA DESARROLLO =====
      HTTP_PROXY: 'http://proxy.tuempresa.com:8080',
      HTTPS_PROXY: 'http://proxy.tuempresa.com:8080',
      NO_PROXY: 'localhost,127.0.0.1,*.local,10.*,192.168.*',
      
      // IP de servicio para desarrollo
      SERVICE_IP: '192.168.1.100',
      
      DEBUG: 'weather:*'
    },
    
    // ===== CONFIGURACIÓN DE LOGS =====
    log_type: 'json',
    
    // Archivos de log
    log_file: 'D:/nginx/weather-app/logs/combined.log',
    out_file: 'D:/nginx/weather-app/logs/out.log',
    error_file: 'D:/nginx/weather-app/logs/error.log',
    
    // Formato de fecha en logs
    log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS Z',
    
    // Rotación de logs
    max_size: '100M',
    retain: 30,
    compress: true,
    dateFormat: 'YYYY-MM-DD_HH-mm-ss',
    rotateModule: true,
    
    // ===== CONFIGURACIÓN DE MONITOREO =====
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    
    // Configuración de memoria y CPU
    max_memory_restart: '1G',
    kill_timeout: 5000,
    listen_timeout: 8000,
    
    // ===== CONFIGURACIÓN DE PROCESO =====
    exec_mode: 'fork',
    
    // Configuración de señales
    kill_retry_time: 100,
    
    // ===== VARIABLES DE ENTORNO ADICIONALES =====
    env_vars: {
      // URL base de la API externa
      API_BASE_URL: 'https://www.el-tiempo.net/api/json/v2/provincias/39/municipios',
      
      // Configuraciones de timeout
      API_TIMEOUT: '15000',
      CONNECTIVITY_TIMEOUT: '10000',
      
      // Configuración de User-Agent
      USER_AGENT: 'WeatherApp/1.0 (Windows; PM2)',
      
      // Configuración de cache
      CACHE_TTL: '300', // 5 minutos
      
      // Configuración de rate limiting
      RATE_LIMIT_WINDOW: '900000', // 15 minutos
      RATE_LIMIT_MAX: '100' // 100 requests por ventana
    },
    
    // ===== CONFIGURACIÓN DE HEALTH CHECKS =====
    pmx: true,
    
    // Health check endpoint
    health_check_url: 'http://localhost:3001/api/health',
    health_check_grace_period: 3000
  }],
  
  // ===== CONFIGURACIÓN DE DEPLOY (OPCIONAL) =====
  deploy: {
    production: {
      user: 'weather-app',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:tu-repo/weather-app.git',
      path: 'D:/nginx/weather-app',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.cjs --env production',
      'pre-setup': ''
    }
  }
};