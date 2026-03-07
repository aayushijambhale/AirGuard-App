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
}

export const getAQICategory = (aqi: number) => {
  if (aqi <= 50) return { category: "Good", color: "#22c55e", advice: "Outdoor activity safe" };
  if (aqi <= 100) return { category: "Moderate", color: "#eab308", advice: "Sensitive people should reduce exposure" };
  if (aqi <= 150) return { category: "Unhealthy for Sensitive Groups", color: "#f97316", advice: "Wear mask outdoors if sensitive" };
  if (aqi <= 200) return { category: "Unhealthy", color: "#ef4444", advice: "Wear mask outdoors" };
  if (aqi <= 300) return { category: "Very Unhealthy", color: "#a855f7", advice: "Avoid outdoor activities" };
  return { category: "Hazardous", color: "#7f1d1d", advice: "Stay indoors" };
};

// Mock function to simulate API fetch
export const fetchCurrentAQI = async (lat: number, lng: number): Promise<AQIData> => {
  // In a real app, you'd use:
  // const res = await axios.get(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${API_KEY}`);
  
  // Simulating random data for demo
  const mockAQI = Math.floor(Math.random() * 350);
  const { category, color, advice } = getAQICategory(mockAQI);
  
  return {
    aqi: mockAQI,
    category,
    color,
    advice,
    pollutants: {
      pm25: Number((Math.random() * 100).toFixed(1)),
      pm10: Number((Math.random() * 150).toFixed(1)),
      co: Number((Math.random() * 500).toFixed(1)),
      no2: Number((Math.random() * 50).toFixed(1)),
      so2: Number((Math.random() * 20).toFixed(1)),
      o3: Number((Math.random() * 120).toFixed(1)),
    },
    location: "Current Location"
  };
};
