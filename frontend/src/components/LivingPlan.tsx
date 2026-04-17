
import React, { useState, useEffect } from 'react';
import { useTasks } from '../TaskContext';
import { aiService } from '../services/aiService';
import DisruptionModal, { DisruptionType } from './DisruptionModal';
import { 
  CheckCircle2, 
  Clock, 
  Pause, 
  ArrowRight, 
  RotateCcw, 
  Zap,
  Calendar,
  MoreVertical,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Search,
  Filter,
  GripVertical,
  AlertTriangle,
  CalendarDays,
  Target
} from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult 
} from '@hello-pangea/dnd';

export default function LivingPlan() {
  const { tasks, sprints, activeSprintId } = useTasks();
  const [plan, setPlan] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTime, setEditingTime] = useState<{ dayIdx: number, taskIdx: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [disruptionOpen, setDisruptionOpen] = useState(false);
  const [disruptionMenuOpen, setDisruptionMenuOpen] = useState(false);

  const activeSprint = sprints.find(s => s.id === activeSprintId);
  
  const allPoolTags = Array.from(new Set(tasks.flatMap(t => t.meta.tags)));

  const togglePoolTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const refreshPlan = async () => {
    if (!activeSprint) return;
    setLoading(true);
    const newPlan = await aiService.generateDailyPlan(tasks, activeSprint);
    setPlan(newPlan);
    setLoading(false);
  };

  const handleDisruption = async (type: DisruptionType, data: any) => {
    if (!activeSprint) return;
    try {
      await fetch(`/api/plan/${activeSprint.id}/disruption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disruption_type: type, data }),
      });
      await refreshPlan();
    } catch (err) {
      console.error('Failed to handle disruption:', err);
    }
    setDisruptionMenuOpen(false);
  };

  useEffect(() => {
    refreshPlan();
  }, [activeSprintId]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;

    // Handle moving from Task Pool to a Day
    if (source.droppableId === 'task-pool' && destination.droppableId.startsWith('day-')) {
      const dayIdx = parseInt(destination.droppableId.replace('day-', ''));
      const taskPool = tasks.filter(t => !plan.some(d => d.tasks.some((pt: any) => pt.taskId === t.id)));
      const filteredPool = taskPool.filter(t => 
        t.goal.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.path.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      const taskToAdd = filteredPool[source.index];
      const newPlan = [...plan];
      newPlan[dayIdx].tasks.splice(destination.index, 0, {
        taskId: taskToAdd.id,
        title: taskToAdd.goal.split('.')[0],
        estimatedTime: "1h",
        action: "Manually scheduled"
      });
      setPlan(newPlan);
      return;
    }

    // Handle moving within/between days
    if (source.droppableId.startsWith('day-') && destination.droppableId.startsWith('day-')) {
      const sourceDayIdx = parseInt(source.droppableId.replace('day-', ''));
      const destDayIdx = parseInt(destination.droppableId.replace('day-', ''));
      
      const newPlan = [...plan];
      const [movedTask] = newPlan[sourceDayIdx].tasks.splice(source.index, 1);
      newPlan[destDayIdx].tasks.splice(destination.index, 0, movedTask);
      setPlan(newPlan);
    }
  };

  const updateTaskTime = (dayIdx: number, taskIdx: number, newTime: string) => {
    const newPlan = [...plan];
    newPlan[dayIdx].tasks[taskIdx].estimatedTime = newTime;
    setPlan(newPlan);
    setEditingTime(null);
  };

  const removeTask = (dayIdx: number, taskIdx: number) => {
    const newPlan = [...plan];
    newPlan[dayIdx].tasks.splice(taskIdx, 1);
    setPlan(newPlan);
  };

  const poolTasks = tasks.filter(t => !plan.some(d => d.tasks.some((pt: any) => pt.taskId === t.id)))
    .filter(t => {
      const matchesSearch = t.goal.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           t.path.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTags = selectedTags.length === 0 || 
                         selectedTags.some(tag => t.meta.tags.includes(tag));
      return matchesSearch && matchesTags;
    });

  return (
    <DragDropContext onDragEnd={onDragEnd}> 
      <div className="flex gap-6 h-[calc(100vh-140px)] overflow-hidden">
        {/* Sidebar: Task Pool */}
        <aside className="w-72 flex flex-col bg-white border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-slate-50/50">
            <h3 className="text-xs font-bold text-text-main uppercase tracking-wider mb-3">Task Pool</h3>
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" size={12} />
              <input 
                type="text" 
                placeholder="Filter backlog..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-border rounded-md text-[11px] focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>

            <div className="flex flex-wrap gap-1">
              {allPoolTags.slice(0, 8).map(tag => (
                <button
                  key={tag}
                  onClick={() => togglePoolTag(tag)}
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors",
                    selectedTags.includes(tag) 
                      ? "bg-primary text-white border-primary" 
                      : "bg-white text-text-muted border-border hover:border-primary/30"
                  )}
                >
                  #{tag.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <Droppable droppableId="task-pool" isDropDisabled={true}>
            {(provided) => (
              <div 
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex-1 overflow-y-auto p-3 space-y-2"
              >
                {poolTasks.map((task, index) => (
                  <Draggable key={task.id} draggableId={task.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="p-3 bg-white border border-border rounded-lg hover:border-primary/30 shadow-sm transition-all group scale-100 active:scale-95"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-mono text-text-muted uppercase truncate flex-1">{task.meta.jiraKey || task.path.split('/').pop()}</span>
                          <GripVertical size={10} className="text-slate-300 group-hover:text-primary" />
                        </div>
                        <h4 className="text-[12px] font-semibold text-text-main leading-snug line-clamp-2">{task.goal}</h4>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                {poolTasks.length === 0 && (
                  <div className="py-12 text-center">
                    <p className="text-[10px] text-text-muted font-bold uppercase">No tasks found</p>
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </aside>

        {/* Main Content: Daily Plan */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <div className="max-w-3xl mx-auto space-y-6 pb-12">
            <header className="flex items-center justify-between sticky top-0 bg-bg z-10 py-2">
              <div>
                <h2 className="text-[16px] font-bold text-text-main tracking-tight">Active Strategy</h2>
                <p className="text-[11px] text-text-muted">Orchestrate your sprint execution manually or via AI.</p>
              </div>
              <div className="flex gap-2">
                 <button 
                   onClick={refreshPlan}
                   disabled={loading}
                   className="btn flex items-center gap-2 h-8"
                 >
                   <RotateCcw size={14} className={cn(loading && "animate-spin")} />
                   AI Rebalance
                 </button>
<div className="relative">
                  <button 
                    onClick={() => setDisruptionMenuOpen(!disruptionMenuOpen)}
                    className="btn btn-primary flex items-center gap-2 h-8 text-[11px]"
                  >
                    <Zap size={14} />
                    Disruption
                    <ChevronDown size={12} className={cn(disruptionMenuOpen && "rotate-180")} />
                  </button>
                  {disruptionMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setDisruptionMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-border rounded-lg shadow-lg z-20 overflow-hidden">
                        <div className="p-2">
                          <p className="text-[9px] font-bold text-text-muted uppercase px-2 py-1 mb-1">Select Disruption Type</p>
                          <button
                            onClick={() => { setDisruptionOpen(true); setDisruptionMenuOpen(false); }}
                            className="w-full flex items-center gap-3 px-2 py-2 rounded hover:bg-slate-50 transition-colors text-left"
                          >
                            <AlertTriangle size={14} className="text-error" />
                            <div>
                              <p className="text-[11px] font-semibold text-text-main">Add Urgent Task</p>
                              <p className="text-[9px] text-text-muted">Insert high-priority task</p>
                            </div>
                          </button>
                          <button
                            onClick={() => { setDisruptionOpen(true); setDisruptionMenuOpen(false); }}
                            className="w-full flex items-center gap-3 px-2 py-2 rounded hover:bg-slate-50 transition-colors text-left"
                          >
                            <CalendarDays size={14} className="text-warning" />
                            <div>
                              <p className="text-[11px] font-semibold text-text-main">Mark Capacity Reduction</p>
                              <p className="text-[9px] text-text-muted">Indicate reduced availability</p>
                            </div>
                          </button>
                          <button
                            onClick={() => { setDisruptionOpen(true); setDisruptionMenuOpen(false); }}
                            className="w-full flex items-center gap-3 px-2 py-2 rounded hover:bg-slate-50 transition-colors text-left"
                          >
                            <Target size={14} className="text-primary" />
                            <div>
                              <p className="text-[11px] font-semibold text-text-main">Scope Change</p>
                              <p className="text-[9px] text-text-muted">Add or remove tasks</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </header>

            <div className="space-y-8">
              {plan.map((day, idx) => (
                <section key={idx} className="space-y-3">
                  <div className="flex items-center gap-3">
                     <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-text-muted">
                        <Calendar size={12} />
                     </div>
                     <h3 className="text-[12px] font-bold text-text-main uppercase tracking-wider">{day.day}</h3>
                     <div className="h-px flex-1 bg-border" />
                  </div>

                  <Droppable droppableId={`day-${idx}`}>
                    {(provided, snapshot) => (
                      <div 
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={cn(
                          "min-h-[40px] space-y-2 rounded-lg transition-colors p-1",
                          snapshot.isDraggingOver ? "bg-primary/5 border border-dashed border-primary/20" : "bg-transparent"
                        )}
                      >
                        {day.tasks.map((item: any, i: number) => (
                          <Draggable key={item.taskId + '-' + i} draggableId={item.taskId + '-' + i} index={i}>
                            {(provided) => (
                              <div 
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="flex items-center gap-4 p-3 bg-white border border-border rounded-lg group hover:border-primary/30 transition-all shadow-sm"
                              >
                                 <div className="w-4 h-4 rounded border border-slate-200 flex items-center justify-center text-transparent group-hover:border-primary/50 group-hover:text-primary transition-all cursor-pointer">
                                    <CheckCircle2 size={10} fill="currentColor" className="opacity-0 group-hover:opacity-100" />
                                 </div>
                                 
                                 <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <h4 className="text-[13px] font-semibold text-text-main truncate leading-tight">{item.title}</h4>
                                      
                                      {editingTime?.dayIdx === idx && editingTime?.taskIdx === i ? (
                                        <input 
                                          autoFocus
                                          defaultValue={item.estimatedTime}
                                          onBlur={(e) => updateTaskTime(idx, i, e.target.value)}
                                          onKeyDown={(e) => e.key === 'Enter' && updateTaskTime(idx, i, e.currentTarget.value)}
                                          className="text-[10px] w-12 px-1 border border-primary/30 rounded focus:outline-none"
                                        />
                                      ) : (
                                        <span 
                                          onClick={() => setEditingTime({ dayIdx: idx, taskIdx: i })}
                                          className="text-[10px] text-text-muted font-mono hover:text-primary hover:underline cursor-pointer transition-colors"
                                        >
                                          {item.estimatedTime}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-text-muted truncate italic leading-tight">{item.action}</p>
                                 </div>

                                 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <GripVertical size={14} className="text-slate-300 mr-2" />
                                    <button 
                                      onClick={() => removeTask(idx, i)}
                                      className="p-1.5 text-slate-400 hover:text-error transition-colors bg-white border border-border rounded-md"
                                    >
                                       <Trash2 size={12} />
                                    </button>
                                 </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </section>
              ))}

              {!loading && plan.length === 0 && (
                 <div className="p-12 text-center card border-dashed">
                    <p className="text-sm text-slate-400">No active plan. Click "AI Rebalance" to generate one.</p>
                 </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <DisruptionModal
        isOpen={disruptionOpen}
        onClose={() => setDisruptionOpen(false)}
        onSubmit={handleDisruption}
      />
    </DragDropContext>
  );
}
