import React, { useState } from 'react';
import { 
  GitMerge, 
  DollarSign, 
  Users, 
  Clock, 
  TrendingUp, 
  ShieldCheck, 
  Zap, 
  FileText, 
  CheckCircle2, 
  Settings, 
  Plus,
  ArrowRight,
  BarChart3,
  Briefcase,
  Layers,
  AlertCircle,
  Download
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

type Tab = 'workflow' | 'vendor';

const COLORS = ['#10b981', '#3b82f6', '#6366f1', '#f43f5e'];

const TM_DATA = [
  { name: '100% Match', value: 45, fill: '#10b981' },
  { name: '85-99% Fuzzy', value: 25, fill: '#3b82f6' },
  { name: '75-84% Fuzzy', value: 15, fill: '#6366f1' },
  { name: 'New Words', value: 15, fill: '#f43f5e' },
];

const VENDOR_DATA = [
  { name: 'GlobalLinguists', score: 98, spend: 24000 },
  { name: 'Internal', score: 95, spend: 0 },
  { name: 'Freelance A', score: 88, spend: 18500 },
];

const EnterpriseOperations: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('workflow');

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
              <Layers className="text-indigo-400" />
              Advanced Workflow & Operations
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Enterprise-grade routing, approval pipelines, and vendor cost management.
            </p>
          </div>
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveTab('workflow')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'workflow' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
              <GitMerge size={14} /> Workflow Builder
            </button>
            <button
              onClick={() => setActiveTab('vendor')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'vendor' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
              <DollarSign size={14} /> Vendor & Cost
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'workflow' ? <WorkflowBuilder /> : <VendorDashboard />}
        </div>
      </div>
    </div>
  );
};

