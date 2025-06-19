import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import http from 'http';
import https from 'https';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de debug
let debugMode = false;

// Sistema de logging avanzado
class Logger {
  static log(level, category, message, data = null, requestId = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      category,
      message,
      data,
      requestId,
      pid: process.pid,
      memory: process.memoryUsage()
    };

    // Log estructurado para PM2
    console.log(JSON.stringify(logEntry));

    // Log legible para consola
    if (debugMode || level === 'ERROR') {
      const icon = {
        'INFO': '✅',
        'ERROR': '❌',
        'WARNING': '⚠️',
        'REQUEST': '🔄',
        'RESPONSE': '📤',
        'DEBUG': '🐛'
      }[level] || '📝';

      console.log(`${icon} [${level}][${category}] ${message}${requestId ? ` [${requestId}]` : ''}`);
      if (data) {
        console.log('📊 Data:', JSON.stringify(data, null, 2));
      }
    }
  }

  static info(category, message, data, requestId) {
    this.log('INFO', category, message, data, requestId);
  }

  static error(category, message, data, requestId) {
    this.log('ERROR', category, message, data, requestId);
  }

  static warning(category, message, data, requestId) {
    this.log('WARNING', category, message, data, requestId);
  }

  static request(category, message, data, requestId) {
    this.log('REQUEST', category, message, data, requestId);
  }

  static response(category, message, data, requestId) {
    this.log('RESPONSE', category, message, data, requestId);
  }

  static debug(category, message, data, requestId) {
    this.log('DEBUG', category, message, data, requestId);
  }
}

// Función para verificar si una URL debe usar proxy según NO_PROXY
const shouldUseProxy = (url) => {
  const noProxy = process.env.NO_PROXY || process.env.no_proxy;
  
  if (!noProxy) {
    return true; // Si no hay NO_PROXY definido, usar proxy si está configurado
  }
  
  try {
    const targetUrl = new URL(url);
    const hostname = targetUrl.hostname;
    
    // Dividir NO_PROXY por comas y verificar cada patrón
    const noProxyPatterns = noProxy.split(',').map(pattern => pattern.trim());
    
    for (const pattern of noProxyPatterns) {
      // Coincidencia exacta
      if (hostname === pattern) {
        return false;
      }
      
      // Patrón con wildcard (*.domain.com)
      if (pattern.startsWith('*.')) {
        const domain = pattern.substring(2);
        if (hostname.endsWith('.' + domain) || hostname === domain) {
          return false;
        }
      }
      
      // Patrón de subred (10.*, 192.168.*)
      if (pattern.includes('*')) {
        const regexPattern = pattern.replace(/\*/g, '.*');
        const regex = new RegExp('^' + regexPattern + '$');
        if (regex.test(hostname)) {
          return false;
        }
      }
    }
    
    return true; // No coincide con ningún patrón de NO_PROXY, usar proxy
  } catch (error) {
    // Si hay error parseando la URL, usar proxy por seguridad
    return true;
  }
};

// Función mejorada para crear agentes con proxy
const createProxyAgent = (url, requestId) => {
  const isHttps = url.startsWith('https://');
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const serviceIP = process.env.SERVICE_IP;
  
  // Determinar si debe usar proxy
  const useProxy = shouldUseProxy(url);
  const proxyUrl = isHttps ? httpsProxy : httpProxy;
  
  Logger.debug('PROXY', `🔧 Configurando agente para ${url}`, {
    isHttps,
    useProxy,
    proxyUrl: proxyUrl || 'No configurado',
    serviceIP: serviceIP || 'default',
    noProxy: process.env.NO_PROXY || 'No configurado'
  }, requestId);
  
  // Si debe usar proxy y está configurado
  if (useProxy && proxyUrl) {
    const agentOptions = {};
    
    // Añadir IP de servicio si está configurada
    if (serviceIP) {
      agentOptions.localAddress = serviceIP;
    }
    
    if (isHttps) {
      Logger.debug('PROXY', '🔐 Creando HttpsProxyAgent', {
        proxyUrl,
        serviceIP: serviceIP || 'default'
      }, requestId);
      return new HttpsProxyAgent(proxyUrl, agentOptions);
    } else {
      Logger.debug('PROXY', '🌐 Creando HttpProxyAgent', {
        proxyUrl,
        serviceIP: serviceIP || 'default'
      }, requestId);
      return new HttpProxyAgent(proxyUrl, agentOptions);
    }
  }
  
  // Sin proxy, usar agentes nativos con IP específica si está configurada
  const agentOptions = {};
  if (serviceIP) {
    agentOptions.localAddress = serviceIP;
  }
  
  if (isHttps) {
    Logger.debug('PROXY', '🔒 Creando agente HTTPS nativo', {
      serviceIP: serviceIP || 'default'
    }, requestId);
    return new https.Agent(agentOptions);
  } else {
    Logger.debug('PROXY', '🌍 Creando agente HTTP nativo', {
      serviceIP: serviceIP || 'default'
    }, requestId);
    return new http.Agent(agentOptions);
  }
};

