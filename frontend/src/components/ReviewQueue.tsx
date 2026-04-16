
import React from 'react';
import { useTasks } from '../TaskContext';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ChevronRight, 
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Code2
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ReviewQueueProps {
  onOpenTask: (taskId: string) => void;
}

export default function ReviewQueue({ onOpenTask }: ReviewQueueProps) {
  const { tasks } = useTasks();

  const reviewTasks = tasks.filter(t => t.meta.status === 'Review');
  const waitingTasks = tasks.filter(t => t.meta.status === 'AI working');
  const blockedTasks = tasks.filter(t => t.meta.status === 'Blocked');

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="pb-6 border-b border-border">
        <h2 className="text-[16px] font-bold text-text-main tracking-tight">Review Queue</h2>
        <p className="text-[11px] text-text-muted">Batch review AI outputs with intent checking.</p>
      </header>

      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <ShieldCheck className="text-success" size={16} />
          <h3 className="text-[12px] font-bold text-text-muted uppercase tracking-wider">Ready for Review</h3>
          <span className="bg-success text-white px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold ml-2">
            {reviewTasks.length}
          </span>
        </div>

        <div className="space-y-2">
          {reviewTasks.map(task => (
            <div 
              key={task.id}
              onClick={() => onOpenTask(task.id)}
              className="bg-white border border-border p-4 flex flex-col md:flex-row gap-8 items-center group cursor-pointer hover:border-primary/30 transition-all rounded-lg"
            >
              <div className="flex-1 space-y-3 text-[13px]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px] text-text-muted font-mono uppercase">
                    <span>{task.meta.jiraKey}</span>
                    <span>•</span>
                    <span className="truncate max-w-[200px]">{task.path}</span>
                  </div>
                  <h4 className="font-bold text-text-main group-hover:text-primary transition-colors">{task.goal}</h4>
                </div>

                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-success font-medium bg-success/5 px-2 py-1 rounded">
                    <ShieldCheck size={14} />
                    <span>Verified Implementation</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded">
                    <AlertTriangle size={14} />
                    <span>Divergence Detected</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-4 pl-8 border-l border-slate-100">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Agent Output</p>
                  <div className="flex items-center gap-2 mt-1">
                     <Code2 size={16} className="text-slate-400" />
                     <span className="text-xs font-mono text-slate-600">+142 -23 lines</span>
                  </div>
                </div>
                <button className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          ))}
          {reviewTasks.length === 0 && (
             <div className="p-12 text-center card border-dashed">
                <p className="text-sm text-slate-400">No tasks ready for review.</p>
             </div>
          )}
        </div>
      </section>

      {/* Waiting for AI */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Clock className="text-info" size={16} />
          <h3 className="text-[12px] font-bold text-text-muted uppercase tracking-wider">Waiting for AI</h3>
          <span className="bg-info text-white px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold ml-2">
            {waitingTasks.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {waitingTasks.map(task => (
            <div key={task.id} className="bg-white border border-border p-4 rounded-lg flex items-center gap-4 animate-pulse-subtle">
               <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                  <Clock size={16} className="animate-spin-slow" />
               </div>
               <div className="flex-1 min-w-0">
                  <h4 className="text-[13px] font-bold text-text-main truncate leading-tight">{task.goal}</h4>
                  <p className="text-[10px] text-text-muted truncate">Agent: {task.meta.assignedAI} • Est. 4m left</p>
               </div>
               <div className="w-12 h-1 bg-border rounded-full overflow-hidden shrink-0">
                  <div className="h-full bg-blue-500 w-2/3 animate-progress" />
               </div>
            </div>
          ))}
        </div>
      </section>

      {/* Blocked */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <XCircle className="text-error" size={16} />
          <h3 className="text-[12px] font-bold text-text-muted uppercase tracking-wider text-error">Blocked</h3>
          <span className="bg-error text-white px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold ml-2">
            {blockedTasks.length}
          </span>
        </div>

        <div className="space-y-1">
          {blockedTasks.map(task => (
            <div key={task.id} className="flex items-center justify-between p-3 bg-red-50/30 border border-red-100 rounded-lg group hover:bg-red-50 transition-colors cursor-pointer">
               <div className="flex items-center gap-3">
                  <AlertCircle size={16} className="text-error" />
                  <div>
                    <h4 className="text-[13px] font-bold text-text-main leading-tight">{task.goal}</h4>
                    <p className="text-[10px] text-error font-medium">Needs developer architecture tradeoff</p>
                  </div>
               </div>
               <button className="text-[10px] font-bold text-error uppercase tracking-widest flex items-center gap-1 group-hover:translate-x-1 transition-transform pr-2">
                  Resolve <ArrowRight size={14} />
               </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
