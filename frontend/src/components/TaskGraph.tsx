
import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  Connection,
  Handle,
  Position,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { searchAPI } from '../services/api';
import { Bot, Layers, Layout, List as ListIcon, Trash2, MousePointer2, GitCommitHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';

interface GraphNode {
  id: string;
  title: string;
  path: string;
  status: string;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
  score: number;
}

const STATUS_COLORS: Record<string, string> = {
  'drafting': '#94a3b8',
  'in_progress': '#f59e0b',
  'review': '#10b981',
  'done': '#6b7280',
  'blocked': '#ef4444',
};

const EDGE_COLORS: Record<string, string> = {
  'blocks': '#EF4444',
  'depends-on': '#f97316',
  'related-to': '#9ca3af',
  'linked': '#534AB7',
};

const STATUS_BORDER_COLORS: Record<string, string> = {
  'Blocked': '#ef4444',
  'Review': '#10b981',
  'In progress': '#f59e0b',
  'AI working': '#3b82f6',
  'Done': '#6b7280',
  'Backlog': '#94a3b8',
};

const SimpleTaskNode = ({ data, onClick }: { data: GraphNode; onClick?: () => void }) => {
  return (
    <div
      className="w-[180px] bg-white border border-border rounded-lg shadow-sm hover:border-primary/50 transition-all p-3 cursor-pointer"
      style={{ borderLeftWidth: 4, borderLeftColor: STATUS_BORDER_COLORS[data.status] || '#e5e7eb' }}
      onClick={onClick}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-slate-300" />
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono text-text-muted uppercase truncate max-w-[80px]">
            {data.path.split('/').pop()}
          </span>
        </div>
        <h4 className="text-[11px] font-bold text-text-main line-clamp-2 leading-tight">
          {data.title}
        </h4>
        <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-50 mt-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: STATUS_COLORS[data.status] || '#e5e7eb' }}
          />
          <span className="text-[9px] text-text-muted font-bold uppercase">{data.status}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-primary" />
    </div>
  );
};

const nodeTypes = {
  task: SimpleTaskNode,
};

interface TaskGraphProps {
  onOpenTask?: (taskPath: string) => void;
}

