import React, { useState } from 'react';
import { X, AlertTriangle, Calendar, Clock, Target, Trash2, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

export type DisruptionType = 'urgent_task' | 'reduced_capacity' | 'scope_change';

interface DisruptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (type: DisruptionType, data: any) => void;
}

export default function DisruptionModal({ isOpen, onClose, onSubmit }: DisruptionModalProps) {
  const [type, setType] = useState<DisruptionType | null>(null);
  const [urgentData, setUrgentData] = useState({
    task_name: '',
    priority: 'high',
    deadline: '',
    estimated_time: '1h',
    defer_lower_priority: false,
  });
  const [capacityData, setCapacityData] = useState({
    start_date: '',
    end_date: '',
    percentage: 50,
  });
  const [scopeData, setScopeData] = useState({
    add_tasks: [] as { title: string; taskId: string }[],
    remove_task_ids: [] as string[],
    reason: '',
  });
  const [newTaskTitle, setNewTaskTitle] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!type) return;
    if (type === 'urgent_task') {
      onSubmit(type, urgentData);
    } else if (type === 'reduced_capacity') {
      onSubmit(type, capacityData);
    } else if (type === 'scope_change') {
      onSubmit(type, scopeData);
    }
    onClose();
  };

  const addScopeTask = () => {
    if (!newTaskTitle.trim()) return;
    setScopeData(prev => ({
      ...prev,
      add_tasks: [...prev.add_tasks, { title: newTaskTitle, taskId: `scope-${Date.now()}` }],
    }));
    setNewTaskTitle('');
  };

  const removeScopeTask = (taskId: string) => {
    setScopeData(prev => ({
      ...prev,
      add_tasks: prev.add_tasks.filter(t => t.taskId !== taskId),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-[14px] font-bold text-text-main">Handle Disruption</h3>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-main transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!type ? (
            <div className="space-y-3">
              <p className="text-[11px] text-text-muted mb-3">Select disruption type:</p>
              <button
                onClick={() => setType('urgent_task')}
                className="w-full p-4 text-left bg-error/5 border border-error/20 rounded-lg hover:border-error/40 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center">
                    <AlertTriangle size={18} className="text-error" />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-text-main group-hover:text-error transition-colors">Add Urgent Task</h4>
                    <p className="text-[10px] text-text-muted">Insert a high-priority task, optionally defer lower priority</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setType('reduced_capacity')}
                className="w-full p-4 text-left bg-warning/5 border border-warning/20 rounded-lg hover:border-warning/40 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                    <Calendar size={18} className="text-warning" />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-text-main group-hover:text-warning transition-colors">Mark Capacity Reduction</h4>
                    <p className="text-[10px] text-text-muted">Indicate reduced availability, rebalance remaining work</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setType('scope_change')}
                className="w-full p-4 text-left bg-primary/5 border border-primary/20 rounded-lg hover:border-primary/40 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Target size={18} className="text-primary" />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-text-main group-hover:text-primary transition-colors">Scope Change</h4>
                    <p className="text-[10px] text-text-muted">Add or remove tasks from the sprint</p>
                  </div>
                </div>
              </button>
            </div>
          ) : (
            <>
              <button onClick={() => setType(null)} className="text-[10px] text-primary hover:underline mb-2">
                ← Back to selection
              </button>

              {type === 'urgent_task' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">Task Name</label>
                    <input
                      type="text"
                      value={urgentData.task_name}
                      onChange={(e) => setUrgentData(prev => ({ ...prev, task_name: e.target.value }))}
                      placeholder="What needs to be done urgently?"
                      className="w-full px-3 py-2 border border-border rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">Priority</label>
                      <select
                        value={urgentData.priority}
                        onChange={(e) => setUrgentData(prev => ({ ...prev, priority: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-primary/30"
                      >
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">Est. Time</label>
                      <input
                        type="text"
                        value={urgentData.estimated_time}
                        onChange={(e) => setUrgentData(prev => ({ ...prev, estimated_time: e.target.value }))}
                        placeholder="1h"
                        className="w-full px-3 py-2 border border-border rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">Deadline</label>
                    <input
                      type="text"
                      value={urgentData.deadline}
                      onChange={(e) => setUrgentData(prev => ({ ...prev, deadline: e.target.value }))}
                      placeholder="e.g., Today, Tomorrow, EOD"
                      className="w-full px-3 py-2 border border-border rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={urgentData.defer_lower_priority}
                      onChange={(e) => setUrgentData(prev => ({ ...prev, defer_lower_priority: e.target.checked }))}
                      className="rounded border-border"
                    />
                    <span className="text-[11px] text-text-main">Defer lower priority tasks to accommodate</span>
                  </label>
                </div>
              )}

              {type === 'reduced_capacity' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">Start Date</label>
                      <input
                        type="text"
                        value={capacityData.start_date}
                        onChange={(e) => setCapacityData(prev => ({ ...prev, start_date: e.target.value }))}
                        placeholder="e.g., 2024-01-15"
                        className="w-full px-3 py-2 border border-border rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">End Date</label>
                      <input
                        type="text"
                        value={capacityData.end_date}
                        onChange={(e) => setCapacityData(prev => ({ ...prev, end_date: e.target.value }))}
                        placeholder="e.g., 2024-01-20"
                        className="w-full px-3 py-2 border border-border rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">Capacity Reduction: {capacityData.percentage}%</label>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      step="10"
                      value={capacityData.percentage}
                      onChange={(e) => setCapacityData(prev => ({ ...prev, percentage: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[9px] text-text-muted mt-1">
                      <span>10%</span>
                      <span>90%</span>
                    </div>
                  </div>
                </div>
              )}

              {type === 'scope_change' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">Add Tasks</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Task title to add..."
                        className="flex-1 px-3 py-2 border border-border rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-primary/30"
                        onKeyDown={(e) => e.key === 'Enter' && addScopeTask()}
                      />
                      <button onClick={addScopeTask} className="btn btn-primary h-8 px-3">
                        <Plus size={14} />
                      </button>
                    </div>
                    {scopeData.add_tasks.length > 0 && (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {scopeData.add_tasks.map(task => (
                          <div key={task.taskId} className="flex items-center justify-between p-2 bg-slate-50 rounded text-[11px]">
                            <span>{task.title}</span>
                            <button onClick={() => removeScopeTask(task.taskId)} className="text-error hover:text-error/70">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">Reason</label>
                    <input
                      type="text"
                      value={scopeData.reason}
                      onChange={(e) => setScopeData(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Why is the scope changing?"
                      className="w-full px-3 py-2 border border-border rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border bg-slate-50/50">
          <button onClick={onClose} className="btn h-8 text-[11px]">
            Cancel
          </button>
          {type && (
            <button onClick={handleSubmit} className="btn btn-primary h-8 text-[11px]">
              Apply Disruption
            </button>
          )}
        </div>
      </div>
    </div>
  );
}