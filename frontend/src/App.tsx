import React, { useState, useRef, useEffect } from 'react';
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
  Clock,
  GripVertical,
  Pencil,
  Trash2,
  MoreHorizontal,
  X as XIcon,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  BarChart3
} from 'lucide-react';
import { cn } from './lib/utils';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import Dashboard from './components/Dashboard';
import TaskDetail from './components/TaskDetail';
import ReviewQueue from './components/ReviewQueue';
import TaskGraph from './components/TaskGraph';
import Kanban from './components/Kanban';
import LivingPlan from './components/LivingPlan';
import FolderModal from './components/FolderModal';
import SprintSummaryModal from './components/SprintSummaryModal';
import { TaskBrief } from './types';
import { searchAPI, briefsAPI } from './services/api';

type ViewMode = 'dashboard' | 'review' | 'graph' | 'kanban' | 'archive' | 'detail' | 'plan';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  folderId: string | null;
}

function AppContent() {
  const [view, setView] = useState<ViewMode>('dashboard');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const { tasks, folders, sprints, activeSprintId, setActiveSprintId, activeFolderId, setActiveFolderId, activeTags, toggleTag, useMockData, setUseMockData, error, createFolder, updateFolder, deleteFolder, moveFolder, createSprint } = useTasks();

  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [sprintSummaryOpen, setSprintSummaryOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, folderId: null });
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; title: string; folder_path: string; status: string; score: number }>>([]);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeSprint = sprints.find(s => s.id === activeSprintId);
  
  const handleOpenTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setView('detail');
  };

  const handleContextMenu = (e: React.MouseEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, folderId });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, folderId: null });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    if (contextMenu.visible) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu.visible]);

  const handleRenameFolder = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (folder) {
      setEditingFolderId(folderId);
      setEditingName(folder.name);
      closeContextMenu();
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (window.confirm('Are you sure you want to delete this folder?')) {
      try {
        await deleteFolder(folderId);
        if (activeFolderId === folderId) {
          setActiveFolderId('all');
        }
      } catch (err) {
        console.error('Failed to delete folder:', err);
      }
    }
    closeContextMenu();
  };

  const handleCreateFolder = async (name: string) => {
    try {
      await createFolder(name);
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const handleRenameSubmit = async () => {
    if (editingFolderId && editingName.trim()) {
      try {
        await updateFolder(editingFolderId, editingName.trim());
      } catch (err) {
        console.error('Failed to rename folder:', err);
      }
    }
    setEditingFolderId(null);
    setEditingName('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setEditingFolderId(null);
      setEditingName('');
    }
  };

  useEffect(() => {
    if (editingFolderId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingFolderId]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (searchQuery.trim().length > 0) {
      setSearchDropdownOpen(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await searchAPI.search(searchQuery);
          setSearchResults(results);
        } catch (err) {
          console.error('Search failed:', err);
          setSearchResults([]);
        }
      }, 300);
    } else {
      setSearchResults([]);
      setSearchDropdownOpen(false);
    }
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.closest('.search-container')?.contains(e.target as Node)) {
        setSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    
    try {
      await moveFolder(draggableId, folders[destination.index]?.parentId || '');
    } catch (err) {
      console.error('Failed to move folder:', err);
    }
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
            <div className="flex items-center justify-between pr-2">
              <h2 className="zone-title">Sprint</h2>
              <button
                onClick={() => setSprintSummaryOpen(true)}
                className="text-[11px] text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                title="Sprint Summary"
              >
                <BarChart3 size={12} />
              </button>
            </div>
            <div className="bg-[#F3F4F6] p-3 rounded-md space-y-2">
              <select
                value={activeSprintId}
                onChange={(e) => setActiveSprintId(e.target.value)}
                className="w-full text-[12px] font-bold text-slate-900 bg-transparent border-none outline-none cursor-pointer"
              >
                {sprints.map(sprint => (
                  <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
                ))}
              </select>
              {activeSprint && (
                <>
                  {activeSprint.startDate && activeSprint.endDate ? (
                    <>
                      {(() => {
                        const start = new Date(activeSprint.startDate);
                        const end = new Date(activeSprint.endDate);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        start.setHours(0, 0, 0, 0);
                        end.setHours(0, 0, 0, 0);
                        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                        const elapsedDays = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                        const dayProgress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
                        const currentDay = Math.min(totalDays, Math.max(1, elapsedDays + 1));
                        const daysRemaining = Math.max(0, totalDays - elapsedDays);
                        const isAtRisk = dayProgress < 50 && elapsedDays > totalDays * 0.5;
                        return (
                          <>
                            <div className="flex justify-between items-center text-[12px]">
                              <span className="text-slate-500 font-medium">Day {currentDay}/{totalDays}</span>
                              <div className="flex items-center gap-1">
                                {daysRemaining < 2 && daysRemaining > 0 && (
                                  <span className="flex items-center gap-0.5 text-[10px] text-red-500 font-semibold">
                                    <AlertTriangle size={10} />
                                  </span>
                                )}
                                <span className={cn(
                                  "text-[10px] font-medium",
                                  isAtRisk ? "text-red-500" : "text-slate-400"
                                )}>
                                  {isAtRisk ? "At Risk" : dayProgress >= 80 ? "On Track" : "In Progress"}
                                </span>
                              </div>
                            </div>
                            <div className="h-1 w-full bg-[#D1D5DB] rounded-full overflow-hidden">
                              <div
                                className={cn("h-full transition-all", isAtRisk ? "bg-red-400" : "bg-primary")}
                                style={{ width: `${dayProgress}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-500">
                                {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left
                              </span>
                              <span className="text-slate-400">{Math.round(dayProgress)}%</span>
                            </div>
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">No dates set</div>
                  )}
                  {activeSprint.tasks.length > 0 && (
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500">
                        {activeSprint.tasks.length} tasks
                      </span>
                      <span className="text-slate-400">
                        {tasks.filter(t => activeSprint.tasks.includes(t.id) && t.meta.status === 'Done').length} done
                      </span>
                    </div>
                  )}
                </>
              )}
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
            <div className="flex items-center justify-between pr-2">
              <h2 className="zone-title">Folders</h2>
              <button
                onClick={() => setFolderModalOpen(true)}
                className="p-1 hover:bg-slate-100 rounded transition-colors text-text-muted hover:text-primary"
                title="Create new folder"
              >
                <Plus size={14} />
              </button>
            </div>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="folders">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}>
                    {folders.map((folder, index) => (
                      <Draggable draggableId={folder.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "group flex items-center gap-1 w-full py-1 text-[13px] transition-colors rounded",
                              snapshot.isDragging ? "bg-slate-100 shadow-sm" : "",
                              activeFolderId === folder.id ? "text-text-main font-semibold" : "text-text-muted hover:text-primary"
                            )}
                            onContextMenu={(e) => handleContextMenu(e, folder.id)}
                            onDoubleClick={() => handleRenameFolder(folder.id)}
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="p-1 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <GripVertical size={12} />
                            </div>
                            <button
                              onClick={() => setActiveFolderId(folder.id)}
                              className="flex items-center gap-2 flex-1 min-w-0"
                            >
                              <div 
                                className="w-2 h-2 rounded-full shrink-0" 
                                style={{ backgroundColor: folder.color || '#9CA3AF' }} 
                              />
                              {editingFolderId === folder.id ? (
                                <input
                                  ref={editInputRef}
                                  type="text"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  onBlur={handleRenameSubmit}
                                  onKeyDown={handleRenameKeyDown}
                                  className="flex-1 px-1 py-0 text-[13px] border border-primary rounded-sm bg-white focus:outline-none"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span className="truncate">{folder.name}</span>
                              )}
                              <span className="text-[11px] text-text-muted opacity-60 shrink-0">{folder.tasks.length}</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleContextMenu(e, folder.id);
                              }}
                              className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600 rounded"
                            >
                              <MoreHorizontal size={12} />
                            </button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>

          {contextMenu.visible && (
            <div
              ref={contextMenuRef}
              className="fixed z-50 bg-white rounded-md shadow-lg border border-slate-200 py-1 min-w-[120px]"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <button
                onClick={() => contextMenu.folderId && handleRenameFolder(contextMenu.folderId)}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Pencil size={12} />
                Rename
              </button>
              <button
                onClick={() => contextMenu.folderId && handleDeleteFolder(contextMenu.folderId)}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={12} />
                Delete
              </button>
            </div>
          )}

          <FolderModal
            isOpen={folderModalOpen}
            onClose={() => setFolderModalOpen(false)}
            onCreate={handleCreateFolder}
          />

          <SprintSummaryModal
            isOpen={sprintSummaryOpen}
            onClose={() => setSprintSummaryOpen(false)}
            sprintId={activeSprintId}
            sprintName={activeSprint?.name || ''}
          />

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
            
            <div className="relative max-w-sm w-full ml-auto mr-4 search-container">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim() && setSearchDropdownOpen(true)}
                className="w-full bg-[#fafafa] border border-border rounded-[4px] pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setSearchResults([]); setSearchDropdownOpen(false); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
                >
                  <XIcon size={12} />
                </button>
              )}
              {searchDropdownOpen && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-[4px] shadow-lg z-50 max-h-64 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => {
                        setSelectedTaskId(result.id);
                        setView('detail');
                        setSearchQuery('');
                        setSearchDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-bg transition-colors flex items-center gap-3 border-b border-border/50 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text-main truncate">{result.title}</p>
                        <p className="text-[10px] text-text-muted truncate">{result.folder_path}</p>
                      </div>
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0",
                        result.status === 'Done' ? "bg-slate-100 text-slate-500" :
                        result.status === 'In progress' ? "bg-amber-100 text-amber-600" :
                        result.status === 'Review' ? "bg-green-100 text-green-600" :
                        result.status === 'Blocked' ? "bg-red-100 text-red-600" :
                        "bg-slate-100 text-slate-600"
                      )}>
                        {result.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {searchDropdownOpen && searchQuery.trim() && searchResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-[4px] shadow-lg z-50 p-4 text-center">
                  <p className="text-xs text-text-muted">No results found</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 text-text-muted hover:bg-slate-50 rounded-full transition-colors relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border-2 border-white" />
            </button>
            <button
              onClick={async () => {
                try {
                  const newBrief = await briefsAPI.create({
                    sprint: activeSprintId,
                    folder: 'new',
                    name: 'New Brief',
                    template_type: 'default'
                  });
                  setSelectedTaskId(newBrief.folder_path);
                  setView('detail');
                } catch (error) {
                  console.error('Failed to create brief:', error);
                }
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
