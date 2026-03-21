import { useEffect, useState, useMemo, useRef } from 'react';
import { useLocation, useOutletContext } from 'react-router-dom';
import { dataService, type UserSummary, type EventResult } from '../services/dataService';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

type DashboardContext = {
  searchQuery: string;
  insidersMap: Record<string, string>;
};

export default function UserBehaviorAnalysis() {
  const { searchQuery, insidersMap: contextInsidersMap } = useOutletContext<DashboardContext>();
  const location = useLocation();
  const initialUserId = location.state?.userId;
  const [events, setEvents] = useState<EventResult[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [activeUser, setActiveUser] = useState<UserSummary | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [localMappingMap, setLocalMappingMap] = useState<Record<string, string>>({});
  const didInitRef = useRef(false);

  // Merge context map + locally fetched map so the name always resolves
  const insidersMap = useMemo(
    () => ({ ...localMappingMap, ...contextInsidersMap }),
    [contextInsidersMap, localMappingMap]
  );

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    async function fetchData() {
      try {
        const [usersData, eventsData, mappingData] = await Promise.all([
          dataService.getUsers(),
          dataService.getEvents(),
          dataService.getUserMapping().catch(() => ({} as Record<string, string>)),
        ]);
        setEvents(eventsData);
        setUsers(usersData);
        setLocalMappingMap(mappingData);

        // Pick the top at-risk user by default OR the one passed via navigation
        const targetUser = initialUserId
          ? usersData.find(u => u.user === initialUserId)
          : usersData.sort((a, b) => b.anomaly_score - a.anomaly_score)[0];

        if (targetUser) setActiveUser(targetUser);
      } catch (err) {
        console.error("Error fetching investigation data:", err);
      }
    }
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = useMemo(() => {
    const globalQ = searchQuery.trim().toLowerCase();
    const localQ = searchTerm.trim().toLowerCase();

    return users
      .filter(u => {
        const display = insidersMap[u.user] || '';
        const matchesLocal = localQ ? (u.user.toLowerCase().includes(localQ) || display.toLowerCase().includes(localQ)) : true;
        const matchesGlobal = globalQ ? (u.user.toLowerCase().includes(globalQ) || display.toLowerCase().includes(globalQ)) : true;
        return matchesLocal && matchesGlobal;
      })
      .sort((a, b) => b.anomaly_score - a.anomaly_score)
      .slice(0, 100);
  }, [users, searchTerm, searchQuery, insidersMap]);

  const userEvents = useMemo(() => {
    if (!activeUser) return [];
    return events.filter(e => e.user === activeUser.user).sort((a, b) => a.day.localeCompare(b.day));
  }, [activeUser, events]);

  const trajectoryData = useMemo(() => {
    return userEvents.map(e => ({
      day: e.day,
      score: e.anomaly_score,
      baseline: -0.15 // Based on model normal mean
    }));
  }, [userEvents]);

  const latestEvent = userEvents[userEvents.length - 1];

  if (!activeUser) return <div className="p-20 text-center animate-pulse text-on-surface-variant">Initializing Investigation...</div>;

  const activeDisplayName = activeUser.final_prediction >= 1
    ? (insidersMap[activeUser.user] || `${activeUser.user.substring(0, 16)}...`)
    : `${activeUser.user.substring(0, 16)}...`;
  const isRevealed = activeUser.final_prediction >= 1 && Boolean(insidersMap[activeUser.user]);

  const downloadFile = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleGenerateReport = async () => {
    const metrics = await dataService.getMetrics().catch(() => null);
    const report = {
      generated_at: new Date().toISOString(),
      user: {
        hashed_user: activeUser.user,
        display_name: activeDisplayName,
        revealed_identity: Boolean(insidersMap[activeUser.user]),
      },
      prediction: {
        anomaly_score: activeUser.anomaly_score,
        temporal_flag: activeUser.temporal_flag,
        label: activeUser.label,
        final_prediction: activeUser.final_prediction,
      },
      metrics,
      latest_event: latestEvent || null,
      timeline: userEvents,
    };

    const safeName = activeDisplayName.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 60);
    downloadFile(`cryptadex_report_${safeName}.json`, JSON.stringify(report, null, 2), 'application/json');

    const csvHeader = Object.keys(userEvents[0] || {}).join(',');
    const csvRows = userEvents.map((row) => {
      return Object.values(row)
        .map((v) => {
          const s = String(v ?? '');
          return /[\",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
        })
        .join(',');
    });
    const csv = userEvents.length ? [csvHeader, ...csvRows].join('\n') : '';
    downloadFile(`cryptadex_events_${safeName}.csv`, csv, 'text/csv');
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* User Selection Sidebar */}
      <aside className="w-80 bg-surface-container-low border-r border-outline-variant/10 flex flex-col shrink-0">
        <div className="p-4 border-b border-outline-variant/10">
          <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-widest mb-3">All Users ({users.length})</h3>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-sm">search</span>
            <input 
              type="text" 
              placeholder="Search users..." 
              className="w-full bg-surface-container-high border-none rounded-lg py-2 pl-9 pr-3 text-xs focus:ring-1 focus:ring-primary/30"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredUsers.map(user => (
            <button
              key={user.user}
              onClick={() => setActiveUser(user)}
              className={`w-full text-left p-4 transition-all border-b border-outline-variant/5 hover:bg-white/50 ${activeUser.user === user.user ? 'bg-white sentinel-shadow relative z-10' : ''}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-mono font-bold text-on-surface-variant truncate max-w-[140px]">
                  {user.final_prediction >= 1
                    ? (insidersMap[user.user] || user.user.substring(0, 12) + '...')
                    : user.user.substring(0, 12) + '...'}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${user.final_prediction >= 1 ? 'bg-error-container text-error' : 'bg-primary-container text-primary'}`}>
                  {user.anomaly_score.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${user.final_prediction >= 1 ? 'bg-error' : 'bg-primary'}`}></div>
                <span className="text-[10px] font-bold text-on-surface">
                  {user.final_prediction >= 1 ? 'Suspicious Pattern' : 'Normal'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Investigation Canvas */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
        <section className="px-4 md:px-8 py-6 space-y-8 w-full pb-10">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">Investigation View</span>
                <h2 className="text-3xl font-extrabold text-on-surface mt-1">
                  User: {activeDisplayName}
                </h2>
                <p className="text-on-surface-variant text-sm mt-1">{isRevealed ? 'Insider identity revealed' : 'Anonymized identifier'} | Flags: {activeUser.temporal_flag}</p>
              </div>
          <div className="flex gap-3">
            <div className={`px-4 py-2 rounded-xl flex items-center gap-3 ${activeUser.final_prediction >= 1 ? 'bg-error-container' : 'bg-primary-container'}`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${activeUser.final_prediction >= 1 ? 'bg-error' : 'bg-primary'}`}></div>
              <span className={`font-bold text-sm ${activeUser.final_prediction >= 1 ? 'text-on-error-container' : 'text-on-primary-container'}`}>
                {activeUser.final_prediction === 2 ? 'USER ISOLATED' : activeUser.final_prediction === 1 ? 'PREDICTED INSIDER' : 'NORMAL BEHAVIOR'}
              </span>
            </div>
            <div className="bg-surface-container-lowest sentinel-shadow px-4 py-2 rounded-xl border border-outline-variant/10">
              <span className="text-on-surface-variant text-xs block">Max Risk Score</span>
              <span className="text-2xl font-black text-primary">{activeUser.anomaly_score.toFixed(3)}</span>
            </div>
          </div>
        </div>

        {/* Bento Grid: Analytics & Timeline */}
        <div className="grid grid-cols-12 gap-8">
          {/* Individual Risk Score Trajectory */}
          <div className="col-span-12 lg:col-span-8 bg-white sentinel-shadow rounded-xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-on-surface">Risk Trajectory (Dataset Duration)</h3>
              <div className="flex gap-4">
                <span className="text-xs text-on-surface-variant flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-slate-300"></span> Model Baseline
                </span>
                <span className="text-xs text-on-surface-variant flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-error"></span> Observed Score
                </span>
              </div>
            </div>
            
            <div className="h-48 w-full mt-auto">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trajectoryData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                  <XAxis dataKey="day" hide />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                  />
                  <Line type="monotone" dataKey="baseline" stroke="#94a3b8" strokeDasharray="5 5" dot={false} strokeWidth={1} />
                  <Line type="monotone" dataKey="score" stroke="#b9122b" strokeWidth={3} dot={{ r: 4, fill: '#b9122b' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Anomalous Summary Stats */}
          <div className="col-span-12 lg:col-span-4 grid grid-rows-2 gap-4">
            <div className="bg-primary text-white p-6 rounded-xl flex flex-col justify-between">
              <span className="text-xs font-bold opacity-80 uppercase">Max Daily Egress</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black">{latestEvent?.external_emails || 0}</span>
                <span className="text-lg font-bold">Ext. Emails</span>
              </div>
              <span className="text-xs text-primary-fixed-dim flex items-center gap-1">
                Last recorded activity on {latestEvent?.day || 'N/A'}
              </span>
            </div>
            <div className="bg-surface-container-high p-6 rounded-xl flex flex-col justify-between">
               <span className="text-xs font-bold text-on-surface-variant uppercase">PC Access Diversity</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-on-surface">{latestEvent?.distinct_pcs_accessed || 1}</span>
                <span className="text-sm font-medium text-on-surface-variant">Unique PCs</span>
              </div>
            </div>
          </div>

          {/* Detailed Log Feed for the User */}
          <div className="col-span-12 bg-surface-container-low rounded-xl overflow-hidden border border-outline-variant/5">
             <div className="bg-surface-container-high px-8 py-4 flex justify-between items-center">
                <span className="font-bold text-sm text-on-surface">Investigation Log (User History)</span>
                <div className="flex gap-4">
                     <button className="text-xs font-bold text-primary flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">filter_list</span> {userEvents.length} Days
                    </button>
                </div>
             </div>
             <div className="divide-y divide-outline-variant/10 max-h-[400px] overflow-y-auto custom-scrollbar">
                {userEvents.map((event, idx) => (
                  <div key={idx} className="px-8 py-4 grid grid-cols-12 gap-4 hover:bg-white transition-colors">
                    <div className="col-span-2 text-xs font-mono text-on-surface-variant">{event.day}</div>
                    <div className="col-span-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${event.final_flag === 1 ? 'bg-error-container text-on-error-container' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                          {event.final_flag === 1 ? 'Critical' : 'Nominal'}
                        </span>
                    </div>
                    <div className="col-span-6 text-sm font-medium">
                      Event Summary: Logons: {event.total_logons} | Files: {event.files_accessed} | Score: {event.anomaly_score.toFixed(4)}
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-on-surface-variant/40 text-[10px] font-mono">NODE_{idx % 5}</span>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </section>
      
      {/* Footer / Action Area */}
      <footer className="mt-auto px-8 py-10 bg-surface-container-low flex justify-between items-center border-t border-outline-variant/10 shrink-0">
          <div className="flex items-center gap-6">
              <div className="flex flex-col">
                  <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Investigation Target</span>
                  <span className="text-sm font-mono font-bold truncate max-w-[200px]">{activeDisplayName}</span>
              </div>
              <div className="h-8 w-px bg-outline-variant/20"></div>
              <div className="flex flex-col">
                  <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Model Label</span>
                  <span className="text-sm font-bold">{activeUser.label === 1 ? 'Ground Truth Insider' : 'No Ground Truth Label'}</span>
              </div>
          </div>
          <div className="flex gap-4">
              <button onClick={handleGenerateReport} className="px-6 py-2.5 rounded-xl text-on-surface-variant font-bold text-sm hover:bg-surface-container-high transition-colors">Generate Report</button>
              <button 
                onClick={async () => {
                  try {
                    if (activeUser.final_prediction === 1) {
                      await dataService.isolateUser(activeUser.user);
                      alert(`ALERT ESCALATED: User ${activeDisplayName} isolated.`);
                    } else {
                      alert(`Investigation for user ${activeDisplayName} closed.`);
                    }
                  } catch (error) {
                    console.error("Action failed:", error);
                  }
                }}
                className={`px-8 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-all sentinel-shadow ${activeUser.final_prediction === 1 ? 'bg-error' : 'bg-primary'}`}
              >
                {activeUser.final_prediction === 1 ? 'Escalate Alert' : 'Close Investigation'}
              </button>
          </div>
      </footer>
      </div>
    </div>
  );
}
