import React, { useState } from 'react';
import { 
  Terminal, 
  Webhook, 
  Key, 
  Activity, 
  Copy, 
  CheckCircle2, 
  RefreshCw, 
  Plus, 
  Box, 
  ShoppingCart, 
  FileJson,
  ShieldAlert,
  Network
} from 'lucide-react';

type Tab = 'api' | 'cms';

const EcosystemIntegrations: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('api');

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
              <Network className="text-indigo-400" />
              Ecosystem Integrations
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Enterprise API Gateway and Headless CMS Connectors.
            </p>
          </div>
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveTab('api')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'api' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
              <Terminal size={14} /> API Gateway
            </button>
            <button
              onClick={() => setActiveTab('cms')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'cms' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
              <Webhook size={14} /> CMS Connectors
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'api' ? <APIGateway /> : <CMSConnectors />}
        </div>
      </div>
    </div>
  );
};

const APIGateway = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('sk_live_51Nx...8mKq');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-800">API Keys & Usage</h3>
          <p className="text-sm text-slate-500">Manage your programmatic access to the Neural Synthesis engine.</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm">
          <Plus size={14} /> Generate New Key
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Active API Keys</h4>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Key size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Production Environment</h4>
                    <p className="text-xs text-slate-500 font-mono mt-1">sk_live_51Nx••••••••••••••••8mKq</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded-md">Active</span>
                  <button onClick={handleCopy} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Copy Key">
                    {copied ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-500 flex items-center justify-center">
                    <Key size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Staging Environment</h4>
                    <p className="text-xs text-slate-500 font-mono mt-1">sk_test_92Ab••••••••••••••••4pLz</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-200 px-2 py-1 rounded-md">Inactive</span>
                  <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Copy Key">
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Quick Start Integration</h4>
            <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
              <pre className="text-xs text-emerald-400 font-mono leading-relaxed">
{`curl -X POST https://api.transai.com/v1/translate \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "source_text": "Hello world",
    "target_lang": "es",
    "mode": "powerhouse",
    "anonymize_pii": true
  }'`}
              </pre>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Activity size={14} /> API Usage (Current Month)
            </h4>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-bold text-slate-700">Characters Translated</span>
                  <span className="font-bold text-indigo-600">4.2M / 10M</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '42%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-bold text-slate-700">Powerhouse Requests</span>
                  <span className="font-bold text-amber-600">8,500 / 20,000</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: '42.5%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-bold text-slate-700">Custom Model Inferences</span>
                  <span className="font-bold text-emerald-600">125K / 500K</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
            <h4 className="text-sm font-black text-indigo-900 mb-2 flex items-center gap-2">
              <ShieldAlert size={16} /> Enterprise SLA
            </h4>
            <p className="text-xs text-indigo-700 leading-relaxed mb-4">
              Your current tier includes 99.99% uptime guarantee, dedicated account management, and SOC2 compliant data processing.
            </p>
            <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider">
              View SLA Details &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CMSConnectors = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-800">Headless CMS Connectors</h3>
          <p className="text-sm text-slate-500">Sync content directly from your enterprise systems for continuous localization.</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm">
          <Plus size={14} /> Add Connection
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Contentful */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Box size={24} />
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded-md">
              <CheckCircle2 size={12} /> Connected
            </span>
          </div>
          <h4 className="font-black text-slate-800 text-lg mb-1">Contentful</h4>
          <p className="text-xs text-slate-500 mb-6">Marketing Website & Blog</p>
          
          <div className="mt-auto space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Last Sync</span>
              <span className="font-bold text-slate-700">10 mins ago</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Auto-Translate</span>
              <span className="font-bold text-emerald-600">Enabled</span>
            </div>
            <button className="w-full mt-2 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
              <RefreshCw size={14} /> Force Sync
            </button>
          </div>
        </div>

        {/* Shopify */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShoppingCart size={24} />
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded-md">
              <CheckCircle2 size={12} /> Connected
            </span>
          </div>
          <h4 className="font-black text-slate-800 text-lg mb-1">Shopify Plus</h4>
          <p className="text-xs text-slate-500 mb-6">Global E-commerce Store</p>
          
          <div className="mt-auto space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Last Sync</span>
              <span className="font-bold text-slate-700">2 hours ago</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Auto-Translate</span>
              <span className="font-bold text-amber-600">Drafts Only</span>
            </div>
            <button className="w-full mt-2 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
              <RefreshCw size={14} /> Force Sync
            </button>
          </div>
        </div>

        {/* AEM */}
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 shadow-sm p-6 flex flex-col items-center justify-center text-center opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
            <FileJson size={24} />
          </div>
          <h4 className="font-black text-slate-800 text-lg mb-1">Adobe Experience Manager</h4>
          <p className="text-xs text-slate-500 mb-4">Enterprise Content Hub</p>
          <button className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider">
            Configure
          </button>
        </div>
      </div>
    </div>
  );
};

export default EcosystemIntegrations;
