import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { dataService, type EventResult, type ModelMetrics } from '../services/dataService';

type DashboardContext = {
  searchQuery: string;
  insidersMap: Record<string, string>;
};

export default function RealTimeDetection() {
  const { searchQuery, insidersMap } = useOutletContext<DashboardContext>();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventResult[]>([]);
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isViewCleared, setIsViewCleared] = useState(false);

  useEffect(() => {
    let interval: number;
    async function fetchEvents() {
      if (isPaused) return;
      try {
        const [data, metricsData] = await Promise.all([
          dataService.getEvents(),
          dataService.getMetrics(),
        ]);
        // Sort by day descending to show "recent" first
        setEvents(data.sort((a, b) => b.day.localeCompare(a.day)));
        setMetrics(metricsData);
      } catch (err) {
        console.error("Error fetching events:", err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchEvents();
    // Poll every 5 seconds if not paused
    interval = window.setInterval(fetchEvents, 5000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const activeFlagsCount = useMemo(() => events.filter(e => e.final_flag === 1).length, [events]);

  const anomalyEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = events.filter(e => e.final_flag === 1);
    const searched = q
      ? filtered.filter((e) => {
          const display = (insidersMap[e.user] || '').toLowerCase();
          return e.user.toLowerCase().includes(q) || e.day.toLowerCase().includes(q) || display.includes(q);
        })
      : filtered;
    return isViewCleared ? [] : searched.slice(0, 50);
  }, [events, searchQuery, insidersMap, isViewCleared]);

  const handleIsolate = async (userId: string) => {
    try {
      await dataService.isolateUser(userId);
      alert(`SECURITY ALERT: User ${userId} has been isolated from the network. All session tokens revoked and endpoint access locked.`);
      // Refresh events to show updated status if we added it to UI
    } catch (error) {
      console.error("Isolation failed:", error);
    }
  };

  const handleDismiss = async (eventId: string, userId: string, day: string) => {
    try {
      await dataService.dismissEvent(eventId, userId, day);
      const [data, metricsData] = await Promise.all([
        dataService.getEvents(),
        dataService.getMetrics(),
      ]);
      setEvents(data.sort((a, b) => b.day.localeCompare(a.day)));
      setMetrics(metricsData);
    } catch (error) {
      console.error("Dismissal failed:", error);
    }
  };

  const eventPrecisionPct = useMemo(() => {
    const v = metrics?.event_level?.precision;
    if (v === null || v === undefined) return null;
    return Number((v * 100).toFixed(2));
  }, [metrics]);

  const alertLoadPct = useMemo(() => {
    if (!events.length) return 0;
    return Number(((activeFlagsCount / events.length) * 100).toFixed(1));
  }, [events.length, activeFlagsCount]);

  return (
    <section className="flex-1 p-4 md:p-8 overflow-y-auto flex flex-col gap-6 w-full pb-20">
      {/* Real-time Summary Header (Bento Style) */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-on-surface">Live Detection Feed</h2>
            <p className="text-on-surface-variant text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Monitoring {events.length.toLocaleString()} system events across global nodes
            </p>
        </div>
        <div className="col-span-12 lg:col-span-4 flex justify-end items-center gap-3">
            <div className="bg-surface-container-lowest sentinel-shadow px-4 py-3 rounded-2xl flex items-center gap-4 border border-outline-variant/10">
                <div className="text-right">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-none mb-1">Global Risk</p>
                    <p className={`text-xl font-black leading-none ${activeFlagsCount > 10 ? 'text-error' : 'text-tertiary'}`}>
                      {activeFlagsCount > 50 ? 'CRITICAL' : activeFlagsCount > 10 ? 'HIGH' : 'STABLE'}
                    </p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${activeFlagsCount > 10 ? 'bg-error-container text-error' : 'bg-tertiary-container text-tertiary'}`}>
                    <span className="material-symbols-outlined font-bold">{activeFlagsCount > 10 ? 'potted_plant' : 'verified'}</span>
                </div>
            </div>
        </div>
      </div>

      {/* Terminal Stream Container */}
      <div className="flex-1 bg-surface-container-lowest rounded-2xl sentinel-shadow overflow-hidden flex flex-col min-h-[500px] border border-outline-variant/10">
          {/* Terminal Header */}
          <div className="bg-surface-container-high px-6 py-4 flex justify-between items-center border-b border-outline-variant/10">
              <div className="flex items-center gap-4">
                  <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-error/50"></div>
                      <div className="w-3 h-3 rounded-full bg-amber-500/50"></div>
                      <div className="w-3 h-3 rounded-full bg-emerald-500/50"></div>
                  </div>
                  <span className="text-[11px] font-mono text-on-surface-variant font-bold uppercase tracking-widest">stream_session: cryptadex_live_v2</span>
              </div>
              <div className="flex items-center gap-3">
                  <button 
                    className={`text-xs font-bold px-4 py-1.5 rounded-lg transition-all active:scale-95 ${isPaused ? 'bg-primary text-white' : 'text-primary hover:bg-primary/10'}`}
                    onClick={() => setIsPaused(!isPaused)}
                  >
                    {isPaused ? 'RESUME FEED' : 'PAUSE FEED'}
                  </button>
                  <button className="text-xs font-bold text-on-surface-variant px-4 py-1.5 hover:bg-surface-container-highest rounded-lg transition-all active:scale-95" onClick={() => setIsViewCleared(true)}>CLEAR VIEW</button>
                  <button className="text-xs font-bold text-on-surface-variant px-4 py-1.5 hover:bg-surface-container-highest rounded-lg transition-all active:scale-95" onClick={() => setIsViewCleared(false)}>RESTORE VIEW</button>
              </div>
          </div>
          
          {/* Live Stream Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 font-mono text-sm space-y-3">
              {isLoading ? (
                <div className="animate-pulse space-y-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-12 bg-surface-container-highest rounded-xl w-full" />
                  ))}
                </div>
              ) : anomalyEvents.length > 0 ? (
                anomalyEvents.map((event, idx) => (
                  <div key={`${event.user}-${event.day}`} className={`group flex items-center gap-4 p-4 rounded-xl border-l-4 transition-all hover:bg-surface-container-low ${event.final_flag === 1 ? 'bg-error-container/20 border-error' : 'border-transparent'}`}>
                    <div className="flex-none text-on-surface-variant/60 text-xs w-20">{event.day}</div>
                    <div className="flex-none">
                        <span className={`text-white text-[10px] px-3 py-1 rounded-full font-black tracking-tighter ${event.final_flag === 1 ? 'bg-error shadow-lg shadow-error/20' : 'bg-primary'}`}>
                          {event.final_flag === 1 ? 'THREAT' : 'EVENT'}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="text-on-surface font-bold mr-2">
                          {event.after_hours_logons > 0 ? '[OFF_HOURS_LOGON]' : 
                           event.after_hours_files > 0 ? '[SUS_FILE_ACCESS]' : 
                           event.external_emails > 5 ? '[DATA_EGRESS_RISK]' : 
                           event.anomaly_score > 0.8 ? '[HIGH_ANOMALY]' : '[SECURITY_EVENT]'}
                        </span>
                        <span className="text-on-surface-variant leading-relaxed">
                          User <span className="text-primary-variant font-black underline underline-offset-4 decoration-primary/20">{insidersMap[event.user] || `${event.user.substring(0, 16)}...`}</span> 
                          detected with score <span className="font-mono text-error font-bold">{event.anomaly_score.toFixed(4)}</span> 
                          on system node <span className="text-on-surface">SRV_{event.user.substring(0,3).toUpperCase()}</span>
                        </span>
                    </div>
                    <div className="flex-none flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <button 
                          onClick={() => navigate('/users', { state: { userId: event.user } })}
                          className="bg-primary text-white text-[10px] px-4 py-1.5 rounded-lg font-black tracking-tighter hover:bg-primary/80 transition-all shadow-md active:scale-95"
                        >
                          INVESTIGATE
                        </button>
                        <button 
                          onClick={() => handleIsolate(event.user)}
                          className="bg-error text-white text-[10px] px-4 py-1.5 rounded-lg font-black tracking-tighter hover:bg-error/80 transition-all shadow-md active:scale-95"
                        >
                          ISOLATE
                        </button>
                        <button 
                          onClick={() => handleDismiss(String(idx), event.user, event.day)}
                          className="bg-surface-container-highest text-on-surface text-[10px] px-4 py-1.5 rounded-lg font-black tracking-tighter hover:bg-surface-variant transition-all active:scale-95"
                        >
                          DISMISS
                        </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-on-surface-variant/30 py-20 bg-surface-container-low/50 rounded-2xl border-2 border-dashed border-outline-variant/20">
                    <span className="material-symbols-outlined text-4xl">radar</span>
                    <p className="italic font-bold">Scanning telemetry packets...</p>
                </div>
              )}
          </div>
      </div>

       {/* Contextual Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-28 shrink-0 pb-6 mb-10">
          <div className="bg-surface-container-lowest sentinel-shadow p-5 rounded-2xl flex flex-col justify-between border border-outline-variant/10">
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest leading-none">Total Events</p>
              <div className="flex items-end justify-between">
                  <h4 className="text-3xl font-black text-on-surface leading-none">{events.length.toLocaleString()}</h4>
                  <span className="text-emerald-500 text-[10px] font-black flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-md">
                    <span className="material-symbols-outlined text-sm leading-none">trending_up</span> LIVE
                  </span>
              </div>
          </div>
          <div className="bg-surface-container-lowest sentinel-shadow p-5 rounded-2xl flex flex-col justify-between border border-outline-variant/10">
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest leading-none">Flagged Points</p>
              <div className="flex items-end justify-between">
                  <h4 className="text-3xl font-black text-tertiary leading-none">{activeFlagsCount}</h4>
                  <span className="text-on-surface-variant text-[10px] font-bold">MODEL_OUT</span>
              </div>
          </div>
          <div className="bg-surface-container-lowest sentinel-shadow p-5 rounded-2xl flex flex-col justify-between border border-outline-variant/10">
               <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest leading-none">Event Precision</p>
              <div className="flex items-end justify-between">
                  <h4 className="text-3xl font-black text-on-surface leading-none">{eventPrecisionPct === null ? '--' : `${eventPrecisionPct}%`}</h4>
                  <span className="material-symbols-outlined text-primary font-bold">analytics</span>
              </div>
          </div>
           <div className="bg-surface-container-lowest sentinel-shadow p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden group border border-outline-variant/10 font-bold">
               <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest leading-none">Alert Load</p>
              <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 bg-surface-container rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${alertLoadPct > 30 ? 'bg-error' : alertLoadPct > 15 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${alertLoadPct}%` }}
                      ></div>
                  </div>
                  <span className={`text-[10px] font-black ${alertLoadPct > 30 ? 'text-error' : alertLoadPct > 15 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {alertLoadPct > 30 ? 'HIGH' : alertLoadPct > 15 ? 'ELEVATED' : 'NORMAL'}
                  </span>
              </div>
          </div>
      </div>
    </section>
  );
}
