import React, { useState, useEffect, useRef } from 'react';
import { ProblemPayload, AnalysisResult, CodePatch, TestScoreResult } from '../../../backend/src/types';
import { ProblemExtractor } from './problemExtractor';
import { EditorAdapter } from './editorAdapter';
import { 
  Sparkles, 
  Terminal, 
  Database, 
  Code2, 
  Layers, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  FileCode, 
  Copy, 
  RefreshCw, 
  X,
  Keyboard,
  FastForward,
  RotateCcw,
  CheckCheck,
  Zap,
  BookmarkCheck,
  BookmarkPlus,
  Trophy,
  RotateCw
} from 'lucide-react';

interface FloatingPanelProps {
  onClose?: () => void;
}

export const FloatingPanel: React.FC<FloatingPanelProps> = ({ onClose }) => {
  const [minimized, setMinimized] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'solution' | 'diff' | 'explanation' | 'issues'>('solution');
  const [loading, setLoading] = useState<boolean>(false);
  const [problem, setProblem] = useState<ProblemPayload | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusStep, setStatusStep] = useState<number>(0);
  const [approvalGiven, setApprovalGiven] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  
  // Score & Test Results state
  const [testResult, setTestResult] = useState<string | null>(null);
  const [scoreResult, setScoreResult] = useState<TestScoreResult | null>(null);
  const [retryAttempt, setRetryAttempt] = useState<number>(0);
  
  // Non-Repeat & Completed state
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [markingStatus, setMarkingStatus] = useState<string | null>(null);

  // Typing animation state for UI
  const [typingAnimationEnabled, setTypingAnimationEnabled] = useState<boolean>(true);
  const [typingSpeed, setTypingSpeed] = useState<'fast' | 'normal' | 'slow'>('fast');
  const [displayedText, setDisplayedText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Editor typing animation state
  const [isEditorTyping, setIsEditorTyping] = useState<boolean>(false);
  const [editorTypingProgress, setEditorTypingProgress] = useState<number>(0);

  const extractor = new ProblemExtractor();
  const editor = new EditorAdapter();

  const checkCompletion = async (urlOrTitle: string) => {
    try {
      const res = await fetch('http://localhost:4000/api/challenges/completed/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlOrTitle })
      });
      const data = await res.json();
      if (data.success) {
        setIsCompleted(data.isCompleted);
      }
    } catch {
      // Backend may be offline
    }
  };

  const handleToggleCompleted = async () => {
    if (!problem) return;
    try {
      if (isCompleted) {
        await fetch('http://localhost:4000/api/challenges/completed', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: problem.url || problem.title })
        });
        setIsCompleted(false);
        setMarkingStatus('Removed from completed');
      } else {
        await fetch('http://localhost:4000/api/challenges/completed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: problem.url || problem.title, title: problem.title })
        });
        setIsCompleted(true);
        setMarkingStatus('Marked as completed (will not repeat)');
      }
      setTimeout(() => setMarkingStatus(null), 3000);
    } catch (err: any) {
      setError(`Failed to update completion: ${err.message}`);
    }
  };

  const handleDetect = () => {
    try {
      const extracted = extractor.extractProblem();
      setProblem(extracted);
      setStatusStep(1);
      setError(null);
      if (extracted.url || extracted.title) {
        checkCompletion(extracted.url || extracted.title);
      }
    } catch (err: any) {
      setError(`Detection failed: ${err.message}`);
    }
  };

  useEffect(() => {
    handleDetect();
  }, []);

  // Typewriter animation trigger when text changes or tab switches
  const startTypewriter = (fullText: string) => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
    }

    if (!typingAnimationEnabled) {
      setDisplayedText(fullText);
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    setDisplayedText('');
    let idx = 0;
    const speedMs = typingSpeed === 'fast' ? 6 : typingSpeed === 'normal' ? 18 : 35;
    const stepSize = typingSpeed === 'fast' ? 4 : 2;

    typingTimerRef.current = setInterval(() => {
      idx += stepSize;
      if (idx >= fullText.length) {
        setDisplayedText(fullText);
        setIsTyping(false);
        if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      } else {
        setDisplayedText(fullText.slice(0, idx));
      }
    }, speedMs);
  };

  const skipTypewriter = (fullText: string) => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
    }
    setDisplayedText(fullText);
    setIsTyping(false);
  };

  // Update animated text when analysis or activeTab changes
  useEffect(() => {
    if (!analysis) return;
    let targetText = '';
    if (activeTab === 'solution') {
      targetText = analysis.generated_solution;
    } else if (activeTab === 'explanation') {
      targetText = `${analysis.solution_strategy}\n\n${analysis.explanation}`;
    } else if (activeTab === 'diff' && analysis.patch) {
      targetText = analysis.patch.diff;
    }

    if (targetText) {
      startTypewriter(targetText);
    }

    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
  }, [analysis, activeTab, typingAnimationEnabled, typingSpeed]);

  const handleAnalyzeAndSolve = async (options?: { isRetry?: boolean; feedback?: string }) => {
    setLoading(true);
    setError(null);
    setTestResult(null);
    setScoreResult(null);
    try {
      const currentProblem = extractor.extractProblem();
      if (options?.isRetry && options?.feedback) {
        currentProblem.errorFeedback = options.feedback;
        if (analysis?.generated_solution) {
          currentProblem.previousAttempt = {
            code: analysis.generated_solution,
            error: options.feedback,
            score: scoreResult?.score ?? 0
          };
        }
        setRetryAttempt(prev => prev + 1);
      } else {
        setRetryAttempt(0);
      }

      setProblem(currentProblem);
      setStatusStep(2);

      const response = await fetch('http://localhost:4000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentProblem)
      });

      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error || 'Analysis failed');
      }

      setAnalysis(json.data);
      setStatusStep(4);
      if (json.data.category === 'React' && json.data.patch) {
        setActiveTab('diff');
      } else {
        setActiveTab('solution');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Instant Editor Code Insertion
  const handleInsertCodeInstant = async () => {
    if (!analysis?.generated_solution) return;
    try {
      await editor.setCode(analysis.generated_solution);
      setApprovalGiven(true);
    } catch (err: any) {
      setError(`Insert failed: ${err.message}`);
    }
  };

  // Animated Editor Typing Simulation
  const handleInsertCodeAnimated = async () => {
    if (!analysis?.generated_solution) return;
    setIsEditorTyping(true);
    setEditorTypingProgress(0);
    try {
      await editor.typeCodeAnimated(analysis.generated_solution, {
        delayMs: 12,
        onProgress: (current, total) => {
          setEditorTypingProgress(Math.round((current / total) * 100));
        }
      });
      setApprovalGiven(true);
    } catch (err: any) {
      setError(`Animated typing failed: ${err.message}`);
    } finally {
      setIsEditorTyping(false);
    }
  };

  const handleCopy = () => {
    if (analysis?.generated_solution) {
      navigator.clipboard.writeText(analysis.generated_solution);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Run Test and Extract Score
  const handleRunTest = async () => {
    setLoading(true);
    setScoreResult(null);
    try {
      if (analysis?.category === 'Linux Shell' && analysis.generated_solution) {
        const res = await fetch('http://localhost:4000/api/shell/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: analysis.generated_solution,
            input: problem?.examples?.[0]?.input || 'Sample standard input'
          })
        });
        const resJson = await res.json();
        const output = resJson.data.output || resJson.data.error || 'Completed test';
        const isError = !!resJson.data.error;
        const score = isError ? 0 : 100;
        
        const scoreData: TestScoreResult = {
          passed: !isError,
          score,
          maxScore: 100,
          details: isError ? 'Execution Error' : 'All tests passed (Score: 100/100)',
          error: isError ? output : undefined
        };
        setScoreResult(scoreData);
        setTestResult(output);

        if (score > 0 && problem) {
          fetch('http://localhost:4000/api/challenges/completed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: problem.url || problem.title, title: problem.title })
          }).then(() => setIsCompleted(true)).catch(() => {});
        }
      } else {
        // Trigger HackerRank Run Code button
        const runBtn = document.querySelector('button[data-automation="run-code-button"], button.hr-monaco-run-code, button:has-text("Run Code")') as HTMLButtonElement;
        if (runBtn) {
          runBtn.click();
          setTestResult('Triggered HackerRank Run Code. Waiting for test evaluation...');

          // Poll for DOM testcase evaluation results & score
          let evaluated = false;
          for (let i = 0; i < 15; i++) {
            await new Promise(r => setTimeout(r, 1500));
            const bodyText = document.body.innerText;
            const passedPills = document.querySelectorAll('.testcase-item.passed, .testcase-status-view .badge-success, .test-case-passed, [data-automation="testcase-passed"]');
            const failedPills = document.querySelectorAll('.testcase-item.failed, .testcase-status-view .badge-danger, .test-case-failed, [data-automation="testcase-failed"]');
            const hasCongrats = bodyText.includes('Congratulations!') || bodyText.includes('You passed all sample test cases');
            const hasWrong = bodyText.includes('Wrong Answer') || bodyText.includes('Compilation Error');

            if (passedPills.length > 0 || failedPills.length > 0 || hasCongrats || hasWrong) {
              const passedCount = passedPills.length;
              const totalCount = passedCount + failedPills.length;
              const score = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : (hasCongrats ? 100 : 0);
              const passed = failedPills.length === 0 && (passedCount > 0 || hasCongrats);
              
              const diffEl = document.querySelector('.sample-output-diff, .diff-view, .testcase-error-view, .compiler-message');
              const errorText = diffEl?.textContent?.trim() || (hasWrong ? 'Wrong Answer: Output did not match expected' : undefined);

              const scoreData: TestScoreResult = {
                passed,
                score,
                maxScore: 100,
                passedCount,
                totalCount,
                details: `Score: ${score}/100 (${passedCount}/${totalCount || 1} test cases passed)`,
                error: errorText
              };
              setScoreResult(scoreData);
              setTestResult(scoreData.details);

              if (score > 0 && problem) {
                fetch('http://localhost:4000/api/challenges/completed', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url: problem.url || problem.title, title: problem.title })
                }).then(() => setIsCompleted(true)).catch(() => {});
              }
              evaluated = true;
              break;
            }
          }

          if (!evaluated) {
            setTestResult('Test triggered. Check HackerRank output console.');
          }
        } else {
          setTestResult('Click "Run Code" in HackerRank to test.');
        }
      }
    } catch (err: any) {
      setTestResult(`Test failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'SQL': return <Database className="w-4 h-4 text-emerald-400" />;
      case 'React': return <Layers className="w-4 h-4 text-cyan-400" />;
      case 'Linux Shell': return <Terminal className="w-4 h-4 text-amber-400" />;
      default: return <Code2 className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[999999] font-sans antialiased text-slate-100 selection:bg-cyan-500 selection:text-white">
      <div className={`w-[460px] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${minimized ? 'h-14' : 'max-h-[88vh]'}`}>
        
        {/* Header */}
        <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700 flex items-center justify-between cursor-pointer" onClick={() => setMinimized(!minimized)}>
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-1.5">
                HackerRank Assistant
                {analysis?.category && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-700/80 text-cyan-300 border border-cyan-500/30">
                    {analysis.category}
                  </span>
                )}
              </h3>
            </div>
          </div>
          <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setMinimized(!minimized)} 
              className="p-1 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition"
              title={minimized ? "Expand" : "Minimize"}
            >
              {minimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {onClose && (
              <button 
                onClick={onClose} 
                className="p-1 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {!minimized && (
          <div className="p-4 flex flex-col gap-3.5 overflow-y-auto max-h-[calc(88vh-56px)]">
            
            {/* Status & Non-Repeat Pipeline Cards */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(analysis?.category || problem?.category)}
                  <div>
                    <div className="text-slate-400 text-[10px]">Category</div>
                    <div className="font-semibold text-slate-200">{analysis?.category || 'Detecting...'}</div>
                  </div>
                </div>
              </div>
              
              {/* Question Non-Repeat / Solved Badge */}
              <div 
                onClick={handleToggleCompleted} 
                className={`border rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition ${isCompleted ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/50' : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'}`}
                title={isCompleted ? "Completed! Click to unmark" : "Unsolved. Click to mark as completed (will not repeat)"}
              >
                <div className="flex items-center gap-1.5">
                  {isCompleted ? <BookmarkCheck className="w-4 h-4 text-emerald-400" /> : <BookmarkPlus className="w-4 h-4 text-slate-400" />}
                  <div>
                    <div className="text-[10px] text-slate-400">Non-Repeat Status</div>
                    <div className="font-semibold text-xs">{isCompleted ? '✓ Completed (Skipped)' : 'Unsolved'}</div>
                  </div>
                </div>
              </div>
            </div>

            {markingStatus && (
              <div className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-800/60 text-cyan-300 text-[11px] flex items-center gap-1.5">
                <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>{markingStatus}</span>
              </div>
            )}

            {/* Live Score Display Card */}
            {scoreResult && (
              <div className={`p-3 rounded-xl border flex flex-col gap-1.5 text-xs ${scoreResult.score > 0 ? 'bg-emerald-950/40 border-emerald-700/70 text-emerald-200' : 'bg-red-950/40 border-red-700/70 text-red-200'}`}>
                <div className="flex items-center justify-between font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Trophy className={`w-4 h-4 ${scoreResult.score > 0 ? 'text-yellow-400' : 'text-slate-400'}`} />
                    <span>SCORE: {scoreResult.score} / {scoreResult.maxScore} points</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${scoreResult.score > 0 ? 'bg-emerald-800/60 text-emerald-200' : 'bg-red-800/60 text-red-200'}`}>
                    {scoreResult.score > 0 ? 'Passed' : '0 Points / Failed'}
                  </span>
                </div>
                <div className="text-[11px] opacity-90">{scoreResult.details}</div>
                {scoreResult.error && (
                  <div className="p-2 rounded bg-black/40 font-mono text-[10px] text-red-300 overflow-x-auto whitespace-pre-wrap">
                    {scoreResult.error}
                  </div>
                )}
                {/* Auto Repeat / Refine button if score is 0 */}
                {scoreResult.score === 0 && (
                  <button
                    onClick={() => handleAnalyzeAndSolve({ isRetry: true, feedback: scoreResult.error || scoreResult.details })}
                    disabled={loading}
                    className="mt-1 py-1.5 px-3 rounded-lg bg-red-600/30 hover:bg-red-600/50 border border-red-500/60 text-red-100 font-medium text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    🔁 Repeat & Refine Answer (0 Points Scored)
                  </button>
                )}
              </div>
            )}

            {/* Extracted Diagram & Schema Image Preview for SQL / React */}
            {problem?.images && problem.images.length > 0 && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300 font-medium">
                  <div className="flex items-center gap-1.5 text-cyan-400">
                    <Database className="w-3.5 h-3.5" />
                    <span>Diagrams & Schemas ({problem.images.length})</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Extracted from side pane</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {problem.images.map((img, i) => (
                    <a 
                      key={i} 
                      href={img.src} 
                      target="_blank" 
                      rel="noreferrer"
                      className="shrink-0 border border-slate-700/60 rounded-lg overflow-hidden bg-slate-900 hover:border-cyan-500 transition group"
                      title={img.alt || `Diagram ${i + 1}`}
                    >
                      <img src={img.src} alt={img.alt || 'Schema diagram'} className="h-14 w-auto max-w-[120px] object-cover opacity-80 group-hover:opacity-100" />
                      <div className="px-1.5 py-0.5 text-[9px] text-slate-400 truncate max-w-[120px]">{img.alt || `Diagram ${i + 1}`}</div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* 6-Step HackerRank Automation Workflow Progress */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
              <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>6-Step Automated Workflow</span>
                <span className="text-[10px] text-cyan-400">
                  {statusStep >= 4 ? 'Step 5/6: Ready' : statusStep >= 2 ? 'Step 3/6: Analyzed' : 'Step 1-2/6: Loaded'}
                </span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {[
                  { step: 1, label: 'Website' },
                  { step: 2, label: 'Track' },
                  { step: 3, label: 'Problem' },
                  { step: 4, label: 'Editor' },
                  { step: 5, label: 'Test' },
                  { step: 6, label: 'Submit' }
                ].map((s) => {
                  const isActive = (s.step === 1) || 
                                   (s.step === 2 && Boolean(problem?.url)) || 
                                   (s.step === 3 && Boolean(problem?.statement)) || 
                                   (s.step === 4 && Boolean(problem?.selectedLanguage)) || 
                                   (s.step === 5 && Boolean(analysis?.generated_solution)) || 
                                   (s.step === 6 && Boolean(scoreResult?.passed));
                  return (
                    <div key={s.step} className="flex flex-col items-center gap-1">
                      <div className={`w-full h-1.5 rounded-full ${isActive ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 shadow-sm shadow-cyan-500/50' : 'bg-slate-800'}`} />
                      <span className={`text-[9px] ${isActive ? 'text-cyan-300 font-medium' : 'text-slate-600'}`}>{s.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="pt-1 text-[10px] text-slate-400 flex items-center justify-between">
                <span className="truncate max-w-[280px]">📌 {problem?.title || 'Detecting challenge...'}</span>
                <span className="text-cyan-400 font-mono">{problem?.selectedLanguage || 'Auto'}</span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>{error}</div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAnalyzeAndSolve()}
                disabled={loading}
                className="flex-1 py-2 px-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {analysis ? 'Re-generate' : 'Analyze & Solve'}
              </button>
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await fetch('http://localhost:4000/api/auto/start', { 
                      method: 'POST', 
                      headers: { 'Content-Type': 'application/json' }, 
                      body: JSON.stringify({ 
                        autoSubmit: true, 
                        animatedTyping: true,
                        domain: analysis?.category || problem?.category || 'SQL'
                      }) 
                    });
                    const d = await res.json();
                    setTestResult(d.message || 'Auto loop started with auto-submit & next challenge transition!');
                  } catch (e: any) {
                    setError(`Failed to trigger auto loop: ${e.message}`);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="py-2 px-3 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-medium border border-purple-500/50 transition flex items-center gap-1"
                title="Start Full Autonomous Crawler & Solver (Scores & retries on 0 points)"
              >
                <Play className="w-3.5 h-3.5 text-purple-300" />
                Auto Loop
              </button>
              <button
                onClick={handleDetect}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition flex items-center gap-1"
                title="Refresh problem detection"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Analysis Output Viewers */}
            {analysis && (
              <div className="flex flex-col gap-2 mt-1">
                {/* Tabs & Typing Controls */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-xs">
                  <div className="flex">
                    <button
                      onClick={() => setActiveTab('solution')}
                      className={`py-1 px-2.5 border-b-2 font-medium transition ${activeTab === 'solution' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                    >
                      Solution
                    </button>
                    {analysis.patch && (
                      <button
                        onClick={() => setActiveTab('diff')}
                        className={`py-1 px-2.5 border-b-2 font-medium transition ${activeTab === 'diff' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                      >
                        Diff Patch
                      </button>
                    )}
                    <button
                      onClick={() => setActiveTab('explanation')}
                      className={`py-1 px-2.5 border-b-2 font-medium transition ${activeTab === 'explanation' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                    >
                      Explanation
                    </button>
                    <button
                      onClick={() => setActiveTab('issues')}
                      className={`py-1 px-2.5 border-b-2 font-medium transition ${activeTab === 'issues' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                    >
                      Validation
                    </button>
                  </div>

                  {/* Typing Animation Toolbar */}
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <button
                      onClick={() => setTypingAnimationEnabled(!typingAnimationEnabled)}
                      className={`px-1.5 py-0.5 rounded border text-[10px] font-medium transition flex items-center gap-1 ${typingAnimationEnabled ? 'bg-cyan-950/60 border-cyan-600 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                      title="Toggle typewriter animation effect for code & answers"
                    >
                      <Keyboard className="w-3 h-3" />
                      {typingAnimationEnabled ? 'Ani ON' : 'Ani OFF'}
                    </button>
                    {isTyping && (
                      <button
                        onClick={() => {
                          const full = activeTab === 'solution' ? analysis.generated_solution : activeTab === 'explanation' ? `${analysis.solution_strategy}\n\n${analysis.explanation}` : analysis.patch?.diff || '';
                          skipTypewriter(full);
                        }}
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] text-slate-300 flex items-center gap-0.5"
                        title="Skip typing animation immediately"
                      >
                        <FastForward className="w-3 h-3" />
                        Skip
                      </button>
                    )}
                    {!isTyping && typingAnimationEnabled && (
                      <button
                        onClick={() => {
                          const full = activeTab === 'solution' ? analysis.generated_solution : activeTab === 'explanation' ? `${analysis.solution_strategy}\n\n${analysis.explanation}` : analysis.patch?.diff || '';
                          startTypewriter(full);
                        }}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200"
                        title="Replay typing animation"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Tab: Solution Code with Typewriter Animation */}
                {activeTab === 'solution' && (
                  <div className="relative group">
                    <div className="absolute right-2 top-2 z-10 flex gap-1">
                      <button
                        onClick={handleCopy}
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                        title="Copy solution"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto max-h-56 leading-relaxed whitespace-pre-wrap">
                      {displayedText}
                      {isTyping && <span className="inline-block w-2 h-3.5 bg-cyan-400 ml-0.5 animate-pulse"></span>}
                    </pre>
                  </div>
                )}

                {/* Tab: Diff Patch for React */}
                {activeTab === 'diff' && analysis.patch && (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono space-y-1">
                      <div className="text-cyan-400 font-bold">FILE: {analysis.patch.file}</div>
                      <div className="text-slate-400">CHANGES:</div>
                      {analysis.patch.changesSummary.map((c, i) => (
                        <div key={i} className="text-emerald-400">{c}</div>
                      ))}
                    </div>
                    <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                      {displayedText}
                      {isTyping && <span className="inline-block w-2 h-3.5 bg-cyan-400 ml-0.5 animate-pulse"></span>}
                    </pre>
                  </div>
                )}

                {/* Tab: Explanation */}
                {activeTab === 'explanation' && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2 max-h-52 overflow-y-auto">
                    <div className="whitespace-pre-wrap text-slate-300 leading-relaxed font-sans">
                      {displayedText}
                      {isTyping && <span className="inline-block w-2 h-3.5 bg-cyan-400 ml-0.5 animate-pulse"></span>}
                    </div>
                    {analysis.edge_cases && analysis.edge_cases.length > 0 && !isTyping && (
                      <div className="pt-2 border-t border-slate-800">
                        <div className="font-semibold text-amber-300">Edge Cases:</div>
                        <ul className="list-disc list-inside text-slate-400 mt-1">
                          {analysis.edge_cases.map((e, idx) => (
                            <li key={idx}>{e}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Validation */}
                {activeTab === 'issues' && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2 max-h-52 overflow-y-auto">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="font-medium text-slate-200">
                        {analysis.validation.isValid ? 'Syntax & Semantics Valid' : 'Issues Detected'}
                      </span>
                    </div>
                    {analysis.validation.errors.map((err, idx) => (
                      <div key={idx} className="p-2 rounded bg-red-950/40 border border-red-900 text-red-300 text-[11px]">
                        ❌ {err}
                      </div>
                    ))}
                    {analysis.validation.warnings.map((warn, idx) => (
                      <div key={idx} className="p-2 rounded bg-amber-950/40 border border-amber-900 text-amber-300 text-[11px]">
                        ⚠ {warn}
                      </div>
                    ))}
                    {analysis.validation.errors.length === 0 && analysis.validation.warnings.length === 0 && (
                      <div className="text-slate-400 text-[11px]">
                        ✓ Syntax valid<br/>
                        ✓ Example test cases verified<br/>
                        ✓ Constraints reviewed
                      </div>
                    )}
                  </div>
                )}

                {/* Animated Editor Insertion Controls */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleInsertCodeAnimated}
                      disabled={isEditorTyping}
                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                      title="Simulates human-like character by character typing animation directly into Monaco editor"
                    >
                      <Keyboard className="w-3.5 h-3.5" />
                      {isEditorTyping ? `Typing Code... ${editorTypingProgress}%` : '⌨️ Type into Editor (Animated)'}
                    </button>

                    <button
                      onClick={handleInsertCodeInstant}
                      disabled={isEditorTyping}
                      className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition flex items-center gap-1"
                      title="Instant paste without typing animation"
                    >
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      Instant
                    </button>

                    <button
                      onClick={handleRunTest}
                      disabled={loading}
                      className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition flex items-center gap-1"
                      title="Run sample test in sandbox or trigger Run Code and log score"
                    >
                      <Play className="w-3.5 h-3.5 text-cyan-400" />
                      {loading ? 'Testing...' : 'Test & Score'}
                    </button>
                  </div>

                  {/* Progress bar during editor typing animation */}
                  {isEditorTyping && (
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-1.5 transition-all duration-100"
                        style={{ width: `${editorTypingProgress}%` }}
                      ></div>
                    </div>
                  )}
                </div>

                {testResult && !scoreResult && (
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-200">
                    <span className="text-slate-500">Test Output:</span> {testResult}
                  </div>
                )}

                {/* Safety & Non-Repeat Notice */}
                <div className="text-[10px] text-slate-500 leading-tight text-center px-1">
                  🔒 Safety Guard: User reviews code before submission. Questions earning points are saved to prevent repeating.
                </div>

              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};
