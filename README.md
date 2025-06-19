# WeatherApp Full Stack 🌤️

Una aplicación completa Full Stack para consultar información meteorológica por código postal, desarrollada con React + Node.js y configurada para deployment en Windows con Nginx y PM2.

**📍 UBICACIÓN DEL PROYECTO: `D:\nginx\weather-app\`**

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTE (Navegador)                      │
├─────────────────────────────────────────────────────────────┤
│                         ↓ HTTP                             │
├─────────────────────────────────────────────────────────────┤
│                    NGINX (Puerto 80)                       │
│                   Instalado en D:\nginx                    │
│  ┌─────────────────┐              ┌───────────────────────┐ │
│  │   Static Files  │              │    API Proxy         │ │
│  │   D:\nginx\     │              │   /api/* → :3001     │ │
│  │   weather-app\  │              │                       │ │
│  │   dist\         │              │                       │ │
│  └─────────────────┘              └───────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                         ↓ Proxy                            │
├─────────────────────────────────────────────────────────────┤
│                 NODE.JS BACKEND (Puerto 3001)              │
│              Ubicado en D:\nginx\weather-app\              │
│                    Gestionado por PM2                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Express Server                                         │ │
│  │  ├─ GET /api/weather/:codigo                           │ │
│  │  ├─ POST /api/debug                                    │ │
│  │  ├─ GET /api/debug                                     │ │
│  │  └─ GET /api/health                                    │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                         ↓ HTTP Request                     │
├─────────────────────────────────────────────────────────────┤
│              API EXTERNA (el-tiempo.net)                   │
│    https://www.el-tiempo.net/api/json/v2/provincias/39/    │
│                municipios/{CODIGO_POSTAL}                   │
└─────────────────────────────────────────────────────────────┘
```

## 📋 Prerrequisitos

- **Windows Server/Desktop**
- **Node.js** (v18 o superior) - [Descargar](https://nodejs.org/)
- **Nginx** para Windows instalado en `D:\nginx` - [Descargar](http://nginx.org/en/download.html)
- **PM2** (se instalará globalmente)
- **Proyecto ubicado en**: `D:\nginx\weather-app\`

## 🚀 Instalación y Configuración

### 1. Preparación del Entorno

```bash
# Navegar al directorio del proyecto
cd D:\nginx\weather-app

# Instalar dependencias
npm install

# Instalar PM2 globalmente
npm install -g pm2
```

### 2. Construcción del Frontend

```bash
# Desde D:\nginx\weather-app\
npm run build

# Esto generará los archivos en D:\nginx\weather-app\dist\
```

### 3. Configuración de Nginx

1. **Verificar instalación de Nginx:**
   - Nginx debe estar instalado en `D:\nginx`
   - Si no está instalado, descargar desde: http://nginx.org/en/download.html

2. **Configurar Nginx:**
   ```bash
   # Copiar configuración personalizada (desde D:\nginx\weather-app\)
   copy nginx.conf D:\nginx\conf\nginx.conf
   ```

3. **Verificar configuración:**
   ```bash
   # La configuración apunta directamente a D:\nginx\weather-app\dist\
   # No es necesario copiar archivos, Nginx los leerá directamente
   ```

### 4. Configuración del Backend con PM2

```bash
# Desde D:\nginx\weather-app\
# Crear directorio de logs
mkdir logs

# Iniciar el backend con PM2 (usando el archivo .cjs)
npm run pm2:start

# Verificar que está funcionando
npm run pm2:status

# Ver logs en tiempo real
npm run pm2:logs
```

**IMPORTANTE**: El archivo de configuración debe ser `ecosystem.config.cjs` (no `.js`) porque:
- El proyecto usa `"type": "module"` en `package.json` (ES Modules)
- PM2 requiere configuración en formato CommonJS
- La extensión `.cjs` fuerza Node.js a interpretar el archivo como CommonJS

### 5. Iniciar Nginx

```bash
# Navegar al directorio de Nginx
cd D:\nginx

# Iniciar Nginx
nginx.exe

# Para verificar que está funcionando
nginx -t
```

## 🔧 Comandos de Gestión

### Backend (PM2)

```bash
# Todos los comandos desde D:\nginx\weather-app\

# Iniciar servicio (usando .cjs)
npm run pm2:start
# o directamente:
pm2 start ecosystem.config.cjs

# Parar servicio
npm run pm2:stop

# Reiniciar servicio
npm run pm2:restart

# Ver estado
npm run pm2:status

# Ver logs
npm run pm2:logs

# Limpiar logs
pm2 flush

# Configurar PM2 para iniciar con el sistema
pm2 startup
pm2 save
```

### Nginx

```bash
# Navegar al directorio de Nginx
cd D:\nginx

# Iniciar
nginx

# Parar
nginx -s stop

# Reiniciar (recarga configuración)
nginx -s reload

# Verificar configuración
nginx -t
```

## 🐛 Sistema de Debug

La aplicación incluye un sistema de debug completo:

### Frontend Debug
- **Botón Debug ON/OFF** en la esquina superior derecha
- **Consola de debug** en tiempo real (esquina inferior derecha)
- **Logs de todas las acciones** del usuario y respuestas del servidor

### Backend Debug
- **Endpoint de control**: `POST /api/debug`
- **Logs detallados** de todas las peticiones
- **Información de errores** expandida en modo debug

### Activar/Desactivar Debug

```javascript
// Desde el frontend (botón UI)
// O directamente por API:

// Activar debug
fetch('http://localhost/api/debug', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ enabled: true })
});

