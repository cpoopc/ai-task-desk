
import React, { useEffect, useState } from 'react';
import { reviewsAPI, briefsAPI, ReviewItem, BriefResponse } from '../services/api';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Code2,
  RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ReviewQueueProps {
  onOpenTask: (taskId: string) => void;
}

interface ReviewItemDisplay extends ReviewItem {
  briefTitle?: string;
}

export default function ReviewQueue({ onOpenTask }: ReviewQueueProps) {
  const [reviews, setReviews] = useState<ReviewItemDisplay[]>([]);
  const [waitingBriefs, setWaitingBriefs] = useState<BriefResponse[]>([]);
  const [blockedBriefs, setBlockedBriefs] = useState<BriefResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reviewsData, waitingData, blockedData] = await Promise.all([
        reviewsAPI.list(),
        briefsAPI.list({ status: 'ai_working' }),
        briefsAPI.list({ status: 'blocked' }),
      ]);
      setReviews(reviewsData);
      setWaitingBriefs(waitingData);
      setBlockedBriefs(blockedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const readyReviews = reviews.filter(r => r.status === 'pending' || r.status === 'in_review');

  const getStatusBadge = (passed: boolean | null) => {
    if (passed === true) {
      return (
        <span className="flex items-center gap-1 text-xs text-success font-medium bg-success/5 px-2 py-1 rounded">
          <CheckCircle2 size={14} />
          Verified
        </span>
      );
    }
    if (passed === false) {
      return (
        <span className="flex items-center gap-1 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded">
          <AlertTriangle size={14} />
          Flagged
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-xs text-error font-medium bg-red-50 px-2 py-1 rounded">
        <XCircle size={14} />
        Missing
      </span>
    );
  };

  const totalLinesChanged = (item: ReviewItem) => {
    const added = item.files_changed.reduce((sum, f) => sum + f.lines_added, 0);
    const removed = item.files_changed.reduce((sum, f) => sum + f.lines_removed, 0);
    return { added, removed };
  };

  if (error) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="pb-6 border-b border-border">
          <h2 className="text-[16px] font-bold text-text-main tracking-tight">Review Queue</h2>
          <p className="text-[11px] text-text-muted">Batch review AI outputs with intent checking.</p>
        </header>
        <div className="p-12 text-center card border border-error/50 bg-error/5 rounded-lg">
          <AlertCircle className="text-error mx-auto mb-3" size={32} />
          <p className="text-sm text-error font-medium">Failed to load review queue</p>
          <p className="text-xs text-text-muted mt-1">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-error text-white text-xs font-bold rounded-lg hover:bg-error/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="pb-6 border-b border-border flex items-start justify-between">
        <div>
          <h2 className="text-[16px] font-bold text-text-main tracking-tight">Review Queue</h2>
          <p className="text-[11px] text-text-muted">Batch review AI outputs with intent checking.</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 text-text-muted hover:text-primary transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      {/* Ready for Review */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <ShieldCheck className="text-success" size={16} />
          <h3 className="text-[12px] font-bold text-text-muted uppercase tracking-wider">Ready for Review</h3>
          <span className="bg-success text-white px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold ml-2">
            {loading ? '-' : readyReviews.length}
          </span>
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="bg-white border border-border p-4 flex flex-col md:flex-row gap-8 items-center rounded-lg animate-pulse">
                  <div className="flex-1 space-y-3">
                    <div className="space-y-1">
                      <div className="h-3 w-48 bg-slate-200 rounded" />
                      <div className="h-5 w-64 bg-slate-200 rounded" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-6 w-24 bg-slate-200 rounded" />
                      <div className="h-6 w-24 bg-slate-200 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : readyReviews.length > 0 ? (
            readyReviews.map(item => {
              const lines = totalLinesChanged(item);
              return (
                <div
                  key={item.id}
                  onClick={() => onOpenTask(item.id)}
                  className="bg-white border border-border p-4 flex flex-col md:flex-row gap-8 items-center group cursor-pointer hover:border-primary/30 transition-all rounded-lg"
                >
                  <div className="flex-1 space-y-3 text-[13px]">
                    <div className="space-y-1">
                      <div className="text-[10px] text-text-muted font-mono uppercase">
                        <span>{item.brief_path}</span>
                        <span className="mx-1">•</span>
                        <span className="text-primary">{item.agent_tool}</span>
                      </div>
                      <h4 className="font-bold text-text-main group-hover:text-primary transition-colors line-clamp-2">
                        {item.diff_summary || 'No summary available'}
                      </h4>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {item.intent_checks.map((check, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          {getStatusBadge(check.passed)}
                          <span className="text-[10px] text-text-muted max-w-[150px] truncate">
                            {check.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-4 pl-8 border-l border-slate-100">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Changes</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Code2 size={16} className="text-slate-400" />
                        <span className="text-xs font-mono text-slate-600">
                          <span className="text-success">+{lines.added}</span>
                          {' '}
                          <span className="text-error">-{lines.removed}</span>
                          {' '}lines
                        </span>
                      </div>
                    </div>
                    <button className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center card border-dashed">
              <p className="text-sm text-slate-400">No items ready for review.</p>
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
            {loading ? '-' : waitingBriefs.length}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-white border border-border p-4 rounded-lg flex items-center gap-4 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-blue-50 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-4 w-32 bg-slate-200 rounded mb-2" />
                  <div className="h-3 w-48 bg-slate-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : waitingBriefs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {waitingBriefs.map(brief => (
              <div key={brief.id} className="bg-white border border-border p-4 rounded-lg flex items-center gap-4 animate-pulse-subtle">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                  <Clock size={16} className="animate-spin-slow" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[13px] font-bold text-text-main truncate leading-tight">{brief.title}</h4>
                  <p className="text-[10px] text-text-muted truncate">
                    Agent: {brief.assigned_tool || 'Unassigned'}
                  </p>
                </div>
                <div className="w-12 h-1 bg-border rounded-full overflow-hidden shrink-0">
                  <div className="h-full bg-blue-500 w-2/3 animate-progress" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center card border-dashed">
            <p className="text-sm text-slate-400">No briefs waiting for AI.</p>
          </div>
        )}
      </section>

      {/* Blocked */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <XCircle className="text-error" size={16} />
          <h3 className="text-[12px] font-bold text-text-muted uppercase tracking-wider text-error">Blocked</h3>
          <span className="bg-error text-white px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold ml-2">
            {loading ? '-' : blockedBriefs.length}
          </span>
        </div>

        {loading ? (
          <div className="space-y-1">
            {[1, 2].map(i => (
              <div key={i} className="flex items-center justify-between p-3 bg-red-50/30 border border-red-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-red-200 rounded" />
                  <div>
                    <div className="h-4 w-32 bg-red-200 rounded mb-1" />
                    <div className="h-3 w-24 bg-red-200 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : blockedBriefs.length > 0 ? (
          <div className="space-y-1">
            {blockedBriefs.map(brief => (
              <div key={brief.id} className="flex items-center justify-between p-3 bg-red-50/30 border border-red-100 rounded-lg group hover:bg-red-50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <AlertCircle size={16} className="text-error" />
                  <div>
                    <h4 className="text-[13px] font-bold text-text-main leading-tight">{brief.title}</h4>
                    <p className="text-[10px] text-error font-medium">Blocked</p>
                  </div>
                </div>
                <button className="text-[10px] font-bold text-error uppercase tracking-widest flex items-center gap-1 group-hover:translate-x-1 transition-transform pr-2">
                  Resolve <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center card border-dashed">
            <p className="text-sm text-slate-400">No blocked briefs.</p>
          </div>
        )}
      </section>
    </div>
  );
}