const WorkflowBuilder = () => {
  const [nodes, setNodes] = useState([
    { id: 1, type: 'ingestion', label: 'Source Ingestion', icon: <FileText size={16} />, color: 'bg-slate-500' },
    { id: 2, type: 'mt', label: 'Machine Translation', icon: <Zap size={16} />, color: 'bg-indigo-500' },
    { id: 3, type: 'mtpe', label: 'Human Post-Editing', icon: <Users size={16} />, color: 'bg-blue-500' },
    { id: 4, type: 'compliance', label: 'Legal Compliance Audit', icon: <ShieldCheck size={16} />, color: 'bg-emerald-500' },
    { id: 5, type: 'approval', label: 'Final Client Approval', icon: <CheckCircle2 size={16} />, color: 'bg-violet-500' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-800">Multi-Tier Routing & Approval</h3>
          <p className="text-sm text-slate-500">Design custom localization pipelines with automated routing.</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm">
          <Plus size={14} /> Add Stage
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 overflow-x-auto">
        <div className="flex items-center min-w-max py-4">
          {nodes.map((node, index) => (
            <React.Fragment key={node.id}>
              <div className="relative group cursor-pointer">
                <div className={`w-48 p-4 rounded-xl border-2 border-slate-100 bg-white shadow-sm hover:border-indigo-300 hover:shadow-md transition-all`}>
                  <div className={`w-10 h-10 rounded-lg ${node.color} text-white flex items-center justify-center mb-3 shadow-sm`}>
                    {node.icon}
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">{node.label}</h4>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Stage {index + 1}</span>
                    <Settings size={12} className="hover:text-indigo-600" />
                  </div>
                </div>
              </div>
              
              {index < nodes.length - 1 && (
                <div className="flex flex-col items-center px-4">
                  <div className="h-0.5 w-12 bg-slate-200 relative">
                    <ArrowRight size={14} className="absolute -right-2 -top-1.5 text-slate-300" />
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Stage Configuration: Human Post-Editing</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Vendor / Team</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500">
                <option>GlobalLinguists Inc. (Premium)</option>
                <option>Internal Localization Team</option>
                <option>Freelance Pool A</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Routing Logic</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500">
                <option>Route all content</option>
                <option>Route only if MT Confidence &lt; 85%</option>
                <option>Route only legal/marketing content</option>
              </select>
            </div>
            <div className="pt-2">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500" defaultChecked />
                Require explicit sign-off before next stage
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Automation Rules</h4>
          <div className="space-y-3">
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 flex items-start gap-3">
              <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={16} />
              <div>
                <p className="text-sm font-bold text-emerald-800">Auto-Approve 100% TM Matches</p>
                <p className="text-xs text-emerald-600 mt-0.5">Bypass human review for exact translation memory matches.</p>
              </div>
            </div>
            <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 flex items-start gap-3">
              <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
              <div>
                <p className="text-sm font-bold text-amber-800">Flag High-Risk Terminology</p>
                <p className="text-xs text-amber-600 mt-0.5">Route to Legal Compliance Audit if restricted terms are detected.</p>
              </div>
            </div>
            <button className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-xs font-bold text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
              + Add Automation Rule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const VendorDashboard = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-800">Vendor & Cost Management</h3>
          <p className="text-sm text-slate-500">Real-time analytics on TM leverage, vendor ROI, and MTPE productivity.</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500">
            <option>Last 30 Days</option>
            <option>This Quarter</option>
            <option>Year to Date</option>
          </select>
          <button 
            onClick={() => {
              const csvContent = "data:text/csv;charset=utf-8,Vendor,LQA Score,Spend,Status\nGlobalLinguists Inc.,98/100,$24000,Top Rated\nInternal Team,95/100,$0,Internal\nFreelance Pool A,88/100,$18500,Review Req.";
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", "enterprise_vendor_report.csv");
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
          >
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 text-slate-500 mb-2">
            <DollarSign size={16} />
            <h4 className="text-xs font-bold uppercase tracking-wider">Total Spend</h4>
          </div>
          <div className="text-2xl font-black text-slate-800">$42,500</div>
          <div className="text-xs font-medium text-emerald-600 mt-1 flex items-center gap-1">
            <TrendingUp size={12} /> -12% vs last month
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 text-slate-500 mb-2">
            <Briefcase size={16} />
            <h4 className="text-xs font-bold uppercase tracking-wider">TM Savings</h4>
          </div>
          <div className="text-2xl font-black text-slate-800">$18,240</div>
          <div className="text-xs font-medium text-emerald-600 mt-1 flex items-center gap-1">
            <TrendingUp size={12} /> +5% leverage increase
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 text-slate-500 mb-2">
            <Clock size={16} />
            <h4 className="text-xs font-bold uppercase tracking-wider">Avg MTPE Time</h4>
          </div>
          <div className="text-2xl font-black text-slate-800">450 wph</div>
          <div className="text-xs font-medium text-slate-500 mt-1">Words per hour</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 text-slate-500 mb-2">
            <BarChart3 size={16} />
            <h4 className="text-xs font-bold uppercase tracking-wider">Overall ROI</h4>
          </div>
          <div className="text-2xl font-black text-slate-800">3.2x</div>
          <div className="text-xs font-medium text-emerald-600 mt-1 flex items-center gap-1">
            <TrendingUp size={12} /> +0.4x vs last month
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost Breakdown by TM Leverage */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Cost Breakdown by TM Leverage</h4>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={TM_DATA} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} width={100} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {TM_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vendor Performance */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Vendor Performance</h4>
          
          <div className="h-64 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={VENDOR_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Bar dataKey="score" fill="#4f46e5" radius={[4, 4, 0, 0]} name="LQA Score" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-4 mt-auto">
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
              <div>
                <p className="text-sm font-bold text-slate-800">GlobalLinguists Inc.</p>
                <p className="text-xs text-slate-500">LQA Score: 98/100</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-slate-800">$24k</p>
                <p className="text-[10px] font-bold text-emerald-600 uppercase">Top Rated</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
              <div>
                <p className="text-sm font-bold text-slate-800">Internal Team</p>
                <p className="text-xs text-slate-500">LQA Score: 95/100</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-slate-800">$0</p>
                <p className="text-[10px] font-bold text-blue-600 uppercase">Internal</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
              <div>
                <p className="text-sm font-bold text-slate-800">Freelance Pool A</p>
                <p className="text-xs text-slate-500">LQA Score: 88/100</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-slate-800">$18.5k</p>
                <p className="text-[10px] font-bold text-amber-600 uppercase">Review Req.</p>
              </div>
            </div>
          </div>
          
          <button className="w-full mt-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider transition-all">
            View All Vendors
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseOperations;
