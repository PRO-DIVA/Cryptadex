import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { dataService, type InsiderRecord } from '../services/dataService';

export default function DashboardLayout() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [insidersMap, setInsidersMap] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchMapping() {
      try {
        const mapping = await dataService.getUserMapping();
        setInsidersMap(mapping);
      } catch {
        // Fallback: try insiders endpoint for partial mapping
        try {
          const insiders = await dataService.getInsiders();
          const map: Record<string, string> = {};
          insiders.forEach((i: InsiderRecord) => {
            if (i.user && i.original_user) map[i.user] = i.original_user;
          });
          setInsidersMap(map);
        } catch {
          setInsidersMap({});
        }
      }
    }

    fetchMapping();
  }, []);

  const outletContext = useMemo(
    () => ({ searchQuery, setSearchQuery, insidersMap }),
    [searchQuery, insidersMap]
  );

  const handleScanClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      await dataService.scanCSV(file);
      // Refreshing the page to reload all data across all components
      window.location.reload();
    } catch (error) {
      console.error("Scan failed:", error);
      alert("Scan failed. Please ensure the CSV format is correct and the backend is running.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="w-full bg-surface text-on-surface selection:bg-primary-fixed flex h-screen overflow-hidden">
      {/* Scanning Overlay */}
      {isScanning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center">
          <div className="bg-surface-container-highest p-10 rounded-3xl sentinel-shadow flex flex-col items-center gap-6 border border-outline-variant/20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-primary/20 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-white text-xl font-black tracking-tight">Analyzing Intelligence Feed</p>
              <p className="text-on-surface-variant text-sm max-w-[280px]">
                Running Isolation Forest model and cross-referencing behavioral patterns...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-[#1A1C23] flex flex-col py-6 z-50 transform -translate-x-full md:translate-x-0 transition-transform duration-300 border-r border-outline-variant/10">
        <div className="px-6 mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tighter leading-none">CryptaDex</h1>
              <p className="text-[10px] text-sky-300 font-bold tracking-widest uppercase mt-1">SOC Sentinel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <NavLink 
            to="/" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 mx-2 transition-all duration-200 ${isActive ? 'bg-[#296283] text-white rounded-xl' : 'text-slate-400 hover:text-white group'}`
            }
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
            <span className="font-headline text-sm font-medium">Security Monitoring</span>
          </NavLink>

          <NavLink 
            to="/detection" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 mx-2 transition-all duration-200 ${isActive ? 'bg-[#296283] text-white rounded-xl' : 'text-slate-400 hover:text-white group hover:bg-[#2c2f3a]'}`
            }
          >
            <span className="material-symbols-outlined">radar</span>
            <span className="font-headline text-sm font-medium">Detection Module</span>
          </NavLink>

          <NavLink 
            to="/users" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 mx-2 transition-all duration-200 ${isActive ? 'bg-[#296283] text-white rounded-xl' : 'text-slate-400 hover:text-white group hover:bg-[#2c2f3a]'}`
            }
          >
            <span className="material-symbols-outlined">group</span>
            <span className="font-headline text-sm font-medium">User Behavior</span>
          </NavLink>
        </nav>

        <div className="px-6 mt-auto pb-4">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".csv" 
            onChange={handleFileChange}
          />
          <button 
            onClick={handleScanClick}
            disabled={isScanning}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#1e4a63] transition-all sentinel-shadow active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">add_circle</span>
            START NEW SCAN
          </button>
        </div>
      </aside>

      {/* Main Canvas */}
      <main className="ml-0 md:ml-64 flex-1 flex flex-col h-screen overflow-y-auto custom-scrollbar relative">
        <header className="flex flex-col w-full bg-surface sticky top-0 z-40 border-b border-outline-variant/30 shrink-0">
          <div className="flex justify-between items-center px-6 h-14 w-full">
            <div className="flex items-center gap-4">
              {/* Optional page title/context could go here */}
            </div>
            <div className="flex items-center gap-4">
              <div className="relative hidden md:block">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-base">search</span>
                  <input 
                    className="bg-surface-container-low border-none rounded-full py-1.5 pl-10 pr-4 text-xs w-64 focus:ring-2 focus:ring-primary-container transition-all" 
                    placeholder="Search users, dates, tags..." 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                    }}
                  />
              </div>
            </div>
          </div>
        </header>

        <Outlet context={outletContext} />
      </main>
    </div>
  );
}
