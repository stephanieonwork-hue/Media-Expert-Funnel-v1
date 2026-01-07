import React, { useState, useMemo, useRef } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { Brain, TrendingUp, RefreshCw, Search, RotateCcw, Zap, ChevronRight, AlertTriangle, CheckCircle, BarChart3, Settings, Edit3, HelpCircle, Hexagon, Calendar, Info, ArrowRight, Target, RotateCw, Trash2, Upload, FileSpreadsheet, X } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Stage configuration
const STAGES = [
  { id: 1, key: 'create', name: 'Create Memory', short: 'Create', icon: Brain, hex: '#10b981', formula: 'Consideration ÷ Awareness', type: 'Ratio', healthy: 50, warning: 30, metrics: ['awareness', 'consideration'], labels: { awareness: 'Awareness', consideration: 'Consideration' }, help: { awareness: '% who have heard of the brand', consideration: '% who would consider purchasing' }, diagnosis: "awareness isn't converting—people hear you but don't encode", questions: ['Do consumers know we exist?', 'Breaking through clutter?', 'Encoding among prospects?', 'Faster than benchmarks?', 'Creative distinctive enough?'], warnings: ['Ratio <30% (awareness without encoding)', 'High awareness, low consideration', 'Wasted reach'], interventions: ['Increase reach among non-aware', 'Emotionally distinctive creative', 'Clear category membership cues'] },
  { id: 2, key: 'expand', name: 'Expand Memory', short: 'Expand', icon: TrendingUp, hex: '#3b82f6', formula: '(Buzz + WOM) ÷ 2', type: 'Sum', healthy: 40, warning: 25, metrics: ['buzz', 'womExposure'], labels: { buzz: 'Buzz', womExposure: 'WOM Exposure' }, help: { buzz: '% who heard something recently', womExposure: '% who discussed with friends/family' }, diagnosis: "narrow footprint—not enough people talking about you", questions: ['How many CEPs trigger us?', 'People hearing AND talking?', 'Diverse needs or one context?', 'What occasions could we own?', 'Part of cultural conversation?'], warnings: ['Sum <40 (not in conversation)', 'High Buzz, low WOM (passive)', 'Single-occasion dependency'], interventions: ['Target new Category Entry Points', 'Occasion-specific messaging', 'Shareable, talkable creative'] },
  { id: 3, key: 'strengthen', name: 'Strengthen Memory', short: 'Strengthen', icon: RefreshCw, hex: '#8b5cf6', formula: '(Satisfaction + Recommendation) ÷ 2', type: 'Average', healthy: 65, warning: 50, metrics: ['satisfaction', 'recommendation'], labels: { satisfaction: 'Satisfaction', recommendation: 'Recommendation' }, help: { satisfaction: '% of current customers satisfied', recommendation: '% who would recommend' }, diagnosis: "customer memories weakening—satisfaction not driving advocacy", questions: ['Decaying or stable?', 'Media continuity sufficient?', 'Customers still positive?', 'Maintaining loyalty?', 'How fast do we decay off-air?'], warnings: ['Average <50% (active decay)', 'Declining trajectory', 'Sat > Rec gap'], interventions: ['Continuous media presence', 'Avoid dark periods >4 weeks', 'Loyalty-focused messaging'] },
  { id: 4, key: 'retrieve', name: 'Retrieve Memory', short: 'Retrieve', icon: Search, hex: '#f59e0b', formula: 'Intent ÷ Consideration', type: 'Ratio', healthy: 60, warning: 40, metrics: ['purchaseIntent', 'consideration'], labels: { purchaseIntent: 'Purchase Intent', consideration: 'Consideration' }, help: { purchaseIntent: '% who intend to purchase', consideration: '% who would consider' }, diagnosis: "retrieval failure—consideration not converting to intent", questions: ['Come to mind when need arises?', 'Top-of-mind or buried?', 'Why know us but not buy?', 'Retrieval cues at purchase?', 'Awareness-action gap?'], warnings: ['Ratio <40% (retrieval failure)', 'High consideration, stagnant intent', 'Intent declining'], interventions: ['Increase recency of exposure', 'Point-of-sale triggers', 'Strengthen distinctive assets'] },
  { id: 5, key: 'reinstate', name: 'Reinstate Memory', short: 'Reinstate', icon: RotateCcw, hex: '#f43f5e', formula: 'Consideration (Former)', type: 'Filtered', healthy: 35, warning: 20, metrics: ['considerationFormer'], labels: { considerationFormer: 'Consideration (Former)' }, help: { considerationFormer: '% of former customers who would reconsider' }, diagnosis: "lapsed forgetting—dormant memories not reactivating", questions: ['Lapsed open to reconsidering?', 'What triggers bring them back?', 'How long until forgotten?', 'Win-back connecting?', 'Losing faster than acquiring?'], warnings: ['<20% consideration (fading)', 'Declining trajectory', 'Low campaign response'], interventions: ['Win-back with memory cues', 'Personalized retargeting', 'Reference past behavior'] },
  { id: 6, key: 'disrupt', name: 'Disrupt Memory', short: 'Disrupt', icon: Zap, hex: '#64748b', formula: 'Brand - Competitor Impression', type: 'Differential', healthy: 55, warning: 45, metrics: ['brandImpression', 'competitorImpression'], labels: { brandImpression: 'Brand Impression', competitorImpression: 'Competitor Impression' }, help: { brandImpression: '% with positive brand impression', competitorImpression: '% with positive competitor impression' }, diagnosis: "losing share of mind—competitor memories overtaking", questions: ['Competitors overwriting us?', 'Distinctive enough to resist?', 'Why switching away?', 'Own unique attributes?', 'Winning share of mind?'], warnings: ['Negative differential (losing)', 'Competitor gaining, brand flat', 'Parity (interchangeable)'], interventions: ['Audit competitor messaging', 'Strengthen distinctiveness', 'Increase SOV during competitive activity'] }
];

const DEMO_DATA = { awareness: 72, consideration: 45, buzz: 28, womExposure: 22, satisfaction: 68, recommendation: 54, purchaseIntent: 32, considerationFormer: 26, brandImpression: 48, competitorImpression: 41 };

