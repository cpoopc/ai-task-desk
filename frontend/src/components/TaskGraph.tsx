
import React, { useState, useEffect, useCallback } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  addEdge, 
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
import { useTasks } from '../TaskContext';
import { TaskBrief, Relation } from '../types';
import { Bot, Layers, Layout, List as ListIcon, Trash2, MousePointer2, GitCommitHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';

// --- Custom Task Node ---
const TaskNode = ({ data }: { data: TaskBrief }) => {
  return (
    <div className={cn(
      "w-[180px] bg-white border border-border rounded-lg shadow-sm hover:border-primary/50 transition-all p-3",
      data.meta.status === 'Blocked' && "border-l-4 border-l-error",
      data.meta.status === 'Review' && "border-l-4 border-l-success",
      data.meta.status === 'In progress' && "border-l-4 border-l-warning",
      data.meta.status === 'AI working' && "border-l-4 border-l-info"
    )}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-slate-300" />
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono text-text-muted uppercase truncate max-w-[80px]">
            {data.meta.jiraKey || data.path.split('/').pop()}
          </span>
          {data.meta.assignedAI && (
            <Bot size={10} className="text-info" />
          )}
        </div>
        <h4 className="text-[11px] font-bold text-text-main line-clamp-2 leading-tight">
          {data.goal}
        </h4>
        <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-50 mt-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: data.meta.status === 'Done' ? '#10b981' : '#e5e7eb' }} />
          <span className="text-[9px] text-text-muted font-bold uppercase">{data.meta.status}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-primary" />
    </div>
  );
};

const nodeTypes = {
  task: TaskNode,
};

// --- Task Graph Component ---
export default function TaskGraph() {
  const { tasks, addTaskRelation } = useTasks();
  const [view, setView] = useState<'graph' | 'text'>('graph');
  const [mode, setMode] = useState<'move' | 'connect'>('move');
  const [nodes, setNodes] = useState<Node<any>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Initialize nodes and edges from tasks
  useEffect(() => {
    const newNodes: Node<any>[] = tasks.map((t, idx) => ({
      id: t.id,
      type: 'task',
      position: { x: (idx % 3) * 220, y: Math.floor(idx / 3) * 140 }, // Simple grid layout
      data: t as any,
    }));

    const newEdges: Edge[] = [];
    tasks.forEach(t => {
      t.meta.relations.forEach((rel, rIdx) => {
        const target = tasks.find(other => other.path === rel.targetPath);
        if (target) {
          newEdges.push({
            id: `edge-${t.id}-${target.id}-${rIdx}`,
            source: t.id,
            target: target.id,
            label: rel.type,
            labelStyle: { fontSize: 8, fill: '#94a3b8', fontWeight: 700 },
            style: { stroke: rel.type === 'blocks' ? '#EF4444' : '#534AB7' },
            animated: rel.type === 'depends-on',
          });
        }
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [tasks]);

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
      if (params.source && params.target) {
        addTaskRelation(params.source, params.target, 'blocks');
      }
    },
    [addTaskRelation]
  );

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h2 className="text-[16px] font-bold text-text-main tracking-tight">Interactive Graph</h2>
          <p className="text-[11px] text-text-muted">Connect nodes to define blockers and dependencies.</p>
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
        {view === 'graph' ? (
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
               <div className="flex items-center gap-2"><div className="w-2 h-0.5 bg-error" /> Blocks</div>
               <div className="flex items-center gap-2"><div className="w-2 h-0.5 bg-primary" /> Relates to</div>
            </Panel>
          </ReactFlow>
        ) : (
          <div className="p-6 h-full overflow-y-auto space-y-6">
            {tasks.map(task => (
              <div key={task.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-text-muted uppercase">{task.path}</span>
                    <h3 className="text-sm font-bold text-text-main">{task.goal}</h3>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {task.meta.relations.map((rel, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-md">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "text-[9px] font-bold uppercase py-0.5 px-1.5 rounded",
                          rel.type === 'blocks' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                        )}>
                          {rel.type}
                        </span>
                        <span className="text-[11px] font-medium text-text-main">{rel.targetPath}</span>
                      </div>
                      <button className="text-text-muted hover:text-error transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button className="flex items-center justify-center p-3 border border-dashed border-slate-200 rounded-md text-[10px] font-bold text-text-muted hover:border-primary/30 hover:text-primary transition-all">
                    + ADD RELATION
                  </button>
                </div>
                <div className="h-px bg-slate-50 mt-6" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
