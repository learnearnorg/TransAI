import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Line, Circle, Text } from 'react-konva';
import { 
  Pencil, 
  Eraser, 
  Users, 
  Trash2, 
  Download, 
  MousePointer2,
  Share2,
  X
} from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface DrawingLine {
  tool: string;
  points: number[];
  color: string;
  strokeWidth: number;
}

interface RemoteUser {
  id: string;
  name: string;
  color: string;
  cursor?: Point;
}

interface CollaborativeCanvasProps {
  onClose: () => void;
  user: { id: string; name: string; color: string };
  roomId: string;
}

const CollaborativeCanvas: React.FC<CollaborativeCanvasProps> = ({ onClose, user, roomId }) => {
  const [lines, setLines] = useState<DrawingLine[]>([]);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#4F46E5');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [remoteUsers, setRemoteUsers] = useState<Map<string, RemoteUser>>(new Map());
  const isDrawing = useRef(false);
  const socketRef = useRef<WebSocket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // WebSocket Setup
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    socketRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'join',
        roomId,
        user
      }));
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'sync':
          if (message.state?.lines) {
            setLines(message.state.lines);
          }
          if (message.users) {
            const userMap = new Map();
            message.users.forEach((u: any) => {
              if (u.id !== user.id) userMap.set(u.id, u);
            });
            setRemoteUsers(userMap);
          }
          break;
        case 'update':
          if (message.state?.lines) {
            setLines(message.state.lines);
          }
          break;
        case 'activity':
          const { userId, type, data } = message.activity;
          if (type === 'cursor') {
            setRemoteUsers(prev => {
              const next = new Map(prev);
              const remoteUser = next.get(userId) || { id: userId, name: 'Anonymous', color: '#94a3b8' };
              next.set(userId, { ...remoteUser, cursor: data });
              return next;
            });
          }
          break;
        case 'user_joined':
          setRemoteUsers(prev => {
            const next = new Map(prev);
            next.set(message.user.id, message.user);
            return next;
          });
          break;
        case 'user_left':
          setRemoteUsers(prev => {
            const next = new Map(prev);
            next.delete(message.user.id);
            return next;
          });
          break;
      }
    };

    return () => {
      socket.close();
    };
  }, [roomId, user]);

  // Handle Resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };

    window.addEventListener('resize', updateDimensions);
    updateDimensions();
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const broadcastUpdate = (newLines: DrawingLine[]) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'update',
        roomId,
        state: { lines: newLines }
      }));
    }
  };

  const broadcastCursor = (pos: Point) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'activity',
        roomId,
        activity: {
          userId: user.id,
          type: 'cursor',
          data: pos
        }
      }));
    }
  };

  const handleMouseDown = (e: any) => {
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    const newLine = { tool, points: [pos.x, pos.y], color: tool === 'eraser' ? '#ffffff' : color, strokeWidth };
    const nextLines = [...lines, newLine];
    setLines(nextLines);
  };

  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    
    // Broadcast cursor
    broadcastCursor(point);

    if (!isDrawing.current) return;

    const lastLine = lines[lines.length - 1];
    // add point
    lastLine.points = lastLine.points.concat([point.x, point.y]);

    // replace last
    lines.splice(lines.length - 1, 1, lastLine);
    setLines([...lines]);
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
    broadcastUpdate(lines);
  };

  const clearCanvas = () => {
    setLines([]);
    broadcastUpdate([]);
  };

  const downloadCanvas = () => {
    const uri = containerRef.current?.querySelector('canvas')?.toDataURL();
    if (uri) {
      const link = document.createElement('a');
      link.download = `canvas-${roomId}.png`;
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/90 backdrop-blur-sm flex flex-col p-4 md:p-8 overflow-hidden">
      <div className="bg-white flex-1 w-full rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/20 mx-auto max-w-7xl">
        {/* Header */}
        <div className="px-6 py-4 border-bottom flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Share2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">Collaborative Workspace</h2>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  <div 
                    className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-sm"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.name[0]}
                  </div>
                  {Array.from(remoteUsers.values()).map(u => (
                    <div 
                      key={u.id}
                      className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-sm"
                      style={{ backgroundColor: u.color }}
                      title={u.name}
                    >
                      {u.name[0]}
                    </div>
                  ))}
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {remoteUsers.size + 1} Active Now
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={downloadCanvas}
              className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all"
              title="Export as PNG"
            >
              <Download size={18} />
            </button>
            <button 
              onClick={onClose}
              className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Toolbar */}
          <div className="w-20 bg-slate-50 border-right flex flex-col items-center py-6 gap-6 overflow-y-auto no-scrollbar">
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setTool('pen')}
                className={`p-4 rounded-2xl transition-all ${tool === 'pen' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-400 hover:border-indigo-300'}`}
              >
                <Pencil size={20} />
              </button>
              <button 
                onClick={() => setTool('eraser')}
                className={`p-4 rounded-2xl transition-all ${tool === 'eraser' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-400 hover:border-indigo-300'}`}
              >
                <Eraser size={20} />
              </button>
            </div>

            <div className="h-px w-10 bg-slate-200" />

            <div className="flex flex-col gap-3">
              {['#4F46E5', '#EF4444', '#10B981', '#F59E0B', '#000000'].map(c => (
                <button 
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-indigo-600 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <div className="h-px w-10 bg-slate-200" />

            <button 
              onClick={clearCanvas}
              className="p-4 bg-white border border-slate-200 rounded-2xl text-red-400 hover:bg-red-50 hover:border-red-200 transition-all"
              title="Clear Canvas"
            >
              <Trash2 size={20} />
            </button>
          </div>

          {/* Canvas Area */}
          <div ref={containerRef} className="flex-1 bg-slate-100 relative overflow-hidden cursor-crosshair touch-none">
            <Stage
              width={dimensions.width}
              height={dimensions.height}
              onMouseDown={handleMouseDown}
              onMousemove={handleMouseMove}
              onMouseup={handleMouseUp}
              className="bg-white"
            >
              <Layer>
                {lines.map((line, i) => (
                  <Line
                    key={i}
                    points={line.points}
                    stroke={line.color}
                    strokeWidth={line.strokeWidth}
                    tension={0.5}
                    lineCap="round"
                    lineJoin="round"
                    globalCompositeOperation={
                      line.tool === 'eraser' ? 'destination-out' : 'source-over'
                    }
                  />
                ))}
                
                {/* Remote Cursors */}
                {Array.from(remoteUsers.values()).map(u => u.cursor && (
                  <React.Fragment key={u.id}>
                    <Circle
                      x={u.cursor.x}
                      y={u.cursor.y}
                      radius={4}
                      fill={u.color}
                    />
                    <Text
                      x={u.cursor.x + 8}
                      y={u.cursor.y + 8}
                      text={u.name}
                      fontSize={10}
                      fill={u.color}
                      fontStyle="bold"
                    />
                  </React.Fragment>
                ))}
              </Layer>
            </Stage>

            {/* Status Overlay */}
            <div className="absolute bottom-6 left-6 flex items-center gap-3">
              <div className="px-4 py-2 bg-white/80 backdrop-blur-md border border-white rounded-full shadow-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Live Sync Active</span>
              </div>
              <div className="px-4 py-2 bg-white/80 backdrop-blur-md border border-white rounded-full shadow-sm flex items-center gap-2">
                <Users size={12} className="text-indigo-600" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{remoteUsers.size + 1} Collaborators</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborativeCanvas;