// Column name variations for auto-detection
const METRIC_ALIASES = {
  awareness: ['awareness', 'aided awareness', 'brand awareness', 'aware', 'heard of'],
  consideration: ['consideration', 'consider', 'would consider', 'purchase consideration'],
  buzz: ['buzz', 'heard anything', 'heard recently', 'recent buzz'],
  womExposure: ['wom', 'wom exposure', 'word of mouth', 'talked about', 'discussed'],
  satisfaction: ['satisfaction', 'satisfied', 'customer satisfaction', 'csat'],
  recommendation: ['recommendation', 'recommend', 'would recommend', 'nps', 'promoter'],
  purchaseIntent: ['purchase intent', 'intent', 'intend to purchase', 'buying intent', 'will buy'],
  considerationFormer: ['former consideration', 'lapsed consideration', 'former customers', 'ex-customer consideration'],
  brandImpression: ['impression', 'brand impression', 'positive impression', 'overall impression'],
  competitorImpression: ['competitor impression', 'competitor', 'comp impression']
};

// Additional YouGov columns we recognize but don't use directly
const EXTRA_COLUMNS = ['attention', 'reputation', 'name', 'score'];

const METRIC_LABELS = {
  awareness: 'Awareness',
  consideration: 'Consideration', 
  buzz: 'Buzz',
  womExposure: 'WOM Exposure',
  satisfaction: 'Satisfaction',
  recommendation: 'Recommendation',
  purchaseIntent: 'Purchase Intent',
  considerationFormer: 'Consideration (Former)',
  brandImpression: 'Brand Impression',
  competitorImpression: 'Competitor Impression'
};

