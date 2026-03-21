import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface GlobalBehaviorChartProps {
  data: {
    day: string;
    logon_anomalies: number;
    file_anomalies: number;
    email_anomalies: number;
    web_anomalies: number;
  }[];
}

export function GlobalBehaviorChart({ data }: GlobalBehaviorChartProps) {
  return (
    <div className="w-full h-full min-h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
          <XAxis 
             dataKey="day" 
             tick={{fontSize: 8, fill: '#41484d', fontWeight: 'bold'}}
             tickLine={false}
             axisLine={false}
             minTickGap={20}
          />
          <YAxis 
            tick={{fontSize: 8, fill: '#41484d', fontWeight: 'bold'}}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
          />
          <Area type="monotone" dataKey="logon_anomalies" stackId="1" stroke="#296283" fill="#296283" fillOpacity={0.8} />
          <Area type="monotone" dataKey="file_anomalies" stackId="1" stroke="#fbbc04" fill="#fbbc04" fillOpacity={0.6} />
          <Area type="monotone" dataKey="email_anomalies" stackId="1" stroke="#e84435" fill="#e84435" fillOpacity={0.6} />
          <Area type="monotone" dataKey="web_anomalies" stackId="1" stroke="#1e4620" fill="#1e4620" fillOpacity={0.6} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