export default function TaskGraph({ onOpenTask }: TaskGraphProps) {
  const [view, setView] = useState<'graph' | 'text'>('graph');
  const [mode, setMode] = useState<'move' | 'connect'>('move');
  const [nodes, setNodes] = useState<Node<any>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(false);

  const loadGraphData = useCallback(async () => {
    setLoading(true);
    try {
      const graphData = await searchAPI.getGraph();

      const newNodes: Node<any>[] = graphData.nodes.map((n, idx) => ({
        id: n.id,
        type: 'task',
        position: { x: (idx % 4) * 250, y: Math.floor(idx / 4) * 160 },
        data: { ...n, onClick: () => onOpenTask?.(n.path) },
      }));

      const nodeIds = new Set(graphData.nodes.map(n => n.id));
      const newEdges: Edge[] = graphData.edges
        .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
        .map((e, idx) => ({
          id: `edge-${e.source}-${e.target}-${idx}`,
          source: e.source,
          target: e.target,
          label: e.type,
          labelStyle: { fontSize: 8, fill: '#94a3b8', fontWeight: 700 },
          style: {
            stroke: EDGE_COLORS[e.type] || '#9ca3af',
            strokeWidth: 2,
          },
          animated: e.type === 'depends-on',
        }));

      setNodes(newNodes);
      setEdges(newEdges);
    } catch (err) {
      console.error('Failed to load graph data:', err);
    } finally {
      setLoading(false);
    }
  }, [onOpenTask]);

  useEffect(() => {
    if (view === 'graph') {
      loadGraphData();
    }
  }, [view, loadGraphData]);

  const onNodesChange = useCallback(
    (changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => {
      console.log('Connection attempted:', params);
    },
    []
  );

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h2 className="text-[16px] font-bold text-text-main tracking-tight">Task Dependencies</h2>
          <p className="text-[11px] text-text-muted">Visualize task relationships and blockers.</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-md">
           {view === 'graph' && (
             <div className="flex gap-1 pr-1 mr-1 border-r border-slate-200">
                <button
                  onClick={() => setMode('move')}
                  title="Move Objects"
                  className={cn(
                    "p-1.5 rounded text-[10px] font-bold flex items-center gap-1.5 transition-all",
                    mode === 'move' ? "bg-white text-primary shadow-sm" : "text-text-muted hover:text-text-main"
                  )}
                >
                  <MousePointer2 size={12} /> MOVE
                </button>
                <button
                  onClick={() => setMode('connect')}
                  title="Connect Relations"
                  className={cn(
                    "p-1.5 rounded text-[10px] font-bold flex items-center gap-1.5 transition-all",
                    mode === 'connect' ? "bg-white text-error shadow-sm" : "text-text-muted hover:text-text-main"
                  )}
                >
                  <GitCommitHorizontal size={12} /> CONNECT
                </button>
             </div>
           )}
           <button
             onClick={() => setView('graph')}
             className={cn(
               "flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all",
               view === 'graph' ? "bg-white text-primary shadow-sm" : "text-text-muted hover:text-text-main"
             )}
           >
             <Layout size={14} /> GRAPHICAL
           </button>
           <button
             onClick={() => setView('text')}
             className={cn(
               "flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all",
               view === 'text' ? "bg-white text-primary shadow-sm" : "text-text-muted hover:text-text-main"
             )}
           >
             <ListIcon size={14} /> TEXT LIST
           </button>
        </div>
      </div>

      <div className={cn(
        "flex-1 card overflow-hidden relative bg-white border-border/50",
        mode === 'connect' && "ring-2 ring-error/20 ring-inset"
      )}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-text-muted">Loading graph data...</p>
          </div>
        ) : view === 'graph' ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            nodesConnectable={mode === 'connect'}
            nodesDraggable={mode === 'move'}
            selectNodesOnDrag={false}
            autoPanOnConnect={mode === 'connect'}
            fitView
            className={cn(mode === 'connect' ? "cursor-crosshair" : "cursor-default")}
          >
            <Background color={mode === 'connect' ? "#fff7f7" : "#f1f5f9"} gap={20} />
            <Controls />
            <Panel position="top-right" className="bg-white/80 backdrop-blur border border-border p-2 rounded-lg text-[10px] font-bold text-text-muted space-y-1">
               <div className="flex items-center gap-2"><div className="w-3 h-0.5 bg-error" /> Blocks</div>
               <div className="flex items-center gap-2"><div className="w-3 h-0.5 bg-orange-500" /> Depends on</div>
               <div className="flex items-center gap-2"><div className="w-3 h-0.5 bg-gray-400" /> Related to</div>
            </Panel>
          </ReactFlow>
        ) : (
          <div className="p-6 h-full overflow-y-auto space-y-4">
            {nodes.map(node => {
              const nodeEdges = edges.filter(e => e.source === node.id || e.target === node.id);
              return (
                <div key={node.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-text-muted uppercase">{node.data.path}</span>
                      <h3 className="text-sm font-bold text-text-main">{node.data.title}</h3>
                    </div>
                    <span className={cn(
                      "text-[9px] font-bold uppercase px-2 py-0.5 rounded",
                      node.data.status === 'Blocked' ? "bg-red-100 text-red-600" :
                      node.data.status === 'Review' ? "bg-green-100 text-green-600" :
                      node.data.status === 'in_progress' ? "bg-amber-100 text-amber-600" :
                      "bg-slate-100 text-slate-600"
                    )}>
                      {node.data.status}
                    </span>
                  </div>

                  {nodeEdges.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {nodeEdges.map((edge, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2 rounded-md">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[9px] font-bold uppercase py-0.5 px-1.5 rounded",
                              edge.label === 'blocks' ? "bg-red-100 text-red-600" :
                              edge.label === 'depends-on' ? "bg-orange-100 text-orange-600" :
                              "bg-gray-100 text-gray-600"
                            )}>
                              {edge.label}
                            </span>
                            <span className="text-[11px] font-medium text-text-main">
                              {edge.source === node.id ? edge.target : edge.source}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="h-px bg-slate-100 mt-4" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
