"use client";

import { useState, useEffect, useRef } from "react";
import L from "leaflet";

interface LocationPickerProps {
  isStartPicker: boolean; // başlangıç mı bitiş mi picker'ı
  onLocationChange: (lat: number, lng: number) => void;
  onCalculateRoute: () => void;
}

const LocationPicker = ({ isStartPicker, onLocationChange, onCalculateRoute }: LocationPickerProps) => {
  // İstanbul'daki popüler konumlar
  const popularLocations = [
    { name: "Taksim", lat: 41.0370, lng: 28.9850 },
    { name: "Sultanahmet", lat: 41.0054, lng: 28.9768 },
    { name: "Kadıköy", lat: 40.9927, lng: 29.0277 },
    { name: "Beşiktaş", lat: 41.0430, lng: 29.0061 },
    { name: "Üsküdar", lat: 41.0233, lng: 29.0151 },
    { name: "Atatürk Havalimanı", lat: 40.9767, lng: 28.8242 },
    { name: "Sabiha Gökçen Havalimanı", lat: 40.8982, lng: 29.3092 },
    { name: "Eyüp", lat: 41.0480, lng: 28.9341 },
  ];

  const [searchText, setSearchText] = useState("");
  const [filteredLocations, setFilteredLocations] = useState<typeof popularLocations>([]);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number, name?: string}>({
    lat: isStartPicker ? 41.0082 : 41.0351,
    lng: isStartPicker ? 28.9784 : 28.9895,
  });
  
  const miniMapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerId = isStartPicker ? "mini-map-start" : "mini-map-end";

  // Mini haritayı oluştur
  useEffect(() => {
    if (miniMapRef.current) return;
    
    // Mini haritayı oluştur
    const map = L.map(mapContainerId).setView([selectedLocation.lat, selectedLocation.lng], 11);
    miniMapRef.current = map;
    
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    
    // İlk marker'ı ekle
    markerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng], {
      draggable: true
    }).addTo(map);
    
    // Haritaya tıklandığında marker'ı güncelle
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      updateMarkerPosition(lat, lng);
    });
    
    // Marker sürüklendiğinde konum bilgisini güncelle
    markerRef.current.on('dragend', () => {
      if (markerRef.current) {
        const position = markerRef.current.getLatLng();
        updateMarkerPosition(position.lat, position.lng);
      }
    });
    
    return () => {
      if (miniMapRef.current) {
        miniMapRef.current.remove();
        miniMapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);
  
  // Marker pozisyonunu güncelle ve dışarıya bildir
  const updateMarkerPosition = (lat: number, lng: number) => {
    if (!markerRef.current || !miniMapRef.current) return;
    
    // Marker'ı yeni konuma taşı
    markerRef.current.setLatLng([lat, lng]);
    
    // Yeni konumu state'e kaydet
    setSelectedLocation({ lat, lng });
    
    // Dışarıya bildir
    onLocationChange(lat, lng);
    
    // Arama metnini temizle
    setSearchText("");
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchText(query);
    
    if (query.length > 0) {
      const filtered = popularLocations.filter(location => 
        location.name.toLowerCase().includes(query)
      );
      setFilteredLocations(filtered);
    } else {
      setFilteredLocations([]);
    }
  };

  const selectLocation = (location: { name: string; lat: number; lng: number }) => {
    updateMarkerPosition(location.lat, location.lng);
    setSearchText(location.name);
    setFilteredLocations([]);
    
    // Haritayı seçilen konuma odakla
    if (miniMapRef.current) {
      miniMapRef.current.setView([location.lat, location.lng], 13);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="relative mb-3">
        <input
          type="text"
          placeholder={isStartPicker ? "Başlangıç konumu ara" : "Bitiş konumu ara"}
          value={searchText}
          onChange={handleSearch}
          className="border p-2 w-full rounded"
        />
        {filteredLocations.length > 0 && (
          <div className="absolute z-20 bg-white border rounded mt-1 w-full shadow-lg max-h-60 overflow-y-auto">
            {filteredLocations.map((location, index) => (
              <div
                key={index}
                className="p-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => selectLocation(location)}
              >
                {location.name}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="text-sm text-gray-600 mb-2">
        Haritada istediğiniz noktaya tıklayarak veya marker'ı sürükleyerek konum seçebilirsiniz.
      </div>
      
      {/* Mini harita */}
      <div 
        id={mapContainerId} 
        className="w-full h-64 rounded border mb-3"
      ></div>
      
      {/* Seçilen konum bilgisi */}
      <div className="text-sm bg-gray-100 p-2 rounded mb-3">
        <div><strong>Enlem:</strong> {selectedLocation.lat.toFixed(6)}</div>
        <div><strong>Boylam:</strong> {selectedLocation.lng.toFixed(6)}</div>
      </div>

      {!isStartPicker && (
        <button
          onClick={onCalculateRoute}
          className="bg-blue-600 text-white py-3 px-4 rounded hover:bg-blue-700 w-full mt-auto"
        >
          Rotayı Hesapla
        </button>
      )}
    </div>
  );
};

export default LocationPicker; 