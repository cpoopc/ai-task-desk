import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TaskBrief, Sprint, Folder } from './types';
import { briefsAPI, sprintsAPI, foldersAPI } from './services/api';
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

      const validTasks = tasksFromApi.filter(Boolean) as TaskBrief[];
      setTasks(validTasks);
      setSprints(sprintsRes.map((s: { id: string; name: string; start_date?: string; status: string }) => ({
        id: s.id,
        name: s.name,
        startDate: s.start_date || '',
        endDate: '',
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

  return (
    <TaskContext.Provider value={{
      tasks,
      sprints,
      folders,
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
