import React, { useState, useEffect } from 'react';
import { AIProviderConfig, AIProviderType, PrivacyMode } from '../../../backend/src/types';
import { 
  Settings, 
  Shield, 
  Cpu, 
  Cloud, 
  Key, 
  Check, 
  AlertCircle, 
  Save, 
  RefreshCw,
  ExternalLink
} from 'lucide-react';

export const PopupView: React.FC = () => {
  const [config, setConfig] = useState<AIProviderConfig>({
    provider: 'openrouter',
    privacyMode: 'allow_cloud',
    openrouterApiKey: '',
    openrouterModel: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    openaiApiKey: '',
    openaiModel: 'gpt-4o-mini',
    geminiApiKey: '',
    geminiModel: 'gemini-1.5-pro',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'deepseek-coder:6.7b'
  });
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetch('http://localhost:4000/api/config')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(() => setStatus('Backend server offline. Run `npm start` on port 4000.'));
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setStatus('');
    try {
      const res = await fetch('http://localhost:4000/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        setStatus('Settings saved successfully!');
        setTimeout(() => setStatus(''), 3000);
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setStatus(`Failed to connect to backend: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-[380px] p-4 bg-slate-900 text-slate-100 font-sans text-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center">
            <Settings className="w-4 h-4 text-white" />
          </div>
          <h2 className="font-semibold text-sm text-white">Assistant Settings</h2>
        </div>
        <span className="text-[10px] text-cyan-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">v1.0.0</span>
      </div>

      <div className="mt-3 space-y-3.5">
        {/* Privacy Setting */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-slate-200 font-medium">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            Privacy Mode
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfig({ ...config, privacyMode: 'local_only', provider: config.provider === 'openai' || config.provider === 'gemini' || config.provider === 'openrouter' ? 'local_heuristic' : config.provider })}
              className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1 transition ${config.privacyMode === 'local_only' ? 'bg-emerald-600/20 border-emerald-500/80 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
            >
              <Cpu className="w-3 h-3" />
              Local AI Only
            </button>
            <button
              onClick={() => setConfig({ ...config, privacyMode: 'allow_cloud' })}
              className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1 transition ${config.privacyMode === 'allow_cloud' ? 'bg-cyan-600/20 border-cyan-500/80 text-cyan-300' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
            >
              <Cloud className="w-3 h-3" />
              Allow Cloud AI
            </button>
          </div>
          <p className="text-[10px] text-slate-400">
            {config.privacyMode === 'local_only' ? '✓ No challenge data is transmitted to external cloud APIs.' : '⚠ Challenges may be sent to selected external AI providers (OpenRouter/OpenAI/Gemini).'}
          </p>
        </div>

        {/* AI Provider Select */}
        <div className="space-y-1.5">
          <label className="text-slate-300 font-medium">Active AI Provider</label>
          <select
            value={config.provider}
            onChange={(e) => setConfig({ ...config, provider: e.target.value as AIProviderType })}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="local_heuristic">Local Heuristic Engine (Offline / Safe)</option>
            <option value="ollama">Ollama (Local LLM)</option>
            {config.privacyMode === 'allow_cloud' && (
              <>
                <option value="openrouter">OpenRouter (Nemotron, Claude, GPT, DeepSeek)</option>
                <option value="openai">OpenAI (ChatGPT / GPT-4o)</option>
                <option value="gemini">Google Gemini (Gemini 1.5 Pro)</option>
              </>
            )}
          </select>
        </div>

        {/* OpenRouter specific options */}
        {config.provider === 'openrouter' && (
          <div className="space-y-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <div>
              <label className="text-[11px] text-slate-400 flex items-center gap-1">
                <Key className="w-3 h-3 text-cyan-400" />
                OpenRouter API Key
              </label>
              <input
                type="password"
                value={config.openrouterApiKey || ''}
                onChange={(e) => setConfig({ ...config, openrouterApiKey: e.target.value })}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-slate-200"
                placeholder="sk-or-v1-..."
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400">Model Name</label>
              <input
                type="text"
                value={config.openrouterModel || 'nvidia/nemotron-3-ultra-550b-a55b:free'}
                onChange={(e) => setConfig({ ...config, openrouterModel: e.target.value })}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-slate-200"
                placeholder="nvidia/nemotron-3-ultra-550b-a55b:free"
              />
            </div>
          </div>
        )}

        {/* Ollama specific options */}
        {config.provider === 'ollama' && (
          <div className="space-y-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <div>
              <label className="text-[11px] text-slate-400">Ollama URL</label>
              <input
                type="text"
                value={config.ollamaUrl}
                onChange={(e) => setConfig({ ...config, ollamaUrl: e.target.value })}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-slate-200"
                placeholder="http://localhost:11434"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400">Model Name</label>
              <input
                type="text"
                value={config.ollamaModel}
                onChange={(e) => setConfig({ ...config, ollamaModel: e.target.value })}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-slate-200"
                placeholder="deepseek-coder:6.7b"
              />
            </div>
          </div>
        )}

        {/* OpenAI specific options */}
        {config.provider === 'openai' && (
          <div className="space-y-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <div>
              <label className="text-[11px] text-slate-400 flex items-center gap-1">
                <Key className="w-3 h-3 text-cyan-400" />
                OpenAI API Key
              </label>
              <input
                type="password"
                value={config.openaiApiKey}
                onChange={(e) => setConfig({ ...config, openaiApiKey: e.target.value })}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-slate-200"
                placeholder="sk-..."
              />
            </div>
          </div>
        )}

        {/* Gemini specific options */}
        {config.provider === 'gemini' && (
          <div className="space-y-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <div>
              <label className="text-[11px] text-slate-400 flex items-center gap-1">
                <Key className="w-3 h-3 text-cyan-400" />
                Gemini API Key
              </label>
              <input
                type="password"
                value={config.geminiApiKey}
                onChange={(e) => setConfig({ ...config, geminiApiKey: e.target.value })}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-slate-200"
                placeholder="AIzaSy..."
              />
            </div>
          </div>
        )}

        {status && (
          <div className="p-2 rounded bg-slate-800 border border-slate-700 text-cyan-300 text-[11px]">
            {status}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-600/20 transition"
        >
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Configuration
        </button>
      </div>
    </div>
  );
};