// Middleware para logging de todas las peticiones
app.use((req, res, next) => {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = process.hrtime.bigint();
  
  req.requestId = requestId;
  req.startTime = startTime;

  Logger.request('HTTP', `📥 Petición recibida: ${req.method} ${req.path}`, {
    method: req.method,
    url: req.url,
    path: req.path,
    headers: req.headers,
    query: req.query,
    body: req.body,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  }, requestId);

  // Override del res.json para interceptar respuestas
  const originalJson = res.json;
  res.json = function(body) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convertir a ms

    Logger.response('HTTP', `📤 Respuesta enviada: ${res.statusCode} en ${duration.toFixed(2)}ms`, {
      statusCode: res.statusCode,
      headers: res.getHeaders(),
      body: body,
      duration: `${duration.toFixed(2)}ms`
    }, requestId);

    return originalJson.call(this, body);
  };

  next();
});

// Endpoint para activar/desactivar debug
app.post('/api/debug', (req, res) => {
  const { enabled } = req.body;
  const oldMode = debugMode;
  debugMode = enabled;
  
  Logger.info('DEBUG', `🔄 Debug mode cambiado: ${oldMode} → ${debugMode}`, {
    oldMode,
    newMode: debugMode,
    changedBy: req.ip,
    userAgent: req.get('User-Agent')
  }, req.requestId);

  res.json({ 
    success: true, 
    debugMode,
    message: `Debug mode ${debugMode ? 'activado' : 'desactivado'}`,
    proxyConfig: {
      httpProxy: process.env.HTTP_PROXY || 'No configurado',
      httpsProxy: process.env.HTTPS_PROXY || 'No configurado',
      noProxy: process.env.NO_PROXY || 'No configurado',
      serviceIP: process.env.SERVICE_IP || 'default'
    },
    serverInfo: {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }
  });
});

// Endpoint para obtener estado de debug
app.get('/api/debug', (req, res) => {
  Logger.info('DEBUG', '📊 Consultando estado de debug', {
    currentMode: debugMode,
    requestedBy: req.ip
  }, req.requestId);

  res.json({ 
    debugMode,
    proxyConfig: {
      httpProxy: process.env.HTTP_PROXY || 'No configurado',
      httpsProxy: process.env.HTTPS_PROXY || 'No configurado',
      noProxy: process.env.NO_PROXY || 'No configurado',
      serviceIP: process.env.SERVICE_IP || 'default'
    },
    serverInfo: {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }
  });
});

