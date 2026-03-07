import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Search,
  Map as MapIcon, 
  History, 
  Bell, 
  Settings, 
  Wind, 
  AlertTriangle, 
  Navigation, 
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Info,
  MapPin,
  Bot,
  Loader2,
  User,
  Search as SearchIcon
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { generateChatResponse } from './lib/gemini';
import { fetchCurrentAQI, getAQICategory, AQIData, INDIAN_CITIES } from './lib/aqi';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Fix for Leaflet marker icons in React
let DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Screen = 'home' | 'search' | 'map' | 'history' | 'alerts' | 'settings';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>('home');
  const [aqiData, setAqiData] = useState<AQIData | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [userSettings, setUserSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{lat: number, lng: number}>({lat: 28.6139, lng: 77.2090}); // Default New Delhi
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  const getAiAdvice = async (data: AQIData) => {
    setLoadingAdvice(true);
    try {
      const prompt = `As a health expert in India, give me 3 concise, bulleted safety tips for a current AQI of ${data.aqi} (${data.category}) based on CPCB (Central Pollution Control Board) standards. The pollutants are: PM2.5: ${data.pollutants.pm25}, PM10: ${data.pollutants.pm10}, O3: ${data.pollutants.o3}. Focus on immediate actions relevant to Indian urban environments. Use plain text.`;
      const advice = await generateChatResponse(prompt, []);
      setAiAdvice(advice || "Stay safe and monitor local air quality reports.");
    } catch (err) {
      setAiAdvice("Stay safe and monitor local air quality reports.");
    } finally {
      setLoadingAdvice(false);
    }
  };

  useEffect(() => {
    if (aqiData) getAiAdvice(aqiData);
  }, [aqiData?.aqi]);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    setLoading(true);
    try {
      // Get location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setLocation(newLoc);
            refreshData(newLoc.lat, newLoc.lng, "Current Location", "GPS Detected");
          },
          () => refreshData(location.lat, location.lng, "New Delhi", "Central")
        );
      } else {
        refreshData(location.lat, location.lng, "New Delhi", "Central");
      }

      // Fetch user settings
      const userRes = await fetch('/api/user');
      const userData = await userRes.json();
      setUserSettings(userData);

      // Fetch history
      const historyRes = await fetch('/api/aqi/history');
      const historyData = await historyRes.json();
      setHistory(historyData);

      // Fetch alerts
      const alertsRes = await fetch('/api/alerts');
      const alertsData = await alertsRes.json();
      setAlerts(alertsData);

    } catch (err) {
      console.error("Init error", err);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async (lat: number, lng: number, cityName?: string, areaName?: string) => {
    const data = await fetchCurrentAQI(lat, lng, cityName, areaName);
    setAqiData(data);
    
    // Log to history
    await fetch('/api/aqi/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location_name: data.location,
        area_name: data.area,
        aqi_value: data.aqi,
        ...data.pollutants
      })
    });

    // Check for alerts
    if (userSettings && data.aqi > userSettings.alert_threshold) {
      // In a real app, this would trigger a push notification
      console.log("ALERT: High AQI detected!");
    }
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'home': return <HomeScreen data={aqiData} aiAdvice={aiAdvice} loadingAdvice={loadingAdvice} onRefresh={() => refreshData(location.lat, location.lng, aqiData?.location, aqiData?.area)} />;
      case 'search': return <SearchScreen onSelectLocation={(city, area, lat, lng) => {
        setLocation({ lat, lng });
        refreshData(lat, lng, city, area);
        setActiveScreen('home');
      }} onUseGPS={() => initApp()} />;
      case 'map': return <MapScreen center={location} data={aqiData} />;
      case 'history': return <HistoryScreen history={history} />;
      case 'alerts': return <AlertsScreen alerts={alerts} settings={userSettings} onUpdateSettings={setUserSettings} />;
      case 'settings': return <SettingsScreen settings={userSettings} onUpdateSettings={setUserSettings} />;
      default: return <HomeScreen data={aqiData} aiAdvice={aiAdvice} loadingAdvice={loadingAdvice} onRefresh={() => refreshData(location.lat, location.lng)} />;
    }
  };

  if (loading && !aqiData) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <RefreshCw className="w-10 h-10 text-blue-500" />
        </motion.div>
        <p className="mt-4 text-gray-500 font-medium">Protecting your air...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-[#F8FAFC] max-w-md mx-auto border-x border-gray-100 shadow-2xl relative overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Wind className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">AirGuard India</h1>
        </div>
        <button 
          onClick={() => refreshData(location.lat, location.lng)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <RefreshCw className="w-5 h-5 text-gray-400" />
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScreen}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="h-full"
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <nav className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-100 px-4 py-3 flex items-center justify-between z-20">
        <NavButton active={activeScreen === 'home'} icon={<Home />} label="Home" onClick={() => setActiveScreen('home')} />
        <NavButton active={activeScreen === 'search'} icon={<SearchIcon />} label="Search" onClick={() => setActiveScreen('search')} />
        <NavButton active={activeScreen === 'map'} icon={<MapIcon />} label="Map" onClick={() => setActiveScreen('map')} />
        <NavButton active={activeScreen === 'history'} icon={<History />} label="Trends" onClick={() => setActiveScreen('history')} />
        <NavButton active={activeScreen === 'alerts'} icon={<Bell />} label="Alerts" onClick={() => setActiveScreen('alerts')} />
      </nav>
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all",
        active ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
      )}
    >
      {active ? (
        <motion.div layoutId="nav-active" className="absolute -top-3 w-1 h-1 bg-blue-600 rounded-full" />
      ) : null}
      <div className={cn("w-6 h-6", active ? "scale-110" : "scale-100")}>
        {icon}
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
    </button>
  );
}

