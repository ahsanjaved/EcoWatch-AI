/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  Leaf, 
  Activity, 
  MapPin, 
  AlertTriangle, 
  ClipboardCheck, 
  Loader2,
  Trash2,
  RefreshCw,
  Search,
  Globe,
  Languages,
  Bell
} from 'lucide-react';
import { analyzeEnvironmentImage, analyzeEnvironmentMetadata, translateAnalysisReport, aggregateReports } from './services/geminiService';
import { AnalysisResult, AggregationResult, ReportInput } from './types';
import { ImageDropzone } from './components/ImageDropzone';
import { SeverityBadge } from './components/SeverityBadge';
import { cn } from './lib/utils';

const TRANSLATION_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ur', label: 'اردو' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ar', label: 'العربية' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' }
];

export default function App() {
  const [activeMode, setActiveMode] = useState<'image' | 'metadata' | 'aggregation' | 'geo_verify'>('image');
  const [image, setImage] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<{ base64: string, mimeType: string } | null>(null);
  const [labels, setLabels] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [geoLat, setGeoLat] = useState<string>('');
  const [geoLon, setGeoLon] = useState<string>('');
  const [reportsInput, setReportsInput] = useState<string>('[\n  { "issue_category": "deforestation", "confidence": 0.9 },\n  { "issue_category": "water_pollution", "confidence": 0.85 }\n]');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [originalResult, setOriginalResult] = useState<AnalysisResult | null>(null);
  const [aggregationResult, setAggregationResult] = useState<AggregationResult | null>(null);
  const [geoResult, setGeoResult] = useState<import('./types').GeographicAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState('English');

  const handleImageSelect = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    setOriginalResult(null);
    setGeoResult(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      const base64Match = dataUrl.match(/base64,(.*)$/);
      if (!base64Match) return;
      const base64Str = base64Match[1];
      setImage(dataUrl);
      setRawFile({ base64: base64Str, mimeType: file.type });
      
      if (activeMode === 'image') {
        setIsProcessing(true);
        try {
          const analysis = await analyzeEnvironmentImage(base64Str, file.type);
          setOriginalResult(analysis);
          
          if (targetLanguage !== 'English') {
            setIsTranslating(true);
            const translated = await translateAnalysisReport(analysis, targetLanguage);
            setResult(translated);
            setIsTranslating(false);
          } else {
            setResult(analysis);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An unexpected error occurred during monitoring.');
        } finally {
          setIsProcessing(false);
          setIsTranslating(false);
        }
      }
    };
    reader.readAsDataURL(file);
  }, [targetLanguage, activeMode]);

  const handleMetadataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labels.trim()) return;

    setError(null);
    setIsProcessing(true);
    setResult(null);
    setOriginalResult(null);

    try {
      const labelList = labels.split(',').map(l => l.trim()).filter(Boolean);
      const analysis = await analyzeEnvironmentMetadata(labelList, location);
      setOriginalResult(analysis);

      if (targetLanguage !== 'English') {
        setIsTranslating(true);
        const translated = await translateAnalysisReport(analysis, targetLanguage);
        setResult(translated);
      } else {
        setResult(analysis);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed.');
    } finally {
      setIsProcessing(false);
      setIsTranslating(false);
    }
  };

  const handleLanguageChange = async (newLang: string) => {
    setTargetLanguage(newLang);
    if (!originalResult) return;
    
    if (newLang === 'English') {
      setResult(originalResult);
      return;
    }

    setIsTranslating(true);
    try {
      const translated = await translateAnalysisReport(originalResult, newLang);
      setResult(translated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed. Reverting language.');
      setTargetLanguage('English');
      setResult(originalResult);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleGeoVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawFile || !geoLat.trim() || !geoLon.trim()) return;

    import('./services/geminiService').then(async ({ verifyLocationMatch }) => {
      setError(null);
      setIsProcessing(true);
      setGeoResult(null);

      try {
        const result = await verifyLocationMatch(rawFile.base64, rawFile.mimeType, geoLat, geoLon);
        setGeoResult(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Verification failed.');
      } finally {
        setIsProcessing(false);
      }
    });
  };

  const handleAggregationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportsInput.trim()) return;

    setError(null);
    setIsProcessing(true);
    setAggregationResult(null);

    try {
      const reports = JSON.parse(reportsInput);
      const result = await aggregateReports(reports);
      setAggregationResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aggregation failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setImage(null);
    setRawFile(null);
    setLabels('');
    setLocation('');
    setGeoLat('');
    setGeoLon('');
    setReportsInput('[\n  { "issue_category": "deforestation", "confidence": 0.9 },\n  { "issue_category": "water_pollution", "confidence": 0.85 }\n]');
    setResult(null);
    setOriginalResult(null);
    setAggregationResult(null);
    setGeoResult(null);
    setError(null);
    setIsProcessing(false);
    setIsTranslating(false);
  };

  return (
    <div id="eco-watch-root" className="min-h-screen bg-[#0A0A0B] text-slate-200 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-900 bg-[#0A0A0B]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 h-16">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-500 shadow-inner">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-lg font-bold tracking-tight text-white leading-none">ECOWATCH AI</span>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest leading-none mt-1">Environmental Response System</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-xs font-mono text-slate-500">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              SYSTEM ACTIVE
            </div>
            <div className="hidden sm:block">REGION: GLOBAL_OBSERVATORY</div>
            
            <div className="flex items-center gap-2 pl-4 border-l border-slate-800 relative">
              {isTranslating ? (
                <Loader2 className="h-4 w-4 text-emerald-500 animate-spin absolute -left-2" />
              ) : (
                <Languages className="h-4 w-4 text-slate-500" />
              )}
              <select 
                value={targetLanguage} 
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-transparent text-slate-300 text-xs font-mono focus:outline-none focus:ring-0 cursor-pointer appearance-none hover:text-white transition-colors"
                disabled={isProcessing || isTranslating}
              >
                {TRANSLATION_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.label} className="bg-slate-900 text-slate-300">
                    {lang.code.toUpperCase()} - {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative mx-auto max-w-7xl px-6 py-12">
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Input and Preview */}
          <div className="lg:col-span-5 space-y-6">
            <section id="input-section" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex bg-slate-900 rounded-lg p-1">
                  <button 
                    onClick={() => { setActiveMode('image'); reset(); }}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-mono rounded-md transition-all",
                      activeMode === 'image' ? "bg-emerald-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    IMAGE SCAN
                  </button>
                  <button 
                    onClick={() => { setActiveMode('metadata'); reset(); }}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-mono rounded-md transition-all",
                      activeMode === 'metadata' ? "bg-emerald-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    DATA DESK
                  </button>
                  <button 
                    onClick={() => { setActiveMode('aggregation'); reset(); }}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-mono rounded-md transition-all",
                      activeMode === 'aggregation' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    AGGREGATE
                  </button>
                  <button 
                    onClick={() => { setActiveMode('geo_verify'); reset(); }}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-mono rounded-md transition-all",
                      activeMode === 'geo_verify' ? "bg-amber-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    GEO-VERIFY
                  </button>
                </div>
                {(image || labels || aggregationResult || geoResult) && !isProcessing && (
                  <button 
                    onClick={reset}
                    className="group flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Reset
                  </button>
                )}
              </div>
              
              {activeMode === 'image' ? (
                !image ? (
                  <ImageDropzone onImageSelect={handleImageSelect} isProcessing={isProcessing} />
                ) : (
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
                    <img src={image} alt="Environmental surveillance" className="h-full w-full object-cover" />
                    
                    {isProcessing && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm">
                        <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
                        <div className="text-center">
                          <p className="text-sm font-semibold text-white uppercase tracking-wider mb-1">Scanning Multispectral Data</p>
                          <p className="text-xs text-emerald-500 font-mono">Running neural ecology assessment...</p>
                        </div>
                      </div>
                    )}

                    {/* Recognition Overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                      <div className="flex flex-wrap gap-2">
                        {result?.detected_objects.map((obj, i) => (
                          <span key={i} className="text-[10px] font-mono bg-white/10 backdrop-blur-md text-white px-2 py-0.5 rounded border border-white/10">
                            {obj}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              ) : activeMode === 'metadata' ? (
                <form onSubmit={handleMetadataSubmit} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
                   <div className="space-y-2">
                    <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Vision API Labels (comma separated)</label>
                    <textarea 
                      value={labels}
                      onChange={(e) => setLabels(e.target.value)}
                      placeholder="e.g., forest, smoke, industrial, river, pipe"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-emerald-500/50 min-h-[100px]"
                      disabled={isProcessing}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Location Metadata (optional)</label>
                    <input 
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., Brazil, Amazon Region"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-emerald-500/50"
                      disabled={isProcessing}
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isProcessing || !labels.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                    INITIATE DATA SCAN
                  </button>
                </form>
              ) : activeMode === 'aggregation' ? (
                <form onSubmit={handleAggregationSubmit} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
                   <div className="space-y-2">
                    <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Aggregation Reports (JSON Array)</label>
                    <textarea 
                      value={reportsInput}
                      onChange={(e) => setReportsInput(e.target.value)}
                      placeholder='[{ "issue_category": "deforestation", "confidence": 0.9 }, ...]'
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50 min-h-[160px] font-mono"
                      disabled={isProcessing}
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isProcessing || !reportsInput.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                    AGGREGATE REPORTS
                  </button>
                </form>
              ) : (
                <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
                  {!image ? (
                     <ImageDropzone onImageSelect={handleImageSelect} isProcessing={isProcessing} />
                  ) : (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
                      <img src={image} alt="Location visual" className="h-full w-full object-cover opacity-60" />
                    </div>
                  )}
                  <form onSubmit={handleGeoVerifySubmit} className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Latitude</label>
                        <input 
                          type="text"
                          value={geoLat}
                          onChange={(e) => setGeoLat(e.target.value)}
                          placeholder="e.g., 34.0522"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-amber-500/50"
                          disabled={isProcessing}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Longitude</label>
                        <input 
                          type="text"
                          value={geoLon}
                          onChange={(e) => setGeoLon(e.target.value)}
                          placeholder="e.g., -118.2437"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-amber-500/50"
                          disabled={isProcessing}
                        />
                      </div>
                    </div>
                    <button 
                      type="submit"
                      disabled={isProcessing || !image || !geoLat.trim() || !geoLon.trim()}
                      className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                      VERIFY LOCATION
                    </button>
                  </form>
                </div>
              )}

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg bg-red-950/30 border border-red-900/50 flex gap-3 text-red-200"
                >
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-tight">System Alert</h4>
                    <p className="text-xs opacity-80 mt-1">{error}</p>
                  </div>
                </motion.div>
              )}
            </section>

            {/* Status Summary Card */}
            <AnimatePresence>
              {result && (
                <motion.section 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <Activity className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold text-white tracking-tight">Assessment Summary</h3>
                    </div>
                    <SeverityBadge severity={result.issues.length === 0 ? "STABLE" : "MONITORING"} />
                  </div>
                  
                  <p className="text-sm text-slate-400 leading-relaxed italic border-l-2 border-slate-800 pl-4 py-2">
                    "{result.overall_status}"
                  </p>
                  
                  <div className="mt-6 space-y-4">
                    <div className="text-xs text-slate-400">
                      <p className="mb-2 leading-relaxed">{result.summary}</p>
                    </div>

                    {/* Forensic Data Panel */}
                    <div className="pt-4 border-t border-slate-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Primary Classification</span>
                        <span className="text-xs font-bold text-white uppercase">{result.issue_category.replace('_', ' ')}</span>
                      </div>
                      
                      {result.urgency_level && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Urgency Level</span>
                          <span className={cn(
                            "text-[10px] font-mono font-bold uppercase",
                            result.urgency_level === 'high' ? 'text-red-500' :
                            result.urgency_level === 'medium' ? 'text-orange-500' : 'text-emerald-500'
                          )}>{result.urgency_level}</span>
                        </div>
                      )}
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Confidence Rating</span>
                          <span className="text-[10px] font-mono text-emerald-500">{(result.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${result.confidence * 100}%` }}
                            className="h-full bg-emerald-500"
                          />
                        </div>
                      </div>

                      {result.probable_causes && result.probable_causes.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Probable Causes</span>
                          <div className="space-y-1">
                            {result.probable_causes.map((cause, i) => (
                              <div key={i} className="flex items-center gap-2 text-[10px] text-slate-400">
                                <span className="h-1 w-1 rounded-full bg-red-800" />
                                {cause}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {result.suggested_actions && result.suggested_actions.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Suggested Actions</span>
                          <div className="space-y-1">
                            {result.suggested_actions.map((action, i) => (
                              <div key={i} className="flex items-center gap-2 text-[10px] text-slate-400">
                                <span className="h-1 w-1 rounded-full bg-emerald-800" />
                                {action}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Visual Evidence Log</span>
                        <div className="space-y-1">
                          {result.visual_evidence.map((ev, i) => (
                            <div key={i} className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span className="h-1 w-1 rounded-full bg-slate-700" />
                              {ev}
                            </div>
                          ))}
                        </div>
                      </div>

                      {result.citizen_alert && (
                        <div className="mt-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Bell className="h-4 w-4 text-orange-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Public Alert Broadcast</span>
                          </div>
                          <p className="text-sm text-slate-300 leading-relaxed">
                            {result.citizen_alert}
                          </p>
                        </div>
                      )}

                      {result.reporter_notification && (
                        <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-slate-900 font-bold text-[10px]">i</span>
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Reporter Message</span>
                          </div>
                          <p className="text-sm text-slate-300 leading-relaxed">
                            {result.reporter_notification}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: Detailed Issues */}
          <div className="lg:col-span-7">
            {activeMode === 'aggregation' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Regional Aggregation Summary
                  </h2>
                </div>
                
                {!aggregationResult && !isProcessing && (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-600 border border-slate-900 rounded-2xl bg-slate-900/20">
                    <Globe className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-sm font-mono tracking-wider italic text-center max-w-xs px-6">
                      Ready for aggregation. Provide report data to begin.
                    </p>
                  </div>
                )}

                {isProcessing && (
                  <div className="space-y-4">
                    {[1, 2].map(i => (
                      <div key={i} className="animate-pulse rounded-2xl border border-slate-900 bg-slate-900/40 p-12" />
                    ))}
                  </div>
                )}

                {aggregationResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-6 backdrop-blur-sm">
                      <p className="text-sm text-slate-300 leading-relaxed italic border-l-2 border-indigo-500/50 pl-4 py-2">
                        {aggregationResult.summary}
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {aggregationResult.top_issues.map((issue, idx) => (
                        <div key={idx} className="rounded-xl border border-slate-800 bg-[#111113] p-5">
                          <h4 className="font-bold text-white uppercase tracking-tight mb-2">{issue.category.replace('_', ' ')}</h4>
                          <div className="flex justify-between text-xs text-slate-400 font-mono">
                            <span>REPORTS: <span className="text-indigo-400">{issue.count}</span></span>
                            <span>CONFIDENCE: <span className="text-indigo-400">{(issue.average_confidence * 100).toFixed(0)}%</span></span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
                      <h4 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                        <ClipboardCheck className="h-4 w-4 text-emerald-500" />
                        Recommended Regional Actions
                      </h4>
                      <ul className="space-y-2">
                        {aggregationResult.recommended_regional_actions.map((action, idx) => (
                          <li key={idx} className="flex gap-2 text-sm text-slate-400 border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                            <span className="text-emerald-500 font-mono shrink-0">[{idx + 1}]</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : activeMode === 'geo_verify' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Geographic Verification
                  </h2>
                </div>
                
                {!geoResult && !isProcessing && (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-600 border border-slate-900 rounded-2xl bg-slate-900/20">
                    <Globe className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-sm font-mono tracking-wider italic text-center max-w-xs px-6">
                      Awaiting location verification data.
                    </p>
                  </div>
                )}

                {isProcessing && (
                  <div className="space-y-4">
                    <div className="animate-pulse rounded-2xl border border-slate-900 bg-slate-900/40 p-12" />
                  </div>
                )}

                {geoResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 backdrop-blur-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <Activity className="h-5 w-5 text-amber-500" />
                        <span className="text-sm font-bold text-white uppercase tracking-tight">Match Probability</span>
                      </div>
                      <div className="flex items-end gap-3 mb-2">
                        <span className="text-4xl font-bold text-amber-400">{(geoResult.probability_score * 100).toFixed(1)}%</span>
                        <span className="text-sm text-slate-400 mb-1 font-mono uppercase">Confidence</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${geoResult.probability_score * 100}%` }}
                          className={cn(
                            "h-full rounded-full",
                            geoResult.probability_score > 0.7 ? "bg-emerald-500" : geoResult.probability_score > 0.3 ? "bg-amber-500" : "bg-red-500"
                          )}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
                      <h4 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                        <ClipboardCheck className="h-4 w-4 text-emerald-500" />
                        Geographic Reasoning Log
                      </h4>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {geoResult.reasoning}
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              <>
                {result && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-bold text-white uppercase tracking-tight">Active Warning</span>
                </div>
                <p className="text-sm text-slate-300 italic">"{result.short_description}"</p>
              </motion.div>
            )}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Search className="h-4 w-4" />
                Detected Environmental Anomalies
              </h2>
              {result && (
                <span className="text-xs font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                  {result.issues.length} ISSUES IDENTIFIED
                </span>
              )}
            </div>

            <div className="space-y-4">
              {!result && !isProcessing && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-600 border border-slate-900 rounded-2xl bg-slate-900/20">
                  <Leaf className="h-12 w-12 mb-4 opacity-20" />
                  <p className="text-sm font-mono tracking-wider italic text-center max-w-xs px-6">
                    Ready for analysis. Please upload high-resolution environmental imagery to begin scan.
                  </p>
                </div>
              )}

              {isProcessing && (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="animate-pulse rounded-2xl border border-slate-900 bg-slate-900/40 p-12" />
                  ))}
                </div>
              )}

              <AnimatePresence>
                {result?.issues.map((issue, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="group overflow-hidden rounded-2xl border border-slate-800 bg-[#111113] hover:border-slate-700 transition-all"
                  >
                    <div className="flex border-b border-slate-900 p-6 flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "p-3 rounded-xl border",
                          issue.severity === 'CRITICAL' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                          issue.severity === 'HIGH' ? "bg-orange-500/10 border-orange-500/20 text-orange-500" :
                          "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                        )}>
                          <ShieldAlert className="h-6 w-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white uppercase tracking-tight">{issue.type}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <MapPin className="h-3 w-3 text-slate-500" />
                            <span className="text-[10px] font-mono text-slate-500 uppercase">{issue.location_context}</span>
                          </div>
                        </div>
                      </div>
                      <SeverityBadge severity={issue.severity} className="self-start sm:self-center" />
                    </div>
                    
                    <div className="p-6 space-y-6">
                      <p className="text-sm text-slate-400 leading-relaxed">
                        {issue.description}
                      </p>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-tighter">
                          <ClipboardCheck className="h-4 w-4 text-emerald-500" />
                          Recommended Mitigation
                        </div>
                        <ul className="grid sm:grid-cols-2 gap-2">
                          {issue.recommendations.map((rec, ri) => (
                            <li key={ri} className="flex gap-2 text-xs text-slate-400 bg-slate-900/50 p-2 rounded-lg border border-slate-800/50">
                              <span className="text-emerald-500 font-mono shrink-0">[{ri + 1}]</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {result && result.issues.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-20 text-emerald-400/50 border border-emerald-900/30 rounded-2xl bg-emerald-950/10"
                >
                  <Leaf className="h-12 w-12 mb-4" />
                  <p className="text-sm font-mono tracking-wider italic">No significant environmental anomalies detected in this scan.</p>
                </motion.div>
              )}
            </div>
            </>
            )}
          </div>
        </div>
      </main>

      {/* Footer System Info */}
      <footer className="border-t border-slate-900 p-8 mt-12 bg-[#0A0A0B]">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">
          <div>System: Gemini ECO-OBSERVER v2.0</div>
          <div className="flex gap-6">
            <span>Latency: Optimized</span>
            <span>Security: Hardware Encrypted</span>
            <span>API: Neural-Sync</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
