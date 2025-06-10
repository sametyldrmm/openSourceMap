"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";

interface MapComponentProps {
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
  shouldCalculate: boolean;
}

// İstanbul'daki önemli köprüler ve koordinatları
const BRIDGES = [
  { 
    name: "15 Temmuz Şehitler Köprüsü (Boğaziçi Köprüsü)", 
    bounds: {
      north: 41.0480, 
      south: 41.0430, 
      east: 29.0420,
      west: 29.0320
    }
  },
  { 
    name: "Fatih Sultan Mehmet Köprüsü", 
    bounds: {
      north: 41.0940, 
      south: 41.0890, 
      east: 29.0610,
      west: 29.0530
    }
  },
  { 
    name: "Yavuz Sultan Selim Köprüsü", 
    bounds: {
      north: 41.1950, 
      south: 41.1850, 
      east: 29.1300,
      west: 29.1100
    }
  },
  { 
    name: "Avrasya Tüneli", 
    bounds: {
      north: 40.9990, 
      south: 40.9990, 
      east: 29.0000,
      west: 28.9700
    }
  },
  { 
    name: "Marmaray", 
    bounds: {
      north: 41.0040, 
      south: 40.9960, 
      east: 29.0180,
      west: 28.9900
    }
  },
  { 
    name: "Haliç Köprüsü", 
    bounds: {
      north: 41.0350, 
      south: 41.0320, 
      east: 28.9490,
      west: 28.9400
    }
  },
  { 
    name: "Galata Köprüsü", 
    bounds: {
      north: 41.0210, 
      south: 41.0180, 
      east: 28.9760,
      west: 28.9710
    }
  }
];

// Özel marker özellikleri için tip tanımı
interface CustomLayer extends L.Layer {
  _bridgeMarker?: boolean;
}

// Köprü marker tipi
interface BridgeMarker extends L.Marker {
  _bridgeMarker: boolean;
}

// Nokta tipi (çizgi kesişimleri için)
interface Point {
  x: number;
  lng: number;
  y: number;
  lat: number;
}

