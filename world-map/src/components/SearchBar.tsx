import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchBarProps {
  countries: Array<{ id: string; name: string; capital: string; continent: string; flag: string }>;
  onSelectCountry: (id: string) => void;
}

export default function SearchBar({ countries, onSelectCountry }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<typeof countries>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter countries as user types
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const filtered = countries
      .filter((c) =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.capital.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 6); // Limit results to 6 for clean ui

    setResults(filtered);
  }, [query, countries]);

  // Handle clicking outside to close results dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (id: string, name: string) => {
    onSelectCountry(id);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
  };

  return (
    <div ref={containerRef} className="relative w-full z-30 font-sans">
      
      {/* Search Input Container */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-muted-foreground flex items-center pointer-events-none">
          <Search className="h-4.5 w-4.5 stroke-[2.5]" />
        </div>
        
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search country or capital..."
          className="w-full pl-11 pr-10 py-2.5 rounded-2xl border border-border bg-card/40 dark:bg-card/20 text-slate-800 dark:text-slate-100 placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/80 transition-all duration-300 text-sm shadow-sm"
        />

        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3.5 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-muted-foreground transition"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      <AnimatePresence>
        {isOpen && (query || results.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute w-full mt-2 rounded-2xl border border-border bg-background/95 dark:bg-zinc-950/95 backdrop-blur-lg shadow-premium dark:shadow-premium-dark max-h-80 overflow-y-auto z-50 overflow-hidden"
          >
            {results.length > 0 ? (
              <ul className="py-1.5 divide-y divide-border/20">
                {results.map((country) => (
                  <li key={country.id}>
                    <button
                      onClick={() => handleSelect(country.id, country.name)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent dark:hover:bg-accent/40 text-left transition-colors duration-200"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xl leading-none" role="img" aria-label={country.name}>
                          {country.flag}
                        </span>
                        <div>
                          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 block">
                            {country.name}
                          </span>
                          <span className="text-xs text-muted block">
                            Capital: {country.capital}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-2 py-0.5 rounded bg-accent/80 dark:bg-accent/30 border border-border/10">
                        {country.continent}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-8 px-4 text-center">
                <Globe className="h-8 w-8 text-muted-foreground/35 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
                  No countries match "{query}"
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
