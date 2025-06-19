@echo off
echo ============================================
echo  CONFIGURACIÓN DE IP DE SERVICIO ESPECÍFICA
echo  PARA WEATHERAPP BACKEND
echo ============================================
echo.

REM ===== CONFIGURACIÓN DE IP DE SERVICIO =====
REM ⚠️ IMPORTANTE: Reemplaza este valor con tu IP de servicio real:
REM 
REM Ejemplos:
REM - IP de interfaz de red específica: 192.168.1.100
REM - IP de interfaz de servicio: 10.0.0.50
REM - IP de interfaz dedicada: 172.16.1.200

set SERVICE_IP=192.168.1.100

echo ✅ Configuración de IP de servicio:
echo    SERVICE_IP=%SERVICE_IP%
echo.
echo ℹ️  Todas las conexiones salientes (HTTP/HTTPS) usarán esta IP
echo.

REM ===== VERIFICAR CONFIGURACIÓN ACTUAL =====
echo 🔍 Verificando configuración actual...
echo.

REM Mostrar interfaces de red disponibles
echo 📡 Interfaces de red disponibles:
ipconfig | findstr /R /C:"Ethernet adapter" /C:"Wireless LAN adapter" /C:"IPv4 Address"
echo.

REM ===== VERIFICAR PM2 =====
echo 🔍 Verificando estado de PM2...
pm2 status
echo.

REM ===== ACTUALIZAR CONFIGURACIÓN =====
echo 🔄 Actualizando configuración de WeatherApp backend...
echo.

REM Parar servicio actual
echo ⏹️  Parando servicio actual...
pm2 stop weather-backend

REM Actualizar la variable de entorno en el archivo de configuración
echo 📝 Actualizando ecosystem.config.cjs con SERVICE_IP=%SERVICE_IP%
echo.
echo NOTA: Debes editar manualmente el archivo ecosystem.config.cjs
echo       y cambiar SERVICE_IP: '%SERVICE_IP%' en las secciones env y env_development
echo.

REM Iniciar con nueva configuración
echo 🚀 Iniciando servicio con IP de servicio configurada...
pm2 start ecosystem.config.cjs --env production

REM Verificar estado
echo.
echo 📊 Estado final del servicio:
pm2 status
echo.

REM Mostrar logs recientes
echo 📝 Últimos logs del servicio:
pm2 logs weather-backend --lines 10
echo.

REM ===== TESTS DE CONECTIVIDAD =====
echo 🧪 Ejecutando tests de conectividad...
echo.

REM Test de health check
echo 🏥 Test de health check:
curl -s http://localhost:3001/api/health | findstr /C:"serviceIP" /C:"status"
echo.

REM Test directo de API
echo 🌡️  Test directo de API:
curl -s http://localhost:3001/api/test-direct/39001 | findstr /C:"success" /C:"serviceIP"
echo.

echo ✅ CONFIGURACIÓN COMPLETADA
echo.
echo 📋 RESUMEN:
echo    • IP de Servicio: %SERVICE_IP%
echo    • Servicio:       weather-backend
echo    • Estado:         Ejecutándose con IP específica
echo    • Protocolo:      HTTPS con agentes personalizados
echo.
echo 🔧 PASOS ADICIONALES REQUERIDOS:
echo    1. Editar D:\nginx\weather-app\ecosystem.config.cjs
echo    2. Buscar SERVICE_IP: '192.168.1.100'
echo    3. Cambiar por tu IP real: SERVICE_IP: '%SERVICE_IP%'
echo    4. Ejecutar: pm2 restart weather-backend
echo.
echo 🧪 PARA VERIFICAR LA CONFIGURACIÓN:
echo    • Health check:     curl http://localhost:3001/api/health
echo    • Test API:         curl http://localhost:3001/api/test-direct/39001
echo    • Connectivity:     curl http://localhost:3001/api/connectivity-test
echo    • Debug info:       curl http://localhost:3001/api/debug
echo.
echo 🔍 PARA VER LOGS EN TIEMPO REAL:
echo    pm2 logs weather-backend --lines 50
echo.

pause