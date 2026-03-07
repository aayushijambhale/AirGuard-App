export interface AQIData {
  aqi: number;
  category: string;
  color: string;
  advice: string;
  pollutants: {
    pm25: number;
    pm10: number;
    co: number;
    no2: number;
    so2: number;
    o3: number;
  };
  location: string;
  area?: string;
}

export interface HistoryData {
  time: string;
  aqi: number;
}

export const INDIAN_CITIES = [
  { name: "Delhi", lat: 28.6139, lng: 77.2090 },
  { name: "Mumbai", lat: 19.0760, lng: 72.8777 },
  { name: "Pune", lat: 18.5204, lng: 73.8567 },
  { name: "Bangalore", lat: 12.9716, lng: 77.5946 },
  { name: "Chennai", lat: 13.0827, lng: 80.2707 },
  { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
  { name: "Hyderabad", lat: 17.3850, lng: 78.4867 },
  { name: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
  { name: "Lucknow", lat: 26.8467, lng: 80.9462 },
  { name: "Jaipur", lat: 26.9124, lng: 75.7873 },
];

export const getAQICategory = (aqi: number) => {
  if (aqi <= 50) return { category: "Good", color: "#22c55e", advice: "Minimal impact. Outdoor activities are safe." };
  if (aqi <= 100) return { category: "Satisfactory", color: "#84cc16", advice: "Minor breathing discomfort for sensitive people." };
  if (aqi <= 200) return { category: "Moderate", color: "#eab308", advice: "Breathing discomfort to people with lungs, asthma and heart diseases." };
  if (aqi <= 300) return { category: "Poor", color: "#f97316", advice: "Breathing discomfort to most people on prolonged exposure." };
  if (aqi <= 400) return { category: "Very Poor", color: "#ef4444", advice: "Respiratory illness on prolonged exposure." };
  return { category: "Severe", color: "#7f1d1d", advice: "Affects healthy people and seriously impacts those with existing diseases." };
};

export const fetchCurrentAQI = async (lat: number, lng: number, cityName?: string, areaName?: string): Promise<AQIData> => {
  // Simulating random data for demo
  const mockAQI = Math.floor(Math.random() * 500);
  const { category, color, advice } = getAQICategory(mockAQI);
  
  return {
    aqi: mockAQI,
    category,
    color,
    advice,
    pollutants: {
      pm25: Number((Math.random() * 100).toFixed(1)),
      pm10: Number((Math.random() * 150).toFixed(1)),
      co: Number((Math.random() * 2).toFixed(2)),
      no2: Number((Math.random() * 50).toFixed(1)),
      so2: Number((Math.random() * 20).toFixed(1)),
      o3: Number((Math.random() * 120).toFixed(1)),
    },
    location: cityName || "New Delhi",
    area: areaName || "Central Area"
  };
};

export const fetchAQIHistory = async (): Promise<HistoryData[]> => {
  const history: HistoryData[] = [];
  const now = new Date();
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 3600000);
    history.push({
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      aqi: Math.floor(Math.random() * 300) + 50
    });
  }
  return history;
};
