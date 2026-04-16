
import React from 'react';
import { useTasks } from '../TaskContext';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Users, 
  ChevronRight,
  MoreVertical,
  Layers,
  Bot
} from 'lucide-react';
import { cn } from '../lib/utils';
import { TaskStatus, TaskBrief } from '../types';

interface DashboardProps {
  onOpenTask: (taskId: string) => void;
}

const STATUS_TAG_CLASSES: Record<TaskStatus, string> = {
  'Backlog': 'bg-slate-100 text-slate-600',
  'Blocked': 'bg-red-100 text-red-600',
  'AI working': 'bg-blue-100 text-blue-600',
  'In progress': 'bg-amber-100 text-amber-600',
  'Review': 'bg-green-100 text-green-600',
  'Done': 'bg-slate-50 text-slate-400',
};

export default function Dashboard({ onOpenTask }: DashboardProps) {
  const { tasks, activeFolderId, activeTags } = useTasks();

  const filteredTasks = tasks.filter(task => {
    const matchesFolder = activeFolderId === 'all' || task.path.startsWith(activeFolderId);
    const matchesTags = activeTags.length === 0 || activeTags.every(tag => task.meta.tags.includes(tag));
    return matchesFolder && matchesTags;
  });

  // Focus Items (simulated logic)
  const focusItems = tasks.filter(t => t.meta.status === 'Review' || t.meta.status === 'Blocked' || t.meta.status === 'AI working').slice(0, 3);

  return (
    <div className="space-y-6 max-w-6xl mx-auto flex flex-col h-full">
      {/* Layer 1: Attention Area */}
      <section className="shrink-0 space-y-3">
        <h2 className="text-[12px] font-bold text-text-muted uppercase tracking-wider pl-1">Needs your attention now</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {focusItems.map((task, i) => (
            <div 
              key={task.id} 
              className={cn(
                "group cursor-pointer bg-white border border-border p-4 rounded-lg relative overflow-hidden transition-all hover:border-primary/30",
              )}
              onClick={() => onOpenTask(task.id)}
            >
              <div className={cn(
                "absolute left-0 top-3 bottom-3 w-[3px] rounded-r-[2px]",
                task.meta.status === 'Blocked' ? "bg-status-red" : 
                task.meta.status === 'Review' ? "bg-status-blue" : "bg-status-green"
              )} />
              
              <h3 className="text-[13px] font-bold text-text-main mb-1 group-hover:text-primary transition-colors">
                {task.meta.status === 'Review' ? 'Review: ' : task.meta.status === 'Blocked' ? 'Blocked: ' : 'AI Finish: '}
                {task.goal.split('.')[0]}
              </h3>
              <p className="text-[11px] text-text-muted mb-4 line-clamp-1">
                {task.meta.status === 'Review' ? `Unblocks 3 sub-tasks • ${task.meta.assignedAI}` : 
                 task.meta.status === 'Blocked' ? `Database schema mismatch • P0` : 
                 `100% coverage achieved • ${task.meta.assignedAI}`}
              </p>
              
              <button className="w-full border border-primary text-primary bg-transparent py-1.5 rounded-[4px] text-[11px] font-bold uppercase transition-colors hover:bg-primary/5">
                {task.meta.status === 'Review' ? 'OPEN REVIEW' : task.meta.status === 'Blocked' ? 'RESOLVE BLOCKER' : 'VERIFY OUTPUT'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Layer 2: Active Tasks */}
      <section className="flex-1 flex flex-col min-h-0 space-y-3">
        <h2 className="text-[12px] font-bold text-text-muted uppercase tracking-wider pl-1">Active Tasks</h2>
        
        <div className="bg-white border border-border rounded-lg flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[32px_1fr_120px_100px_100px] gap-4 px-4 py-2.5 border-b border-border bg-slate-50/50 text-[11px] font-bold text-text-muted uppercase tracking-wider shrink-0">
            <span></span>
            <span>Task Name</span>
            <span>Status</span>
            <span>Tool</span>
            <span>Key</span>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto">
            {filteredTasks.map(task => (
              <div 
                key={task.id}
                onClick={() => onOpenTask(task.id)}
                className="grid grid-cols-[32px_1fr_120px_100px_100px] gap-4 px-4 py-2.5 border-b border-slate-50 items-center text-[13px] hover:bg-bg cursor-pointer group transition-colors last:border-0"
              >
                <span><input type="checkbox" className="rounded" onClick={(e) => e.stopPropagation()} /></span>
                <span className="text-text-main font-medium group-hover:text-primary transition-colors truncate">
                  {task.goal}
                </span>
                <span>
                  <span className={cn("status-tag", STATUS_TAG_CLASSES[task.meta.status])}>
                    {task.meta.status}
                  </span>
                </span>
                <span className="text-text-muted font-medium">
                  {task.meta.assignedAI || '-'}
                </span>
                <span className="font-mono text-[10px] text-text-muted">
                  {task.meta.jiraKey || '-'}
                </span>
              </div>
            ))}
            
            {/* Simulation of a "Done" task as per design */}
            <div className="grid grid-cols-[32px_1fr_120px_100px_100px] gap-4 px-4 py-2.5 border-b border-slate-50 items-center text-[13px] opacity-40 hover:bg-bg cursor-pointer truncate last:border-0">
              <span><input type="checkbox" checked readOnly className="rounded" /></span>
              <span className="line-through">Setup Sentry alerting</span>
              <span><span className="status-tag bg-slate-100 text-slate-500">Done</span></span>
              <span>-</span>
              <span className="font-mono text-[10px]">MC-82</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
