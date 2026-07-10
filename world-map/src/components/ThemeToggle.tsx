import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export default function ThemeToggle({ darkMode, setDarkMode }: ThemeToggleProps) {
  const toggleTheme = () => {
    const newVal = !darkMode;
    setDarkMode(newVal);
    
    // Toggle standard tailwind 'dark' class on HTML document
    if (newVal) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-full border border-border bg-card/60 backdrop-blur-md shadow-sm hover:bg-accent hover:text-accent-foreground transition-all duration-300 relative overflow-hidden group focus:outline-none"
      title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle Theme"
      id="theme-toggle-btn"
    >
      <motion.div
        initial={false}
        animate={{ y: darkMode ? 40 : 0, opacity: darkMode ? 0 : 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="text-amber-500"
      >
        <Sun className="h-[20px] w-[20px]" />
      </motion.div>

      <motion.div
        initial={false}
        animate={{ y: darkMode ? 0 : -40, opacity: darkMode ? 1 : 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 m-auto h-[20px] w-[20px] text-blue-400"
      >
        <Moon className="h-[20px] w-[20px]" />
      </motion.div>
    </button>
  );
}