// Endpoint para test directo de API
app.get('/api/test-direct/:codigo', async (req, res) => {
  const { codigo } = req.params;
  
  Logger.info('TEST', '🧪 TEST DIRECTO DE API CON PROXY AGENTS', {
    codigo,
    timestamp: new Date().toISOString()
  }, req.requestId);

  try {
    // Test con la URL real de la API
    const url = `https://www.el-tiempo.net/api/json/v2/provincias/39/municipios/${codigo}`;
    Logger.info('TEST', '🔍 Test con proxy agents', { url }, req.requestId);
    
    // Crear agente apropiado (proxy o directo)
    const agent = createProxyAgent(url, req.requestId);
    
    const response = await fetch(url, {
      method: 'GET',
      agent,
      headers: {
        'User-Agent': 'WeatherApp/1.0'
      },
      timeout: 15000
    });
    
    Logger.info('TEST', `📊 Resultado: ${response.status}`, {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    }, req.requestId);

    let data = null;
    if (response.ok) {
      data = await response.json();
      Logger.info('TEST', '✅ Datos obtenidos correctamente', {
        dataKeys: Object.keys(data),
        hasTemperatura: !!data.temperatura_actual,
        hasMunicipio: !!data.municipio
      }, req.requestId);
    }

    res.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      url,
      data: response.ok ? data : null,
      proxyInfo: {
        httpProxy: process.env.HTTP_PROXY || 'No configurado',
        httpsProxy: process.env.HTTPS_PROXY || 'No configurado',
        serviceIP: process.env.SERVICE_IP || 'default',
        shouldUseProxy: shouldUseProxy(url),
        agentType: agent.constructor.name
      }
    });

  } catch (error) {
    Logger.error('TEST', '❌ Error en test directo', {
      error: error.message,
      stack: error.stack,
      errorCode: error.code,
      errorType: error.constructor.name
    }, req.requestId);

    res.json({
      success: false,
      error: error.message,
      errorCode: error.code,
      errorType: error.constructor.name,
      url: `https://www.el-tiempo.net/api/json/v2/provincias/39/municipios/${codigo}`,
      proxyInfo: {
        httpProxy: process.env.HTTP_PROXY || 'No configurado',
        httpsProxy: process.env.HTTPS_PROXY || 'No configurado',
        serviceIP: process.env.SERVICE_IP || 'default'
      }
    });
  }
});

