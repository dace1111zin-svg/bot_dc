import { useState, useEffect, useRef } from 'react';
import { LeaderboardEntry } from './LeaderboardBoard';
import WorldMapPremium from './WorldMapPremium';
import CountryInfoCard from './CountryInfoCard';
import CountrySearchBar from './CountrySearchBar';
import PremiumMapControls from './PremiumMapControls';
import CambodiaSVGMap from './CambodiaSVGMap';
import ProvinceInfoCard from './ProvinceInfoCard';
import { fallbackCountries, CountryData } from '../data/countries-data';
import { cambodiaProvinces, ProvinceData } from '../data/cambodia-provinces-data';

interface LeafletMapProps {
  entries: LeaderboardEntry[];
  activeCat: 'time' | 'money' | 'iq';
  onOpenRegisterLocation: () => void;
}

interface UserLocation {
  user_id: string;
  name: string;
  avatar_url: string;
  latitude: number;
  longitude: number;
}

export default function LeafletMap({
  entries,
  activeCat,
  onOpenRegisterLocation
}: LeafletMapProps) {
  // Map switcher state ('world' | 'cambodia')
  const [mapType, setMapType] = useState<'world' | 'cambodia'>('world');

  // Shared User Pinned Locations state
  const [pinnedUsers, setPinnedUsers] = useState<UserLocation[]>([]);

  // Premium World Map states
  const [countriesMap, setCountriesMap] = useState<Record<string, CountryData>>(fallbackCountries);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [selectedCountryData, setSelectedCountryData] = useState<CountryData | null>(null);
  const [worldViewport, setWorldViewport] = useState<{ center: [number, number]; zoom: number }>({
    center: [10, 15],
    zoom: 1
  });

  // Cambodia SVG Map states
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null);
  const [selectedProvinceData, setSelectedProvinceData] = useState<ProvinceData | null>(null);
  
  const animationRef = useRef<number | null>(null);

  // Fetch full countries database from REST Countries API on mount
  useEffect(() => {
    const fetchCountriesData = async () => {
      try {
        const response = await fetch('https://restcountries.com/v3.1/all');
        if (!response.ok) throw new Error('Failed to fetch stats');
        
        const data = await response.json();
        
        const apiMap = data.reduce((acc: Record<string, CountryData>, item: any) => {
          const numericId = item.ccn3 || ""; // TopoJSON uses numeric ccn3 strings
          if (!numericId) return acc;

          let currencyStr = "N/A";
          if (item.currencies) {
            const keys = Object.keys(item.currencies);
            if (keys.length > 0) {
              const curr = item.currencies[keys[0]];
              currencyStr = `${curr.name} (${curr.symbol || keys[0]})`;
            }
          }

          let langStr = "N/A";
          if (item.languages) {
            langStr = Object.values(item.languages).join(", ");
          }

          let callingCode = "N/A";
          if (item.idd && item.idd.root) {
            const suffix = item.idd.suffixes && item.idd.suffixes.length > 0 ? item.idd.suffixes[0] : "";
            callingCode = `${item.idd.root}${suffix}`;
          }

          // Projection coordinates order: Longitude, Latitude for react-simple-maps
          const coords: [number, number] = item.latlng && item.latlng.length === 2 
            ? [item.latlng[1], item.latlng[0]] 
            : [0, 0];

          let dynamicZoom = 6;
          if (item.area > 5000000) dynamicZoom = 1.6;
          else if (item.area > 1500000) dynamicZoom = 2.4;
          else if (item.area > 500000) dynamicZoom = 3.5;
          else if (item.area > 150000) dynamicZoom = 4.8;

          acc[numericId] = {
            id: numericId,
            iso2: (item.cca2 || "").toLowerCase(),
            name: item.name.common || "Unknown",
            officialName: item.name.official || "Unknown",
            flag: item.flag || "🏳️",
            flagUrl: item.flags.svg || item.flags.png || `https://flagcdn.com/${(item.cca2 || "").toLowerCase()}.svg`,
            capital: item.capital && item.capital.length > 0 ? item.capital[0] : "N/A",
            population: item.population || 0,
            currency: currencyStr,
            area: item.area || 0,
            continent: item.continents && item.continents.length > 0 ? item.continents[0] : "N/A",
            language: langStr,
            timezone: item.timezones && item.timezones.length > 0 ? item.timezones[0] : "UTC+00:00",
            domain: item.tld && item.tld.length > 0 ? item.tld[0] : ".com",
            callingCode: callingCode,
            coordinates: coords,
            zoomLevel: dynamicZoom
          };
          return acc;
        }, {} as Record<string, CountryData>);

        // Merge and preserve custom coordinates defined in fallback countries (especially Cambodia)
        setCountriesMap((prev) => ({
          ...apiMap,
          ...fallbackCountries
        }));
      } catch (err) {
        console.warn("REST Countries API offline, using fallback country DB profiles.", err);
      }
    };

    fetchCountriesData();
    fetchLocationsData();
  }, []);

  // Fetch pinned locations database
  const fetchLocationsData = async () => {
    try {
      const res = await fetch('/api/public/locations');
      const data = await res.json();
      if (data && data.locations) {
        setPinnedUsers(data.locations);
      }
    } catch (err) {
      console.error("Fetch pinned locations error:", err);
    }
  };

  // Interpolate camera positioning transitions (Zoom & Center coordinates)
  const flyTo = (targetCoords: [number, number], targetZoom: number) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const duration = 850; 
    const startCoords = [...worldViewport.center] as [number, number];
    const startZoom = worldViewport.zoom;
    let startTime: number | null = null;

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = easeOutCubic(progress);

      const nextLng = startCoords[0] + (targetCoords[0] - startCoords[0]) * eased;
      const nextLat = startCoords[1] + (targetCoords[1] - startCoords[1]) * eased;
      const nextZoom = startZoom + (targetZoom - startZoom) * eased;

      setWorldViewport({
        center: [nextLng, nextLat],
        zoom: nextZoom
      });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  // Viewport updates from direct map pans/scrolls
  const handleMapMove = (position: { coordinates: [number, number]; zoom: number }) => {
    if (!animationRef.current) {
      setWorldViewport({
        center: position.coordinates,
        zoom: position.zoom
      });
    }
  };

  // Country Selection Trigger
  const handleCountrySelection = (id: string) => {
    const data = countriesMap[id];
    if (data) {
      setSelectedCountryId(id);
      setSelectedCountryData(data);
      flyTo(data.coordinates, data.zoomLevel);
    }
  };

  const handleCloseCountryCard = () => {
    setSelectedCountryId(null);
    setSelectedCountryData(null);
  };

  // Cambodia Province Selection Trigger
  const handleProvinceSelection = (id: string) => {
    const data = cambodiaProvinces[id];
    if (data) {
      setSelectedProvinceId(id);
      setSelectedProvinceData(data);
    }
  };

  const handleCloseProvinceCard = () => {
    setSelectedProvinceId(null);
    setSelectedProvinceData(null);
  };

  // Helper to resolve nearest province for coordinate pins
  const getProvinceForCoordinates = (lat: number, lng: number): string => {
    let nearestProvinceId = "phnom-penh";
    let minDistance = Infinity;

    Object.entries(cambodiaProvinces).forEach(([id, province]) => {
      const [pLat, pLng] = province.coordinates;
      // standard Euclidean distance for simple map resolution
      const distance = Math.sqrt(Math.pow(lat - pLat, 2) + Math.pow(lng - pLng, 2));
      if (distance < minDistance) {
        minDistance = distance;
        nearestProvinceId = id;
      }
    });

    return nearestProvinceId;
  };

  // Filters pinned users in selected province
  const getProvinceUsers = (provinceId: string) => {
    return pinnedUsers.filter(user => getProvinceForCoordinates(user.latitude, user.longitude) === provinceId);
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(worldViewport.zoom * 1.4, 12);
    flyTo(worldViewport.center, newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(worldViewport.zoom / 1.4, 1);
    flyTo(worldViewport.center, newZoom);
  };

  const handleResetView = () => {
    handleCloseCountryCard();
    flyTo([10, 15], 1);
  };

  return (
    <div id="global-inflation-map-content" className="nb-map-card fade-in-up">
      <div className="nb-map-header">
        <div>
          <h2 className="nb-map-title">
            {mapType === 'world' ? '🌎 Global Inflation Map' : '🇰🇭 Cambodia Provincial Vector Map'}
          </h2>
          <p className="nb-map-subtitle">
            {mapType === 'world' 
              ? 'Interactive heatmap tracking CPI inflation rates across major global economies.' 
              : 'Interactive vector outline map showcasing subnational province boundaries and user pin locations.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="nb-map-badge" 
            style={{ 
              cursor: 'pointer', 
              background: mapType === 'world' ? 'var(--violet)' : '#ffffff', 
              color: mapType === 'world' ? 'white' : 'var(--text)' 
            }} 
            onClick={() => setMapType('world')}
          >
            World Map
          </button>
          <button 
            className="nb-map-badge" 
            style={{ 
              cursor: 'pointer', 
              background: mapType === 'cambodia' ? 'var(--violet)' : '#ffffff', 
              color: mapType === 'cambodia' ? 'white' : 'var(--text)' 
            }} 
            onClick={() => setMapType('cambodia')}
          >
            Cambodia Map
          </button>
          {mapType === 'cambodia' && (
            <button 
              className="nb-map-badge" 
              style={{ cursor: 'pointer', background: '#fffdeb', color: 'var(--text)' }} 
              onClick={onOpenRegisterLocation}
            >
              📍 Pin Me
            </button>
          )}
        </div>
      </div>

      <div className="nb-map-grid">
        {/* Map visualization container */}
        <div 
          className="nb-map-viz" 
          style={{ 
            padding: '10px', 
            overflow: 'hidden', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            position: 'relative',
            background: '#ffffff',
            borderRadius: '16px',
            border: '2px solid var(--line)',
            minHeight: '350px'
          }}
        >
          {mapType === 'world' ? (
            <>
              {/* Floating Autocomplete Search Bar */}
              <div style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', zIndex: 30, maxWidth: '280px' }}>
                <CountrySearchBar
                  countries={Object.values(countriesMap).map((c) => ({
                    id: c.id,
                    name: c.name,
                    capital: c.capital,
                    continent: c.continent,
                    flag: c.flag
                  }))}
                  onSelectCountry={handleCountrySelection}
                />
              </div>

              {/* D3 Composable World Map Canvas */}
              <WorldMapPremium
                selectedCountryId={selectedCountryId}
                onCountryClick={(id) => handleCountrySelection(id)}
                center={worldViewport.center}
                zoom={worldViewport.zoom}
                onMoveEnd={handleMapMove}
              />

              {/* Floating Zoom & Reset Control deck */}
              <PremiumMapControls
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onReset={handleResetView}
              />

              {/* Floating glassmorphic Country Details Profile Card */}
              {selectedCountryData && (
                <CountryInfoCard
                  country={selectedCountryData}
                  onClose={handleCloseCountryCard}
                />
              )}
            </>
          ) : (
            <>
              {/* Interactive SVG Cambodia Province Map */}
              <CambodiaSVGMap
                selectedProvinceId={selectedProvinceId}
                onProvinceClick={(id) => handleProvinceSelection(id)}
                pinnedUsers={pinnedUsers}
              />

              {/* Floating glassmorphic Province Details Card */}
              {selectedProvinceData && (
                <ProvinceInfoCard
                  province={selectedProvinceData}
                  pinnedUsers={getProvinceUsers(selectedProvinceData.id)}
                  onClose={handleCloseProvinceCard}
                />
              )}
            </>
          )}
        </div>

        {/* Sidebar Checklist (Linked dynamically to Map Selection) */}
        <div className="nb-map-list">
          {mapType === 'world' ? (
            <>
              <div 
                className="nb-map-list-item" 
                onClick={() => handleCountrySelection("840")} 
                style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(10,10,10,0.03)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div className="nb-map-country">
                  <span className="nb-map-flag">🇺🇸</span>
                  <div>
                    <span className="nb-map-cname">United States</span>
                    <span className="nb-map-cdetail">CPI (YoY)</span>
                  </div>
                </div>
                <span className="nb-map-cval" style={{ color: '#10b981' }}>2.4%</span>
              </div>
              <div 
                className="nb-map-list-item" 
                onClick={() => handleCountrySelection("276")} 
                style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(10,10,10,0.03)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div className="nb-map-country">
                  <span className="nb-map-flag">🇪🇺</span>
                  <div>
                    <span className="nb-map-cname">Euro Area</span>
                    <span className="nb-map-cdetail">CPI (YoY)</span>
                  </div>
                </div>
                <span className="nb-map-cval" style={{ color: '#10b981' }}>1.9%</span>
              </div>
              <div 
                className="nb-map-list-item" 
                onClick={() => handleCountrySelection("392")} 
                style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(10,10,10,0.03)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div className="nb-map-country">
                  <span className="nb-map-flag">🇯🇵</span>
                  <div>
                    <span className="nb-map-cname">Japan</span>
                    <span className="nb-map-cdetail">CPI (YoY)</span>
                  </div>
                </div>
                <span className="nb-map-cval" style={{ color: '#10b981' }}>2.1%</span>
              </div>
              <div 
                className="nb-map-list-item" 
                onClick={() => handleCountrySelection("116")} 
                style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(10,10,10,0.03)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div className="nb-map-country">
                  <span className="nb-map-flag">🇰🇭</span>
                  <div>
                    <span className="nb-map-cname">Cambodia</span>
                    <span className="nb-map-cdetail">CPI (YoY)</span>
                  </div>
                </div>
                <span className="nb-map-cval" style={{ color: '#f59e0b' }}>3.2%</span>
              </div>
            </>
          ) : (
            <>
              {/* Top Provinces Sidebar list */}
              <div 
                className="nb-map-list-item" 
                onClick={() => handleProvinceSelection("phnom-penh")} 
                style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(10,10,10,0.03)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div className="nb-map-country">
                  <span className="nb-map-flag">🏙️</span>
                  <div>
                    <span className="nb-map-cname">Phnom Penh</span>
                    <span className="nb-map-cdetail">Capital City</span>
                  </div>
                </div>
                <span className="nb-map-cval" style={{ color: 'var(--violet)' }}>
                  {getProvinceUsers("phnom-penh").length} pins
                </span>
              </div>
              <div 
                className="nb-map-list-item" 
                onClick={() => handleProvinceSelection("siem-reap")} 
                style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(10,10,10,0.03)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div className="nb-map-country">
                  <span className="nb-map-flag">🛕</span>
                  <div>
                    <span className="nb-map-cname">Siem Reap</span>
                    <span className="nb-map-cdetail">Angkor Wat Hub</span>
                  </div>
                </div>
                <span className="nb-map-cval" style={{ color: 'var(--violet)' }}>
                  {getProvinceUsers("siem-reap").length} pins
                </span>
              </div>
              <div 
                className="nb-map-list-item" 
                onClick={() => handleProvinceSelection("battambang")} 
                style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(10,10,10,0.03)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div className="nb-map-country">
                  <span className="nb-map-flag">🌾</span>
                  <div>
                    <span className="nb-map-cname">Battambang</span>
                    <span className="nb-map-cdetail">Northwest Hub</span>
                  </div>
                </div>
                <span className="nb-map-cval" style={{ color: 'var(--violet)' }}>
                  {getProvinceUsers("battambang").length} pins
                </span>
              </div>
              <div 
                className="nb-map-list-item" 
                onClick={() => handleProvinceSelection("preah-sihanouk")} 
                style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(10,10,10,0.03)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div className="nb-map-country">
                  <span className="nb-map-flag">🌊</span>
                  <div>
                    <span className="nb-map-cname">Preah Sihanouk</span>
                    <span className="nb-map-cdetail">Deep Sea Coast</span>
                  </div>
                </div>
                <span className="nb-map-cval" style={{ color: 'var(--violet)' }}>
                  {getProvinceUsers("preah-sihanouk").length} pins
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
