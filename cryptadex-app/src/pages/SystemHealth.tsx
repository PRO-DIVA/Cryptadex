
import { useEffect, useState } from 'react';
import { dataService, type SystemHealthData } from '../services/dataService';

export default function SystemHealth() {
  const [health, setHealth] = useState<SystemHealthData | null>(null);

  useEffect(() => {
    async function fetchHealth() {
      try {
        const data = await dataService.getHealth();
        setHealth(data);
      } catch (err) {
        console.error("Error fetching health data:", err);
      }
    }
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!health) return <div className="p-20 text-center animate-pulse text-on-surface-variant">Monitoring Systems...</div>;

  return (
    <section className="p-10 space-y-10 w-full pb-20">
      {/* Hero Stats: Fully Expanded Layout */}
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 flex flex-col gap-8">
          <div className="bg-surface-container-lowest rounded-xl p-8 flex flex-col justify-between min-h-[350px] sentinel-shadow border border-outline-variant/10">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-on-surface-variant font-semibold text-xs uppercase tracking-widest mb-1">Global System Integrity</h3>
                <p className="text-6xl font-extrabold tracking-tight text-on-surface">{health.score}% <span className="text-sm font-medium text-primary px-3 py-1.5 bg-primary-fixed rounded-full ml-3">{health.status} PERFORMANCE</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs text-on-surface-variant font-medium">Uptime Period</p>
                <p className="text-lg font-bold">{health.uptime}</p>
              </div>
            </div>
            
            <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Email Gateways</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold">{health.gateways.stable}/{health.gateways.total}</span>
                  <span className="text-[10px] text-primary font-bold mb-1.5">STABLE</span>
                </div>
                <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-full animate-pulse"></div>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Cloud Endpoints</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold">{(health.endpoints.active / 1000).toFixed(1)}k</span>
                  <span className="text-[10px] text-primary font-bold mb-1.5">ACTIVE</span>
                </div>
                <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[98%]"></div>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Network Nodes</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold">{health.network_nodes.synced}</span>
                  <span className="text-[10px] text-primary font-bold mb-1.5">SYNCED</span>
                </div>
                <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-full"></div>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Ingestion Peak</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold">1.8M</span>
                  <span className="text-[10px] text-primary font-bold mb-1.5">CAPACITY</span>
                </div>
                <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[85%]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid: Health Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Connection Status Card */}
        <div className="bg-surface-container-lowest rounded-xl p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-fixed rounded-lg">
                <span className="material-symbols-outlined text-on-primary-fixed-variant" style={{ fontVariationSettings: "'FILL' 1" }}>lan</span>
              </div>
              <h4 className="font-bold text-sm">Network Infrastructure</h4>
            </div>
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-primary opacity-20"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg">
              <span className="text-xs font-semibold text-on-surface-variant">Core Switch A</span>
              <span className="text-xs font-bold text-primary">CONNECTED</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg">
              <span className="text-xs font-semibold text-on-surface-variant">Boundary FW-01</span>
              <span className="text-xs font-bold text-primary">CONNECTED</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg">
              <span className="text-xs font-semibold text-on-surface-variant">Load Balancer X</span>
              <span className="text-xs font-bold text-primary">CONNECTED</span>
            </div>
          </div>
        </div>

        {/* Endpoint Health */}
        <div className="bg-surface-container-lowest rounded-xl p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-fixed rounded-lg">
                <span className="material-symbols-outlined text-on-primary-fixed-variant" style={{ fontVariationSettings: "'FILL' 1" }}>devices</span>
              </div>
              <h4 className="font-bold text-sm">Endpoint Health</h4>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 bg-surface-container-high rounded text-on-surface-variant uppercase">All Syncing</span>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center py-4">
            <div className="relative w-24 h-24 mb-4">
              <svg className="w-full h-full transform -rotate-90">
                <circle className="text-surface-container-high" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeWidth="8"></circle>
                <circle className="text-primary" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeDasharray="251.2" strokeDashoffset="12" strokeWidth="8"></circle>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-black text-xl">96%</div>
            </div>
            <p className="text-xs text-center font-medium text-on-surface-variant max-w-[180px]">Endpoint response time average: <span className="text-on-surface font-bold">180ms</span></p>
          </div>
        </div>

        {/* Email Connectivity */}
        <div className="bg-surface-container-lowest rounded-xl p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-fixed rounded-lg">
                <span className="material-symbols-outlined text-on-primary-fixed-variant" style={{ fontVariationSettings: "'FILL' 1" }}>alternate_email</span>
              </div>
              <h4 className="font-bold text-sm">Email Security Sync</h4>
            </div>
            <span className="text-primary font-bold text-xs">Healthy</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="h-10 w-1 bg-primary rounded-full"></div>
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">Inbound Filter</p>
                <p className="text-sm font-bold">42.2k Messages Scanned</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-10 w-1 bg-primary/40 rounded-full"></div>
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">Encryption Relay</p>
                <p className="text-sm font-bold">Latency: 12ms</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-10 w-1 bg-primary/20 rounded-full"></div>
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">SPF/DKIM/DMARC</p>
                <p className="text-sm font-bold">100% Validation Rate</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Node IDs: Table/List */}
      <div className="bg-surface-container-lowest rounded-xl overflow-hidden sentinel-shadow">
        <div className="p-6 flex justify-between items-center bg-surface-container-low/30">
          <h3 className="font-bold text-base tracking-tight">Active Infrastructure Node IDs</h3>
          <div className="flex gap-2">
            <button className="text-xs font-bold text-primary px-3 py-1.5 rounded-lg border border-primary/20 hover:bg-primary/5 transition-all">Export Logs</button>
            <button className="text-xs font-bold bg-primary text-white px-3 py-1.5 rounded-lg shadow-sm">Add Node</button>
          </div>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-surface-container-high">
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Node ID</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Cluster</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Load</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Heartbeat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container-low">
            {health.nodes.map(node => (
              <tr key={node.id} className="hover:bg-surface-container-low/50 transition-colors">
                <td className="px-6 py-4 font-mono text-xs font-bold text-primary">{node.id}</td>
                <td className="px-6 py-4 text-sm font-medium">{node.cluster}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${node.status === 'Healthy' ? 'bg-primary/10 text-primary' : 'bg-error/10 text-error'}`}>
                    <span className={`w-1 h-1 rounded-full ${node.status === 'Healthy' ? 'bg-primary' : 'bg-error'}`}></span> {node.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="w-24 h-1 bg-surface-container-high rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${node.load}%` }}></div>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-medium text-on-surface-variant">Just now</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
