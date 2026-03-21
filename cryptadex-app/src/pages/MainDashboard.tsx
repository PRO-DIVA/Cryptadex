import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { dataService, type UserSummary, type EventResult, type DashboardStats, type ModelMetrics } from '../services/dataService';
import { AlertTrendsChart } from '../components/charts/AlertTrendsChart';
import { ThreatDistributionChart } from '../components/charts/ThreatDistributionChart';

type DashboardContext = {
  searchQuery: string;
  insidersMap: Record<string, string>;
};

export default function MainDashboard() {
  const { searchQuery, insidersMap } = useOutletContext<DashboardContext>();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [events, setEvents] = useState<EventResult[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [backendOk, setBackendOk] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [usersData, eventsData, statsData, metricsData] = await Promise.all([
          dataService.getUsers(),
          dataService.getEvents(),
          dataService.getStats(),
          dataService.getMetrics()
        ]);
        setUsers(usersData);
        setEvents(eventsData);
        setStats(statsData);
        setMetrics(metricsData);
        setBackendOk(true);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setMetrics(null);
        setBackendOk(false);
      }
    }
    fetchData();
  }, []);

  const userPrecisionPct = useMemo(() => {
    const v = metrics?.user_level?.precision;
    if (v === null || v === undefined) return null;
    return Number((v * 100).toFixed(1));
  }, [metrics]);

  const userRecallPct = useMemo(() => {
    const v = metrics?.user_level?.recall;
    if (v === null || v === undefined) return null;
    return Number((v * 100).toFixed(1));
  }, [metrics]);

  const userF1Pct = useMemo(() => {
    const v = metrics?.user_level?.f1;
    if (v === null || v === undefined) return null;
    return Number((v * 100).toFixed(1));
  }, [metrics]);

  const userAccuracyPct = useMemo(() => {
    const v = metrics?.user_level?.accuracy;
    if (v === null || v === undefined) return null;
    return Number((v * 100).toFixed(1));
  }, [metrics]);

  const riskStatus = useMemo(() => {
    if (!stats) return { label: 'LOADING', tone: 'text-on-surface-variant' };
    if (stats.flagged === 0) return { label: 'OPTIMAL', tone: 'text-primary' };
    const ratio = stats.total_users > 0 ? stats.flagged / stats.total_users : 0;
    if (ratio >= 0.3) return { label: 'CRITICAL', tone: 'text-error' };
    if (ratio >= 0.15) return { label: 'HIGH', tone: 'text-tertiary' };
    return { label: 'STABLE', tone: 'text-primary' };
  }, [stats]);
  
  // Aggregate daily alert trends matching the mock data structure
  const alertTrendsData = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach(e => {
      if (e.final_flag === 1) {
        counts[e.day] = (counts[e.day] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, count]) => ({ day, count }));
  }, [events]);

  const overallStatsData = useMemo(() => {
    const flagged = events.filter(e => e.final_flag === 1);
    const afterHours = flagged.filter(e => (e.total_after_hours || 0) > 0).length;
    const fileActivity = flagged.filter(e => (e.files_accessed || 0) > 0).length;
    const externalEmail = flagged.filter(e => (e.external_emails || 0) > 0).length;
    const suspiciousWeb = flagged.filter(e => (e.suspicious_web_clicks || 0) > 0).length;
    const device = flagged.filter(e => (e.device_activity || 0) > 0).length;

    return [
      { name: 'After Hours', value: afterHours, color: '#296283' },
      { name: 'File Activity', value: fileActivity, color: '#fbbc04' },
      { name: 'External Email', value: externalEmail, color: '#e84435' },
      { name: 'Suspicious Web', value: suspiciousWeb, color: '#1e4620' },
      { name: 'Device Activity', value: device, color: '#71787e' }
    ];
  }, [events]);

  const topUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const suspectOnly = users.filter((u) => (u.final_prediction ?? 0) >= 1);
    const sorted = [...suspectOnly].sort((a, b) => b.anomaly_score - a.anomaly_score);
    const filtered = q
      ? sorted.filter((u) => {
          const display = (insidersMap[u.user] || '').toLowerCase();
          return u.user.toLowerCase().includes(q) || display.includes(q);
        })
      : sorted;
    return filtered.slice(0, 6);
  }, [users, searchQuery, insidersMap]);

  const flaggedEventsCount = useMemo(() => events.filter(e => e.final_flag === 1).length, [events]);

  return (
    <section className="flex-1 p-4 md:p-8 overflow-y-auto flex flex-col gap-6 w-full pb-20 bg-surface">
      {/* KPI Section - Highly Logical Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <div className="bg-white sentinel-shadow rounded-2xl p-5 border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Global Risk Status</span>
            <span className="material-symbols-outlined text-primary text-sm">shield</span>
          </div>
          <div className="mt-4">
            <h4 className={`text-2xl font-black ${riskStatus.tone}`}>{riskStatus.label}</h4>
            <p className="text-[10px] text-on-surface-variant font-bold mt-1">FLAGGED USERS / TOTAL USERS</p>
          </div>
        </div>
        
        <div className="bg-white sentinel-shadow rounded-2xl p-5 border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Total Users Scanned</span>
            <span className="material-symbols-outlined text-primary text-sm">group</span>
          </div>
          <div className="mt-4">
            <h4 className="text-2xl font-black text-on-surface">{stats?.total_users || 0}</h4>
            <p className="text-[10px] text-on-surface-variant font-bold mt-1">MONITORED IDENTITIES</p>
          </div>
        </div>

        <div className="bg-white sentinel-shadow rounded-2xl p-5 border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Flagged Anomalies</span>
            <span className="material-symbols-outlined text-error text-sm">warning</span>
          </div>
          <div className="mt-4">
            <h4 className="text-2xl font-black text-error">{stats?.flagged || 0}</h4>
            <p className="text-[10px] text-on-surface-variant font-bold mt-1">ACTION REQUIRED</p>
          </div>
        </div>
      </div>

      {/* Main Insights Row */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-5 bg-white sentinel-shadow rounded-2xl p-6 border border-outline-variant/30 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-bold text-base text-on-surface">Detection Engine Performance</h3>
              <p className="text-xs text-on-surface-variant">Model verification stats from latest dataset</p>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-4">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Precision</p>
                <p className="text-2xl font-black text-on-surface">{userPrecisionPct === null ? '--' : `${userPrecisionPct}%`}</p>
              </div>
              <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-4">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Recall</p>
                <p className="text-2xl font-black text-on-surface">{userRecallPct === null ? '--' : `${userRecallPct}%`}</p>
              </div>
              <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-4">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">F1 Score</p>
                <p className="text-2xl font-black text-tertiary">{userF1Pct === null ? '--' : `${userF1Pct}%`}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4">
                <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Accuracy</p>
                <p className="text-2xl font-black text-amber-700">{userAccuracyPct === null ? '--' : `${userAccuracyPct}%`}</p>
              </div>
            </div>
            <div className="bg-surface-container-low rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-bold text-on-surface-variant">Backend Sync Status</span>
                <span className="text-emerald-500 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> ACTIVE
                </span>
              </div>
              <p className="text-[10px] text-on-surface-variant leading-relaxed">
                Backend reachable: {backendOk ? 'YES' : 'NO'} · Flagged events: {flaggedEventsCount}
              </p>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-7 bg-white sentinel-shadow rounded-2xl p-6 border border-outline-variant/30 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-base text-on-surface">Temporal Threat Trends</h3>
              <p className="text-xs text-on-surface-variant">Anomaly frequency across the observation period</p>
            </div>
          </div>
          <div className="h-48 w-full mt-auto">
            {alertTrendsData.length > 0 ? (
              <AlertTrendsChart data={alertTrendsData} />
            ) : (
              <div className="w-full h-full bg-slate-100 animate-pulse rounded-xl" />
            )}
          </div>
        </div>
      </div>

      {/* Deep Analysis Row */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 bg-white sentinel-shadow rounded-2xl p-6 border border-outline-variant/30 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-bold text-base text-on-surface">At-Risk Identities (Live Telemetry)</h3>
              <p className="text-xs text-on-surface-variant">Top targets identified for investigation</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-on-surface-variant uppercase border-b border-outline-variant/30">
                  <th className="pb-3">User ID</th>
                  <th className="pb-3">Risk Vector</th>
                  <th className="pb-3">Dataset Label</th>
                  <th className="pb-3">Anomaly Score</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {topUsers.map((user, idx) => (
                  <tr key={idx} className="border-b border-outline-variant/10 hover:bg-surface-container-lowest transition-colors">
                    <td className="py-4 font-mono font-bold text-primary" title={insidersMap[user.user] ? insidersMap[user.user] : user.user}>
                      {(insidersMap[user.user] ? insidersMap[user.user] : user.user.substring(0, 16) + '...')}
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-md font-bold text-[10px] ${user.final_prediction === 1 ? 'bg-error-container text-error' : 'bg-primary-container text-primary'}`}>
                        {user.final_prediction === 1 ? 'CRITICAL PATTERN' : 'NOMINAL'}
                      </span>
                    </td>
                    <td className="py-4 text-on-surface-variant font-medium">{String(user.label ?? '')}</td>
                    <td className="py-4 font-mono font-black text-on-surface">{user.anomaly_score.toFixed(4)}</td>
                    <td className="py-4 text-right">
                      <button 
                        onClick={() => navigate('/users', { state: { userId: user.user } })}
                        className="bg-primary/10 text-primary hover:bg-primary hover:text-white px-3 py-1 rounded-lg font-bold text-[10px] transition-all"
                      >
                        INVESTIGATE
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 bg-white sentinel-shadow rounded-2xl p-6 border border-outline-variant/30 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-bold text-base text-on-surface">Overall Statistics</h3>
              <p className="text-xs text-on-surface-variant">Computed from backend event results</p>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="relative w-48 h-48 mb-6">
              {overallStatsData.some(d => d.value > 0) ? (
                <ThreatDistributionChart data={overallStatsData} />
              ) : (
                <div className="w-full h-full rounded-full border-[20px] border-surface-container-high animate-pulse" />
              )}
            </div>
            <div className="w-full space-y-2">
              {overallStatsData.map((type, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: type.color }}></span>
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase">{type.name}</span>
                  </div>
                  <span className="text-[10px] font-black text-on-surface">{type.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