// Verificar estado
fetch('http://localhost/api/debug')
```

## 📊 Endpoints de la API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/weather/:codigo` | Obtener información meteorológica |
| `GET` | `/api/health` | Estado del servidor |
| `GET` | `/api/debug` | Estado del modo debug |
| `POST` | `/api/debug` | Activar/desactivar debug |

### Ejemplos de Uso

```bash
# Obtener el tiempo para código postal 39001
curl http://localhost/api/weather/39001

# Verificar salud del servidor
curl http://localhost/api/health

# Activar debug
curl -X POST http://localhost/api/debug \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

## 🔍 Resolución de Problemas

### El frontend no carga
1. Verificar que Nginx está ejecutándose: `nginx -t`
2. Comprobar logs: `D:\nginx\logs\error.log`
3. Verificar que los archivos están en: `D:\nginx\weather-app\dist\`
4. Verificar que el build se ha ejecutado: `npm run build`

### El backend no responde
1. Verificar estado de PM2: `pm2 status`
2. Ver logs: `pm2 logs weather-backend`
3. Reiniciar servicio: `pm2 restart weather-backend`
4. Verificar que estás en el directorio correcto: `D:\nginx\weather-app\`

### Error "Error starting script ecosystem.config.js"
- **Problema**: PM2 no puede interpretar archivos ES Modules
- **Solución**: Usar `ecosystem.config.cjs` en lugar de `.js`
- **Comando correcto**: `pm2 start ecosystem.config.cjs`

### Error de CORS
1. Verificar configuración de Nginx (`nginx.conf`)
2. Comprobar que el proxy está configurado correctamente
3. Reiniciar Nginx: `nginx -s reload`

### No se obtienen datos meteorológicos
1. Activar modo debug desde el frontend
2. Verificar en los logs si llega la petición al backend
3. Comprobar conectividad con la API externa
4. Verificar formato del código postal

### Error "Failed to fetch"
1. Verificar que Nginx está sirviendo en `http://localhost`
2. Comprobar que el proxy `/api/` está funcionando
3. Verificar que el backend PM2 está ejecutándose
4. Activar debug para ver detalles de la petición

## 📁 Estructura del Proyecto

```
D:\nginx\weather-app\                    # ← UBICACIÓN DEL PROYECTO
├── backend/
│   └── server.js                        # Servidor Node.js/Express
├── src/
│   ├── App.tsx                         # Componente principal React
│   ├── main.tsx                        # Punto de entrada React
│   └── index.css                       # Estilos Tailwind
├── dist/                               # Build de producción (generado)
│   ├── index.html                      # ← Nginx sirve desde aquí
│   └── assets/                         # CSS y JS compilados
├── logs/                               # Logs de PM2
├── nginx.conf                          # Configuración Nginx
├── ecosystem.config.cjs                # Configuración PM2 (CommonJS)
├── package.json                        # Dependencias del proyecto (ES Module)
└── README.md                           # Esta documentación

D:\nginx\                               # ← INSTALACIÓN DE NGINX
├── conf\
│   └── nginx.conf                      # ← Copiar configuración aquí
├── logs\                               # Logs de Nginx
└── nginx.exe                           # Ejecutable de Nginx
```

## 🔄 Proceso de Deployment

```bash
# 1. Navegar al proyecto
cd D:\nginx\weather-app

# 2. Desarrollo y pruebas
npm run dev          # Frontend en :3000
npm run backend:dev  # Backend en :3001

# 3. Build de producción
npm run build

# 4. Configurar Nginx
copy nginx.conf D:\nginx\conf\nginx.conf

# 5. Iniciar servicios
npm run pm2:start    # Backend con PM2
cd D:\nginx && nginx # Nginx

# 6. Verificar
# Abrir http://localhost
```

## 📝 Comandos de Deployment Rápido

```bash
# DEPLOYMENT COMPLETO (ejecutar desde D:\nginx\weather-app\)
npm run build
copy nginx.conf D:\nginx\conf\nginx.conf
npm run pm2:start
cd D:\nginx && nginx

# VERIFICACIÓN
npm run pm2:status
cd D:\nginx && nginx -t
```

## 💡 Características Destacadas

- ✅ **Interfaz moderna** con Tailwind CSS y Lucide React
- ✅ **Sistema de debug completo** activable/desactivable
- ✅ **Manejo robusto de errores** con mensajes informativos
- ✅ **Proxy reverso** configurado en Nginx
- ✅ **Gestión de procesos** con PM2 y auto-restart
- ✅ **Logs estructurados** para producción
- ✅ **Configuración lista para producción**
- ✅ **Diseño responsive** para todos los dispositivos
- ✅ **Compatibilidad ES Modules + CommonJS**

## 🚦 Estados de la Aplicación

- **🟢 Funcionando**: Frontend servido por Nginx desde `D:\nginx\weather-app\dist\`, Backend por PM2
- **🟡 Parcial**: Solo una parte funciona (verificar logs)
- **🔴 Error**: Revisar configuración de Nginx y estado de PM2

## ⚠️ Notas Importantes

1. **Configuración PM2**: Usar `ecosystem.config.cjs` (no `.js`)
2. **Rutas de Nginx**: Configuradas para servir desde `D:\nginx\weather-app\dist\`
3. **API Frontend**: Usa `/api` (proxy de Nginx), no `localhost:3001`
4. **Directorio de trabajo**: Todos los comandos desde `D:\nginx\weather-app\`
5. **No copiar archivos**: Nginx lee directamente desde `dist\`

---

**¡Tu aplicación WeatherApp está lista para producción en `D:\nginx\weather-app\`! 🎉**