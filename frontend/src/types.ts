
export type TaskStatus = 'Backlog' | 'Blocked' | 'AI working' | 'In progress' | 'Review' | 'Done';

export interface Metadata {
  status: TaskStatus;
  currentStep: number;
  totalSteps: number;
  assignedAI: string;
  jiraKey?: string;
  tags: string[];
  owner: { name: string; avatar: string };
  reviewer?: { name: string; avatar: string };
  stakeholders: { name: string; avatar: string }[];
  externalLinks: ExternalLink[];
  relations: Relation[];
  resources: string[];
}

export interface ExternalLink {
  type: 'jira' | 'confluence' | 'test-cases' | 'github-pr' | 'figma' | 'slack' | 'resource' | 'url';
  title: string;
  url: string;
  status?: string;
  passRate?: string;
  mergeState?: string;
}

export interface Relation {
  type: 'blocks' | 'blocked-by' | 'depends-on' | 'related-to';
  targetPath: string;
}

export interface TaskRelation {
  type: 'blocks' | 'depends-on' | 'related-to';
  targetPath: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  hint?: string;
  priority: 'must' | 'should' | 'nice';
  phase: string;
  resolvedValue?: string;
  completed: boolean;
}

export interface Decision {
  id: string;
  question: string;
  answer: string;
  rationale: string;
  source: string;
  timestamp: string;
}

export interface TaskBrief {
  id: string;
  path: string; // e.g. "AIR deprovisioning/01-cache-layer"
  goal: string;
  technicalDetails: string;
  errorHandling: string;
  featureFlag?: { name: string; defaultValue: string; rolloutPlan: string };
  metrics: { name: string; type: 'histogram' | 'counter' | 'gauge'; description: string }[];
  filesAffected: { path: string; action: 'new' | 'modify' | 'delete' }[];
  constraints: string[];
  references: string[];
  checklist: ChecklistItem[];
  decisions: Decision[];
  meta: Metadata;
  subtasks: string[]; // List of child task IDs
}

export interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  dayCount: number;
  storyCount: number;
  tasks: string[]; // List of task IDs
}

export interface DailyLog {
  date: string;
  completedItems: { taskId: string; title: string; actualTime: string }[];
  inProgress: string[];
  decisions: { taskId: string; decisionId: string }[];
  tomorrowPlan: string[];
}

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  tasks: string[];
  color?: string;
}
