import React, { useState, useEffect } from 'react';
import { GitBranch, GitPullRequest, Github, Play, CheckCircle2, Loader2, RefreshCw, Settings, Terminal, Key, Gitlab } from 'lucide-react';
import { getApiKey } from '../services/geminiService';

interface ContinuousLocalizationProps {
  sourceLang: string;
  targetLang: string;
}

export default function ContinuousLocalization({ sourceLang, targetLang }: ContinuousLocalizationProps) {
  const [provider, setProvider] = useState<'github' | 'gitlab'>('github');
  const [repoUrl, setRepoUrl] = useState('https://github.com/acme-corp/frontend-app');
  const [branch, setBranch] = useState('main');
  const [filePath, setFilePath] = useState('locales/en.json');
  const [token, setToken] = useState('');
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [logs, setLogs] = useState<{time: string, message: string, type: 'info' | 'success' | 'error'}[]>([]);
  const [prUrl, setPrUrl] = useState<string | null>(null);

  // Load token from local storage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(`${provider}_token`);
    if (savedToken) {
      setToken(savedToken);
    } else {
      setToken('');
    }
    
    // Update default repo URL based on provider
    if (provider === 'github' && repoUrl.includes('gitlab.com')) {
      setRepoUrl('https://github.com/acme-corp/frontend-app');
    } else if (provider === 'gitlab' && repoUrl.includes('github.com')) {
      setRepoUrl('https://gitlab.com/acme-corp/frontend-app');
    }
  }, [provider]);

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newToken = e.target.value;
    setToken(newToken);
    try { localStorage.setItem(`${provider}_token`, newToken); } catch(e) {}
  };

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), message, type }]);
  };

  const handleConnect = async () => {
    if (!token) {
      addLog('Please provide a Personal Access Token.', 'error');
      return;
    }

    setIsConnecting(true);
    addLog(`Connecting to ${provider === 'github' ? 'GitHub' : 'GitLab'} repository: ${repoUrl}...`);
    
    try {
      const res = await fetch('/api/git/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, repoUrl, token })
      });
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const textResp = await res.text();
        throw new Error(`Server returned HTML instead of JSON: ${textResp.substring(0, 50)}...`);
      }

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to connect');
      }

      setIsConnected(true);
      addLog(data.message, 'success');
      addLog(`Ready to process: ${filePath}`);
    } catch (err: any) {
      addLog(err.message, 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRunPipeline = async () => {
    setIsRunning(true);
    setProgress(0);
    setPrUrl(null);
    setLogs([]);
    
    addLog(`Starting CI/CD Localization Pipeline...`);
    addLog(`Source: ${sourceLang} | Target: ${targetLang}`);
    
    try {
      setProgress(10);
      setStatus('Fetching latest changes from remote...');
      addLog('Fetching latest changes from remote...');

      const res = await fetch('/api/git/run-pipeline', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': getApiKey()
        },
        body: JSON.stringify({ provider, repoUrl, branch, filePath, sourceLang, targetLang, token })
      });

      setProgress(50);
      setStatus(`Translating strings via Neural Engine...`);
      addLog(`Translating strings via Neural Engine...`);

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const textResp = await res.text();
        throw new Error(`Server returned HTML instead of JSON: ${textResp.substring(0, 50)}...`);
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Pipeline failed');
      }

      setProgress(100);
      setStatus(`${provider === 'github' ? 'Pull Request' : 'Merge Request'} Created!`);
      setPrUrl(data.prUrl);
      addLog(`Pipeline completed successfully! ${provider === 'github' ? 'PR' : 'MR'} created at ${data.prUrl}`, 'success');
    } catch (err: any) {
      addLog(err.message, 'error');
      setStatus('Pipeline failed');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-8 bg-white border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-slate-900 rounded-2xl shadow-lg shadow-slate-200">
            <GitBranch className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Continuous Localization</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
              CI/CD Pipeline Integration
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
          <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{sourceLang}</span>
          <RefreshCw size={14} className="text-slate-400" />
          <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{targetLang}</span>
        </div>
      </div>

      <div className="flex-1 p-8 flex flex-col lg:flex-row gap-8 overflow-hidden">
        {/* Configuration Panel */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
              {provider === 'github' ? <Github size={16} /> : <Gitlab size={16} />} Repository Config
            </h3>
            
            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setProvider('github')}
                  disabled={isConnected || isConnecting}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all ${provider === 'github' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'} disabled:opacity-50`}
                >
                  <Github size={14} /> GitHub
                </button>
                <button
                  onClick={() => setProvider('gitlab')}
                  disabled={isConnected || isConnecting}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all ${provider === 'gitlab' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'} disabled:opacity-50`}
                >
                  <Gitlab size={14} /> GitLab
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Repository URL</label>
                <input 
                  type="text" 
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  disabled={isConnected || isConnecting}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
                  placeholder={provider === 'github' ? 'https://github.com/owner/repo' : 'https://gitlab.com/owner/repo'}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Branch</label>
                  <input 
                    type="text" 
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    disabled={isConnected || isConnecting}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Source File</label>
                  <input 
                    type="text" 
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    disabled={isConnected || isConnecting}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Key size={12} /> Personal Access Token
                </label>
                <input 
                  type="password" 
                  value={token}
                  onChange={handleTokenChange}
                  disabled={isConnected || isConnecting}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
                  placeholder={`Enter ${provider === 'github' ? 'GitHub' : 'GitLab'} PAT`}
                />
              </div>

              {!isConnected ? (
                <>
                  <button 
                    onClick={handleConnect}
                    disabled={isConnecting || !repoUrl || !token}
                    className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isConnecting ? <Loader2 size={16} className="animate-spin" /> : <Settings size={16} />}
                    {isConnecting ? 'Connecting...' : 'Connect Repository'}
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-2">
                    Token is stored locally in your browser.
                  </p>
                </>
              ) : (
                <button 
                  onClick={() => setIsConnected(false)}
                  disabled={isRunning}
                  className="w-full mt-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>

          {/* Pipeline Trigger */}
          <div className={`bg-white p-6 rounded-2xl border transition-all duration-300 ${isConnected ? 'border-indigo-200 shadow-md shadow-indigo-100' : 'border-slate-200 opacity-50 pointer-events-none'}`}>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Play size={16} /> Execute Pipeline
            </h3>
            
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              This will fetch the latest strings from {filePath}, translate missing entries to {targetLang}, and create a Pull Request.
            </p>

            <button 
              onClick={handleRunPipeline}
              disabled={isRunning || !isConnected}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-indigo-600 uppercase tracking-widest text-sm"
            >
              {isRunning ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Pipeline Running...
                </>
              ) : (
                <>
                  <GitPullRequest size={18} />
                  Run Localization Pipeline
                </>
              )}
            </button>
          </div>
        </div>

        {/* Console / Status Panel */}
        <div className="w-full lg:w-2/3 flex flex-col bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-inner relative">
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-slate-500" />
              <span className="text-xs font-mono text-slate-400">pipeline-console</span>
            </div>
            {isRunning && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-indigo-400">{progress}%</span>
                <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto font-mono text-xs custom-scrollbar">
            {logs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-600">
                Waiting for pipeline execution...
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log, idx) => (
                  <div key={idx} className="flex gap-3">
                    <span className="text-slate-600 shrink-0">[{log.time}]</span>
                    <span className={`${
                      log.type === 'error' ? 'text-rose-400' : 
                      log.type === 'success' ? 'text-emerald-400' : 
                      'text-slate-300'
                    }`}>
                      {log.message}
                    </span>
                  </div>
                ))}
                {isRunning && (
                  <div className="flex gap-3 animate-pulse">
                    <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
                    <span className="text-indigo-400">{status}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PR Success Banner */}
          {prUrl && (
            <div className="absolute bottom-4 left-4 right-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 backdrop-blur-md flex items-center justify-between animate-slideUp">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <CheckCircle2 size={20} className="text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-400">Pull Request Created</h4>
                  <p className="text-xs text-emerald-400/70 mt-0.5">Translations are ready for review.</p>
                </div>
              </div>
              <a 
                href={prUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-xs font-black uppercase tracking-widest rounded-lg transition-colors"
              >
                View PR
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
