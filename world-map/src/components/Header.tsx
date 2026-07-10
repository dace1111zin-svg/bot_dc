import React from 'react';
import { Compass, Users, Globe2 } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

interface HeaderProps {
  totalCountries: number;
  totalPopulation: number;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  children?: React.ReactNode; // For embedding SearchBar
}

export default function Header({ 
  totalCountries, 
  totalPopulation, 
  darkMode, 
  setDarkMode,
  children 
}: HeaderProps) {
  
  // Format population to billons or millions for stats counter
  const formatPopulation = (num: number) => {
    if (num >= 1e9) {
      return `${(num / 1e9).toFixed(2)}B`;
    }
    return `${(num / 1e6).toFixed(1)}M`;
  };

  return (
    <header className="w-full h-20 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between transition-colors duration-300">
      {/* Branding Logo */}
      <div className="flex items-center space-x-2.5">
        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/10 flex items-center justify-center border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-sm animate-pulse-slow">
          <Compass className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight font-sans text-slate-900 dark:text-white leading-none">
            Globalise
          </h1>
          <span className="text-xs text-muted font-medium tracking-wide">
            4K INTERACTIVE ATLAS
          </span>
        </div>
      </div>

      {/* Center Search Input */}
      <div className="flex-1 max-w-md mx-6 hidden md:block">
        {children}
      </div>

      {/* Right-side Stats Counter & Actions */}
      <div className="flex items-center space-x-6">
        {/* World Statistics Indicators (Desktop only) */}
        <div className="hidden lg:flex items-center space-x-5 text-sm">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-accent/50 border border-border/40">
            <Globe2 className="h-4 w-4 text-emerald-500" />
            <span className="text-muted text-xs">Countries:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {totalCountries || 240}
            </span>
          </div>
          
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-accent/50 border border-border/40">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-muted text-xs">Population:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {totalPopulation ? formatPopulation(totalPopulation) : "7.9B"}
            </span>
          </div>
        </div>

        {/* Theme Toggle */}
        <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
      </div>
    </header>
  );
}
