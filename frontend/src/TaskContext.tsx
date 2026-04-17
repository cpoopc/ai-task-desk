import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TaskBrief, TaskStatus, Sprint, Folder } from './types';
import { briefsAPI, sprintsAPI, foldersAPI, focusAPI, FocusItem } from './services/api';
import { INITIAL_TASKS, INITIAL_SPRINTS, INITIAL_FOLDERS } from './constants';

interface ApiFolder {
  name: string;
  path: string;
  type: string;
  children?: ApiFolder[];
}

interface TaskContextType {
  tasks: TaskBrief[];
  sprints: Sprint[];
  folders: Folder[];
  focusItems: FocusItem[];
  loadFocusItems: () => Promise<void>;
  activeSprintId: string;
  setActiveSprintId: (id: string) => void;
  activeFolderId: string;
  setActiveFolderId: (id: string) => void;
  activeTags: string[];
  toggleTag: (tag: string) => void;
  updateTask: (task: TaskBrief) => void;
  addTaskRelation: (sourceId: string, targetId: string, type: 'blocks' | 'blocked-by' | 'depends-on' | 'related-to') => void;
  getTaskById: (id: string) => TaskBrief | undefined;
  loading: boolean;
  error: string | null;
  refreshTasks: () => Promise<void>;
  useMockData: boolean;
  setUseMockData: (value: boolean) => void;
  createFolder: (name: string, parentId?: string) => Promise<void>;
  updateFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  moveFolder: (id: string, targetParentId: string) => Promise<void>;
  createSprint: (name: string, startDate?: string, endDate?: string) => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

const USE_MOCK_KEY = 'mc_use_mock_data';

function loadMockPreference(): boolean {
  try {
    return localStorage.getItem(USE_MOCK_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveMockPreference(value: boolean) {
  try {
    localStorage.setItem(USE_MOCK_KEY, value ? 'true' : 'false');
  } catch {}
}

export const TaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<TaskBrief[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [focusItems, setFocusItems] = useState<FocusItem[]>([]);
  const [activeSprintId, setActiveSprintId] = useState<string>('');
  const [activeFolderId, setActiveFolderId] = useState<string>('all');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockDataState] = useState(loadMockPreference);

  const setUseMockData = (value: boolean) => {
    saveMockPreference(value);
    setUseMockDataState(value);
  };

  const loadFocusItems = async () => {
    try {
      const items = await focusAPI.getFocusItems();
      setFocusItems(items);
    } catch (err) {
      console.error('Failed to load focus items:', err);
    }
  };

  const loadFromAPI = async () => {
    setLoading(true);
    setError(null);
    try {
      const [briefsRes, sprintsRes, foldersRes] = await Promise.all([
        briefsAPI.list(),
        sprintsAPI.list(),
        foldersAPI.getTree(),
      ]);

      const tasksFromApi = await Promise.all(
        briefsRes.map((b) => briefsAPI.get(b.folder_path).catch(() => null))
      );

      const validTasks = tasksFromApi.filter(Boolean).map((t) => ({
        id: t!.id,
        path: t!.folder_path,
        goal: t!.goal,
        technicalDetails: t!.technical_details,
        errorHandling: '',
        featureFlag: undefined,
        metrics: [],
        filesAffected: [],
        constraints: t!.constraints || [],
        references: [],
        checklist: [],
        decisions: (t!.decisions || []).map((d) => ({
          id: crypto.randomUUID(),
          question: '',
          answer: d.text,
          rationale: d.reason || '',
          source: '',
          timestamp: d.made_at,
        })),
        meta: {
          status: t!.status as TaskStatus,
          currentStep: t!.current_step,
          totalSteps: t!.total_steps,
          assignedAI: t!.assigned_tool || '',
          tags: t!.tags || [],
          owner: { name: '', avatar: '' },
          stakeholders: [],
          externalLinks: [],
          relations: [],
          resources: [],
        },
        subtasks: [],
      })) as TaskBrief[];
      setTasks(validTasks);
      setSprints(sprintsRes.map((s: { id: string; name: string; start_date?: string; end_date?: string; status: string }) => ({
        id: s.id,
        name: s.name,
        startDate: s.start_date || '',
        endDate: s.end_date || '',
        dayCount: 0,
        storyCount: validTasks.filter(t => t.path.startsWith(s.name)).length,
        tasks: validTasks.filter(t => t.path.startsWith(s.name)).map(t => t.id),
      })));

      const folderTree = foldersRes as ApiFolder;
      const flattenFolders = (f: ApiFolder, parentId?: string): Folder[] => {
        const current: Folder = {
          id: f.path || f.name,
          name: f.name,
          parentId,
          tasks: validTasks.filter(t => t.path.startsWith(f.path || f.name)).map(t => t.id),
          color: undefined,
        };
        const children = (f.children || []).flatMap(c => flattenFolders(c, current.id));
        return [current, ...children];
      };
      setFolders(flattenFolders(folderTree));

      if (sprintsRes.length > 0 && !activeSprintId) {
        setActiveSprintId(sprintsRes[0].id);
      }

      await loadFocusItems();
    } catch (err) {
      console.error('Failed to load from API:', err);
      setError('Failed to load from backend API');
    } finally {
      setLoading(false);
    }
  };

  const loadMock = () => {
    setTasks(INITIAL_TASKS);
    setSprints(INITIAL_SPRINTS);
    setFolders(INITIAL_FOLDERS);
    setActiveSprintId(INITIAL_SPRINTS[0].id);
    setLoading(false);
    setError(null);
  };

  const refreshTasks = async () => {
    if (useMockData) {
      loadMock();
    } else {
      await loadFromAPI();
    }
  };

  useEffect(() => {
    if (useMockData) {
      loadMock();
    } else {
      loadFromAPI();
    }
  }, [useMockData]);

  const toggleTag = (tag: string) => {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const updateTask = (updatedTask: TaskBrief) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    if (!useMockData) {
      const path = updatedTask.path;
      briefsAPI.update(path, {
        title: updatedTask.goal.split('\n')[0].substring(0, 50),
        status: updatedTask.meta.status.toLowerCase().replace(' ', '_'),
        current_step: updatedTask.meta.currentStep,
        total_steps: updatedTask.meta.totalSteps,
        assigned_tool: updatedTask.meta.assignedAI,
        tags: updatedTask.meta.tags,
        jira_key: updatedTask.meta.jiraKey,
        goal: updatedTask.goal,
        technical_details: updatedTask.technicalDetails,
      }).catch(err => console.error('Failed to update task:', err));
    }
  };

  const addTaskRelation = (sourceId: string, targetId: string, type: 'blocks' | 'blocked-by' | 'depends-on' | 'related-to') => {
    setTasks(prev => prev.map(task => {
      if (task.id === sourceId) {
        const target = prev.find(t => t.id === targetId);
        if (target) {
          const exists = task.meta.relations.some(r => r.targetPath === target.path && r.type === type);
          if (!exists) {
            return {
              ...task,
              meta: {
                ...task.meta,
                relations: [...task.meta.relations, { type, targetPath: target.path }]
              }
            };
          }
        }
      }
      return task;
    }));
  };

  const getTaskById = (id: string) => tasks.find(t => t.id === id);

  const createFolder = async (name: string, parentId?: string) => {
    try {
      await foldersAPI.create(name, parentId || '');
      await loadFromAPI();
    } catch (err) {
      console.error('Failed to create folder:', err);
      throw err;
    }
  };

  const updateFolder = async (id: string, name: string) => {
    try {
      await foldersAPI.update(id, name);
      await loadFromAPI();
    } catch (err) {
      console.error('Failed to update folder:', err);
      throw err;
    }
  };

  const deleteFolder = async (id: string) => {
    try {
      await foldersAPI.delete(id);
      await loadFromAPI();
    } catch (err) {
      console.error('Failed to delete folder:', err);
      throw err;
    }
  };

  const moveFolder = async (id: string, targetParentId: string) => {
    try {
      const targetPath = targetParentId ? `${targetParentId}/${id.split('/').pop()}` : id.split('/').pop() || id;
      await foldersAPI.move(id, targetPath);
      await loadFromAPI();
    } catch (err) {
      console.error('Failed to move folder:', err);
      throw err;
    }
  };

  const createSprint = async (name: string, startDate?: string, endDate?: string) => {
    try {
      await sprintsAPI.create(name, startDate, endDate);
      await loadFromAPI();
    } catch (err) {
      console.error('Failed to create sprint:', err);
      throw err;
    }
  };

  return (
    <TaskContext.Provider value={{
      tasks,
      sprints,
      folders,
      focusItems,
      loadFocusItems,
      activeSprintId,
      setActiveSprintId,
      activeFolderId,
      setActiveFolderId,
      activeTags,
      toggleTag,
      updateTask,
      addTaskRelation,
      getTaskById,
      loading,
      error,
      refreshTasks,
      useMockData,
      setUseMockData,
      createFolder,
      updateFolder,
      deleteFolder,
      moveFolder,
      createSprint,
    }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) throw new Error('useTasks must be used within a TaskProvider');
  return context;
};
