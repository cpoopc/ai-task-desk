
import React from 'react';
import { useTasks } from '../TaskContext';
import { TaskStatus, TaskBrief } from '../types';
import { cn } from '../lib/utils';
import { MoreHorizontal, Bot, MessageSquare, CheckCircle2, Plus } from 'lucide-react';

interface KanbanProps {
  onOpenTask: (taskId: string) => void;
}

const COLUMNS: TaskStatus[] = ['Backlog', 'Blocked', 'AI working', 'In progress', 'Review', 'Done'];

export default function Kanban({ onOpenTask }: KanbanProps) {
  const { tasks } = useTasks();

  const groupedTasks = tasks.reduce((acc, task) => {
    const status = task.meta.status;
    if (!acc[status]) acc[status] = [];
    acc[status].push(task);
    return acc;
  }, {} as Record<TaskStatus, TaskBrief[]>);

  return (
    <div className="h-full flex flex-col space-y-4">
       <div>
          <h2 className="text-[16px] font-bold text-text-main tracking-tight">Sprint Workflow</h2>
          <p className="text-[11px] text-text-muted">Track tasks through the automated development cycle.</p>
        </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-6 -mx-6 px-6">
        {COLUMNS.map(column => (
          <div key={column} className="w-[280px] shrink-0 flex flex-col space-y-2">
            <div className="flex items-center justify-between px-1">
               <div className="flex items-center gap-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{column}</h3>
                  <span className="bg-slate-100 text-text-muted px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold">
                    {groupedTasks[column]?.length || 0}
                  </span>
               </div>
               <button className="text-text-muted hover:text-text-main transition-colors">
                 <MoreHorizontal size={14} />
               </button>
            </div>

            <div className="flex-1 bg-slate-100/50 rounded-[4px] p-2 space-y-2 border border-border/50">
               {groupedTasks[column]?.map(task => (
                 <div 
                   key={task.id} 
                   onClick={() => onOpenTask(task.id)}
                   className="bg-white p-3 rounded-[4px] border border-border hover:border-primary/30 transition-all cursor-pointer group space-y-2"
                 >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                         <span className="text-[9px] font-mono text-text-muted uppercase">{task.path.split('/').pop()}</span>
                         {task.meta.assignedAI && (
                           <div className="flex items-center gap-1 text-[9px] font-bold text-info bg-info/5 px-1 py-0.5 rounded-[2px]">
                             <Bot size={8} /> {task.meta.assignedAI}
                           </div>
                         )}
                      </div>
                      <h4 className="text-[12px] font-semibold text-text-main line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                        {task.goal}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                       <div className="flex -space-x-1">
                          <img src={task.meta.owner.avatar} className="w-5 h-5 rounded-full ring-2 ring-white" />
                          {task.meta.stakeholders.length > 0 && (
                            <div className="w-5 h-5 rounded-full ring-2 ring-white bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-400">
                               +{task.meta.stakeholders.length}
                            </div>
                          )}
                       </div>
                       <div className="flex items-center gap-2 text-slate-300">
                          {task.checklist.length > 0 && (
                             <div className="flex items-center gap-1">
                                <CheckCircle2 size={10} />
                                <span className="text-[9px] font-bold">{task.checklist.filter(c => c.completed).length}/{task.checklist.length}</span>
                             </div>
                          )}
                          {task.decisions.length > 0 && (
                             <div className="flex items-center gap-1">
                                <MessageSquare size={10} />
                                <span className="text-[9px] font-bold">{task.decisions.length}</span>
                             </div>
                          )}
                       </div>
                    </div>
                 </div>
               ))}
               <button className="w-full py-2 hover:bg-white rounded-md text-slate-400 hover:text-slate-600 transition-all flex items-center justify-center gap-1.5">
                  <Plus size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Add Task</span>
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
