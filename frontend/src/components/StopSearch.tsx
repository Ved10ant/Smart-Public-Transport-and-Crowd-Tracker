import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin, Loader2 } from 'lucide-react';
import { Stop, fetchStops } from '../api/client.js';

interface StopSearchProps {
  onSelectStop: (stop: Stop) => void;
  selectedStopId?: string;
}

export const StopSearch: React.FC<StopSearchProps> = ({ onSelectStop }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Stop[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const stops = await fetchStops(searchTerm.trim());
        setResults(stops);
        setIsOpen(true);
      } catch (err) {
        console.error('Failed to search stops:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-md z-20">
      <div className="relative flex items-center">
        <div className="absolute left-3 text-slate-400 pointer-events-none">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder="Search bus stop (e.g., Dadar, CSMT, Andheri, BKC)..."
          className="w-full pl-9 pr-9 py-2.5 bg-slate-900/90 text-sm text-slate-100 placeholder-slate-400 rounded-xl border border-slate-700/70 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 shadow-xl backdrop-blur-md transition-all"
        />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('');
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-3 text-slate-400 hover:text-white p-0.5 rounded-full hover:bg-slate-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-800/80">
          {results.map((stop) => (
            <button
              key={stop.stop_id}
              onClick={() => {
                onSelectStop(stop);
                setIsOpen(false);
                setSearchTerm(stop.name);
              }}
              className="w-full px-4 py-3 text-left hover:bg-rose-500/10 flex items-center justify-between group transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-200 group-hover:text-white">
                    {stop.name}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    ID: {stop.stop_id}
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 group-hover:text-rose-400 font-mono">
                {stop.lat.toFixed(4)}, {stop.lon.toFixed(4)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