const MapComponent = ({ startLocation, endLocation, shouldCalculate }: MapComponentProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const [route, setRoute] = useState<any>(null);
  const [detectedBridges, setDetectedBridges] = useState<string[]>([]);
  const controlRef = useRef<L.Control | null>(null);
  
  // Koordinatları x, y (lng, lat) noktasına dönüştür
  const coordToPoint = (lng: number, lat: number): Point => ({
    x: lng,
    lng,
    y: lat,
    lat
  });
  
  // İki çizgi parçasının kesişimini kontrol et
  const doLinesIntersect = (
    p1: Point, p2: Point, // İlk çizgi
    p3: Point, p4: Point  // İkinci çizgi
  ): boolean => {
    // Çizginin eğimi ve y-kesişimi
    const denominator = ((p4.y - p3.y) * (p2.x - p1.x)) - ((p4.x - p3.x) * (p2.y - p1.y));
    
    // Çizgiler paralelsa kesişmez
    if (denominator === 0) {
      return false;
    }
    
    const ua = (((p4.x - p3.x) * (p1.y - p3.y)) - ((p4.y - p3.y) * (p1.x - p3.x))) / denominator;
    const ub = (((p2.x - p1.x) * (p1.y - p3.y)) - ((p2.y - p1.y) * (p1.x - p3.x))) / denominator;
    
    // Kesişim noktası her iki çizgi segmentinde de bulunuyorsa
    return (ua >= 0 && ua <= 1) && (ub >= 0 && ub <= 1);
  }
  
  // Bir çizginin dikdörtgenle kesişimini kontrol et
  const doesLineIntersectRectangle = (
    line: [number, number][],  // [lng, lat] formatında koordinatlar
    bounds: typeof BRIDGES[0]["bounds"] // Köprü sınırları
  ): boolean => {
    // Noktalar dikdörtgenin içindeyse kesişim vardır
    const isPointInRect = (lng: number, lat: number) => {
      return (
        lat <= bounds.north &&
        lat >= bounds.south &&
        lng <= bounds.east &&
        lng >= bounds.west
      );
    };
    
    // Dikdörtgenin kenarları
    const rectEdges = [
      // Sol kenar
      [coordToPoint(bounds.west, bounds.south), coordToPoint(bounds.west, bounds.north)],
      // Üst kenar
      [coordToPoint(bounds.west, bounds.north), coordToPoint(bounds.east, bounds.north)],
      // Sağ kenar
      [coordToPoint(bounds.east, bounds.north), coordToPoint(bounds.east, bounds.south)],
      // Alt kenar
      [coordToPoint(bounds.east, bounds.south), coordToPoint(bounds.west, bounds.south)]
    ];
    
    // Çizgi parçaları
    for (let i = 0; i < line.length - 1; i++) {
      const [lng1, lat1] = line[i];
      const [lng2, lat2] = line[i + 1];
      
      // Çizgi parçasının bir ucu dikdörtgenin içindeyse
      if (isPointInRect(lng1, lat1) || isPointInRect(lng2, lat2)) {
        return true;
      }
      
      const lineSegment = [coordToPoint(lng1, lat1), coordToPoint(lng2, lat2)];
      
      // Çizgi dikdörtgenin herhangi bir kenarını kesiyor mu?
      for (const [rectP1, rectP2] of rectEdges) {
        if (doLinesIntersect(
          lineSegment[0], lineSegment[1], 
          rectP1, rectP2
        )) {
          return true;
        }
      }
    }
    
    return false;
  };
  
  // Bir çizginin köprüden geçip geçmediğini kontrol et
  const doesLineIntersectBridge = (
    line: [number, number][],  // [lng, lat] formatında koordinatlar
    bridge: typeof BRIDGES[0]
  ) => {
    // Çizgi köprü sınırlarını kesiyor mu?
    if (doesLineIntersectRectangle(line, bridge.bounds)) {
      console.log(`✅ Köprü tespit edildi: ${bridge.name} - Köprüyü kesen çizgi bulundu!`);
      return true;
    }
    return false;
  };
  
  // GeoJSON rotasındaki koordinatları kontrol ederek köprüleri tespit eder
  const detectBridgesOnRoute = (routeData: any) => {
    console.log("🔄 Rota verileri alındı, köprü tespiti başlatılıyor...");
    
    if (!routeData || !routeData.features || routeData.features.length === 0) {
      console.warn("⚠️ Rota verisi bulunamadı veya boş!");
      return [];
    }
    
    const foundBridges = new Set<string>();
    
    // Rota verilerindeki tüm çizgileri kontrol et
    routeData.features.forEach((feature: any, featureIndex: number) => {
      if (feature.geometry && feature.geometry.type === 'LineString') {
        const coordinates = feature.geometry.coordinates;
        console.log(`🔄 LineString bulundu, ${coordinates.length} koordinat içeriyor`);
        
        // Her köprü için çizginin kesişimini kontrol et
        BRIDGES.forEach(bridge => {
          if (doesLineIntersectBridge(coordinates, bridge)) {
            foundBridges.add(bridge.name);
            console.log(`💡 Rota üzerinde köprü bulundu: ${bridge.name}`);
          }
        });
      }
    });
    
    const bridges = Array.from(foundBridges);
    console.log(`📊 Tespit edilen köprüler (${bridges.length}):`, bridges);
    
    // Köprü tespit edilemediyse, boğaz geçişi olan rotalar için uyarı göster
    if (bridges.length === 0) {
      console.warn("⚠️ Rota üzerinde köprü tespit edilemedi!");
      
      // Rota İstanbul'un iki yakası arasında mı kontrol et
      const isEuropeanSide = (lng: number) => lng < 29.00; // Yaklaşık olarak boğazın batısı
      
      const startIsEuropean = isEuropeanSide(startLocation.lng);
      const endIsEuropean = isEuropeanSide(endLocation.lng);
      
      if (startIsEuropean !== endIsEuropean) {
        console.warn("🌉 Rota, boğazın iki yakası arasında geçiş içeriyor ama köprü tespit edilemedi!");
        
        // Boğaz geçişi olan rotalar için manuel köprü tespiti
        const possibleBridge = determinePossibleBridge(startLocation, endLocation);
        if (possibleBridge) {
          console.log(`🌉 Manuel tespit: Muhtemelen ${possibleBridge} kullanılıyor`);
          bridges.push(`${possibleBridge} (tahmini)`);
        }
      }
    }
    
    // Rotada kullanılan köprüleri boğaz geçişine göre görselleştir
    if (mapRef.current) {
      drawBridgesOnMap(bridges);
    }
    
    return bridges;
  };
  
  // Köprüleri haritada görselleştir
  const drawBridgesOnMap = (bridgeNames: string[]) => {
    if (!mapRef.current) return;
    
    // Eski köprü katmanlarını temizle
    mapRef.current.eachLayer((layer: CustomLayer) => {
      if (layer._bridgeMarker && mapRef.current) {
        mapRef.current.removeLayer(layer);
      }
    });
    
    // Tespit edilen köprüleri haritada göster
    bridgeNames.forEach(bridgeName => {
      const bridge = BRIDGES.find(b => b.name === bridgeName || bridgeName.includes(b.name));
      if (bridge && mapRef.current) {
        const center = {
          lat: (bridge.bounds.north + bridge.bounds.south) / 2,
          lng: (bridge.bounds.east + bridge.bounds.west) / 2
        };
        
        // Köprü alanını dikdörtgen olarak göster
        const bounds = [
          [bridge.bounds.south, bridge.bounds.west],
          [bridge.bounds.north, bridge.bounds.east]
        ];
        
        const rectangle = L.rectangle(bounds as L.LatLngBoundsExpression, {
          color: "#ff3366",
          weight: 2,
          opacity: 0.7,
          fill: true,
          fillColor: "#ff3366",
          fillOpacity: 0.3
        }).addTo(mapRef.current);
        
        rectangle.bindPopup(`<b>${bridge.name}</b>`);
        (rectangle as CustomLayer)._bridgeMarker = true;
        
        // Köprü ikonunu göster
        const bridgeIcon = L.divIcon({
          html: '🌉',
          className: 'bridge-icon',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });
        
        const marker = L.marker([center.lat, center.lng], {
          icon: bridgeIcon
        }).addTo(mapRef.current);
        
        marker.bindPopup(`<b>${bridge.name}</b>`);
        (marker as CustomLayer)._bridgeMarker = true;
      }
    });
  };
  
  // Başlangıç ve bitiş noktalarına göre hangi köprünün kullanılabileceğini tahmin eder
  const determinePossibleBridge = (start: {lat: number, lng: number}, end: {lat: number, lng: number}) => {
    // Başlangıç ve bitiş noktalarının kuzey-güney konumlarına göre hangi köprünün daha uygun olduğunu belirliyoruz
    const northernMost = Math.max(start.lat, end.lat);
    
    // Kuzeyde ise Yavuz Sultan Selim veya FSM Köprüsü
    if (northernMost > 41.08) {
      if (northernMost > 41.15) {
        return "Yavuz Sultan Selim Köprüsü";
      }
      return "Fatih Sultan Mehmet Köprüsü";
    }
    
    // Orta bölgede ise 15 Temmuz Şehitler (Boğaziçi) Köprüsü
    if (northernMost > 40.99) {
      return "15 Temmuz Şehitler Köprüsü (Boğaziçi Köprüsü)";
    }
    
    // Güneyde ise Avrasya Tüneli veya Marmaray
    return "Avrasya Tüneli veya Marmaray";
  };
  
  // Yeni rota hesaplamak için
  const calculateRoute = () => {
    console.log("🚗 Rota hesaplanıyor...");
    console.log("🚗 Başlangıç noktası:", startLocation);
    console.log("🚗 Bitiş noktası:", endLocation);
    
    if (!mapRef.current) {
      console.error("❌ Harita referansı bulunamadı!");
      return;
    }
    
    // Önceki rotayı temizle
    if (route) {
      console.log("🔄 Önceki rota temizleniyor...");
      mapRef.current.removeLayer(route);
    }
    
    // Önceki kontrolü kaldır
    if (controlRef.current) {
      console.log("🔄 Önceki köprü bilgisi kontrolü kaldırılıyor...");
      mapRef.current.removeControl(controlRef.current);
      controlRef.current = null;
    }

    const startPoint: [number, number] = [startLocation.lat, startLocation.lng];
    const endPoint: [number, number] = [endLocation.lat, endLocation.lng];
    
    // Markerleri güncelle
    console.log("📍 Markerler temizleniyor ve yenileri ekleniyor...");
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        // Marker köprü markeri değilse temizle
        const markerLayer = layer as CustomLayer;
        if (!markerLayer._bridgeMarker && mapRef.current) {
          mapRef.current.removeLayer(layer);
        }
      }
    });
    
    // Yeni markerleri ekle
    const startMarker = L.marker(startPoint).addTo(mapRef.current);
    startMarker.bindPopup("<b>Başlangıç Noktası</b>").openPopup();
    
    const endMarker = L.marker(endPoint).addTo(mapRef.current);
    endMarker.bindPopup("<b>Bitiş Noktası</b>");
    
    // Rota isteği yap
    const routeRequest = {
      coordinates: [
        [startLocation.lng, startLocation.lat], // OpenRouteService için (lon, lat) formatında
        [endLocation.lng, endLocation.lat],
      ],
      format: "geojson",
    };

    console.log("🌐 OpenRouteService API'ye istek gönderiliyor...", routeRequest);
    
    fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
      method: "POST",
      headers: {
        Authorization: "5b3ce3597851110001cf62484f7095854058404ead4a446b369ac2bc",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(routeRequest),
    })
      .then((res) => {
        console.log("🌐 API yanıt verdi, durum kodu:", res.status);
        return res.json();
      })
      .then((data) => {
        console.log("📄 Rota verisi alındı:", data);
        
        // Köprüleri tespit et
        const bridges = detectBridgesOnRoute(data);
        setDetectedBridges(bridges);
        
        // Köprü bilgisini popup'ta göster
        let popupContent = "";
        if (bridges.length > 0) {
          popupContent = `<b>Rota üzerindeki köprüler:</b><br/>` + 
            bridges.map(bridge => `- ${bridge}`).join('<br/>');
          console.log("📝 Köprü bilgisi popup içeriği oluşturuldu.");
        } else {
          popupContent = "<b>Rota üzerinde köprü bulunamadı.</b>";
          console.log("📝 Rota üzerinde köprü bulunamadı.");
        }
        
        // Özelleştirilmiş stil ile GeoJSON ekleme
        console.log("🗺️ Rota haritaya ekleniyor...");
        const newRoute = L.geoJSON(data, {
          style: {
            color: "#3388ff",
            weight: 6,
            opacity: 0.8,
            lineJoin: "round",
            lineCap: "round"
          },
          onEachFeature: (feature, layer) => {
            if (feature.properties && feature.properties.segments) {
              layer.bindPopup(popupContent);
            }
          }
        }).addTo(mapRef.current!);
        
        setRoute(newRoute);
        console.log("✅ Rota başarıyla haritaya eklendi.");

        // Tüm rotayı haritada göstermek için sınırlara yakınlaştır
        const bounds = L.latLngBounds([startPoint, endPoint]);
        mapRef.current?.fitBounds(bounds, { padding: [50, 50] });
        console.log("🔍 Harita görünümü ayarlandı.");
        
        // Eğer köprü varsa, bir bildirim göster
        if (bridges.length > 0) {
          console.log("📢 Köprü bilgisi paneli oluşturuluyor...");
          const bridgeInfo = document.createElement('div');
          bridgeInfo.className = 'bridge-info';
          bridgeInfo.innerHTML = `
            <div class="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded shadow-md mb-4">
              <p class="font-bold">Rota üzerinde ${bridges.length} köprü bulundu:</p>
              <ul class="mt-2">
                ${bridges.map(bridge => `<li>- ${bridge}</li>`).join('')}
              </ul>
            </div>
          `;
          
          // Bildirim kutusunu haritaya ekle
          const CustomControl = L.Control.extend({
            options: {
              position: 'bottomleft'
            },
            onAdd: function() {
              return bridgeInfo;
            }
          });
          
          // Yeni kontrolü ekle ve referansını tut
          const control = new CustomControl();
          if (mapRef.current) {
            mapRef.current.addControl(control);
            controlRef.current = control;
            console.log("✅ Köprü bilgisi paneli haritaya eklendi.");
          }
        }
      })
      .catch(error => {
        console.error("❌ Rota hesaplanırken bir hata oluştu:", error);
        alert("Rota hesaplanırken bir hata oluştu. Lütfen koordinatları kontrol edin.");
      });
  };
  
  // Her shouldCalculate değişiminde rotayı hesapla
  useEffect(() => {
    if (mapRef.current) {
      console.log("🔄 shouldCalculate değişti, rota yeniden hesaplanıyor...");
      calculateRoute();
    }
  }, [shouldCalculate, startLocation, endLocation]);
  
  useEffect(() => {
    if (mapRef.current !== null) return;
    
    // Başlangıçta haritayı oluştur
    console.log("🗺️ Harita başlatılıyor...");
    const map = L.map("map").setView([startLocation.lat, startLocation.lng], 13);
    mapRef.current = map;
    
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    console.log("✅ Harita başlatıldı, ilk rota hesaplanıyor...");
    // İlk rotayı hesapla
    calculateRoute();
      
    // Temizleme işlevi
    return () => {
      console.log("🧹 Harita temizleniyor...");
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex flex-col w-full h-full">
      <div id="map" className="w-full h-full rounded-lg shadow-md"></div>
      
      {detectedBridges.length > 0 && (
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded shadow-md mt-4">
          <p className="font-bold">Rota üzerinde {detectedBridges.length} köprü bulundu:</p>
          <ul className="mt-2">
            {detectedBridges.map((bridge, index) => (
              <li key={index}>- {bridge}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MapComponent; 