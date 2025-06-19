@echo off
echo ============================================
echo  CONFIGURACIÓN DE PROXY AGENTS PARA NODE.JS
echo  WEATHERAPP BACKEND CON PROXY COMPLETO
echo ============================================
echo.

REM ===== VARIABLES DE PROXY PARA PROXY AGENTS =====
REM ⚠️ IMPORTANTE: Reemplaza estos valores con tu configuración real de proxy:
REM 
REM Formato básico:       http://servidor:puerto
REM Formato con auth:     http://usuario:password@servidor:puerto
REM Formato HTTPS proxy:  https://servidor:puerto

set HTTP_PROXY=http://proxy.tuempresa.com:8080
set HTTPS_PROXY=http://proxy.tuempresa.com:8080
set NO_PROXY=localhost,127.0.0.1,*.local,10.*,192.168.*
set SERVICE_IP=192.168.1.100

echo ✅ Variables de proxy configuradas para proxy agents:
echo    HTTP_PROXY=%HTTP_PROXY%
echo    HTTPS_PROXY=%HTTPS_PROXY%
echo    NO_PROXY=%NO_PROXY%
echo    SERVICE_IP=%SERVICE_IP%
echo.
echo 📦 PROXY AGENTS INSTALADOS:
echo    • http-proxy-agent: Para peticiones HTTP a través de proxy
echo    • https-proxy-agent: Para peticiones HTTPS a través de proxy
echo    • Lógica inteligente de NO_PROXY incluida
echo    • Soporte para IP de servicio específica
echo.

REM ===== VERIFICAR PM2 =====
echo 🔍 Verificando estado de PM2...
pm2 status
echo.

REM ===== REINICIAR SERVICIO CON PROXY AGENTS =====
echo 🔄 Reiniciando WeatherApp backend con proxy agents...
echo.

REM Parar servicio actual
echo ⏹️  Parando servicio actual...
pm2 stop weather-backend

REM Iniciar con nueva configuración de proxy agents
echo 🚀 Iniciando servicio con proxy agents configurados...
pm2 start ecosystem.config.cjs --env production

REM Verificar estado
echo.
echo 📊 Estado final del servicio:
pm2 status
echo.

REM Mostrar logs recientes
echo 📝 Últimos logs del servicio:
pm2 logs weather-backend --lines 15

echo.
echo ✅ CONFIGURACIÓN DE PROXY AGENTS COMPLETADA
echo.
echo 📋 RESUMEN:
echo    • HTTP Proxy Agent:  %HTTP_PROXY%
echo    • HTTPS Proxy Agent: %HTTPS_PROXY%
echo    • Exclusiones:       %NO_PROXY%
echo    • IP de Servicio:    %SERVICE_IP%
echo    • Servicio:          weather-backend
echo    • Estado:            Ejecutándose con proxy agents
echo.
echo 🔧 CÓMO FUNCIONA:
echo    • HttpProxyAgent maneja peticiones HTTP a través del proxy
echo    • HttpsProxyAgent maneja peticiones HTTPS a través del proxy
echo    • NO_PROXY excluye hosts de ir por proxy (localhost, IPs internas)
echo    • SERVICE_IP especifica la interfaz local de salida
echo    • Resolución DNS se hace en el proxy, no localmente
echo.
echo 🛠️  PARA CAMBIAR LA CONFIGURACIÓN:
echo    1. Editar ecosystem.config.cjs
echo    2. Modificar HTTP_PROXY, HTTPS_PROXY, NO_PROXY, SERVICE_IP
echo    3. Ejecutar: pm2 restart weather-backend
echo.
echo 🧪 PARA PROBAR LA CONECTIVIDAD CON PROXY AGENTS:
echo    • Health check:     curl http://localhost:3001/api/health
echo    • Test API:         curl http://localhost:3001/api/test-direct/39001
echo    • Connectivity:     curl http://localhost:3001/api/connectivity-test
echo    • Debug info:       curl http://localhost:3001/api/debug
echo.
echo 🔍 VERIFICAR EN LOGS:
echo    • Buscar "HttpProxyAgent" o "HttpsProxyAgent" en los logs
echo    • Verificar que no aparezcan errores "ENOTFOUND"
echo    • Los logs mostrarán qué agente se usa para cada petición
echo.

pause