// Endpoint para verificar conectividad
app.get('/api/connectivity-test', async (req, res) => {
  Logger.info('CONNECTIVITY', '🔍 Iniciando tests de conectividad con proxy agents', {
    requestedBy: req.ip,
    timestamp: new Date().toISOString()
  }, req.requestId);

  const tests = [];
  
  try {
    // Test 1: Google.com
    Logger.debug('CONNECTIVITY', '🌐 Testeando conectividad con Google.com', {}, req.requestId);
    const startGoogle = process.hrtime.bigint();
    
    const googleTest = await fetch('https://www.google.com', { 
      method: 'HEAD', 
      agent: createProxyAgent('https://www.google.com', req.requestId),
      timeout: 10000
    }).then(() => {
      const endGoogle = process.hrtime.bigint();
      const duration = Number(endGoogle - startGoogle) / 1000000;
      return { success: true, message: 'OK', duration: `${duration.toFixed(2)}ms` };
    }).catch(err => {
      const endGoogle = process.hrtime.bigint();
      const duration = Number(endGoogle - startGoogle) / 1000000;
      return { success: false, message: err.message, duration: `${duration.toFixed(2)}ms`, errorCode: err.code };
    });
    
    tests.push({ name: 'Google.com (HTTPS)', ...googleTest });
    Logger.info('CONNECTIVITY', `✅ Test Google.com: ${googleTest.success ? 'OK' : 'FAIL'}`, googleTest, req.requestId);

    // Test 2: API de el-tiempo.net
    Logger.debug('CONNECTIVITY', '🌡️ Testeando API el-tiempo.net', {}, req.requestId);
    const startAPI = process.hrtime.bigint();
    
    const apiTest = await fetch('https://www.el-tiempo.net/api/json/v2/provincias/39/municipios/39001', { 
      method: 'GET',
      agent: createProxyAgent('https://www.el-tiempo.net/api/json/v2/provincias/39/municipios/39001', req.requestId),
      headers: {
        'User-Agent': 'WeatherApp/1.0'
      },
      timeout: 15000
    }).then(response => {
      const endAPI = process.hrtime.bigint();
      const duration = Number(endAPI - startAPI) / 1000000;
      return { 
        success: response.ok, 
        message: `HTTP ${response.status} ${response.statusText}`,
        duration: `${duration.toFixed(2)}ms`,
        headers: Object.fromEntries(response.headers.entries())
      };
    }).catch(err => {
      const endAPI = process.hrtime.bigint();
      const duration = Number(endAPI - startAPI) / 1000000;
      return { 
        success: false, 
        message: err.message,
        duration: `${duration.toFixed(2)}ms`,
        errorType: err.constructor.name,
        errorCode: err.code
      };
    });
    
    tests.push({ name: 'El-Tiempo.net API (HTTPS)', ...apiTest });
    Logger.info('CONNECTIVITY', `🌡️ Test API el-tiempo.net: ${apiTest.success ? 'OK' : 'FAIL'}`, apiTest, req.requestId);

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      proxyConfig: {
        httpProxy: process.env.HTTP_PROXY || 'No configurado',
        httpsProxy: process.env.HTTPS_PROXY || 'No configurado',
        noProxy: process.env.NO_PROXY || 'No configurado',
        serviceIP: process.env.SERVICE_IP || 'default'
      },
      tests,
      summary: {
        total: tests.length,
        passed: tests.filter(t => t.success).length,
        failed: tests.filter(t => !t.success).length
      }
    };

    Logger.info('CONNECTIVITY', '✅ Tests de conectividad completados', result.summary, req.requestId);
    res.json(result);

  } catch (error) {
    Logger.error('CONNECTIVITY', '❌ Error en tests de conectividad', { 
      error: error.message,
      stack: error.stack
    }, req.requestId);

    res.status(500).json({
      success: false,
      error: 'Error al realizar tests de conectividad',
      details: debugMode ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

// Datos de prueba para cuando la API externa falle
const mockWeatherData = {
  "39001": {
    municipio: "Alfoz de Lloredo",
    provincia: "Cantabria", 
    temperatura: "18°C",
    descripcion: "Parcialmente nublado",
    humedad: "75%",
    viento: "15 km/h NE",
    presion: "1015 hPa"
  },
  "39002": {
    municipio: "Santander",
    provincia: "Cantabria",
    temperatura: "17°C", 
    descripcion: "Nublado",
    humedad: "80%",
    viento: "12 km/h N",
    presion: "1012 hPa"
  },
  "39003": {
    municipio: "Castro-Urdiales",
    provincia: "Cantabria",
    temperatura: "19°C",
    descripcion: "Soleado", 
    humedad: "65%",
    viento: "8 km/h E",
    presion: "1018 hPa"
  }
};

// Endpoint principal para obtener información meteorológica
app.get('/api/weather/:codigoPostal', async (req, res) => {
  const { codigoPostal } = req.params;
  
  Logger.info('WEATHER', '🌤️ Solicitud de información meteorológica recibida', { 
    codigoPostal,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    referer: req.get('Referer'),
    fullUrl: req.url,
    originalUrl: req.originalUrl
  }, req.requestId);

  // Validación del código postal
  if (!codigoPostal || codigoPostal.trim().length === 0) {
    Logger.warning('WEATHER', '⚠️ Código postal vacío recibido', { 
      codigoPostal: `"${codigoPostal}"`,
      type: typeof codigoPostal,
      length: codigoPostal?.length
    }, req.requestId);
    
    return res.status(400).json({
      success: false,
      error: 'Código postal requerido.',
      received: codigoPostal,
      requestId: req.requestId
    });
  }

  const cleanCodigoPostal = codigoPostal.trim();
  if (cleanCodigoPostal.length < 4) {
    Logger.warning('WEATHER', '⚠️ Código postal muy corto recibido', { 
      codigoPostal: cleanCodigoPostal,
      length: cleanCodigoPostal.length
    }, req.requestId);
    
    return res.status(400).json({
      success: false,
      error: 'Código postal inválido. Debe tener al menos 4 dígitos.',
      received: cleanCodigoPostal,
      requestId: req.requestId
    });
  }

  try {
    // URL de la API externa
    const apiUrl = `https://www.el-tiempo.net/api/json/v2/provincias/39/municipios/${cleanCodigoPostal}`;
    
    Logger.request('EXTERNAL_API', '🌐 Construyendo petición a API externa con proxy agents', { 
      apiUrl,
      codigoPostal: cleanCodigoPostal,
      step: 'URL_CONSTRUCTION'
    }, req.requestId);

    // Crear agente apropiado basado en configuración de proxy
    const agent = createProxyAgent(apiUrl, req.requestId);

    Logger.request('EXTERNAL_API', '🚀 Enviando petición a API externa', { 
      apiUrl,
      proxyConfig: {
        httpProxy: process.env.HTTP_PROXY || 'No configurado',
        httpsProxy: process.env.HTTPS_PROXY || 'No configurado',
        serviceIP: process.env.SERVICE_IP || 'default',
        shouldUseProxy: shouldUseProxy(apiUrl),
        agentType: agent.constructor.name
      }
    }, req.requestId);

    // Realizar la petición
    const startExternalAPI = process.hrtime.bigint();
    const response = await fetch(apiUrl, {
      method: 'GET',
      agent,
      headers: {
        'User-Agent': 'WeatherApp/1.0',
        'Accept': 'application/json'
      },
      timeout: 15000
    });
    const endExternalAPI = process.hrtime.bigint();
    const apiDuration = Number(endExternalAPI - startExternalAPI) / 1000000;

    Logger.response('EXTERNAL_API', `📥 Respuesta de API externa recibida en ${apiDuration.toFixed(2)}ms`, { 
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      duration: `${apiDuration.toFixed(2)}ms`,
      headers: Object.fromEntries(response.headers.entries()),
      url: apiUrl
    }, req.requestId);
    
    if (!response.ok) {
      Logger.error('EXTERNAL_API', '❌ API externa devolvió ERROR HTTP', { 
        status: response.status,
        statusText: response.statusText,
        apiUrl,
        responseHeaders: Object.fromEntries(response.headers.entries())
      }, req.requestId);
      
      if (response.status === 404) {
        // Si el código postal no existe, usar datos mock si están disponibles
        if (mockWeatherData[cleanCodigoPostal]) {
          Logger.info('FALLBACK', '🔄 Usando datos de prueba por código postal no encontrado', {
            codigoPostal: cleanCodigoPostal,
            source: 'mock_data'
          }, req.requestId);

          const mockData = mockWeatherData[cleanCodigoPostal];
          return res.json({
            success: true,
            ...mockData,
            codigoPostal: cleanCodigoPostal,
            timestamp: new Date().toISOString(),
            dataSource: 'mock_data',
            note: 'Datos de prueba - Código postal no encontrado en API externa',
            requestId: req.requestId
          });
        }
        
        Logger.error('WEATHER', '❌ Código postal no encontrado y sin datos mock', {
          codigoPostal: cleanCodigoPostal,
          status: response.status
        }, req.requestId);

        return res.status(404).json({
          success: false,
          error: 'No se encontró información meteorológica para este código postal.',
          codigoPostal: cleanCodigoPostal,
          requestId: req.requestId
        });
      }
      
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    // Parsear respuesta JSON
    Logger.debug('EXTERNAL_API', '🔄 Parseando respuesta JSON...', {}, req.requestId);
    const data = await response.json();
    
    Logger.info('EXTERNAL_API', '📊 Datos JSON parseados correctamente', { 
      hasData: !!data,
      dataKeys: Object.keys(data || {}),
      municipioData: data.municipio ? Object.keys(data.municipio) : 'N/A',
      dataSize: JSON.stringify(data).length,
      temperaturaActual: data.temperatura_actual || 'N/A'
    }, req.requestId);

    // Procesar la estructura de la API
    const weatherInfo = {
      success: true,
      municipio: data.municipio?.NOMBRE || data.municipio?.nombre || 'Municipio desconocido',
      provincia: data.municipio?.NOMBRE_PROVINCIA || 'Cantabria',
      codigoPostal: cleanCodigoPostal,
      temperatura: data.temperatura_actual ? `${data.temperatura_actual}°C` : 'No disponible',
      descripcion: data.stateSky?.description || 'No disponible',
      humedad: data.humedad ? `${data.humedad}%` : 'No disponible',
      viento: data.viento ? `${data.viento} km/h` : 'No disponible',
      presion: 'No disponible en esta API',
      temperaturas: data.temperaturas ? {
        maxima: data.temperaturas.max ? `${data.temperaturas.max}°C` : 'N/A',
        minima: data.temperaturas.min ? `${data.temperaturas.min}°C` : 'N/A'
      } : null,
      timestamp: new Date().toISOString(),
      dataSource: 'external_api',
      rawData: debugMode ? data : undefined,
      processingTime: `${apiDuration.toFixed(2)}ms`,
      protocol: 'HTTPS',
      requestId: req.requestId,
      proxyUsed: shouldUseProxy(apiUrl) && (process.env.HTTP_PROXY || process.env.HTTPS_PROXY),
      proxyInfo: {
        agentType: agent.constructor.name,
        serviceIP: process.env.SERVICE_IP || 'default'
      }
    };

    Logger.info('WEATHER', '✅ Datos meteorológicos procesados correctamente', { 
      municipio: weatherInfo.municipio,
      temperatura: weatherInfo.temperatura,
      descripcion: weatherInfo.descripcion,
      dataSource: weatherInfo.dataSource,
      processingTime: weatherInfo.processingTime,
      proxyUsed: weatherInfo.proxyUsed,
      agentType: agent.constructor.name
    }, req.requestId);
    
    res.json(weatherInfo);

  } catch (error) {
    Logger.error('WEATHER', '❌ ERROR CRÍTICO al obtener información meteorológica', { 
      error: error.message,
      stack: error.stack,
      errorType: error.constructor.name,
      codigoPostal: cleanCodigoPostal,
      cause: error.cause,
      code: error.code,
      errno: error.errno
    }, req.requestId);

    // Si hay error de conectividad, intentar usar datos mock
    if (error.message.includes('ENOTFOUND') || error.message.includes('fetch failed') || error.message.includes('timeout')) {
      Logger.warning('FALLBACK', '🔄 Error de conectividad detectado, intentando usar datos mock', {
        error: error.message,
        codigoPostal: cleanCodigoPostal,
        mockAvailable: !!mockWeatherData[cleanCodigoPostal]
      }, req.requestId);
      
      if (mockWeatherData[cleanCodigoPostal]) {
        Logger.info('FALLBACK', '✅ Usando datos de prueba por error de conectividad', {
          codigoPostal: cleanCodigoPostal,
          source: 'mock_data'
        }, req.requestId);

        const mockData = mockWeatherData[cleanCodigoPostal];
        return res.json({
          success: true,
          ...mockData,
          codigoPostal: cleanCodigoPostal,
          timestamp: new Date().toISOString(),
          dataSource: 'mock_data',
          note: 'Datos de prueba - Error de conectividad con API externa',
          error_details: debugMode ? error.message : undefined,
          requestId: req.requestId
        });
      }
      
      return res.status(503).json({
        success: false,
        error: 'Servicio temporalmente no disponible. Problemas de conectividad con la API externa.',
        details: debugMode ? error.message : undefined,
        suggestion: 'Verifique la configuración del proxy o intente códigos postales: 39001, 39002, 39003 (datos de prueba disponibles)',
        requestId: req.requestId
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener la información meteorológica.',
      details: debugMode ? error.message : undefined,
      errorType: error.constructor.name,
      requestId: req.requestId
    });
  }
});

// Endpoint de salud del servidor
app.get('/api/health', (req, res) => {
  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    debugMode,
    uptime: process.uptime(),
    version: '1.0.0',
    mockDataAvailable: Object.keys(mockWeatherData),
    proxyConfig: {
      httpProxy: process.env.HTTP_PROXY || 'No configurado',
      httpsProxy: process.env.HTTPS_PROXY || 'No configurado',
      noProxy: process.env.NO_PROXY || 'No configurado',
      serviceIP: process.env.SERVICE_IP || 'default'
    },
    apiConfig: {
      protocol: 'HTTPS',
      baseUrl: 'https://www.el-tiempo.net/api/json/v2/provincias/39/municipios',
      proxyAgentsEnabled: true
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    }
  };

  Logger.info('HEALTH', '💊 Health check solicitado', {
    status: healthData.status,
    uptime: healthData.uptime,
    requestedBy: req.ip,
    proxyAgentsEnabled: true
  }, req.requestId);

  res.json(healthData);
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  Logger.warning('ROUTING', '❓ Endpoint no encontrado', {
    method: req.method,
    url: req.url,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  }, req.requestId);

  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado',
    requested: {
      method: req.method,
      path: req.path
    },
    available: [
      'GET /api/health',
      'GET /api/debug',
      'POST /api/debug',
      'GET /api/connectivity-test',
      'GET /api/weather/:codigoPostal',
      'GET /api/test-direct/:codigo'
    ]
  });
});

// Manejo de errores global
app.use((error, req, res, next) => {
  Logger.error('GLOBAL', '💥 Error no manejado capturado', { 
    error: error.message, 
    stack: error.stack,
    url: req.url,
    method: req.method,
    headers: req.headers
  }, req.requestId);

  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    details: debugMode ? error.message : undefined,
    timestamp: new Date().toISOString()
  });
});

// Manejo de señales del sistema
process.on('SIGTERM', () => {
  Logger.info('SYSTEM', '🛑 Recibida señal SIGTERM - Cerrando servidor gracefully', {
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
  process.exit(0);
});

process.on('SIGINT', () => {
  Logger.info('SYSTEM', '🛑 Recibida señal SIGINT - Cerrando servidor gracefully', {
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
  process.exit(0);
});

app.listen(PORT, () => {
  Logger.info('SYSTEM', '🚀 Servidor backend iniciado correctamente', {
    port: PORT,
    nodeVersion: process.version,
    platform: process.platform,
    debugMode,
    proxyConfig: {
      httpProxy: process.env.HTTP_PROXY || 'No configurado',
      httpsProxy: process.env.HTTPS_PROXY || 'No configurado',
      noProxy: process.env.NO_PROXY || 'No configurado',
      serviceIP: process.env.SERVICE_IP || 'default'
    },
    apiConfig: {
      protocol: 'HTTPS',
      baseUrl: 'https://www.el-tiempo.net/api/json/v2/provincias/39/municipios',
      proxyAgentsEnabled: true
    },
    mockDataAvailable: Object.keys(mockWeatherData),
    endpoints: [
      `http://localhost:${PORT}/api/health`,
      `http://localhost:${PORT}/api/connectivity-test`,
      `http://localhost:${PORT}/api/debug`,
      `http://localhost:${PORT}/api/weather/:codigo`,
      `http://localhost:${PORT}/api/test-direct/:codigo`
    ]
  });
  
  console.log(`🚀 Servidor backend ejecutándose en puerto ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Connectivity test: http://localhost:${PORT}/api/connectivity-test`);
  console.log(`🧪 Test directo: http://localhost:${PORT}/api/test-direct/39001`);
  console.log(`🐛 Debug mode: ${debugMode ? 'ACTIVADO' : 'DESACTIVADO'}`);
  console.log(`📋 Mock data disponible para códigos: ${Object.keys(mockWeatherData).join(', ')}`);
  console.log(`🌐 Configuración de proxy:`);
  console.log(`   HTTP_PROXY: ${process.env.HTTP_PROXY || 'No configurado'}`);
  console.log(`   HTTPS_PROXY: ${process.env.HTTPS_PROXY || 'No configurado'}`);
  console.log(`   NO_PROXY: ${process.env.NO_PROXY || 'No configurado'}`);
  console.log(`   SERVICE_IP: ${process.env.SERVICE_IP || 'default'}`);
  console.log(`🔧 API Externa: HTTPS con proxy agents configurados`);
  console.log(`📝 Logging: JSON estructurado para PM2 + Debug mode para detalles`);
});