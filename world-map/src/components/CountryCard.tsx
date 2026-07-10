import { motion } from 'framer-motion';
import { X, Landmark, Users, Map, Globe, Languages, Clock, Hash, Link } from 'lucide-react';
import { CountryData } from '../data/fallback-countries';

interface CountryCardProps {
  country: CountryData | null;
  onClose: () => void;
}

export default function CountryCard({ country, onClose }: CountryCardProps) {
  if (!country) return null;

  // Format large numbers cleanly
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const statItems = [
    {
      label: "Capital City",
      value: country.capital || "N/A",
      icon: <Landmark className="h-4 w-4 text-emerald-500" />
    },
    {
      label: "Population",
      value: formatNumber(country.population),
      icon: <Users className="h-4 w-4 text-blue-500" />
    },
    {
      label: "Area (Sq Km)",
      value: `${formatNumber(country.area)} km²`,
      icon: <Map className="h-4 w-4 text-amber-500" />
    },
    {
      label: "Continent",
      value: country.continent,
      icon: <Globe className="h-4 w-4 text-purple-500" />
    },
    {
      label: "Official Language",
      value: country.language,
      icon: <Languages className="h-4 w-4 text-pink-500" />
    },
    {
      label: "Currency",
      value: country.currency,
      icon: <span className="text-sm font-bold text-sky-500 leading-none">$</span>
    },
    {
      label: "Time Zone",
      value: country.timezone,
      icon: <Clock className="h-4 w-4 text-teal-500" />
    },
    {
      label: "Internet Domain",
      value: country.domain,
      icon: <Link className="h-4 w-4 text-indigo-500" />
    },
    {
      label: "Calling Code",
      value: country.callingCode,
      icon: <Hash className="h-4 w-4 text-rose-500" />
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -340 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -340 }}
      transition={{ type: 'spring', damping: 25, stiffness: 120 }}
      className="absolute top-6 left-6 w-[340px] md:w-[360px] max-h-[calc(100%-48px)] z-30 flex flex-col rounded-[20px] glass-panel shadow-premium dark:shadow-premium-dark overflow-hidden font-sans border border-border"
      id="country-info-card"
    >
      {/* Banner / Flag section */}
      <div className="relative h-44 bg-slate-100 dark:bg-zinc-900 overflow-hidden flex items-center justify-center border-b border-border">
        {/* Transparent blurred background flag for aesthetic texture */}
        <div 
          className="absolute inset-0 bg-cover bg-center filter blur-xl opacity-20 scale-125 select-none pointer-events-none"
          style={{ backgroundImage: `url(${country.flagUrl})` }}
        />
        
        {/* SVG Flag */}
        <img
          src={country.flagUrl}
          alt={`Flag of ${country.name}`}
          className="h-24 rounded-lg shadow-md border border-border/20 z-10 transition-transform duration-300 hover:scale-105 select-none pointer-events-none"
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 transition-colors z-20 focus:outline-none"
          title="Close profile"
          aria-label="Close Profile"
        >
          <X className="h-4 w-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Profile Details Content (Scrollable) */}
      <div className="p-5 overflow-y-auto flex-1 space-y-4">
        {/* Names */}
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
            {country.name}
          </h2>
          <p className="text-xs text-muted font-medium mt-0.5 leading-none">
            {country.officialName}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-2.5 pt-2">
          {statItems.map((stat, idx) => (
            <div 
              key={idx} 
              className="flex items-center space-x-3.5 px-3 py-2.5 rounded-xl bg-accent/40 dark:bg-accent/15 border border-border/20 hover:border-border/60 transition-colors duration-200"
            >
              <div className="h-8 w-8 rounded-lg bg-background dark:bg-zinc-800 border border-border/40 shadow-sm flex items-center justify-center shrink-0">
                {stat.icon}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold leading-none">
                  {stat.label}
                </span>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-1 block truncate">
                  {stat.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
