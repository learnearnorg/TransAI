import React, { useState, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Play, Plus, Settings, Github, Slack, Bot, Sparkles, ShieldCheck, FileText, Loader2 } from 'lucide-react';

const nodeTypes = {
  triggerNode: TriggerNode,
  agentNode: AgentNode,
  actionNode: ActionNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'triggerNode',
    position: { x: 50, y: 200 },
    data: { label: 'GitHub Push', icon: <Github size={16} />, type: 'trigger' },
  },
  {
    id: '2',
    type: 'agentNode',
    position: { x: 300, y: 100 },
    data: { label: 'Extract Terminology', icon: <FileText size={16} />, type: 'agent' },
  },
  {
    id: '3',
    type: 'agentNode',
    position: { x: 300, y: 300 },
    data: { label: 'Translate (Gemini)', icon: <Sparkles size={16} />, type: 'agent' },
  },
  {
    id: '4',
    type: 'agentNode',
    position: { x: 550, y: 200 },
    data: { label: 'Cultural Audit', icon: <ShieldCheck size={16} />, type: 'agent' },
  },
  {
    id: '5',
    type: 'actionNode',
    position: { x: 800, y: 100 },
    data: { label: 'Slack Notify', icon: <Slack size={16} />, type: 'action' },
  },
  {
    id: '6',
    type: 'actionNode',
    position: { x: 800, y: 300 },
    data: { label: 'Create PR', icon: <Github size={16} />, type: 'action' },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e1-3', source: '1', target: '3', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e2-4', source: '2', target: '4', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e3-4', source: '3', target: '4', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e4-5', source: '4', target: '5', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e4-6', source: '4', target: '6', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
];

function TriggerNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-xl bg-slate-900 border-2 border-slate-700 text-white min-w-[150px]">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-slate-800 rounded-lg text-indigo-400">
          {data.icon}
        </div>
        <div className="text-xs font-bold uppercase tracking-wider">{data.label}</div>
      </div>
      <div className="text-[9px] text-slate-400 uppercase tracking-widest">Trigger Event</div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-indigo-500 border-2 border-slate-900" />
    </div>
  );
}

function AgentNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-xl bg-white border-2 border-indigo-200 min-w-[180px]">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-slate-300 border-2 border-white" />
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
          {data.icon}
        </div>
        <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">{data.label}</div>
      </div>
      <div className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest flex items-center gap-1">
        <Bot size={10} /> Autonomous Agent
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-indigo-500 border-2 border-white" />
    </div>
  );
}

function ActionNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-xl bg-slate-50 border-2 border-slate-200 min-w-[150px]">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-slate-300 border-2 border-white" />
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-white rounded-lg text-slate-600 shadow-sm">
          {data.icon}
        </div>
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">{data.label}</div>
      </div>
      <div className="text-[9px] text-slate-400 uppercase tracking-widest">Action Output</div>
    </div>
  );
}

export default function AgenticWorkflowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isRunning, setIsRunning] = useState(false);
  const [activeNode, setActiveNode] = useState<string | null>(null);

  const onConnect = useCallback((params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, animated: true, markerEnd: { type: MarkerType.ArrowClosed } }, eds)), [setEdges]);

  const handleRunWorkflow = async () => {
    setIsRunning(true);
    
    // Simulate workflow execution by animating nodes
    for (const node of nodes) {
      setActiveNode(node.id);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setActiveNode(null);
    setIsRunning(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-8 bg-white border-b border-slate-100 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
            <Bot className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Agentic Workflows</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
              Autonomous Localization Pipelines
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2">
            <Plus size={16} /> Add Node
          </button>
          <button 
            onClick={handleRunWorkflow}
            disabled={isRunning}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg disabled:opacity-50 disabled:hover:bg-indigo-600 flex items-center gap-2"
          >
            {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {isRunning ? 'Executing...' : 'Run Workflow'}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes.map(n => ({
            ...n,
            style: {
              ...n.style,
              opacity: isRunning && activeNode !== n.id ? 0.5 : 1,
              transform: activeNode === n.id ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 0.3s ease'
            }
          }))}
          edges={edges.map(e => ({
            ...e,
            style: {
              stroke: isRunning ? '#6366f1' : '#cbd5e1',
              strokeWidth: isRunning ? 2 : 1,
            }
          }))}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-slate-50"
        >
          <Background color="#cbd5e1" gap={16} />
          <Controls className="bg-white border-slate-200 shadow-md rounded-xl overflow-hidden" />
          <MiniMap 
            nodeColor={(node) => {
              switch (node.type) {
                case 'triggerNode': return '#0f172a';
                case 'agentNode': return '#4f46e5';
                case 'actionNode': return '#94a3b8';
                default: return '#eee';
              }
            }}
            className="bg-white border-slate-200 shadow-md rounded-xl overflow-hidden"
          />
        </ReactFlow>

        {/* Execution Overlay */}
        {isRunning && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-slideUp">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-widest text-indigo-400">Executing Pipeline</span>
              <span className="text-[10px] text-slate-400 font-mono">Running agent: {nodes.find(n => n.id === activeNode)?.data.label || '...'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