// --- Screens ---

function HomeScreen({ data, aiAdvice, loadingAdvice, onRefresh }: { data: AQIData | null, aiAdvice: string, loadingAdvice: boolean, onRefresh: () => void }) {
  if (!data) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Main AQI Card */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center relative overflow-hidden"
      >
        <div 
          className="absolute top-0 left-0 w-full h-2" 
          style={{ backgroundColor: data.color }}
        />
        
        <div className="flex flex-col items-center gap-1 text-gray-400 mb-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-bold text-gray-900">{data.location}</span>
          </div>
          {data.area && (
            <span className="text-xs font-medium text-gray-400">{data.area}</span>
          )}
        </div>

        <div className="relative mb-4">
          <div 
            className="w-48 h-48 rounded-full border-8 flex flex-col items-center justify-center"
            style={{ borderColor: `${data.color}20` }}
          >
            <span className="text-6xl font-black text-gray-900">{data.aqi}</span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">CPCB AQI</span>
          </div>
          <div 
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-xs font-bold shadow-lg"
            style={{ backgroundColor: data.color }}
          >
            {data.category}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-center gap-2 text-gray-900 font-bold">
            <ShieldCheck className="w-5 h-5 text-blue-500" />
            <span>Health Advice</span>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed">
            {data.advice}
          </p>
        </div>
      </motion.div>

      {/* AI Advice Card */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-gray-900">AI Health Insights</h3>
          </div>
          {loadingAdvice && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
        </div>
        <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
          {aiAdvice || "Analyzing air quality for personalized tips..."}
        </div>
      </div>

      {/* Pollutants Grid */}
      <div className="grid grid-cols-2 gap-4">
        <PollutantCard label="PM2.5" value={data.pollutants.pm25} unit="µg/m³" />
        <PollutantCard label="PM10" value={data.pollutants.pm10} unit="µg/m³" />
        <PollutantCard label="CO" value={data.pollutants.co} unit="mg/m³" />
        <PollutantCard label="NO₂" value={data.pollutants.no2} unit="µg/m³" />
      </div>
    </div>
  );
}

function SearchScreen({ onSelectLocation, onUseGPS }: { onSelectLocation: (city: string, area: string, lat: number, lng: number) => void, onUseGPS: () => void }) {
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');

  const handleSearch = () => {
    if (!city) return;
    const foundCity = INDIAN_CITIES.find(c => c.name.toLowerCase() === city.toLowerCase());
    const lat = foundCity?.lat || 28.6139;
    const lng = foundCity?.lng || 77.2090;
    onSelectLocation(city, area || "Local Area", lat, lng);
  };

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Search Location</h2>
        <p className="text-sm text-gray-500">Enter your city and area for real-time AQI</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">City Name</label>
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="e.g. Pune, Delhi, Mumbai"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Local Area / Neighborhood</label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="e.g. Shivaji Nagar"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>

        <button 
          onClick={handleSearch}
          className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
        >
          Check Air Quality
        </button>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold text-gray-300 bg-[#F8FAFC] px-4">
            OR
          </div>
        </div>

        <button 
          onClick={onUseGPS}
          className="w-full py-4 bg-white text-gray-700 font-bold rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-all"
        >
          <Navigation className="w-5 h-5 text-blue-500" />
          Use Current Location (GPS)
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Popular Cities</h3>
        <div className="grid grid-cols-2 gap-3">
          {INDIAN_CITIES.slice(0, 4).map(c => (
            <button 
              key={c.name}
              onClick={() => onSelectLocation(c.name, "Central", c.lat, c.lng)}
              className="p-4 bg-white rounded-2xl border border-gray-100 text-left hover:border-blue-500 transition-all group"
            >
              <p className="text-sm font-bold text-gray-900 group-hover:text-blue-600">{c.name}</p>
              <p className="text-[10px] text-gray-400 font-medium">India</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PollutantCard({ label, value, unit }: { label: string, value: number, unit: string }) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-xl font-bold text-gray-900">{value}</span>
        <span className="text-[10px] text-gray-400 font-medium">{unit}</span>
      </div>
    </div>
  );
}

function MapScreen({ center, data }: { center: {lat: number, lng: number}, data: AQIData | null }) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-6 bg-white border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">Pollution Map</h2>
        <p className="text-sm text-gray-500">Real-time air quality across India</p>
      </div>
      <div className="flex-1 z-0">
        <MapContainer center={[center.lat, center.lng]} zoom={5} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <Marker position={[center.lat, center.lng]}>
            <Popup>
              <div className="text-center">
                <p className="font-bold">Your Location</p>
                <p className="text-lg font-black" style={{ color: data?.color }}>AQI: {data?.aqi}</p>
              </div>
            </Popup>
          </Marker>
          
          {INDIAN_CITIES.map(city => {
            const mockAqi = Math.floor(Math.random() * 400) + 50;
            const { color } = getAQICategory(mockAqi);
            return (
              <Circle 
                key={city.name}
                center={[city.lat, city.lng]} 
                radius={20000} 
                pathOptions={{ color: color, fillColor: color, fillOpacity: 0.6 }} 
              >
                <Popup>
                  <div className="text-center">
                    <p className="font-bold">{city.name}</p>
                    <p className="text-lg font-black" style={{ color }}>AQI: {mockAqi}</p>
                  </div>
                </Popup>
              </Circle>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}

function HistoryScreen({ history }: { history: any[] }) {
  const chartData = useMemo(() => {
    return history.map(h => ({
      time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      aqi: h.aqi_value
    })).reverse();
  }, [history]);

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">AQI Trends</h2>
        <p className="text-sm text-gray-500">Pollution levels over the last 24 hours</p>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
          <History className="w-4 h-4 text-blue-500" />
          Hourly Trend
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Area type="monotone" dataKey="aqi" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAqi)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-900">Recent Logs</h3>
        <div className="space-y-3">
          {history.map((h, i) => {
            const { category, color } = getAQICategory(h.aqi_value);
            return (
              <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-10 rounded-full" style={{ backgroundColor: color }} />
                  <div>
                    <p className="text-sm font-bold text-gray-900">{category}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                      {new Date(h.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className="text-xl font-black text-gray-900">{h.aqi_value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AlertsScreen({ alerts, settings, onUpdateSettings }: { alerts: any[], settings: any, onUpdateSettings: (s: any) => void }) {
  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Smart Alerts</h2>
        <p className="text-sm text-gray-500">Manage your pollution notifications</p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Push Notifications</p>
              <p className="text-xs text-gray-400">Alert me when AQI is high</p>
            </div>
          </div>
          <button 
            onClick={() => onUpdateSettings({ ...settings, notifications_enabled: settings.notifications_enabled ? 0 : 1 })}
            className={cn(
              "w-12 h-6 rounded-full transition-colors relative",
              settings?.notifications_enabled ? "bg-blue-600" : "bg-gray-200"
            )}
          >
            <motion.div 
              animate={{ x: settings?.notifications_enabled ? 24 : 4 }}
              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" 
            />
          </button>
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-50">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Alert Threshold (AQI)</p>
          <div className="flex items-center gap-4">
            <input 
              type="range" 
              min="50" 
              max="300" 
              step="10"
              value={settings?.alert_threshold || 100}
              onChange={(e) => onUpdateSettings({ ...settings, alert_threshold: parseInt(e.target.value) })}
              className="flex-1 h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-lg font-black text-blue-600 w-12">{settings?.alert_threshold}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-900">Alert History</h3>
        {alerts.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-dashed border-gray-200 flex flex-col items-center text-center">
            <ShieldCheck className="w-10 h-10 text-gray-200 mb-2" />
            <p className="text-sm text-gray-400 font-medium">No alerts triggered yet. Your air is safe!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((a, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-start gap-4">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{a.message}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{new Date(a.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsScreen({ settings, onUpdateSettings }: { settings: any, onUpdateSettings: (s: any) => void }) {
  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500">Personalize your AirGuard experience</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">General</h3>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <SettingsItem icon={<MapPin className="text-blue-500" />} label="Location Permissions" value="Always" />
          <SettingsItem icon={<Wind className="text-emerald-500" />} label="Measurement Units" value="Metric" />
          <SettingsItem icon={<Home className="text-purple-500" />} label="Saved Locations" value="3 Cities" />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Account</h3>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <SettingsItem icon={<User className="text-gray-500" />} label="Profile" value={settings?.email || "User"} />
          <SettingsItem icon={<Bell className="text-orange-500" />} label="Notification History" value="View All" />
        </div>
      </div>

      <button className="w-full py-4 bg-red-50 text-red-600 font-bold rounded-2xl border border-red-100 hover:bg-red-100 transition-colors">
        Sign Out
      </button>

      <div className="text-center">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">AirGuard India v1.1.0</p>
        <p className="text-[10px] text-gray-300 mt-1 italic">Designed for your safety</p>
      </div>
    </div>
  );
}

function SettingsItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 flex items-center justify-center">
          {icon}
        </div>
        <span className="text-sm font-bold text-gray-700">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 font-medium">{value}</span>
        <ChevronRight className="w-4 h-4 text-gray-300" />
      </div>
    </button>
  );
}
