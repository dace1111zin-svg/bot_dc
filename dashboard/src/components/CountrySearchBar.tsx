import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Globe } from 'lucide-react';

interface CountrySearchBarProps {
  countries: Array<{ id: string; name: string; capital: string; continent: string; flag: string }>;
  onSelectCountry: (id: string) => void;
}

export default function CountrySearchBar({ countries, onSelectCountry }: CountrySearchBarProps) {
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
      .slice(0, 6); // Limit results to 6 for clean UI

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

  const handleSelect = (id: string) => {
    onSelectCountry(id);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', zIndex: 40, fontFamily: "'Inter', sans-serif" }}>
      
      {/* Search Input Container */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        <div style={{ position: 'absolute', left: '14px', color: '#64748b', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
          <Search className="h-4 w-4 stroke-[2.5]" />
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
          style={{
            width: '100%',
            padding: '10px 36px 10px 40px',
            borderRadius: '14px',
            border: '2px solid var(--line)',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            fontSize: '13px',
            fontWeight: 600,
            outline: 'none',
            boxShadow: '2px 2px 0px var(--line)',
            boxSizing: 'border-box'
          }}
        />

        {query && (
          <button
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: '12px',
              border: 'none',
              background: 'none',
              padding: '4px',
              borderRadius: '50%',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (query || results.length > 0) && (
        <div
          style={{
            position: 'absolute',
            width: '100%',
            marginTop: '8px',
            borderRadius: '16px',
            border: '2px solid var(--line)',
            backgroundColor: '#ffffff',
            boxShadow: '3px 3px 0px var(--line)',
            maxHeight: '280px',
            overflowY: 'auto',
            zIndex: 50,
            boxSizing: 'border-box'
          }}
          className="custom-scrollbar"
        >
          {results.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {results.map((country) => (
                <li key={country.id} style={{ borderBottom: '1px solid rgba(10, 10, 10, 0.05)' }}>
                  <button
                    onClick={() => handleSelect(country.id)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(10, 10, 10, 0.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px', lineHeight: 1 }} role="img" aria-label={country.name}>
                        {country.flag}
                      </span>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', display: 'block' }}>
                          {country.name}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '1px' }}>
                          Capital: {country.capital}
                        </span>
                      </div>
                    </div>
                    <span 
                      style={{
                        fontSize: '9px',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        color: '#64748b',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(10, 10, 10, 0.04)',
                        border: '1px solid rgba(10, 10, 10, 0.05)'
                      }}
                    >
                      {country.continent}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ padding: '24px 16px', textAlign: 'center' }}>
              <Globe className="h-8 w-8 text-slate-300 mx-auto mb-2" style={{ strokeWidth: 1.5 }} />
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', margin: 0 }}>
                No countries match "{query}"
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
