
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { TaskBrief, Sprint, Folder, TaskStatus } from './types';
import { INITIAL_TASKS, INITIAL_SPRINTS, INITIAL_FOLDERS } from './constants';

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
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<TaskBrief[]>(INITIAL_TASKS);
  const [sprints] = useState<Sprint[]>(INITIAL_SPRINTS);
  const [folders] = useState<Folder[]>(INITIAL_FOLDERS);
  const [activeSprintId, setActiveSprintId] = useState<string>(INITIAL_SPRINTS[0].id);
  const [activeFolderId, setActiveFolderId] = useState<string>('all');
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const toggleTag = (tag: string) => {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const updateTask = (updatedTask: TaskBrief) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const addTaskRelation = (sourceId: string, targetId: string, type: 'blocks' | 'blocked-by' | 'depends-on' | 'related-to') => {
    setTasks(prev => prev.map(task => {
      if (task.id === sourceId) {
        const target = prev.find(t => t.id === targetId);
        if (target) {
          // Check if relation already exists
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
      getTaskById
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
