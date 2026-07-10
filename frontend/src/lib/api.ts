export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  ward: string;
}

export interface CivicReport {
  report_id: string;
  timestamp: string;
  citizen_name: string;
  phone: string;
  location: Location;
  description: string;
  image_filename: string;
  status: string;
  linked_incident_id: string | null;
  ward: string;
  scenario_id: number | null;
}

export interface PerceptionResult {
  report_id: string;
  issue_type: string;
  severity: string;
  confidence: number;
  evidence_text: string;
  image_filename: string;
  visual_evidence?: string[];
}

export interface ImpactBreakdown {
  severity_score: number;
  infrastructure_proximity: number;
  people_affected: number;
  duration: number;
  repeat_reports: number;
  secondary_risk: number;
}

export interface ResponseStep {
  step_number: number;
  department: string;
  department_name: string;
  action: string;
  reason: string;
  estimated_hours: number;
  depends_on: string[];
  resources: string[];
  issues: string[];
}

export interface AgentLogEntry {
  timestamp: string;
  agent: string;
  message: string;
  decision: string;
  evidence_used: string[];
  confidence: number;
  recommended_action: string;
}

export interface IncidentContext {
  incident_id: string;
  status: string;
  classification: string;
  created_at: string;
  updated_at: string;
  connected_reports: string[];
  cluster: {
    radius_m: number;
    time_window_days: number;
    center_lat: number;
    center_lon: number;
    report_count: number;
  };
  perception_results: PerceptionResult[];
  root_cause: {
    hypothesis: string;
    confidence: number;
    evidence: string[];
    chain: string[];
    disclaimer: string;
  };
  impact_score: {
    score: number;
    priority: string;
    breakdown: ImpactBreakdown;
    explanation: string;
  };
  response_plan: {
    steps: ResponseStep[];
    rationale: string;
    approved: boolean;
    approved_by: string;
    approved_at: string;
  };
  resolution: {
    before_photo: string;
    after_photo: string;
    verification_result: string;
    verification_details: string;
    confidence: number;
  };
  sla: {
    deadline: string;
    reminders_sent: number;
    escalated: boolean;
    escalation_reason: string;
  };
}

export interface PipelineStage {
  status: string;
  result: Record<string, unknown>;
}

export interface PipelineResult {
  report_id: string;
  incident_id: string | null;
  stages: Record<string, PipelineStage>;
  agent_logs: AgentLogEntry[];
}

export interface DashboardStats {
  total_reports: number;
  total_incidents: number;
  active_incidents: number;
  critical_incidents: number;
  resolved_incidents: number;
  reopened_incidents: number;
  escalated_incidents: number;
}

// ── API Functions ─────────────────────────────────────────────────────────

async function fetchJson(url: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || res.statusText);
  }
  return res.json();
}

export const api = {
  submitReport: (data: {
    citizen_name?: string;
    phone?: string;
    latitude: number;
    longitude: number;
    address?: string;
    ward?: string;
    description: string;
    image_filename?: string;
    image_file?: File | null;
  }) => {
    const formData = new FormData();
    if (data.citizen_name) formData.append('citizen_name', data.citizen_name);
    if (data.phone) formData.append('phone', data.phone);
    formData.append('latitude', String(data.latitude));
    formData.append('longitude', String(data.longitude));
    if (data.address) formData.append('location_name', data.address);
    if (data.ward) formData.append('ward', data.ward);
    formData.append('description', data.description);
    if (data.image_filename) formData.append('image_filename', data.image_filename);
    if (data.image_file) formData.append('image', data.image_file);

    return fetch(`${API_BASE}/reports`, {
      method: 'POST',
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(error.detail || res.statusText);
      }
      return res.json();
    });
  },

  getReports: () => fetchJson('/reports'),
  getReport: (id: string) => fetchJson(`/reports/${id}`),

  // Analysis
  analyzeReport: (id: string): Promise<PipelineResult> =>
    fetchJson(`/analyze/${id}`, { method: 'POST' }),

  // Incidents
  getIncidents: () => fetchJson('/incidents'),
  getIncident: (id: string): Promise<IncidentContext> => fetchJson(`/incidents/${id}`),
  getImpact: (id: string) => fetchJson(`/incidents/${id}/impact`),
  getResponsePlan: (id: string) => fetchJson(`/incidents/${id}/response-plan`),

  approvePlan: (id: string) => fetchJson(`/incidents/${id}/approve-plan`, { method: 'POST' }),

  // Resolution
  submitResolution: (id: string, data: {
    after_photo: string;
    after_latitude: number;
    after_longitude: number;
    notes?: string;
  }) => fetchJson(`/incidents/${id}/resolution`, { method: 'POST', body: JSON.stringify(data) }),

  verifyResolution: (id: string) =>
    fetchJson(`/incidents/${id}/verify-resolution`, { method: 'POST' }),

  // Escalation
  advanceDemoTime: (id: string, hours: number = 72) =>
    fetchJson(`/incidents/${id}/advance-demo-time`, {
      method: 'POST',
      body: JSON.stringify({ hours }),
    }),

  // Dashboard & Logs
  getStats: (): Promise<DashboardStats> => fetchJson('/dashboard/stats'),
  getAgentLogs: () => fetchJson('/agent-logs'),

  // Dev
  resetDemo: () => fetchJson('/dev/reset-demo', { method: 'POST' }),
  getScenarios: () => fetchJson('/dev/scenarios'),
  getSeedImages: () => fetchJson('/dev/seed-images'),
  getPerceptionLookup: () => fetchJson('/dev/perception-lookup'),
};
