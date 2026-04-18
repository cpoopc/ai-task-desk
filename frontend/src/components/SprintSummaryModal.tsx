import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Clock, TrendingUp, Download } from 'lucide-react';
import { cn } from '../lib/utils';
import { sprintsAPI, type SprintProgress, type SprintSummary } from '../services/api';

interface SprintSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprintId: string;
  sprintName: string;
}

export default function SprintSummaryModal({ isOpen, onClose, sprintId, sprintName }: SprintSummaryModalProps) {
  const [progress, setProgress] = useState<SprintProgress | null>(null);
  const [summary, setSummary] = useState<SprintSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && sprintId) {
      loadData();
    }
  }, [isOpen, sprintId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [progressData, summaryData] = await Promise.all([
        sprintsAPI.getProgress(sprintId),
        sprintsAPI.getSummary(sprintId),
      ]);
      setProgress(progressData);
      setSummary(summaryData);
    } catch (err) {
      console.error('Failed to load sprint data:', err);
      setError('Failed to load sprint data');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const exportAsMarkdown = () => {
    if (!summary) return;
    const md = `# ${summary.sprint_name} - Sprint Summary

## Sprint Information
- **Status**: ${summary.status}
- **Start Date**: ${summary.start_date || 'Not set'}
- **End Date**: ${summary.end_date || 'Not set'}

## Progress
- **Total Tasks**: ${summary.total_tasks}
- **Completed**: ${summary.completed_tasks}
- **Completion Rate**: ${summary.completion_rate}%

## Task Breakdown
${Object.entries(summary.tasks_by_status).map(([status, count]) => `- ${status}: ${count}`).join('\n')}

## Blockers
${summary.blockers.length > 0 ? summary.blockers.map(b => `- ${b}`).join('\n') : 'No blockers'}

## Upcoming Deadlines
${summary.upcoming_deadlines.length > 0 ? summary.upcoming_deadlines.map(d => `- ${d}`).join('\n') : 'No upcoming deadlines'}

## Recommendations
${summary.recommendations.length > 0 ? summary.recommendations.map(r => `- ${r}`).join('\n') : 'No recommendations'}
`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${summary.sprint_name.replace(/\s+/g, '-')}-summary.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onKeyDown={handleKeyDown}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-[600px] max-w-[90vw] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-sm text-slate-900">Sprint Summary: {sprintName}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={exportAsMarkdown}
              className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400"
              title="Export as Markdown"
            >
              <Download size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-red-500 text-sm">{error}</div>
          )}

          {!loading && !error && summary && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wide">Total Tasks</div>
                  <div className="text-xl font-bold text-slate-900">{summary.total_tasks}</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3">
                  <div className="text-[10px] text-emerald-600 uppercase tracking-wide">Completed</div>
                  <div className="text-xl font-bold text-emerald-700">{summary.completed_tasks}</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-[10px] text-blue-600 uppercase tracking-wide">Completion</div>
                  <div className="text-xl font-bold text-blue-700">{summary.completion_rate}%</div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-700 mb-2">Task Status Breakdown</h4>
                <div className="space-y-2">
                  {(Object.entries(summary.tasks_by_status) as [string, number][]).map(([status, count]) => {
                    const percentage = summary.total_tasks > 0 ? (count / summary.total_tasks) * 100 : 0;
                    const colors: Record<string, string> = {
                      todo: 'bg-slate-400',
                      in_progress: 'bg-amber-400',
                      review: 'bg-green-400',
                      done: 'bg-emerald-500',
                      blocked: 'bg-red-400',
                    };
                    return (
                      <div key={status} className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 w-20 capitalize">{status.replace('_', ' ')}</span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full transition-all', colors[status] || 'bg-slate-400')}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {summary.blockers.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    Blockers
                  </h4>
                  <ul className="space-y-1">
                    {summary.blockers.map((blocker, i) => (
                      <li key={i} className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                        {blocker}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.upcoming_deadlines.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1">
                    <Clock size={12} />
                    Upcoming Deadlines (&lt; 2 days)
                  </h4>
                  <ul className="space-y-1">
                    {summary.upcoming_deadlines.map((deadline, i) => (
                      <li key={i} className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                        {deadline}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.recommendations.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                    <TrendingUp size={12} />
                    Recommendations
                  </h4>
                  <ul className="space-y-1">
                    {summary.recommendations.map((rec, i) => (
                      <li key={i} className="text-xs text-blue-600 flex items-start gap-1">
                        <CheckCircle size={10} className="mt-0.5 shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}