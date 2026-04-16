
import React, { useState } from 'react';
import { useTasks } from '../TaskContext';
import { 
  X, 
  CheckSquare, 
  MessageSquare, 
  Settings, 
  Clock, 
  ExternalLink, 
  Trash2,
  Plus,
  ArrowRight,
  Save,
  ChevronRight,
  FileText
} from 'lucide-react';
import { cn } from '../lib/utils';
import { exportContext } from '../lib/exportUtils';
import ReactMarkdown from 'react-markdown';
import { ChecklistItem, Decision, TaskBrief } from '../types';

interface TaskDetailProps {
  taskId: string | null;
  onClose: () => void;
}

type Tab = 'Brief' | 'Checklist' | 'Decisions' | 'Meta' | 'Timeline';

export default function TaskDetail({ taskId, onClose }: TaskDetailProps) {
  const { tasks, updateTask } = useTasks();
  const [activeTab, setActiveTab] = useState<Tab>('Brief');
  
  const originalTask = taskId ? tasks.find(t => t.id === taskId) : null;
  const [task, setTask] = useState<TaskBrief | null>(originalTask || null);

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <p className="text-slate-500">Task not found or creating new...</p>
        <button onClick={onClose} className="btn-primary">Go Back</button>
      </div>
    );
  }

  const handleSave = () => {
    if (task) {
      updateTask(task);
      onClose();
    }
  };

  const tabs: Tab[] = ['Brief', 'Checklist', 'Decisions', 'Meta', 'Timeline'];

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden relative">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary">
            <FileText size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 leading-tight truncate max-w-md">
              {task.goal || 'New Task Brief'}
            </h2>
            <p className="text-[11px] text-slate-400 uppercase tracking-widest font-medium">Task Brief & Spec</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={handleSave} className="btn-primary flex items-center gap-2 h-9 text-xs px-5">
            <Save size={16} />
            Save Changes
          </button>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-md transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-6 border-b border-slate-100 shrink-0 bg-white">
        <nav className="flex gap-8">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "py-3 text-[11px] font-bold uppercase tracking-widest transition-all relative outline-none flex items-center gap-1.5",
                activeTab === tab ? "text-primary" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {tab === 'Checklist' && <div className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[8px]">!</div>}
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-10 focus-visible:outline-none">
        
        {activeTab === 'Brief' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Overall Goal</h3>
              <textarea 
                value={task.goal}
                onChange={e => setTask({...task, goal: e.target.value})}
                placeholder="One sentence task description..."
                className="w-full bg-slate-50/50 border border-slate-100 p-4 rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary/20 focus:border-primary/20 outline-none transition-all resize-none min-h-[80px]"
              />
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Technical Details</h3>
              <textarea 
                value={task.technicalDetails}
                onChange={e => setTask({...task, technicalDetails: e.target.value})}
                placeholder="API specs, schemas, definitions..."
                className="w-full bg-slate-50/50 border border-slate-100 p-4 rounded-lg text-sm font-mono focus:ring-1 focus:ring-primary/20 focus:border-primary/20 outline-none transition-all h-40"
              />
            </section>

            <div className="grid grid-cols-2 gap-8">
              <section className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Constraints</h3>
                <div className="space-y-2">
                  {task.constraints.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 group">
                      <div className="w-1.5 h-1.5 rounded-full bg-error shrink-0" />
                      <span className="text-sm text-slate-600 flex-1">{c}</span>
                      <button onClick={() => setTask({...task, constraints: task.constraints.filter((_, idx) => idx !== i)})} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-error transition-all">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <button className="text-xs text-primary font-semibold flex items-center gap-1.5 mt-2 hover:opacity-80 transition-opacity">
                    <Plus size={14} /> Add Constraint
                  </button>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Affected Files</h3>
                <div className="space-y-2">
                  {task.filesAffected.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded border border-slate-100">
                      <span className={cn(
                        "text-[9px] font-bold px-1 py-0.5 rounded",
                        f.action === 'new' ? "bg-green-100 text-green-700" : f.action === 'modify' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                      )}>{f.action.toUpperCase()}</span>
                      <span className="text-xs font-mono text-slate-600 truncate">{f.path}</span>
                    </div>
                  ))}
                  <button className="text-xs text-primary font-semibold flex items-center gap-1.5 mt-2 hover:opacity-80 transition-opacity">
                    <Plus size={14} /> Add File
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'Checklist' && (
          <div className="space-y-8 animate-in fade-in duration-300">
             <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Implementation Progress</h3>
                <span className="text-xs font-mono text-slate-500">
                  {task.checklist.filter(c => c.completed).length} / {task.checklist.length}
                </span>
             </div>

             <div className="space-y-6">
                {['Design', 'Auth', 'Implementation', 'Testing', 'Ops'].map(phase => {
                  const items = task.checklist.filter(i => i.phase === phase);
                  if (items.length === 0) return null;
                  return (
                    <div key={phase} className="space-y-3">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{phase}</h4>
                      <div className="space-y-1">
                        {items.map(item => (
                          <div 
                            key={item.id} 
                            onClick={() => {
                              const newList = task.checklist.map(i => i.id === item.id ? {...i, completed: !i.completed} : i);
                              setTask({...task, checklist: newList});
                            }}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer group",
                              item.completed ? "bg-slate-50/50 border-slate-100" : "bg-white border-slate-200 hover:border-primary/30"
                            )}
                          >
                            <div className={cn(
                              "mt-0.5 shrink-0",
                              item.completed ? "text-success" : "text-slate-300 group-hover:text-primary/50"
                            )}>
                              {item.completed ? <CheckSquare size={18} fill="currentColor" className="text-white" /> : <div className="w-[18px] h-[18px] border-2 border-current rounded" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className={cn("text-sm font-medium", item.completed ? "text-slate-400 line-through" : "text-slate-800")}>
                                    {item.text}
                                  </p>
                                  {item.priority === 'must' && (
                                    <span className="text-[9px] font-bold uppercase text-error px-1 bg-error/5 rounded">Must</span>
                                  )}
                                </div>
                                {item.hint && <p className="text-[11px] text-slate-400">{item.hint}</p>}
                                {item.completed && item.resolvedValue && (
                                  <div className="mt-2 text-[10px] bg-white border border-slate-100 rounded px-2 py-1 text-slate-500 w-fit">
                                    Resolved: {item.resolvedValue}
                                  </div>
                                )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
             </div>
          </div>
        )}

        {activeTab === 'Decisions' && (
           <div className="space-y-8 animate-in fade-in duration-300">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Decision Log</h3>
              <div className="space-y-4">
                {task.decisions.map(d => (
                  <div key={d.id} className="card p-5 space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                      <MessageSquare size={48} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Question</p>
                      <h4 className="text-sm font-semibold text-slate-800">{d.question}</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-success uppercase tracking-wider">Decision</p>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">{d.answer}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rationale</p>
                        <p className="text-xs text-slate-500 italic leading-relaxed">{d.rationale}</p>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Source: {d.source}</span>
                      <span>{d.timestamp}</span>
                    </div>
                  </div>
                ))}
                <button className="w-full py-4 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 flex items-center justify-center gap-2 hover:border-primary/50 hover:text-primary transition-all group">
                  <Plus size={18} className="group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold uppercase tracking-wider">Log New Decision</span>
                </button>
              </div>
           </div>
        )}

        {activeTab === 'Meta' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-2 gap-10">
              <div className="space-y-6">
                 <section className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">People</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <img src={task.meta.owner.avatar} className="w-8 h-8 rounded-full" />
                        <div>
                          <p className="text-xs font-semibold">{task.meta.owner.name}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Owner</p>
                        </div>
                      </div>
                      {task.meta.stakeholders.map((s, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <img src={s.avatar} className="w-8 h-8 rounded-full" />
                          <div>
                            <p className="text-xs font-semibold">{s.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Stakeholder</p>
                          </div>
                        </div>
                      ))}
                    </div>
                 </section>

                 <section className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                       {task.meta.tags.map(tag => (
                         <span key={tag} className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded">
                           {tag}
                         </span>
                       ))}
                    </div>
                 </section>
              </div>

              <div className="space-y-6">
                <section className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">External Links</h3>
                  <div className="space-y-2">
                    {task.meta.externalLinks.map((link, i) => (
                      <a 
                        key={i} 
                        href={link.url} 
                        className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-lg hover:border-primary/50 transition-all group"
                      >
                        <ExternalLink size={14} className="text-slate-400 group-hover:text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 truncate">{link.title}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{link.type}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Footer / Context Export */}
      <footer className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
             <Clock size={14} className="text-slate-400" />
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Last active 2h ago</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ready for Export</span>
           </div>
         </div>
         <div className="flex gap-2">
           <button 
             onClick={() => {
               const files = exportContext(task);
               console.log("Exported Files:", files);
               alert("Context exported to console (simulated file generation)");
             }}
             className="px-4 py-2 bg-white border border-slate-200 rounded-md text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 transition-colors"
           >
              Export Context
           </button>
           <button className="px-4 py-2 bg-slate-900 border border-slate-900 rounded-md text-[10px] font-bold uppercase tracking-wider text-white hover:bg-black transition-colors">
              Send to Agent
           </button>
         </div>
      </footer>
    </div>
  );
}
