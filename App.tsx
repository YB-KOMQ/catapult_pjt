
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ExperimentFactors, 
  ExperimentConditions, 
  ExperimentResult, 
  MaterialType, 
  LaunchMethod 
} from './types';
import { 
  INITIAL_FACTORS, 
  INITIAL_CONDITIONS, 
  FACTOR_LABELS, 
  MAX_SIM_DISTANCE, 
  BASE_COST, 
  COST_PER_FACTOR 
} from './constants';
import PasswordOverlay from './components/PasswordOverlay';
import ChatBot from './components/ChatBot';

const App: React.FC = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [factors, setFactors] = useState<ExperimentFactors>(INITIAL_FACTORS);
  const [conditions, setConditions] = useState<ExperimentConditions>(INITIAL_CONDITIONS);
  const [targetDistance, setTargetDistance] = useState(420);
  const [repeatCount, setRepeatCount] = useState(3);
  const [results, setResults] = useState<ExperimentResult[]>([]);
  const [explosionSuccessCount, setExplosionSuccessCount] = useState(0);
  
  // Animation states
  const [isLaunching, setIsLaunching] = useState(false);
  const [currentProjectile, setCurrentProjectile] = useState<{ x: number, y: number, color: string } | null>(null);
  const [isExploding, setIsExploding] = useState(false);
  const [armRotation, setArmRotation] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);

  // Function to play explosion sound using Web Audio API
  const playExplosionSound = () => {
    try {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      const audioCtx = new AudioContextClass();
      const bufferSize = audioCtx.sampleRate * 0.4;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, audioCtx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.4);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      noise.start();
    } catch (e) {
      console.warn("Audio playback failed", e);
    }
  };

  const updateFactor = (key: keyof ExperimentFactors) => {
    setFactors(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateCondition = (key: keyof ExperimentConditions, value: any) => {
    setConditions(prev => ({ ...prev, [key]: value }));
  };

  const calculateCost = useCallback(() => {
    const activeFactorCount = Object.values(factors).filter(Boolean).length;
    return BASE_COST + activeFactorCount * COST_PER_FACTOR;
  }, [factors]);

  const launch = async () => {
    if (isLaunching) return;
    setIsLaunching(true);
    
    const currentCost = calculateCost();
    const currentDistances: number[] = [];
    const activeFactors = Object.entries(factors)
      .filter(([_, active]) => active)
      .reduce((acc, [key]) => ({ ...acc, [key]: (conditions as any)[key] }), {});

    const materialColors: Record<MaterialType, string> = {
      'A': '#ef4444',
      'B': '#3b82f6',
      'C': '#f59e0b'
    };

    for (let i = 0; i < repeatCount; i++) {
      // Logic for distance calculation
      let baseDist = 400;
      baseDist += (conditions.angle - 45) * 0.5;
      baseDist += (conditions.tension - 5) * 10;
      baseDist -= (conditions.mass - 1) * 20;
      baseDist += (conditions.rubberLength - 30) * 2;
      baseDist -= (conditions.friction - 0.2) * 50;
      baseDist += (conditions.wind) * 5;
      
      const variation = (Math.random() - 0.5) * 20;
      const finalDist = Math.max(0, Math.min(MAX_SIM_DISTANCE, baseDist + variation));
      
      // Arm Animation
      setArmRotation(-80);
      
      const worldWidth = worldRef.current?.clientWidth || 1000;
      const worldHeight = worldRef.current?.clientHeight || 400;
      const startX = 72;
      const startY = worldHeight - 120;

      // Check for hit
      const isHit = Math.abs(finalDist - targetDistance) <= 3;
      
      // For visual precision, if it's a hit, we land exactly at the target coordinate
      const animatedDist = isHit ? targetDistance : finalDist;
      const visualDist = (animatedDist / MAX_SIM_DISTANCE) * (worldWidth - startX - 100);
      
      const totalSteps = 40;
      for (let step = 0; step <= totalSteps; step++) {
        const t = step / totalSteps;
        const x = startX + visualDist * t;
        const peak = 150;
        const y = startY - Math.sin(Math.PI * t) * peak;
        
        setCurrentProjectile({ x, y, color: materialColors[conditions.material] });
        await new Promise(r => setTimeout(r, 20));
      }

      if (isHit) {
        playExplosionSound(); // Play explosion sound on hit
        setIsExploding(true);
        setExplosionSuccessCount(prev => prev + 1);
        await new Promise(r => setTimeout(r, 500));
        setIsExploding(false);
      }

      currentDistances.push(finalDist);
      setArmRotation(0);
      setCurrentProjectile(null);
      await new Promise(r => setTimeout(r, 200));
    }

    const avg = currentDistances.reduce((a, b) => a + b, 0) / repeatCount;
    const newResult: ExperimentResult = {
      id: results.length + 1,
      conditions: activeFactors,
      yValues: currentDistances,
      yBar: avg,
      cost: currentCost
    };

    setResults(prev => [...prev, newResult]);
    setIsLaunching(false);
  };

  const resetTable = () => {
    setResults([]);
    setExplosionSuccessCount(0);
  };

  const downloadCSV = () => {
    const activeHeaders = Object.entries(factors)
      .filter(([_, v]) => v)
      .map(([k]) => FACTOR_LABELS[k as keyof ExperimentFactors]);
    
    const yHeaders = Array.from({ length: repeatCount }, (_, i) => `Y${i + 1}`);
    const headers = ['실험 번호', ...activeHeaders, ...yHeaders, 'Ybar', '비용'];
    
    const rows = results.map(r => {
      const conditionValues = Object.entries(factors)
        .filter(([_, v]) => v)
        .map(([k]) => (r.conditions as any)[k]);
      return [r.id, ...conditionValues, ...r.yValues.map(v => v.toFixed(1)), r.yBar.toFixed(1), r.cost];
    });

    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `catapult_exp_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isUnlocked) {
    return <PasswordOverlay onSuccess={() => setIsUnlocked(true)} />;
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-slate-50 text-slate-800">
      <header className="mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-6 flex-1">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span className="text-4xl">🎯</span> 투석기 시뮬레이터 <span className="text-blue-600">Pro</span>
            </h1>
            <p className="text-slate-500 mt-1 font-medium text-sm">한국경영품질연구원 실험계획법(DOE) 교육 시스템</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={launch}
              disabled={isLaunching}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 active:scale-95 text-sm"
            >
              {isLaunching ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>🚀</span>
              )}
              발사 개시!
            </button>
            <button
              onClick={downloadCSV}
              className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-all text-sm"
            >
              CSV 추출
            </button>
            <button
              onClick={resetTable}
              className="bg-white hover:bg-red-50 text-red-600 font-bold px-5 py-2.5 rounded-xl border border-red-100 shadow-sm transition-all text-sm"
            >
              리셋
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-right">
            <p className="text-xs text-slate-400 font-bold uppercase">Target Hit</p>
            <p className="text-2xl font-black text-orange-600 leading-none">{explosionSuccessCount}</p>
          </div>
          <div className="h-8 w-px bg-slate-100" />
          <div className="px-2">
            <span className="text-xs text-slate-400 font-bold uppercase block">Status</span>
            <span className={`inline-flex items-center gap-1 text-sm font-semibold ${isLaunching ? 'text-blue-500' : 'text-green-500'}`}>
              <span className={`w-2 h-2 rounded-full ${isLaunching ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
              {isLaunching ? 'Launching...' : 'Ready'}
            </span>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Control Panel */}
        <section className="xl:col-span-5 space-y-6">
          {/* Target Control */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="text-blue-600">💡</span> 목표값 설정
            </h2>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-600 mb-2">목표 거리 (0 ~ 500m)</label>
                <div className="relative">
                  <input
                    type="range"
                    min="50"
                    max="450"
                    value={targetDistance}
                    onChange={(e) => setTargetDistance(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono">
                    <span>50m</span>
                    <span className="text-blue-600 font-bold">{targetDistance}m</span>
                    <span>450m</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Factor Selection */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="text-blue-600">✅</span> 실험 인자 선택
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(Object.keys(factors) as Array<keyof ExperimentFactors>).map(key => (
                <label key={key} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                  factors[key] ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-100 text-slate-500 grayscale'
                }`}>
                  <input
                    type="checkbox"
                    checked={factors[key]}
                    onChange={() => updateFactor(key)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium">{FACTOR_LABELS[key]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Conditions Input */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="text-blue-600">⚙️</span> 조건 상세 입력
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {factors.angle && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{FACTOR_LABELS.angle}</label>
                  <input type="number" value={conditions.angle} onChange={(e) => updateCondition('angle', Number(e.target.value))} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              )}
              {factors.tension && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{FACTOR_LABELS.tension}</label>
                  <input type="number" value={conditions.tension} onChange={(e) => updateCondition('tension', Number(e.target.value))} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              )}
              {factors.mass && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{FACTOR_LABELS.mass}</label>
                  <input type="number" step="0.1" value={conditions.mass} onChange={(e) => updateCondition('mass', Number(e.target.value))} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              )}
              {factors.rubberLength && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{FACTOR_LABELS.rubberLength}</label>
                  <input type="number" value={conditions.rubberLength} onChange={(e) => updateCondition('rubberLength', Number(e.target.value))} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              )}
              {factors.friction && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{FACTOR_LABELS.friction}</label>
                  <input type="number" step="0.01" value={conditions.friction} onChange={(e) => updateCondition('friction', Number(e.target.value))} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              )}
              {factors.temp && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{FACTOR_LABELS.temp}</label>
                  <input type="number" value={conditions.temp} onChange={(e) => updateCondition('temp', Number(e.target.value))} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              )}
              {factors.humidity && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{FACTOR_LABELS.humidity}</label>
                  <input type="number" value={conditions.humidity} onChange={(e) => updateCondition('humidity', Number(e.target.value))} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              )}
              {factors.wind && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{FACTOR_LABELS.wind}</label>
                  <input type="number" step="0.1" value={conditions.wind} onChange={(e) => updateCondition('wind', Number(e.target.value))} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              )}
              {factors.material && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{FACTOR_LABELS.material}</label>
                  <select value={conditions.material} onChange={(e) => updateCondition('material', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="A">Type A (Red)</option>
                    <option value="B">Type B (Blue)</option>
                    <option value="C">Type C (Yellow)</option>
                  </select>
                </div>
              )}
              {factors.method && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{FACTOR_LABELS.method}</label>
                  <select value={conditions.method} onChange={(e) => updateCondition('method', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="손당김">손당김</option>
                    <option value="기계당김">기계당김</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">발사 횟수 (Repeat)</label>
                <input type="number" min="1" max="10" value={repeatCount} onChange={(e) => setRepeatCount(Math.min(10, Math.max(1, Number(e.target.value))))} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          </div>
        </section>

        {/* Right Simulation & Results Panel */}
        <section className="xl:col-span-7 space-y-6">
          {/* Visualizer (Fixed Viewport, No Horizontal Scroll) */}
          <div 
            ref={containerRef}
            className={`relative w-full h-[400px] bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#334155] rounded-3xl border-4 border-slate-800 shadow-2xl overflow-hidden ${isExploding ? 'animate-shake' : ''}`}
          >
            <div 
              ref={worldRef}
              className="relative h-full w-full"
            >
              {/* Stars */}
              <div className="absolute inset-0 pointer-events-none opacity-40">
                {Array.from({ length: 60 }).map((_, i) => (
                  <div key={i} className="absolute bg-white rounded-full" style={{
                    top: `${Math.random() * 80}%`,
                    left: `${Math.random() * 100}%`,
                    width: `${Math.random() * 3}px`,
                    height: `${Math.random() * 3}px`,
                  }} />
                ))}
              </div>

              {/* Moon */}
              <div className="absolute top-8 right-1/4 w-16 h-16 bg-yellow-50 rounded-full shadow-[0_0_30px_rgba(253,224,71,0.3)] z-0" />

              {/* Background Silhouettes (Trees/Jungle) */}
              <div className="absolute bottom-16 w-full flex justify-around items-end opacity-20 pointer-events-none z-0">
                 {Array.from({ length: 15 }).map((_, i) => (
                   <div key={i} className="bg-[#064e3b] w-24 h-48 rounded-t-full -mb-12 blur-[1px]" />
                 ))}
              </div>

              {/* Scenery Ground (Grassy/Sandy style) */}
              <div className="absolute bottom-0 w-full h-16 bg-[#3f6212] border-t-4 border-[#1a2e05] z-10" />

              {/* Target Marker (Wooden Crate Style) */}
              <div 
                className="absolute bottom-16 w-12 h-12 z-20 transition-all flex flex-col items-center"
                style={{ left: `calc(${72}px + ${(targetDistance / MAX_SIM_DISTANCE) * ((containerRef.current?.clientWidth || 0) - 172)}px)` }}
              >
                <div className="w-10 h-10 bg-[#78350f] border-2 border-[#451a03] rounded shadow-lg flex items-center justify-center text-xs font-bold text-white/50 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full border border-white/10" />
                  <div className="absolute w-1 h-full bg-[#451a03] left-1/4" />
                  <div className="absolute w-1 h-full bg-[#451a03] right-1/4" />
                  <div className="absolute h-1 w-full bg-[#451a03] top-1/4" />
                  <div className="absolute h-1 w-full bg-[#451a03] bottom-1/4" />
                  📦
                </div>
                <div className="absolute -bottom-8 bg-orange-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm whitespace-nowrap">
                  {targetDistance}m
                </div>
              </div>

              {/* Slingshot / Catapult (Wooden Game Style) */}
              <div className="absolute bottom-16 left-[40px] z-30">
                 {/* Y-shaped Slingshot Base */}
                 <svg width="40" height="80" viewBox="0 0 40 80">
                   <path d="M15 80 L15 40 L5 20" stroke="#451a03" strokeWidth="6" fill="none" strokeLinecap="round" />
                   <path d="M25 80 L25 40 L35 20" stroke="#451a03" strokeWidth="6" fill="none" strokeLinecap="round" />
                   <path d="M15 40 L25 40" stroke="#451a03" strokeWidth="6" strokeLinecap="round" />
                   {/* Vines */}
                   <path d="M10 30 Q15 35 20 30" stroke="#166534" strokeWidth="2" fill="none" />
                 </svg>
                 
                 {/* Elastic Band (Dynamically animated) */}
                 <svg width="100" height="100" className="absolute -top-10 -left-10 pointer-events-none">
                   <line x1="15" y1="30" x2={isLaunching ? 15 + armRotation/2 : 15} y2={isLaunching ? 30 - armRotation/4 : 30} stroke="#1e1e1e" strokeWidth="2" />
                 </svg>

                 {/* Arm/Mechanism (Subtle wooden rotating part for simulation consistency) */}
                 <div 
                  className="absolute top-4 left-4 origin-left opacity-0"
                  style={{ transform: `rotate(${armRotation}deg)` }}
                 />
              </div>

              {/* Projectile (Monkey or Character Style) */}
              {currentProjectile ? (
                <div 
                  className="absolute w-8 h-8 flex items-center justify-center text-xl z-40 transition-none"
                  style={{ 
                    left: currentProjectile.x - 16, 
                    top: currentProjectile.y - 16,
                    filter: `drop-shadow(0 0 10px ${currentProjectile.color}44)`
                  }}
                >
                  🐒
                </div>
              ) : null}

              {/* Explosion Effect */}
              {isExploding && (
                <div 
                  className="absolute w-48 h-48 z-50 flex items-center justify-center pointer-events-none"
                  style={{ 
                    left: `calc(${72}px + ${(targetDistance / MAX_SIM_DISTANCE) * ((containerRef.current?.clientWidth || 0) - 172)}px - 72px)`,
                    bottom: '16px'
                  }}
                >
                  <div className="w-full h-full bg-orange-500 rounded-full animate-ping opacity-75" />
                  <span className="absolute text-3xl">💥</span>
                </div>
              )}
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-700">실험 결과 데이터 로그</h3>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">DOE Records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-center border-collapse">
                <thead className="text-sm text-slate-600 bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-2 py-4 border-r border-slate-200 font-semibold">실험 번호</th>
                    {(Object.keys(factors) as Array<keyof ExperimentFactors>).filter(k => factors[k]).map(k => (
                      <th key={k} className="px-2 py-4 border-r border-slate-200 font-semibold">{FACTOR_LABELS[k]}</th>
                    ))}
                    {Array.from({ length: repeatCount }).map((_, i) => (
                      <th key={i} className="px-2 py-4 border-r border-slate-200 font-semibold">Y{i + 1}</th>
                    ))}
                    <th className="px-2 py-4 border-r border-slate-200 font-semibold bg-blue-50/30">Ybar</th>
                    <th className="px-2 py-4 font-semibold text-slate-600">비용</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.length === 0 ? (
                    <tr>
                      <td colSpan={30} className="px-4 py-16 text-center text-slate-400 italic bg-white">표시할 결과가 없습니다. 발사 버튼을 눌러보세요.</td>
                    </tr>
                  ) : (
                    results.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                        <td className="px-2 py-4 border-r border-slate-100 font-medium text-slate-700">{r.id}</td>
                        {(Object.keys(factors) as Array<keyof ExperimentFactors>).filter(k => factors[k]).map(k => (
                          <td key={k} className="px-2 py-4 border-r border-slate-100 text-slate-600">{(r.conditions as any)[k] ?? '-'}</td>
                        ))}
                        {r.yValues.map((y, idx) => (
                          <td key={idx} className="px-2 py-4 border-r border-slate-100 font-mono text-slate-600">{y.toFixed(1)}</td>
                        ))}
                        <td className="px-2 py-4 border-r border-slate-100 font-bold text-slate-800 bg-blue-50/20">{r.yBar.toFixed(1)}</td>
                        <td className="px-2 py-4 font-bold text-slate-700">{r.cost}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      <ChatBot />

      <footer className="mt-16 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 text-xs font-medium">
        <p>© 2024 Korea Management Quality Institute. All Rights Reserved.</p>
        <div className="flex gap-6">
          <span className="hover:text-slate-600 transition-colors cursor-help">이용약관</span>
          <span className="hover:text-slate-600 transition-colors cursor-help">개인정보처리방침</span>
          <span className="hover:text-slate-600 transition-colors cursor-help">교육 문의: 02-1234-5678</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
