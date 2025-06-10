"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

// Leaflet'i SSR olmadan sadece client'ta render etmek için
const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
});

// LocationPicker bileşenini dinamik olarak import et
const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
});

export default function Home() {
  const [startLocation, setStartLocation] = useState<{ lat: number; lng: number }>({ 
    lat: 41.0082, 
    lng: 28.9784 
  });
  const [endLocation, setEndLocation] = useState<{ lat: number; lng: number }>({ 
    lat: 41.0351, 
    lng: 28.9895 
  });
  const [shouldCalculate, setShouldCalculate] = useState(false);

  // Başlangıç noktasını güncelle
  const handleStartLocationChange = (lat: number, lng: number) => {
    setStartLocation({ lat, lng });
  };
  
  // Bitiş noktasını güncelle
  const handleEndLocationChange = (lat: number, lng: number) => {
    setEndLocation({ lat, lng });
  };

  // Rotayı hesapla
  const handleCalculateRoute = () => {
    setShouldCalculate(prev => !prev); // State değişikliği ile MapComponent'i tetikle
  };

  return (
    <main className="w-full h-screen grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      {/* Sol panel - Başlangıç noktası seçici */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-xl font-bold mb-4">Başlangıç Noktası</h2>
        <LocationPicker 
          isStartPicker={true}
          onLocationChange={handleStartLocationChange}
          onCalculateRoute={() => {}}
        />
      </div>
      
      {/* Orta panel - Harita */}
      <div className="md:col-span-1 lg:col-span-1 h-full">
        <MapComponent 
          startLocation={startLocation}
          endLocation={endLocation}
          shouldCalculate={shouldCalculate}
        />
      </div>
      
      {/* Sağ panel - Bitiş noktası seçici */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-xl font-bold mb-4">Bitiş Noktası</h2>
        <LocationPicker 
          isStartPicker={false}
          onLocationChange={handleEndLocationChange}
          onCalculateRoute={handleCalculateRoute}
        />
      </div>
    </main>
  );
}
