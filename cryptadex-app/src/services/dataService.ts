const API_URL = 'http://localhost:8000/api';

export interface UserSummary {
  user: string;
  original_user?: string | null;
  anomaly_score: number;
  temporal_flag: number;
  label: number;
  final_prediction: number;
}

export interface EventResult {
  user: string;
  original_user?: string | null;
  day: string;
  total_logons: number;
  after_hours_logons: number;
  weekend_logons: number;
  distinct_pcs_accessed: number;
  files_accessed: number;
  after_hours_files: number;
  emails_sent: number;
  external_emails: number;
  after_hours_emails: number;
  web_visits: number;
  suspicious_web_clicks: number;
  after_hours_web: number;
  device_activity: number;
  after_hours_device: number;
  total_after_hours: number;
  label: number;
  logon_change: number;
  file_change: number;
  email_change: number;
  logon_zscore: number;
  file_zscore: number;
  email_zscore: number;
  anomaly_score: number;
  anomaly: number;
  rolling_anomaly: number;
  temporal_flag: number;
  final_flag: number;
}

export interface DashboardStats {
  total_users: number;
  flagged: number;
  true_positives: number;
  false_positives: number;
}

export interface BinaryMetrics {
  precision: number | null;
  recall: number | null;
  f1: number | null;
  accuracy: number | null;
  support?: number;
  positives?: number;
  predicted_positives?: number;
}

export interface ModelMetrics {
  user_level: BinaryMetrics;
  event_level: BinaryMetrics;
}

export interface InsiderRecord {
  user: string;
  original_user?: string | null;
  anomaly_score: number;
  temporal_flag: number;
  label: number;
  final_prediction: number;
}

export interface SystemHealthData {
  status: string;
  score: number;
  uptime: string;
  nodes: { id: string; cluster: string; status: string; load: number }[];
  gateways: { total: number; stable: number };
  endpoints: { total: number; active: number };
  network_nodes: { total: number; synced: number };
}

export const dataService = {
  async getUsers(): Promise<UserSummary[]> {
    const response = await fetch(`${API_URL}/users`);
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  async getEvents(): Promise<EventResult[]> {
    const response = await fetch(`${API_URL}/events`);
    if (!response.ok) throw new Error('Failed to fetch events');
    return response.json();
  },

  async getStats(): Promise<DashboardStats> {
    const response = await fetch(`${API_URL}/stats`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },

  async getMetrics(): Promise<ModelMetrics> {
    const response = await fetch(`${API_URL}/metrics`);
    if (!response.ok) throw new Error('Failed to fetch metrics');
    return response.json();
  },

  async getInsiders(): Promise<InsiderRecord[]> {
    const response = await fetch(`${API_URL}/insiders`);
    if (!response.ok) throw new Error('Failed to fetch insiders');
    return response.json();
  },

  async getUserMapping(): Promise<Record<string, string>> {
    const response = await fetch(`${API_URL}/user-mapping`);
    if (!response.ok) throw new Error('Failed to fetch user mapping');
    return response.json();
  },

  async getHealth(): Promise<SystemHealthData> {
    const response = await fetch(`${API_URL}/health`);
    if (!response.ok) throw new Error('Failed to fetch health');
    return response.json();
  },

  async scanCSV(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_URL}/scan`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Scan failed');
    return response.json();
  },

  async isolateUser(userId: string) {
    const formData = new FormData();
    formData.append('user_id', userId);
    const response = await fetch(`${API_URL}/action/isolate`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Isolation failed');
    return response.json();
  },

  async dismissEvent(eventId: string, userId?: string, day?: string) {
    const formData = new FormData();
    formData.append('event_id', eventId);
    if (userId) formData.append('user_id', userId);
    if (day) formData.append('day', day);
    const response = await fetch(`${API_URL}/action/dismiss`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Dismissal failed');
    return response.json();
  }
};
