import React, { useState, useEffect } from 'react';
import { Cloud, MapPin, Thermometer, Droplets, Wind, Gauge, Bug, CheckCircle, AlertCircle, Loader, Sun, CloudRain, Activity, Eye } from 'lucide-react';

interface WeatherData {
  success: boolean;
  municipio: string;
  provincia: string;
  codigoPostal: string;
  temperatura: string;
  descripcion: string;
  humedad: string;
  viento: string;
  presion: string;
  temperaturas?: {
    maxima: string;
    minima: string;
  };
  timestamp: string;
  dataSource?: string;
  note?: string;
  rawData?: any;
  proxyUsed?: boolean;
}

interface ApiResponse {
  success: boolean;
  error?: string;
  details?: string;
}

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'ERROR' | 'WARNING' | 'REQUEST' | 'RESPONSE';
  category: 'UI' | 'HTTP' | 'API' | 'DEBUG';
  message: string;
  data?: any;
}

function App() {
  const [codigoPostal, setCodigoPostal] = useState('');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [debugLogs, setDebugLogs] = useState<LogEntry[]>([]);
  const [showDetailedLogs, setShowDetailedLogs] = useState(false);

  // CORREGIDO: Usar el proxy de Nginx en lugar de conectar directamente al backend
  const API_BASE_URL = '/api';

  // Función mejorada para añadir logs estructurados
  const addLog = (level: LogEntry['level'], category: LogEntry['category'], message: string, data?: any) => {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined
    };
    
    setDebugLogs(prev => [...prev.slice(-49), logEntry]); // Mantener últimos 50 logs
    
    // También log en consola para debugging avanzado
    const consoleMethod = level === 'ERROR' ? 'error' : level === 'WARNING' ? 'warn' : 'log';
    console[consoleMethod](`[${level}][${category}] ${message}`, data || '');
  };

  // Función para peticiones HTTP con trazas completas
  const trackedFetch = async (url: string, options: RequestInit = {}) => {
    const requestId = Math.random().toString(36).substring(7);
    const startTime = performance.now();
    
    addLog('REQUEST', 'HTTP', `🚀 Iniciando petición [${requestId}]`, {
      url,
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body,
      requestId
    });

    try {
      const response = await fetch(url, options);
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      addLog('RESPONSE', 'HTTP', `📥 Respuesta recibida [${requestId}] - ${response.status} en ${duration}ms`, {
        requestId,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        duration,
        ok: response.ok
      });

      // Clonar respuesta para poder leer el body
      const responseClone = response.clone();
      
      try {
        const responseData = await responseClone.json();
        addLog('RESPONSE', 'API', `📊 Datos de respuesta [${requestId}]`, {
          requestId,
          data: responseData,
          size: JSON.stringify(responseData).length
        });
      } catch (parseError) {
        addLog('WARNING', 'HTTP', `⚠️ No se pudo parsear respuesta JSON [${requestId}]`, {
          requestId,
          error: parseError
        });
      }

      return response;
    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      addLog('ERROR', 'HTTP', `❌ Error en petición [${requestId}] después de ${duration}ms`, {
        requestId,
        error: error instanceof Error ? error.message : String(error),
        duration,
        url
      });
      
      throw error;
    }
  };

  // Verificar estado inicial del debug
  useEffect(() => {
    addLog('INFO', 'UI', '🎬 Aplicación iniciada');
    checkDebugStatus();
  }, []);

  const checkDebugStatus = async () => {
    try {
      addLog('INFO', 'DEBUG', '🔍 Verificando estado de debug del servidor...');
      
      const response = await trackedFetch(`${API_BASE_URL}/debug`);
      const data = await response.json();
      
      setDebugMode(data.debugMode);
      addLog('INFO', 'DEBUG', `✅ Estado de debug verificado: ${data.debugMode ? 'ACTIVADO' : 'DESACTIVADO'}`, {
        debugMode: data.debugMode,
        proxyConfig: data.proxyConfig
      });
    } catch (err) {
      addLog('ERROR', 'DEBUG', '❌ Error al verificar estado de debug', { error: err });
      console.error('Error al verificar estado de debug:', err);
    }
  };

  const toggleDebugMode = async () => {
    try {
      const newMode = !debugMode;
      addLog('INFO', 'DEBUG', `🔄 Cambiando modo debug: ${debugMode} → ${newMode}`);
      
      const response = await trackedFetch(`${API_BASE_URL}/debug`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: newMode }),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();
      setDebugMode(data.debugMode);
      
      if (data.debugMode) {
        addLog('INFO', 'DEBUG', '✅ Debug mode ACTIVADO - Logs del servidor visibles', {
          proxyConfig: data.proxyConfig
        });
      } else {
        addLog('INFO', 'DEBUG', '⏹️ Debug mode DESACTIVADO');
      }
    } catch (err) {
      addLog('ERROR', 'DEBUG', '❌ Error al cambiar modo debug', { error: err });
      console.error('Error al cambiar modo debug:', err);
    }
  };

  const fetchWeatherData = async () => {
    if (!codigoPostal.trim()) {
      addLog('WARNING', 'UI', '⚠️ Usuario intentó buscar sin código postal');
      setError('Por favor, introduce un código postal válido');
      return;
    }

    setLoading(true);
    setError(null);
    setWeatherData(null);
    
    addLog('INFO', 'UI', `🌤️ Usuario solicita datos meteorológicos`, { 
      codigoPostal: codigoPostal.trim(),
      timestamp: new Date().toISOString()
    });

    try {
      const url = `${API_BASE_URL}/weather/${codigoPostal}`;
      addLog('REQUEST', 'API', `🌐 Solicitando datos meteorológicos`, {
        url,
        codigoPostal,
        apiBase: API_BASE_URL
      });

      const response = await trackedFetch(url);
      
      if (!response.ok) {
        addLog('ERROR', 'HTTP', `❌ Error HTTP: ${response.status}`, {
          status: response.status,
          statusText: response.statusText,
          url
        });
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data: WeatherData | ApiResponse = await response.json();
      
      if (!data.success) {
        const errorData = data as ApiResponse;
        addLog('ERROR', 'API', '❌ API devolvió error', { 
          error: errorData.error,
          details: errorData.details
        });
        throw new Error(errorData.error || 'Error desconocido');
      }

      const weatherInfo = data as WeatherData;
      setWeatherData(weatherInfo);
      
      addLog('INFO', 'API', '✅ Datos meteorológicos obtenidos correctamente', {
        municipio: weatherInfo.municipio,
        temperatura: weatherInfo.temperatura,
        descripcion: weatherInfo.descripcion,
        dataSource: weatherInfo.dataSource,
        proxyUsed: weatherInfo.proxyUsed,
        timestamp: weatherInfo.timestamp
      });
      
      if (weatherInfo.dataSource === 'mock_data') {
        addLog('WARNING', 'API', '⚠️ Usando datos de prueba', { 
          note: weatherInfo.note,
          reason: 'API externa no disponible'
        });
      } else {
        addLog('INFO', 'API', '🌐 Datos desde API externa el-tiempo.net', {
          proxyUsed: weatherInfo.proxyUsed
        });
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error de conexión';
      setError(errorMessage);
      addLog('ERROR', 'API', '❌ ERROR final en obtención de datos', { 
        error: errorMessage,
        codigoPostal,
        stack: err instanceof Error ? err.stack : undefined
      });
      console.error('Error detallado:', err);
    } finally {
      setLoading(false);
      addLog('INFO', 'UI', '🏁 Finalizada petición de datos meteorológicos');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addLog('INFO', 'UI', '📝 Formulario enviado por el usuario', { 
      codigoPostal: codigoPostal.trim(),
      action: 'form_submit'
    });
    fetchWeatherData();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCodigoPostal(value);
    addLog('INFO', 'UI', '⌨️ Usuario modificó código postal', { 
      oldValue: codigoPostal,
      newValue: value,
      length: value.length
    });
  };

  const clearDebugLogs = () => {
    const logCount = debugLogs.length;
    setDebugLogs([]);
    addLog('INFO', 'DEBUG', '🧹 Logs limpiados por el usuario', { 
      clearedLogs: logCount
    });
  };

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'ERROR': return 'text-red-400';
      case 'WARNING': return 'text-yellow-400';
      case 'REQUEST': return 'text-blue-400';
      case 'RESPONSE': return 'text-green-400';
      default: return 'text-gray-300';
    }
  };

  const getLogIcon = (category: LogEntry['category']) => {
    switch (category) {
      case 'HTTP': return '🌐';
      case 'API': return '🔌';
      case 'UI': return '👤';
      case 'DEBUG': return '🐛';
      default: return '📝';
    }
  };

  // Función para obtener icono basado en la descripción
  const getWeatherIcon = (descripcion: string) => {
    const desc = descripcion.toLowerCase();
    if (desc.includes('despejado') || desc.includes('soleado')) {
      return <Sun className="h-8 w-8 text-yellow-500" />;
    } else if (desc.includes('lluvia') || desc.includes('lluvioso')) {
      return <CloudRain className="h-8 w-8 text-blue-500" />;
    } else {
      return <Cloud className="h-8 w-8 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Cloud className="h-12 w-12 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-800">WeatherApp</h1>
          </div>
          <p className="text-gray-600 text-lg">Consulta el tiempo por código postal de Cantabria</p>
          <p className="text-xs text-gray-500 mt-2">API Base: {API_BASE_URL} | Conectado a: el-tiempo.net</p>
        </div>

        {/* Debug Controls */}
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
          <button
            onClick={toggleDebugMode}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg ${
              debugMode
                ? 'bg-green-500 text-white shadow-green-200'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Bug className="h-4 w-4" />
            Debug {debugMode ? 'ON' : 'OFF'}
          </button>
          
          {debugMode && (
            <button
              onClick={() => setShowDetailedLogs(!showDetailedLogs)}
              className={`flex items-center gap-2 px-3 py-1 rounded-md font-medium transition-all duration-200 text-sm ${
                showDetailedLogs
                  ? 'bg-blue-500 text-white'
                  : 'bg-blue-200 text-blue-800 hover:bg-blue-300'
              }`}
            >
              <Eye className="h-3 w-3" />
              Detalles {showDetailedLogs ? 'ON' : 'OFF'}
            </button>
          )}
        </div>

        <div className="max-w-4xl mx-auto grid gap-8 lg:grid-cols-3">
          {/* Search Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                Buscar por Código Postal
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="codigoPostal" className="block text-sm font-medium text-gray-700 mb-2">
                    Código Postal de Cantabria
                  </label>
                  <input
                    type="text"
                    id="codigoPostal"
                    value={codigoPostal}
                    onChange={handleInputChange}
                    placeholder="Ej: 39001, 39002, 39003..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Códigos de prueba disponibles: 39001, 39002, 39003
                  </p>
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" />
                      Consultando...
                    </>
                  ) : (
                    'Ver el Tiempo'
                  )}
                </button>
              </form>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-red-800 font-medium">Error</p>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Weather Data */}
          <div className="lg:col-span-2">
            {weatherData && (
              <div className="bg-white rounded-2xl shadow-lg p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    {getWeatherIcon(weatherData.descripcion)}
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">
                        {weatherData.municipio}
                      </h2>
                      <p className="text-gray-600">{weatherData.provincia}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {weatherData.dataSource === 'external_api' ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">Datos en vivo</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-orange-600">
                        <AlertCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">Datos de prueba</span>
                      </div>
                    )}
                    {weatherData.proxyUsed && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <Activity className="h-4 w-4" />
                        <span className="text-xs">Via Proxy</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl md:col-span-1 lg:col-span-3">
                    <div className="flex items-center gap-3">
                      <Thermometer className="h-8 w-8 text-orange-600" />
                      <div className="flex-1">
                        <p className="text-sm text-orange-700 font-medium">Temperatura Actual</p>
                        <p className="text-3xl font-bold text-orange-800">{weatherData.temperatura}</p>
                        {weatherData.temperaturas && (
                          <p className="text-sm text-orange-600 mt-1">
                            Máx: {weatherData.temperaturas.maxima} | Mín: {weatherData.temperaturas.minima}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Droplets className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="text-sm text-blue-700 font-medium">Humedad</p>
                        <p className="text-xl font-bold text-blue-800">{weatherData.humedad}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Wind className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-sm text-green-700 font-medium">Viento</p>
                        <p className="text-xl font-bold text-green-800">{weatherData.viento}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Gauge className="h-8 w-8 text-purple-600" />
                      <div>
                        <p className="text-sm text-purple-700 font-medium">Presión</p>
                        <p className="text-lg font-bold text-purple-800">{weatherData.presion}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    {getWeatherIcon(weatherData.descripcion)}
                    Estado del Cielo
                  </h3>
                  <p className="text-gray-700 text-lg">{weatherData.descripcion}</p>
                  {weatherData.note && (
                    <p className="text-orange-600 text-sm mt-2 font-medium">ℹ️ {weatherData.note}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Última actualización: {new Date(weatherData.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Advanced Debug Panel */}
        {debugMode && (
          <div className="fixed bottom-4 right-4 w-[500px] max-h-[600px] bg-black bg-opacity-95 text-green-400 rounded-lg overflow-hidden z-40 border border-green-500 shadow-2xl">
            <div className="flex items-center justify-between p-3 bg-green-900 bg-opacity-50">
              <span className="text-green-300 font-bold flex items-center gap-2">
                🐛 CONSOLE DEBUG
                <span className="text-xs bg-green-800 px-2 py-1 rounded">
                  {debugLogs.length} logs
                </span>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={clearDebugLogs}
                  className="text-green-300 hover:text-white text-xs px-2 py-1 bg-green-800 rounded"
                >
                  Clear
                </button>
                <button
                  onClick={() => setDebugMode(false)}
                  className="text-red-300 hover:text-white text-xs px-2 py-1 bg-red-800 rounded"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-3 overflow-y-auto max-h-[540px] space-y-1 font-mono text-xs">
              {debugLogs.length === 0 ? (
                <p className="text-gray-500 italic">Esperando actividad...</p>
              ) : (
                debugLogs.map((log, index) => (
                  <div key={index} className="border-l-2 border-gray-600 pl-2 py-1">
                    <div className={`${getLogColor(log.level)} break-words leading-relaxed`}>
                      <span className="text-gray-400 text-xs">
                        {new Date(log.timestamp).toLocaleTimeString()}.
                        {new Date(log.timestamp).getMilliseconds().toString().padStart(3, '0')}
                      </span>
                      <span className="mx-2">
                        {getLogIcon(log.category)}
                      </span>
                      <span className={`font-bold ${getLogColor(log.level)}`}>
                        [{log.level}]
                      </span>
                      <span className="mx-1 text-cyan-400">
                        [{log.category}]
                      </span>
                      {log.message}
                    </div>
                    {showDetailedLogs && log.data && (
                      <div className="ml-4 mt-1 text-gray-400 bg-gray-900 bg-opacity-50 p-2 rounded text-xs">
                        <pre className="whitespace-pre-wrap break-words">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;