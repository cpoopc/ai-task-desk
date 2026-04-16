import React, { useState } from 'react';
import { TaskProvider, useTasks } from './TaskContext';
import { 
  LayoutDashboard, 
  ClipboardList, 
  GitGraph, 
  Trello, 
  Archive, 
  Search, 
  Plus, 
  ChevronRight,
  Bell,
  Settings,
  Circle,
  Clock
} from 'lucide-react';
import { cn } from './lib/utils';
import Dashboard from './components/Dashboard';
import TaskDetail from './components/TaskDetail';
import ReviewQueue from './components/ReviewQueue';
import TaskGraph from './components/TaskGraph';
import Kanban from './components/Kanban';
import LivingPlan from './components/LivingPlan';
import { TaskBrief } from './types';

type ViewMode = 'dashboard' | 'review' | 'graph' | 'kanban' | 'archive' | 'detail' | 'plan';

function AppContent() {
  const [view, setView] = useState<ViewMode>('dashboard');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const { tasks, folders, sprints, activeSprintId, setActiveSprintId, activeFolderId, setActiveFolderId, activeTags, toggleTag, useMockData, setUseMockData, error } = useTasks();

  const activeSprint = sprints.find(s => s.id === activeSprintId);
  
  const handleOpenTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setView('detail');
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'plan', label: 'Living Plan', icon: Clock },
    { id: 'review', label: 'Review Queue', icon: ClipboardList },
    { id: 'graph', label: 'Task Graph', icon: GitGraph },
    { id: 'kanban', label: 'Kanban', icon: Trello },
    { id: 'archive', label: 'Archive', icon: Archive },
  ];

  const allTags = Array.from(new Set(tasks.flatMap(t => t.meta.tags)));

  return (
    <div className="flex h-screen bg-[#fdfdfd] text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[240px] flex flex-col border-r border-slate-200 bg-white">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-2 px-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-xs">MC</span>
            </div>
            <h1 className="font-semibold text-sm tracking-tight text-primary">Mission Control</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-0 space-y-0">
          {/* Sprint Zone */}
          <div className="sidebar-zone space-y-3">
            <h2 className="zone-title">Current Sprint</h2>
            <div className="bg-[#F3F4F6] p-3 rounded-md space-y-2">
              <div className="flex justify-between items-center text-[12px]">
                <strong className="text-slate-900 font-bold">{activeSprint?.name}</strong>
                <span className="text-slate-500 font-medium">Day 4/10</span>
              </div>
              <div className="h-1 w-full bg-[#D1D5DB] rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: '65%' }} />
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="sidebar-zone space-y-1">
            <h2 className="zone-title">Navigation</h2>
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setView(item.id as ViewMode)}
                className={cn(
                  "flex items-center gap-3 w-full py-1 text-[13px] transition-colors",
                  view === item.id ? "text-primary font-semibold" : "text-text-main hover:text-primary"
                )}
              >
                <item.icon size={16} />
                {item.label}
                {item.id === 'review' && tasks.filter(t => t.meta.status === 'Review').length > 0 && (
                  <span className="ml-auto text-[10px] bg-info text-white px-1.5 py-0.5 rounded-[4px] font-bold">
                    {tasks.filter(t => t.meta.status === 'Review').length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Folders */}
          <div className="sidebar-zone space-y-1">
            <h2 className="zone-title">Folders</h2>
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => setActiveFolderId(folder.id)}
                className={cn(
                  "flex items-center gap-2 w-full py-1 text-[13px] transition-colors",
                  activeFolderId === folder.id ? "text-text-main font-semibold" : "text-text-muted hover:text-primary"
                )}
              >
                <div 
                  className="w-2 h-2 rounded-full shrink-0" 
                  style={{ backgroundColor: folder.color || '#9CA3AF' }} 
                />
                <span className="truncate">{folder.name}</span>
                <span className="ml-auto text-[11px] text-text-muted opacity-60">{folder.tasks.length}</span>
              </button>
            ))}
          </div>

          {/* Tags */}
          <div className="sidebar-zone border-0 space-y-3">
            <h2 className="zone-title">Tags</h2>
            <div className="flex flex-wrap gap-1.5">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "px-2 py-0.5 text-[10px] rounded-[4px] transition-colors",
                    activeTags.includes(tag) 
                      ? "bg-primary font-semibold text-white" 
                      : "bg-border/50 text-text-main hover:bg-border"
                  )}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 space-y-2">
          {error && (
            <div className="text-[10px] text-red-500 px-2">API Error</div>
          )}
          <div className="flex items-center justify-between px-2">
            <span className="text-[11px] text-slate-500">Debug Mode</span>
            <button
              onClick={() => setUseMockData(!useMockData)}
              className={`relative w-9 h-5 rounded-full transition-colors ${useMockData ? 'bg-amber-500' : 'bg-emerald-500'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${useMockData ? 'translate-x-4' : ''}`}
              />
            </button>
          </div>
          <div className="text-[10px] text-slate-400 px-2">
            {useMockData ? 'Using mock data' : 'Using real API'}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* TopBar */}
        <header className="h-[56px] border-b border-border bg-white flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-[16px] font-semibold text-text-main">Dashboard</h1>
              <span className="text-[11px] font-medium px-2 py-0.5 bg-[#EEF2FF] text-primary rounded-full">
                {tasks.length} Active Tasks
              </span>
            </div>
            
            <div className="relative max-w-sm w-full ml-auto mr-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
              <input 
                type="text" 
                placeholder="Search..."
                className="w-full bg-[#fafafa] border border-border rounded-[4px] pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 text-text-muted hover:bg-slate-50 rounded-full transition-colors relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border-2 border-white" />
            </button>
            <button 
              onClick={() => {
                setSelectedTaskId(null);
                setView('detail');
              }}
              className="btn btn-primary flex items-center gap-2 h-8 text-xs sm:px-4"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">New Brief</span>
            </button>
          </div>
        </header>

        {/* Dynamic View */}
        <div className="flex-1 overflow-y-auto p-6 bg-bg">
          {view === 'dashboard' && <Dashboard onOpenTask={handleOpenTask} />}
          {view === 'plan' && <LivingPlan />}
          {view === 'detail' && (
            <TaskDetail 
              taskId={selectedTaskId} 
              onClose={() => setView('dashboard')} 
            />
          )}
          {view === 'review' && <ReviewQueue onOpenTask={handleOpenTask} />}
          {view === 'graph' && <TaskGraph />}
          {view === 'kanban' && <Kanban onOpenTask={handleOpenTask} />}
          {view === 'archive' && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
              <Archive size={48} className="opacity-20" />
              <p className="text-sm">No archived sessions yet.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <TaskProvider>
      <AppContent />
    </TaskProvider>
  );
}
