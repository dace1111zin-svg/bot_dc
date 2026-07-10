import { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import SearchBar from './components/SearchBar';
import MapControls from './components/MapControls';
import CountryCard from './components/CountryCard';
import WorldMap from './components/WorldMap';
import { fallbackCountries, CountryData } from './data/fallback-countries';
import { Globe, RefreshCw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function App() {
  // App States
  const [countriesMap, setCountriesMap] = useState<Record<string, CountryData>>(fallbackCountries);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [selectedCountryData, setSelectedCountryData] = useState<CountryData | null>(null);
  const [hoveredCoordinates, setHoveredCoordinates] = useState<[number, number] | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);

  // Map Viewport state (Zoom and Center coordinates)
  const [viewport, setViewport] = useState<{ center: [number, number]; zoom: number }>({
    center: [0, 0],
    zoom: 1
  });

  const appContainerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  // Stats summaries
  const countriesArray = Object.values(countriesMap);
  const totalCountries = countriesArray.length;
  const totalPopulation = countriesArray.reduce((acc, curr) => acc + (curr.population || 0), 0);

  // Simulate progress bar loading
  useEffect(() => {
    let progressTimer = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 85) {
          clearInterval(progressTimer);
          return 85;
        }
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 150);

    return () => clearInterval(progressTimer);
  }, []);

  // Fetch full countries data from REST Countries API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('https://restcountries.com/v3.1/all');
        if (!response.ok) throw new Error('Network error fetching stats');
        
        const data = await response.json();
        
        // Map REST Countries response to our structured database schema
        const apiMap = data.reduce((acc: Record<string, CountryData>, item: any) => {
          const numericId = item.ccn3 || ""; // TopoJSON uses numeric ID string
          if (!numericId) return acc;

          // Format Currencies
          let currencyStr = "N/A";
          if (item.currencies) {
            const keys = Object.keys(item.currencies);
            if (keys.length > 0) {
              const curr = item.currencies[keys[0]];
              currencyStr = `${curr.name} (${curr.symbol || keys[0]})`;
            }
          }

          // Format Languages
          let langStr = "N/A";
          if (item.languages) {
            langStr = Object.values(item.languages).join(", ");
          }

          // Format Calling Code
          let callingCode = "N/A";
          if (item.idd && item.idd.root) {
            const suffix = item.idd.suffixes && item.idd.suffixes.length > 0 ? item.idd.suffixes[0] : "";
            callingCode = `${item.idd.root}${suffix}`;
          }

          // Reverse coordinates order from REST [lat, lng] to react-simple-maps D3 projection [lng, lat]
          const coords: [number, number] = item.latlng && item.latlng.length === 2 
            ? [item.latlng[1], item.latlng[0]] 
            : [0, 0];

          // Area sizes trigger dynamic default zoom factor
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

        // Merge API data over our local fallbacks (ensuring Cambodia coordinates remain optimized)
        setCountriesMap((prev) => ({
          ...apiMap,
          ...fallbackCountries // keeps fine-tuned local coordinates and styling safe
        }));
      } catch (err) {
        console.warn("Using offline fallback country profile database.", err);
      } finally {
        setLoadingProgress(100);
        setTimeout(() => {
          setLoading(false);
        }, 300);
      }
    };

    fetchData();
  }, []);

  // Smooth flight path interpolation camera controls (Zoom & Coordinates)
  const flyTo = (targetCoords: [number, number], targetZoom: number) => {
    // Cancel any active transitions
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const duration = 800; // Transition duration in milliseconds
    const startCoords = [...viewport.center];
    const startZoom = viewport.zoom;
    let startTime: number | null = null;

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = easeOutCubic(progress);

      const nextLng = startCoords[0] + (targetCoords[0] - startCoords[0]) * eased;
      const nextLat = startCoords[1] + (targetCoords[1] - startCoords[1]) * eased;
      const nextZoom = startZoom + (targetZoom - startZoom) * eased;

      setViewport({
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
    // Only update directly if no flying animation is active
    if (!animationRef.current) {
      setViewport({
        center: position.coordinates,
        zoom: position.zoom
      });
    }
  };

  // Click handler inspect trigger
  const handleCountrySelection = (id: string, name: string) => {
    const data = countriesMap[id];
    
    if (data) {
      setSelectedCountryId(id);
      setSelectedCountryData(data);
      // Pan and zoom camera to country coordinates center
      flyTo(data.coordinates, data.zoomLevel);
    } else {
      // Create a dynamic profile card if country metadata doesn't exist
      const fallbackData: CountryData = {
        id,
        iso2: "",
        name,
        officialName: name,
        flag: "🏳️",
        flagUrl: "",
        capital: "N/A",
        population: 0,
        currency: "N/A",
        area: 0,
        continent: "N/A",
        language: "N/A",
        timezone: "UTC+00:00",
        domain: "N/A",
        callingCode: "N/A",
        coordinates: [0, 0],
        zoomLevel: 4
      };
      setSelectedCountryId(id);
      setSelectedCountryData(fallbackData);
    }
  };

  // Card close/deselect
  const handleCloseCard = () => {
    setSelectedCountryId(null);
    setSelectedCountryData(null);
  };

  // Button Deck actions
  const handleZoomIn = () => {
    const newZoom = Math.min(viewport.zoom * 1.4, 12);
    flyTo(viewport.center, newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(viewport.zoom / 1.4, 1);
    flyTo(viewport.center, newZoom);
  };

  const handleResetView = () => {
    handleCloseCard();
    flyTo([0, 0], 1);
  };

  // Fullscreen support
  const handleToggleFullscreen = () => {
    if (!appContainerRef.current) return;

    if (!document.fullscreenElement) {
      appContainerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error("Fullscreen request failed", err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  // Update fullscreen state listener when user exits using Escape
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  return (
    <div 
      ref={appContainerRef}
      className="flex flex-col min-h-screen relative overflow-hidden transition-colors duration-300 select-none bg-background text-foreground fullscreen-container font-sans"
    >
      {/* 1. Global Loading Overlay Screen */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-white dark:bg-zinc-950 flex flex-col items-center justify-center z-50 pointer-events-auto"
          >
            <div className="flex flex-col items-center space-y-6 max-w-sm w-full px-8 text-center">
              {/* Spinner */}
              <div className="relative h-16 w-16 flex items-center justify-center">
                <RefreshCw className="h-10 w-10 text-emerald-500 animate-spin" />
                <Globe className="absolute h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">
                  Loading Atlas Database...
                </h2>
                <p className="text-xs text-muted font-medium">
                  Configuring 4K geographic maps & stats
                </p>
              </div>

              {/* Progress Bar container */}
              <div className="w-full h-1.5 bg-slate-100 dark:bg-zinc-900 rounded-full overflow-hidden border border-border/10">
                <motion.div
                  className="h-full bg-emerald-500 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${loadingProgress}%` }}
                  transition={{ ease: "easeInOut" }}
                />
              </div>
              <span className="text-[10px] text-muted font-bold font-mono">
                {loadingProgress}%
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Top Header Navigation */}
      <Header
        totalCountries={totalCountries}
        totalPopulation={totalPopulation}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      >
        <SearchBar
          countries={countriesArray.map((c) => ({
            id: c.id,
            name: c.name,
            capital: c.capital,
            continent: c.continent,
            flag: c.flag
          }))}
          onSelectCountry={(id) => handleCountrySelection(id, countriesMap[id]?.name || "")}
        />
      </Header>

      {/* 3. Main Workspace Map Canvas */}
      <main className="flex-1 relative w-full h-[calc(100vh-128px)] overflow-hidden bg-slate-50 dark:bg-zinc-900/60 transition-colors duration-300">
        
        {/* Vector SVG World Map Layer */}
        <WorldMap
          selectedCountryId={selectedCountryId}
          onCountryClick={handleCountrySelection}
          center={viewport.center}
          zoom={viewport.zoom}
          onMoveEnd={handleMapMove}
          onHoverCoordinates={setHoveredCoordinates}
          darkMode={darkMode}
        />

        {/* Reusable Autocomplete Search Overlay for Mobile */}
        <div className="absolute top-4 left-6 right-6 md:hidden z-30">
          <SearchBar
            countries={countriesArray.map((c) => ({
              id: c.id,
              name: c.name,
              capital: c.capital,
              continent: c.continent,
              flag: c.flag
            }))}
            onSelectCountry={(id) => handleCountrySelection(id, countriesMap[id]?.name || "")}
          />
        </div>

        {/* Floating Detailed Profile Card */}
        <AnimatePresence>
          {selectedCountryData && (
            <CountryCard
              country={selectedCountryData}
              onClose={handleCloseCard}
            />
          )}
        </AnimatePresence>

        {/* Map Control deck floating overlay */}
        <MapControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleResetView}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
        />
      </main>

      {/* 4. Bottom Footer Coordinates Telemetry */}
      <Footer
        hoveredCoordinates={hoveredCoordinates}
        selectedCountryName={selectedCountryData ? selectedCountryData.name : null}
      />
    </div>
  );
}
