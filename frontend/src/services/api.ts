import type { TaskBrief, TaskStatus } from '../types';

const API_BASE = '/api';

const getHeaders = () => ({
  'Content-Type': 'application/json',
});

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export interface BriefResponse {
  id: string;
  folder_path: string;
  title: string;
  status: string;
  current_step: number;
  total_steps: number;
  assigned_tool: string | null;
  sprint_name: string | null;
  folder_name: string | null;
  tags: string[];
  checklist_total: number;
  checklist_done: number;
  jira_key: string | null;
  created_at: string;
}

export interface BriefDetailResponse extends BriefResponse {
  goal: string;
  technical_details: string;
  constraints: string[];
  decisions: Array<{ text: string; made_at: string; reason: string | null }>;
  extracted_tags: string[];
  parent_task_path: string | null;
  last_active_at: string | null;
  indexed_at: string | null;
}

export interface DashboardStats {
  total_briefs: number;
  drafts: number;
  in_progress: number;
  review: number;
  done: number;
  blocked: number;
  total_sprints: number;
}

export interface Sprint {
  id: string;
  name: string;
  start_date: string | null;
  status: string;
}

export interface Folder {
  name: string;
  path: string;
  type: string;
  children: Folder[];
}

export interface ReviewItem {
  id: string;
  brief_path: string;
  agent_tool: string;
  status: string;
  diff_summary: string;
  files_changed: Array<{ path: string; change_type: string; lines_added: number; lines_removed: number }>;
  intent_checks: Array<{ description: string; passed: boolean | null; notes: string | null }>;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface CreateBriefRequest {
  sprint: string;
  folder: string;
  name: string;
  template_type?: string;
}

export interface UpdateBriefRequest {
  title?: string;
  status?: string;
  current_step?: number;
  total_steps?: number;
  assigned_tool?: string;
  tags?: string[];
  jira_key?: string;
  goal?: string;
  technical_details?: string;
  constraints?: string[];
}

// Briefs API
export const briefsAPI = {
  list: (params?: { sprint?: string; folder?: string; tag?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.sprint) searchParams.set('sprint', params.sprint);
    if (params?.folder) searchParams.set('folder', params.folder);
    if (params?.tag) searchParams.set('tag', params.tag);
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    return fetchJSON<BriefResponse[]>(`${API_BASE}/briefs${query ? `?${query}` : ''}`);
  },

  get: (path: string) => fetchJSON<BriefDetailResponse>(`${API_BASE}/briefs/${path}`),

  create: (data: CreateBriefRequest) =>
    fetchJSON<BriefResponse>(`${API_BASE}/briefs`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (path: string, data: UpdateBriefRequest) =>
    fetchJSON<BriefResponse>(`${API_BASE}/briefs/${path}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (path: string) =>
    fetchJSON<{ status: string }>(`${API_BASE}/briefs/${path}`, { method: 'DELETE' }),

  stats: () => fetchJSON<DashboardStats>(`${API_BASE}/briefs/stats`),

  rebuildIndex: () => fetchJSON<{ total: number; sprints: number }>(`${API_BASE}/briefs/rebuild-index`, { method: 'POST' }),
};

// Folders API
export const foldersAPI = {
  getTree: () => fetchJSON<Folder>(`${API_BASE}/folders`),

  create: (name: string, parentPath: string = '') =>
    fetchJSON<Folder>(`${API_BASE}/folders`, {
      method: 'POST',
      body: JSON.stringify({ name, parent_path: parentPath }),
    }),

  update: (path: string, name: string) =>
    fetchJSON<{ name: string; path: string }>(`${API_BASE}/folders/${path}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),

  delete: (path: string) =>
    fetch(`${API_BASE}/folders/${path}`, { method: 'DELETE' }),

  move: (path: string, target: string) =>
    fetchJSON<{ name: string; path: string }>(`${API_BASE}/folders/${path}/move`, {
      method: 'PUT',
      body: JSON.stringify({ target }),
    }),
};

// Sprints API
export const sprintsAPI = {
  list: () => fetchJSON<Sprint[]>(`${API_BASE}/sprints`),

  create: (name: string, startDate?: string) =>
    fetchJSON<Sprint>(`${API_BASE}/sprints`, {
      method: 'POST',
      body: JSON.stringify({ name, start_date: startDate }),
    }),

  update: (id: string, data: { name?: string; status?: string }) =>
    fetchJSON<Sprint>(`${API_BASE}/sprints/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Reviews API
export const reviewsAPI = {
  list: (status?: string) =>
    fetchJSON<ReviewItem[]>(`${API_BASE}/review${status ? `?status=${status}` : ''}`),

  create: (data: {
    brief_path: string;
    agent_tool: string;
    diff_summary: string;
    files_changed: Array<{ path: string; change_type: string }>;
    intent_checks: Array<{ description: string }>;
  }) => fetchJSON<ReviewItem>(`${API_BASE}/review`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  submitFeedback: (id: string, feedback: { approved: boolean; comments: string; ratings: Record<string, number> }) =>
    fetchJSON<ReviewItem>(`${API_BASE}/review/${id}/feedback`, {
      method: 'PUT',
      body: JSON.stringify(feedback),
    }),
};

// Search API
export const searchAPI = {
  search: (q: string) => fetchJSON<Array<{ id: string; title: string; folder_path: string; status: string; score: number }>>(`${API_BASE}/search?q=${encodeURIComponent(q)}`),

  getGraph: (sprint?: string) => fetchJSON<{ nodes: Array<{ id: string; title: string; path: string; status: string }>; edges: Array<{ source: string; target: string; score: number }> }>(`${API_BASE}/graph${sprint ? `?sprint=${sprint}` : ''}`),

  detectLinks: () => fetchJSON<{ total_links: number; auto_links: number; suggested_links: number }>(`${API_BASE}/links/detect`, { method: 'POST' }),
};

// Health check
export const healthAPI = {
  check: () => fetchJSON<{ status: string }>(`${API_BASE}/health`),
};

// Helper to convert backend Brief to frontend TaskBrief format
export function briefToTask(brief: BriefDetailResponse): TaskBrief {
  return {
    id: brief.id,
    path: brief.folder_path,
    goal: brief.goal,
    technicalDetails: brief.technical_details,
    errorHandling: '',
    checklist: [],
    decisions: brief.decisions.map((d, i) => ({
      id: `d${i}`,
      question: '',
      answer: d.text,
      rationale: d.reason || '',
      source: '',
      timestamp: d.made_at,
    })),
    meta: {
      status: brief.status as TaskStatus,
      currentStep: brief.current_step,
      totalSteps: brief.total_steps,
      assignedAI: brief.assigned_tool || 'Unassigned',
      jiraKey: brief.jira_key || undefined,
      tags: brief.tags,
      owner: { name: 'Unknown', avatar: 'https://picsum.photos/seed/user/32/32' },
      stakeholders: [],
      externalLinks: [],
      relations: [],
      resources: [],
    },
    subtasks: [],
    filesAffected: [],
    constraints: brief.constraints,
    references: [],
    metrics: [],
  };
}
