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
  if (aqi <= 50) return { category: "Good", color: "#22c55e", advice: "Minimal impact. Outdoor activities are safe." };
  if (aqi <= 100) return { category: "Satisfactory", color: "#84cc16", advice: "Minor breathing discomfort for sensitive people." };
  if (aqi <= 200) return { category: "Moderate", color: "#eab308", advice: "Breathing discomfort to people with lungs, asthma and heart diseases." };
  if (aqi <= 300) return { category: "Poor", color: "#f97316", advice: "Breathing discomfort to most people on prolonged exposure." };
  if (aqi <= 400) return { category: "Very Poor", color: "#ef4444", advice: "Respiratory illness on prolonged exposure." };
  return { category: "Severe", color: "#7f1d1d", advice: "Affects healthy people and seriously impacts those with existing diseases." };
};

// Mock function to simulate API fetch
export const fetchCurrentAQI = async (lat: number, lng: number): Promise<AQIData> => {
  // In a real app, you'd use:
  // const res = await axios.get(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${API_KEY}`);
  
  // Simulating random data for demo (Indian cities often have higher AQI)
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
      co: Number((Math.random() * 500).toFixed(1)),
      no2: Number((Math.random() * 50).toFixed(1)),
      so2: Number((Math.random() * 20).toFixed(1)),
      o3: Number((Math.random() * 120).toFixed(1)),
    },
    location: "Current Location"
  };
};