const MemoryScoreFramework = () => {
  const [view, setView] = useState('input');
  const [activeStage, setActiveStage] = useState(0);
  const [compareMode, setCompareMode] = useState('competitor');
  const [tooltip, setTooltip] = useState(null);
  
  // File upload state
  const fileInputRef = useRef(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [uploadedData, setUploadedData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [availableColumns, setAvailableColumns] = useState([]);
  const [uploadError, setUploadError] = useState(null);
  const [templateCopied, setTemplateCopied] = useState(false);
  
  // Paste import state
  const [pasteText, setPasteText] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [selectedBrandIndex, setSelectedBrandIndex] = useState(0);
  const [selectedCompetitorIndex, setSelectedCompetitorIndex] = useState(1);
  const [selectedBenchmarkIndex, setSelectedBenchmarkIndex] = useState(2);
  const [parseError, setParseError] = useState(null);
  
  const [config, setConfig] = useState({ brandName: 'Sample Brand', category: 'QSR', period: 'Q1 2026', competitor: 'Competitor A', timeline: '12-week' });
  const [metrics, setMetrics] = useState(DEMO_DATA);
  const [compScores, setCompScores] = useState({ create: 58, expand: 42, strengthen: 65, retrieve: 55, reinstate: 30, disrupt: 50 });
  const [catScores, setCatScores] = useState({ create: 50, expand: 35, strengthen: 60, retrieve: 50, reinstate: 25, disrupt: 50 });

  // Calculate scores
  const scores = useMemo(() => {
    const m = metrics;
    return {
      create: m.awareness > 0 ? Math.min(100, Math.round((m.consideration / m.awareness) * 100)) : 0,
      expand: Math.round((m.buzz + m.womExposure) / 2),
      strengthen: Math.round((m.satisfaction + m.recommendation) / 2),
      retrieve: m.consideration > 0 ? Math.min(100, Math.round((m.purchaseIntent / m.consideration) * 100)) : 0,
      reinstate: m.considerationFormer,
      disrupt: Math.round((m.brandImpression - m.competitorImpression + 100) / 2)
    };
  }, [metrics]);

  const overall = useMemo(() => {
    const vals = Object.values(scores);
    return Math.round(Math.pow(vals.reduce((a, v) => a * Math.max(v, 1), 1), 1/6));
  }, [scores]);

  // Status helpers
  const getStatus = (score) => {
    if (score >= 80) return { label: 'Dominant', color: 'emerald', bg: 'bg-emerald-100 text-emerald-800', fill: '#10b981' };
    if (score >= 60) return { label: 'Established', color: 'blue', bg: 'bg-blue-100 text-blue-800', fill: '#3b82f6' };
    if (score >= 40) return { label: 'Vulnerable', color: 'amber', bg: 'bg-amber-100 text-amber-800', fill: '#f59e0b' };
    if (score >= 20) return { label: 'Fragile', color: 'rose', bg: 'bg-rose-100 text-rose-800', fill: '#f43f5e' };
    return { label: 'Dormant', color: 'slate', bg: 'bg-slate-100 text-slate-800', fill: '#64748b' };
  };

  const getScoreColor = (s) => s >= 80 ? 'text-emerald-600' : s >= 60 ? 'text-blue-600' : s >= 40 ? 'text-amber-600' : 'text-rose-600';

  // Calculation display
  const getCalc = (stage) => {
    const m = metrics;
    switch(stage.key) {
      case 'create': return m.awareness > 0 ? `${m.consideration}÷${m.awareness}=${Math.round(m.consideration/m.awareness*100)}%` : 'N/A';
      case 'expand': return `(${m.buzz}+${m.womExposure})÷2=${Math.round((m.buzz+m.womExposure)/2)}`;
      case 'strengthen': return `(${m.satisfaction}+${m.recommendation})÷2=${Math.round((m.satisfaction+m.recommendation)/2)}`;
      case 'retrieve': return m.consideration > 0 ? `${m.purchaseIntent}÷${m.consideration}=${Math.round(m.purchaseIntent/m.consideration*100)}%` : 'N/A';
      case 'reinstate': return `${m.considerationFormer}`;
      case 'disrupt': const d = m.brandImpression - m.competitorImpression; return `${m.brandImpression}-${m.competitorImpression}=${d>0?'+':''}${d}`;
      default: return '';
    }
  };

  // Executive summary
  const summary = useMemo(() => {
    const sorted = STAGES.map(s => ({ ...s, score: scores[s.key] })).sort((a, b) => a.score - b.score);
    const weak = sorted[0], strong = sorted[5];
    const status = getStatus(overall);
    
    let text = `${config.brandName} has a ${status.label.toLowerCase()} memory presence (${overall}). `;
    
    if (weak.score < weak.warning) {
      text += `Critical weakness: ${weak.name} (${weak.score})—${weak.diagnosis}. `;
    } else if (weak.score < weak.healthy) {
      text += `Primary challenge: ${weak.name} (${weak.score})—${weak.diagnosis}. `;
    }
    
    if (strong.score >= strong.healthy) {
      text += `Strength: ${strong.name} (${strong.score}). `;
    }
    
    text += `Priority: ${weak.interventions[0]}.`;
    return text;
  }, [scores, overall, config.brandName]);

  // Radar data
  const radarData = useMemo(() => {
    const comp = compareMode === 'competitor' ? compScores : catScores;
    return STAGES.map(s => ({ stage: s.short, brand: scores[s.key], comparison: comp[s.key] }));
  }, [scores, compScores, catScores, compareMode]);

  // Handlers
  const updateMetric = (key, val) => setMetrics(p => ({ ...p, [key]: Math.min(100, Math.max(0, Number(val) || 0)) }));
  const resetDemo = () => setMetrics(DEMO_DATA);
  const clearAll = () => setMetrics(Object.fromEntries(Object.keys(metrics).map(k => [k, 0])));

  // File upload handlers
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadError(null);
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            processUploadedData(results.data, Object.keys(results.data[0]));
          } else {
            setUploadError('No data found in CSV file');
          }
        },
        error: (err) => setUploadError(`CSV parsing error: ${err.message}`)
      });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const wb = XLSX.read(evt.target.result, { type: 'binary' });
          const wsName = wb.SheetNames[0];
          const ws = wb.Sheets[wsName];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
          
          if (data.length > 1) {
            const headers = data[0].map(h => String(h || '').trim());
            const rows = data.slice(1).map(row => {
              const obj = {};
              headers.forEach((h, i) => { obj[h] = row[i]; });
              return obj;
            });
            processUploadedData(rows, headers);
          } else {
            setUploadError('No data found in Excel file');
          }
        } catch (err) {
          setUploadError(`Excel parsing error: ${err.message}`);
        }
      };
      reader.readAsBinaryString(file);
    } else {
      setUploadError('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
    }
    
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processUploadedData = (data, columns) => {
    setUploadedData(data);
    setAvailableColumns(columns.filter(c => c && c.trim()));
    
    // Auto-detect column mappings
    const autoMapping = {};
    Object.keys(METRIC_ALIASES).forEach(metric => {
      const aliases = METRIC_ALIASES[metric];
      const matchedCol = columns.find(col => {
        const colLower = col.toLowerCase().trim();
        return aliases.some(alias => colLower.includes(alias) || alias.includes(colLower));
      });
      if (matchedCol) autoMapping[metric] = matchedCol;
    });
    
    setColumnMapping(autoMapping);
    setShowUploadModal(true);
  };

  const applyMapping = () => {
    if (!uploadedData || uploadedData.length === 0) return;
    
    // Use the first row (or average if multiple rows)
    const row = uploadedData[0];
    const newMetrics = { ...metrics };
    
    Object.keys(columnMapping).forEach(metric => {
      const col = columnMapping[metric];
      if (col && row[col] !== undefined) {
        let val = parseFloat(row[col]);
        // Handle percentage strings like "45%" 
        if (typeof row[col] === 'string' && row[col].includes('%')) {
          val = parseFloat(row[col].replace('%', ''));
        }
        if (!isNaN(val)) {
          newMetrics[metric] = Math.min(100, Math.max(0, Math.round(val)));
        }
      }
    });
    
    setMetrics(newMetrics);
    setShowUploadModal(false);
    setUploadedData(null);
    setColumnMapping({});
  };

  const cancelUpload = () => {
    setShowUploadModal(false);
    setUploadedData(null);
    setColumnMapping({});
    setUploadError(null);
  };

  const downloadTemplate = () => {
    setShowTemplateModal(true);
    setTemplateCopied(false);
  };

  const templateCSV = `Brand,Awareness,Consideration,Buzz,WOM Exposure,Satisfaction,Recommendation,Purchase Intent,Former Consideration,Brand Impression,Competitor Impression
Your Brand,0,0,0,0,0,0,0,0,0,0`;

  const copyTemplate = () => {
    navigator.clipboard.writeText(templateCSV).then(() => {
      setTemplateCopied(true);
      setTimeout(() => setTemplateCopied(false), 2000);
    });
  };

  // Parse pasted table data
  const parsePastedData = (text) => {
    if (!text.trim()) {
      setParsedRows([]);
      setParseError(null);
      return;
    }

    try {
      // Split by newlines and filter empty
      const lines = text.trim().split(/\r?\n/).filter(line => line.trim());
      if (lines.length < 2) {
        setParseError('Need at least 2 rows (header + data)');
        setParsedRows([]);
        return;
      }

      // Detect delimiter (tab or comma)
      const delimiter = lines[0].includes('\t') ? '\t' : ',';
      const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
      
      // Find name column index
      const nameColIndex = headers.findIndex(h => h === 'name' || h === 'brand' || h === 'brand name');
      
      // Map header indices to our metrics
      const headerMapping = {};
      Object.keys(METRIC_ALIASES).forEach(metric => {
        const aliases = METRIC_ALIASES[metric];
        const idx = headers.findIndex(h => 
          aliases.some(alias => h === alias || h.includes(alias) || alias.includes(h))
        );
        if (idx !== -1) headerMapping[metric] = idx;
      });

      if (Object.keys(headerMapping).length === 0) {
        setParseError('Could not detect any metrics. Check column names.');
        setParsedRows([]);
        return;
      }

      // Parse each data row
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter).map(v => v.trim());
        
        // Get brand name if available
        let brandName = `Row ${i}`;
        if (nameColIndex !== -1 && values[nameColIndex]) {
          brandName = values[nameColIndex].split('\n')[0].trim(); // Handle multi-line cells
        }

        // Extract metrics
        const metrics = {};
        Object.entries(headerMapping).forEach(([metric, idx]) => {
          if (values[idx]) {
            let val = parseFloat(values[idx].replace('%', '').replace(',', '.'));
            if (!isNaN(val)) {
              metrics[metric] = Math.min(100, Math.max(0, Math.round(val * 10) / 10));
            }
          }
        });

        if (Object.keys(metrics).length > 0) {
          rows.push({ brandName, metrics, raw: values });
        }
      }

      if (rows.length === 0) {
        setParseError('No valid data rows found.');
        setParsedRows([]);
      } else {
        setParsedRows(rows);
        // Auto-select: first row = brand, second = competitor, third = benchmark
        setSelectedBrandIndex(0);
        setSelectedCompetitorIndex(rows.length > 1 ? 1 : -1);
        setSelectedBenchmarkIndex(rows.length > 2 ? 2 : -1);
        setParseError(null);
      }
    } catch (err) {
      setParseError(`Parse error: ${err.message}`);
      setParsedRows([]);
    }
  };

  // Calculate stage scores from raw metrics (same formulas as main scores)
  const calculateScoresFromMetrics = (m, competitorImpression = 50) => {
    if (!m) return null;
    return {
      create: m.awareness > 0 ? Math.min(100, Math.round((m.consideration / m.awareness) * 100)) : 0,
      expand: Math.round(((m.buzz || 0) + (m.womExposure || 0)) / 2),
      strengthen: Math.round(((m.satisfaction || 0) + (m.recommendation || 0)) / 2),
      retrieve: m.consideration > 0 ? Math.min(100, Math.round(((m.purchaseIntent || 0) / m.consideration) * 100)) : 0,
      reinstate: m.considerationFormer || 25,
      disrupt: Math.round(((m.brandImpression || 50) - competitorImpression + 100) / 2)
    };
  };

  const applyParsedData = () => {
    if (parsedRows.length === 0 || selectedBrandIndex < 0) return;
    
    const brandRow = parsedRows[selectedBrandIndex];
    const competitorRow = selectedCompetitorIndex >= 0 ? parsedRows[selectedCompetitorIndex] : null;
    const benchmarkRow = selectedBenchmarkIndex >= 0 ? parsedRows[selectedBenchmarkIndex] : null;
    
    // Set brand metrics
    const newMetrics = { ...metrics, ...brandRow.metrics };
    
    // If competitor exists, use their Impression as Competitor Impression
    if (competitorRow && competitorRow.metrics.brandImpression !== undefined) {
      newMetrics.competitorImpression = competitorRow.metrics.brandImpression;
    }
    
    setMetrics(newMetrics);
    setConfig(prev => ({ 
      ...prev, 
      brandName: brandRow.brandName,
      competitor: competitorRow ? competitorRow.brandName : prev.competitor
    }));
    
    // If competitor exists, calculate their scores for comparison
    // Competitor's Disrupt = their impression vs brand's impression
    if (competitorRow) {
      const brandImpression = brandRow.metrics.brandImpression || 50;
      const compCalc = calculateScoresFromMetrics(competitorRow.metrics, brandImpression);
      if (compCalc) {
        setCompScores(compCalc);
      }
    }
    
    // If benchmark exists, calculate category benchmark scores
    // Category's Disrupt = category impression vs brand's impression
    if (benchmarkRow) {
      const brandImpression = brandRow.metrics.brandImpression || 50;
      const benchCalc = calculateScoresFromMetrics(benchmarkRow.metrics, brandImpression);
      if (benchCalc) {
        setCatScores(benchCalc);
      }
    }
    
    setPasteText('');
    setParsedRows([]);
    setView('input');
  };

  const CustomTick = ({ payload, x, y, textAnchor }) => {
    const stage = STAGES.find(s => s.short === payload.value);
    return <text x={x} y={y} textAnchor={textAnchor} fill={stage?.hex || '#64748b'} fontSize={11} fontWeight={600}>{payload.value}</text>;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Memory Score™</h1>
              <p className="text-xs text-slate-500">Brand Memory Diagnostic</p>
            </div>
          </div>
          
          <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm border border-slate-200">
            {[{ id: 'input', label: 'Input', icon: Edit3 }, { id: 'import', label: 'Import', icon: FileSpreadsheet }, { id: 'framework', label: 'Framework', icon: Settings }, { id: 'dashboard', label: 'Dashboard', icon: BarChart3 }, { id: 'compare', label: 'Compare', icon: Hexagon }].map(v => (
              <button key={v.id} onClick={() => setView(v.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all ${view === v.id ? 'bg-emerald-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                <v.icon className="w-3.5 h-3.5" />{v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* INPUT VIEW */}
      {view === 'input' && (
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Config */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800">Brand Configuration</h2>
              <div className="flex gap-2">
                <button onClick={resetDemo} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100">
                  <RotateCw className="w-3 h-3" />Demo
                </button>
                <button onClick={clearAll} className="flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 px-2 py-1 rounded hover:bg-slate-100">
                  <Trash2 className="w-3 h-3" />Clear
                </button>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {[{ k: 'brandName', l: 'Brand' }, { k: 'category', l: 'Category' }, { k: 'period', l: 'Period' }, { k: 'competitor', l: 'Competitor' }].map(f => (
                <input key={f.k} type="text" value={config[f.k]} onChange={e => setConfig(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.l} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              ))}
              <select value={config.timeline} onChange={e => setConfig(p => ({ ...p, timeline: e.target.value }))} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="4-week">4-week</option>
                <option value="12-week">12-week</option>
                <option value="52-week">52-week</option>
              </select>
            </div>
          </div>

          {/* Live Score */}
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-xs font-medium">Overall Memory Score</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{overall}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-medium">{getStatus(overall).label}</span>
                </div>
                <p className="text-emerald-100 text-xs mt-1">{config.timeline} • YouGov BrandIndex</p>
              </div>
              <div className="flex gap-2">
                {STAGES.map(s => {
                  const score = scores[s.key];
                  const bad = score < s.warning;
                  return (
                    <div key={s.id} className="text-center">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-1 ${bad ? 'bg-rose-500/40' : 'bg-white/20'}`}>
                        <s.icon className="w-4 h-4" />
                      </div>
                      <div className="text-sm font-bold">{score}</div>
                      <div className="text-[10px] text-emerald-100">{s.short}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 gap-4">
            {STAGES.map(stage => {
              const score = scores[stage.key];
              const status = getStatus(score);
              const bad = score < stage.warning;
              const mid = score < stage.healthy && score >= stage.warning;
              
              return (
                <div key={stage.id} className={`bg-white rounded-xl border shadow-sm p-4 ${bad ? 'border-rose-200 bg-rose-50/30' : mid ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: stage.hex + '20' }}>
                        <stage.icon className="w-4 h-4" style={{ color: stage.hex }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 text-sm">{stage.name}</h3>
                        <p className="text-[10px] text-slate-500">{stage.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold ${getScoreColor(score)}`}>{score}</div>
                      <div className={`text-[10px] px-1.5 py-0.5 rounded-full ${status.bg}`}>{status.label}</div>
                    </div>
                  </div>

                  {/* Progress with benchmarks */}
                  <div className="mb-2">
                    <div className="h-1.5 bg-slate-100 rounded-full relative">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(score, 100)}%`, backgroundColor: stage.hex }} />
                      <div className="absolute top-0 h-full w-0.5 bg-amber-400" style={{ left: `${stage.warning}%` }} />
                      <div className="absolute top-0 h-full w-0.5 bg-emerald-400" style={{ left: `${stage.healthy}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                      <span>0</span><span className="text-amber-500">{stage.warning}</span><span className="text-emerald-500">{stage.healthy}</span><span>100</span>
                    </div>
                  </div>

                  {/* Formula */}
                  <div className="bg-slate-50 rounded px-2 py-1 mb-2 flex items-center justify-between">
                    <code className="text-[10px] text-slate-500">{stage.formula}</code>
                    <code className="text-[10px] font-semibold" style={{ color: stage.hex }}>{getCalc(stage)}</code>
                  </div>

                  {/* Inputs */}
                  <div className="space-y-1.5">
                    {stage.metrics.map(m => (
                      <div key={m} className="flex items-center gap-2">
                        <div className="flex items-center gap-1 w-28">
                          <span className="text-xs text-slate-600 truncate">{stage.labels[m]}</span>
                          <button onClick={() => setTooltip(tooltip === m ? null : m)} className="text-slate-400 hover:text-slate-600">
                            <Info className="w-3 h-3" />
                          </button>
                        </div>
                        <input type="range" min="0" max="100" value={metrics[m]} onChange={e => updateMetric(m, e.target.value)} className="flex-1 h-1.5 bg-slate-200 rounded appearance-none cursor-pointer" style={{ accentColor: stage.hex }} />
                        <input type="number" min="0" max="100" value={metrics[m]} onChange={e => updateMetric(m, e.target.value)} className="w-12 px-1.5 py-0.5 text-xs border border-slate-200 rounded text-center" />
                      </div>
                    ))}
                  </div>

                  {tooltip && stage.metrics.includes(tooltip) && (
                    <div className="mt-2 p-2 bg-slate-800 text-white text-[10px] rounded">{stage.help[tooltip]}</div>
                  )}

                  {bad && (
                    <div className="mt-2 p-1.5 bg-rose-100 rounded flex items-start gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-rose-600 flex-shrink-0 mt-0.5" />
                      <span className="text-[10px] text-rose-700">Below warning ({stage.warning}): {stage.interventions[0]}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* IMPORT VIEW */}
      {view === 'import' && (
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-800">Import YouGov Data</h2>
                <p className="text-sm text-slate-500">Paste a table from YouGov BrandIndex, Excel, or Google Sheets</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Paste your data below</label>
              <textarea
                value={pasteText}
                onChange={(e) => {
                  setPasteText(e.target.value);
                  parsePastedData(e.target.value);
                }}
                placeholder={`Paste table here (select cells in YouGov/Excel including headers)

Example:
Name	Awareness	Consideration	Buzz	Impression	Purchase Intent	Recommend	Satisfaction	WOM Exposure
Honda (CA)	90	29.3	19.3	40.8	9.6	35.9	17.7	14.1
Toyota (CA)	92.5	38.4	26	49.1	17.9	44.9	24.2	21
Vehicle brands (CA)	77.5	9.4	6.3	14	2.9	8.6	4.5	6.5`}
                className="w-full h-32 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {parseError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {parseError}
              </div>
            )}

            {parsedRows.length > 0 && (
              <div className="mb-4 space-y-4">
                {/* Row assignment selectors */}
                <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                  <h4 className="font-medium text-slate-700 text-sm">Assign rows ({parsedRows.length} detected)</h4>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {/* Brand selector */}
                    <div>
                      <label className="block text-xs font-medium text-emerald-700 mb-1">Your Brand</label>
                      <select 
                        value={selectedBrandIndex} 
                        onChange={(e) => setSelectedBrandIndex(Number(e.target.value))}
                        className="w-full px-2 py-1.5 border-2 border-emerald-300 bg-emerald-50 rounded-lg text-sm"
                      >
                        {parsedRows.map((row, idx) => (
                          <option key={idx} value={idx}>{row.brandName}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Competitor selector */}
                    <div>
                      <label className="block text-xs font-medium text-rose-700 mb-1">Competitor</label>
                      <select 
                        value={selectedCompetitorIndex} 
                        onChange={(e) => setSelectedCompetitorIndex(Number(e.target.value))}
                        className="w-full px-2 py-1.5 border-2 border-rose-300 bg-rose-50 rounded-lg text-sm"
                      >
                        <option value={-1}>None</option>
                        {parsedRows.map((row, idx) => (
                          <option key={idx} value={idx} disabled={idx === selectedBrandIndex}>{row.brandName}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Benchmark selector */}
                    <div>
                      <label className="block text-xs font-medium text-blue-700 mb-1">Category Benchmark</label>
                      <select 
                        value={selectedBenchmarkIndex} 
                        onChange={(e) => setSelectedBenchmarkIndex(Number(e.target.value))}
                        className="w-full px-2 py-1.5 border-2 border-blue-300 bg-blue-50 rounded-lg text-sm"
                      >
                        <option value={-1}>None</option>
                        {parsedRows.map((row, idx) => (
                          <option key={idx} value={idx} disabled={idx === selectedBrandIndex || idx === selectedCompetitorIndex}>{row.brandName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Preview selected brand */}
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-sm font-medium text-emerald-800">
                        {parsedRows[selectedBrandIndex]?.brandName} (Your Brand)
                      </span>
                    </div>
                    <span className="text-xs text-emerald-600">
                      {Object.keys(parsedRows[selectedBrandIndex]?.metrics || {}).length} metrics
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {Object.entries(parsedRows[selectedBrandIndex]?.metrics || {}).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between text-xs bg-white rounded px-2 py-1 border border-emerald-100">
                        <span className="text-slate-500">{METRIC_LABELS[key]?.replace(' (Former)', '').substring(0, 12)}</span>
                        <span className="font-semibold text-emerald-700">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview competitor if selected */}
                {selectedCompetitorIndex >= 0 && parsedRows[selectedCompetitorIndex] && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        <span className="text-sm font-medium text-rose-800">
                          {parsedRows[selectedCompetitorIndex]?.brandName} (Competitor)
                        </span>
                      </div>
                      <span className="text-xs text-rose-600">
                        Impression: {parsedRows[selectedCompetitorIndex]?.metrics?.brandImpression || 'N/A'} → Competitor Impression
                      </span>
                    </div>
                    <p className="text-xs text-rose-600">
                      Their scores will populate the Compare view's competitor radar.
                    </p>
                  </div>
                )}

                {/* Preview benchmark if selected */}
                {selectedBenchmarkIndex >= 0 && parsedRows[selectedBenchmarkIndex] && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-sm font-medium text-blue-800">
                          {parsedRows[selectedBenchmarkIndex]?.brandName} (Category Benchmark)
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600">
                      These scores will populate the Compare view's "vs Category" radar.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={() => { setPasteText(''); setParsedRows([]); setParseError(null); }}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Clear
              </button>
              <button
                onClick={applyParsedData}
                disabled={parsedRows.length === 0}
                className="px-4 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                Apply & View Scores
              </button>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-3">How It Works</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                <div>
                  <strong className="text-slate-700">Your Brand</strong>
                  <p className="text-slate-500">Metrics populate the main Memory Score calculations</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                <div>
                  <strong className="text-slate-700">Competitor</strong>
                  <p className="text-slate-500">Their "Impression" becomes your "Competitor Impression" for Disrupt stage. Their calculated scores populate Compare view.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                <div>
                  <strong className="text-slate-700">Category Benchmark</strong>
                  <p className="text-slate-500">Calculated scores populate the "vs Category" option in Compare view</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <strong className="text-amber-800">Note:</strong>
              <span className="text-amber-700"> "Former Consideration" is not in standard YouGov exports. Default value (25) used if not detected.</span>
            </div>
          </div>
        </div>
      )}

      {/* FRAMEWORK VIEW */}
      {view === 'framework' && (
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 text-white">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Brain className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="font-bold mb-1">The Core Premise</h2>
                <p className="text-slate-300 text-sm">Most purchasing decisions are <span className="text-emerald-400 font-semibold">memory retrieval tasks</span>. ~95% are System 1. Memory Score diagnoses where your brand is failing.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {STAGES.map((s, i) => (
              <button key={s.id} onClick={() => setActiveStage(i)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 transition-all whitespace-nowrap ${activeStage === i ? 'shadow-lg' : 'border-slate-200 bg-white'}`} style={{ borderColor: activeStage === i ? s.hex : undefined, backgroundColor: activeStage === i ? s.hex + '10' : undefined }}>
                <s.icon className="w-4 h-4" style={{ color: s.hex }} />
                <span className="text-sm font-medium" style={{ color: activeStage === i ? s.hex : '#475569' }}>{s.name}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${getStatus(scores[s.key]).bg}`}>{scores[s.key]}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" style={{ color: STAGES[activeStage].hex }} />Questions We're Solving
                </h3>
                <div className="space-y-2">
                  {STAGES[activeStage].questions.map((q, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-slate-50 rounded">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: STAGES[activeStage].hex }}>{i+1}</div>
                      <p className="text-sm text-slate-700">{q}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <h3 className="font-semibold text-slate-800 mb-3">YouGov Calculation</h3>
                <div className="bg-slate-800 rounded-lg p-3 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-[10px]">Formula</p>
                      <p className="font-mono">{STAGES[activeStage].formula}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-[10px]">Score</p>
                      <p className="text-2xl font-bold text-emerald-400">{scores[STAGES[activeStage].key]}</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-700">
                    <code className="text-sm text-slate-300">{getCalc(STAGES[activeStage])}</code>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl p-4 text-white" style={{ backgroundColor: STAGES[activeStage].hex }}>
                <p className="text-white/80 text-xs">{STAGES[activeStage].name}</p>
                <div className="text-4xl font-bold my-1">{scores[STAGES[activeStage].key]}</div>
                <div className="inline-block px-2 py-0.5 rounded-full bg-white/20 text-xs">{getStatus(scores[STAGES[activeStage].key]).label}</div>
                <div className="mt-3 pt-3 border-t border-white/20 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-white/70">Healthy</span><span>≥{STAGES[activeStage].healthy}</span></div>
                  <div className="flex justify-between"><span className="text-white/70">Warning</span><span>&lt;{STAGES[activeStage].warning}</span></div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-1.5 text-sm">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />Warning Signs
                </h3>
                <div className="space-y-1.5">
                  {STAGES[activeStage].warnings.map((w, i) => (
                    <div key={i} className="p-2 bg-amber-50 rounded text-xs text-amber-800">{w}</div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-1.5 text-sm">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />Interventions
                </h3>
                <div className="space-y-1.5">
                  {STAGES[activeStage].interventions.map((int, i) => (
                    <div key={i} className="flex items-start gap-1.5 p-2 bg-emerald-50 rounded text-xs text-emerald-800">
                      <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />{int}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD VIEW */}
      {view === 'dashboard' && (
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{config.brandName} Memory Score™ Report</h2>
                <p className="text-slate-500 text-sm">{config.category} • {config.period} • {config.timeline}</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Overall Score</div>
                <div className="flex items-center gap-2">
                  <span className={`text-4xl font-bold ${getScoreColor(overall)}`}>{overall}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatus(overall).bg}`}>{getStatus(overall).label}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 text-white">
            <div className="flex items-start gap-2">
              <Target className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm mb-1">Executive Summary</h3>
                <p className="text-slate-300 text-sm">{summary}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="font-semibold text-slate-800 mb-3">Memory Task Breakdown</h3>
              <div className="space-y-3">
                {[...STAGES].map(s => ({ ...s, score: scores[s.key] })).sort((a, b) => a.score - b.score).map(stage => (
                  <div key={stage.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: stage.hex + '20' }}>
                      <stage.icon className="w-4 h-4" style={{ color: stage.hex }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{stage.name}</span>
                        <span className={`text-sm font-bold ${getScoreColor(stage.score)}`}>{stage.score}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full">
                        <div className="h-full rounded-full" style={{ width: `${stage.score}%`, backgroundColor: stage.hex }} />
                      </div>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatus(stage.score).bg}`}>{getStatus(stage.score).label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="font-semibold text-slate-800 mb-3">Priority Actions</h3>
              <div className="space-y-2">
                {[...STAGES].map(s => ({ ...s, score: scores[s.key] })).sort((a, b) => a.score - b.score).slice(0, 3).map((stage, i) => (
                  <div key={stage.id} className="p-2 border rounded-lg" style={{ borderColor: stage.hex + '40' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: stage.hex }}>{i+1}</div>
                      <span className="text-xs font-medium" style={{ color: stage.hex }}>{stage.name}</span>
                      <span className={`ml-auto text-[10px] px-1 py-0.5 rounded ${getStatus(stage.score).bg}`}>{stage.score}</span>
                    </div>
                    <p className="text-[10px] text-slate-600 flex items-start gap-1">
                      <ArrowRight className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" style={{ color: stage.hex }} />{stage.interventions[0]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="font-semibold text-slate-800 mb-1">Memory Decay Projection</h3>
            <p className="text-xs text-slate-500 mb-3">~5% weekly decline without media (Ebbinghaus)</p>
            <div className="flex items-end gap-2 h-28">
              {[0, 4, 8, 12, 16].map(w => {
                const proj = Math.round(overall * Math.pow(0.95, w));
                const st = getStatus(proj);
                return (
                  <div key={w} className="flex-1 flex flex-col items-center">
                    <div className="w-full rounded-t transition-all" style={{ height: `${proj}%`, backgroundColor: st.fill }} />
                    <span className="text-xs font-bold mt-1 text-slate-700">{proj}</span>
                    <span className="text-[10px] text-slate-500">{w === 0 ? 'Now' : `W${w}`}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* COMPARE VIEW */}
      {view === 'compare' && (
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800">Memory Score Comparison</h2>
                <div className="flex gap-1">
                  {['competitor', 'category'].map(m => (
                    <button key={m} onClick={() => setCompareMode(m)} className={`px-3 py-1.5 rounded text-xs font-medium ${compareMode === m ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      vs {m === 'competitor' ? 'Competitor' : 'Category'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="stage" tick={<CustomTick />} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Radar name={config.brandName} dataKey="brand" stroke="#059669" fill="#059669" fillOpacity={0.7} strokeWidth={2} />
                    <Radar name={compareMode === 'competitor' ? config.competitor : 'Category'} dataKey="comparison" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.5} strokeWidth={2} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <table className="w-full text-xs mt-4 border-t border-slate-200 pt-3">
                <thead><tr className="text-slate-500"><th className="text-left py-1">Stage</th><th className="text-center">{config.brandName}</th><th className="text-center">{compareMode === 'competitor' ? config.competitor : 'Category'}</th><th className="text-center">Gap</th></tr></thead>
                <tbody>
                  {radarData.map((r, i) => {
                    const gap = r.brand - r.comparison;
                    return (
                      <tr key={r.stage} className="border-t border-slate-100">
                        <td className="py-1.5 flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: STAGES[i].hex }} /><span style={{ color: STAGES[i].hex }}>{r.stage}</span></td>
                        <td className="text-center font-bold text-emerald-600">{r.brand}</td>
                        <td className="text-center font-bold text-rose-500">{r.comparison}</td>
                        <td className={`text-center font-bold ${gap > 0 ? 'text-emerald-600' : gap < 0 ? 'text-rose-500' : 'text-slate-400'}`}>{gap > 0 ? '+' : ''}{gap}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
                <h3 className="font-semibold text-slate-800 text-sm mb-2">{compareMode === 'competitor' ? 'Competitor' : 'Category'} Scores</h3>
                <div className="space-y-2">
                  {STAGES.map(s => {
                    const val = compareMode === 'competitor' ? compScores[s.key] : catScores[s.key];
                    const handler = compareMode === 'competitor' ? (v) => setCompScores(p => ({ ...p, [s.key]: v })) : (v) => setCatScores(p => ({ ...p, [s.key]: v }));
                    return (
                      <div key={s.id} className="flex items-center gap-2">
                        <s.icon className="w-3.5 h-3.5" style={{ color: s.hex }} />
                        <span className="text-xs text-slate-600 w-16">{s.short}</span>
                        <input type="range" min="0" max="100" value={val} onChange={e => handler(Number(e.target.value))} className="flex-1 h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-rose-500" />
                        <input type="number" min="0" max="100" value={val} onChange={e => handler(Number(e.target.value))} className="w-10 px-1 py-0.5 text-[10px] border border-slate-200 rounded text-center" />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3">
                <h3 className="font-semibold text-emerald-800 text-sm mb-2">{config.brandName}</h3>
                <div className="space-y-1">
                  {STAGES.map(s => (
                    <div key={s.id} className="flex items-center justify-between text-xs">
                      <span style={{ color: s.hex }}>{s.short}</span>
                      <span className={`font-bold ${getScoreColor(scores[s.key])}`}>{scores[s.key]}</span>
                    </div>
                  ))}
                  <div className="border-t border-emerald-300 pt-1 mt-1 flex items-center justify-between">
                    <span className="font-semibold text-emerald-800 text-xs">Overall</span>
                    <span className="text-lg font-bold text-emerald-600">{overall}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                <h3 className="font-semibold text-slate-800 text-sm mb-2">Key Insights</h3>
                <div className="space-y-1.5">
                  {radarData.filter(r => r.brand - r.comparison < -10).slice(0, 2).map((r, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-rose-700 bg-rose-50 rounded p-1.5 text-[10px]">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" /><span><strong>{r.stage}</strong>: {Math.abs(r.brand - r.comparison)} behind</span>
                    </div>
                  ))}
                  {radarData.filter(r => r.brand - r.comparison > 10).slice(0, 2).map((r, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-emerald-700 bg-emerald-50 rounded p-1.5 text-[10px]">
                      <CheckCircle className="w-3 h-3 flex-shrink-0" /><span><strong>{r.stage}</strong>: +{r.brand - r.comparison} ahead</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Mapping Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-slate-800">Map Your Data Columns</h3>
              </div>
              <button onClick={cancelUpload} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {uploadError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {uploadError}
                </div>
              )}
              
              <p className="text-sm text-slate-600 mb-4">
                Match your file columns to Memory Score metrics. We auto-detected some mappings for you.
              </p>
              
              {uploadedData && (
                <div className="mb-4 p-2 bg-slate-50 rounded-lg text-xs text-slate-500">
                  Found {uploadedData.length} row(s) • Using first row for values
                </div>
              )}
              
              <div className="space-y-3">
                {Object.keys(METRIC_LABELS).map(metric => (
                  <div key={metric} className="flex items-center gap-3">
                    <label className="text-sm text-slate-700 w-40 flex-shrink-0">{METRIC_LABELS[metric]}</label>
                    <select
                      value={columnMapping[metric] || ''}
                      onChange={(e) => setColumnMapping(p => ({ ...p, [metric]: e.target.value }))}
                      className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm bg-white"
                    >
                      <option value="">-- Select column --</option>
                      {availableColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                    {columnMapping[metric] && uploadedData?.[0]?.[columnMapping[metric]] !== undefined && (
                      <span className="text-xs text-emerald-600 font-medium w-12 text-right">
                        {uploadedData[0][columnMapping[metric]]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="text-xs text-slate-500">
                {Object.values(columnMapping).filter(Boolean).length} of {Object.keys(METRIC_LABELS).length} mapped
              </span>
              <div className="flex gap-2">
                <button onClick={cancelUpload} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg">
                  Cancel
                </button>
                <button 
                  onClick={applyMapping} 
                  disabled={Object.values(columnMapping).filter(Boolean).length === 0}
                  className="px-4 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply Mapping
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-slate-800">CSV Template</h3>
              </div>
              <button onClick={() => setShowTemplateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4">
              <p className="text-sm text-slate-600 mb-3">
                Copy this template, paste into Excel or Google Sheets, fill in your data, and save as CSV.
              </p>
              
              <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto">
                <div className="text-emerald-400 mb-2"># Header row (column names):</div>
                <div className="whitespace-nowrap">Brand,Awareness,Consideration,Buzz,WOM Exposure,Satisfaction,Recommendation,Purchase Intent,Former Consideration,Brand Impression,Competitor Impression</div>
                <div className="text-emerald-400 mt-4 mb-2"># Data row (your values 0-100):</div>
                <div className="whitespace-nowrap">Your Brand,0,0,0,0,0,0,0,0,0,0</div>
              </div>

              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="font-medium text-amber-800 text-sm mb-2">Column Definitions</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-amber-700">
                  <div><strong>Awareness:</strong> % heard of brand</div>
                  <div><strong>Consideration:</strong> % would consider</div>
                  <div><strong>Buzz:</strong> % heard recently</div>
                  <div><strong>WOM Exposure:</strong> % discussed with others</div>
                  <div><strong>Satisfaction:</strong> % customers satisfied</div>
                  <div><strong>Recommendation:</strong> % would recommend</div>
                  <div><strong>Purchase Intent:</strong> % intend to buy</div>
                  <div><strong>Former Consideration:</strong> % lapsed reconsidering</div>
                  <div><strong>Brand Impression:</strong> % positive impression</div>
                  <div><strong>Competitor Impression:</strong> % positive for competitor</div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="text-xs text-slate-500">
                All values should be 0-100 (percentages)
              </span>
              <div className="flex gap-2">
                <button onClick={() => setShowTemplateModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg">
                  Close
                </button>
                <button 
                  onClick={copyTemplate}
                  className="px-4 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center gap-2"
                >
                  {templateCopied ? (
                    <><CheckCircle className="w-4 h-4" /> Copied!</>
                  ) : (
                    <><FileSpreadsheet className="w-4 h-4" /> Copy Template</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="max-w-7xl mx-auto mt-4">
        <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex gap-4">
            <span><strong>Kahneman</strong> Dual-Process</span>
            <span><strong>Sharp/Romaniuk</strong> Mental Availability</span>
            <span><strong>Ebbinghaus</strong> Memory Decay</span>
          </div>
          <span>Memory Score™ • Media Experts • YouGov BrandIndex</span>
        </div>
      </div>
    </div>
  );
};

export default MemoryScoreFramework;
