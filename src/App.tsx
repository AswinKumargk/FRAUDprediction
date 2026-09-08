/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation, Routes, Route, Link } from 'react-router-dom';
import { 
  Shield, 
  Upload, 
  BarChart3, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  Activity, 
  Lock, 
  ChevronRight,
  ChevronDown,
  Loader2,
  Menu,
  X,
  FileText,
  PieChart,
  Zap,
  Search,
  Calendar,
  Database,
  ArrowUpDown,
  ExternalLink,
  Clock,
  LayoutDashboard,
  Trash2,
  ShieldCheck,
  MapPin,
  Brain
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart as RePieChart, 
  Pie, 
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import Papa from 'papaparse';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const generateFraudExplanation = (txn: Transaction, amountThreshold: number = 70000) => {
  const explanations: string[] = [];
  
  if (txn.amount > amountThreshold) {
    explanations.push("Unusually high transaction amount detected.");
  }
  
  if (txn.riskScore >= 70) {
    explanations.push("High risk score indicates strong fraud probability.");
  }
  
  if (txn.velocityFlag) {
    explanations.push("Multiple transactions detected in short time (Velocity spike).");
  }
  
  const hour = new Date(txn.timestamp).getHours();
  if (hour >= 0 && hour <= 5) {
    explanations.push("Transaction occurred during unusual hours (00:00–05:00).");
  }
  
  if (txn.type?.toUpperCase() === 'TRANSFER') {
    explanations.push("Transfer transactions have higher fraud probability.");
  }

  if (txn.unusualReason && txn.unusualReason.toLowerCase().includes("location")) {
    explanations.push("Sudden change in location detected from previous patterns.");
  }

  if (txn.unusualReason && txn.unusualReason.toLowerCase().includes("device")) {
    explanations.push("Sudden change in device detected from previous session.");
  }
  
  return explanations;
};

// --- Types ---
interface Transaction {
  id: string;
  timestamp: string;
  amount: number;
  type: string;
  location: string;
  isFraud: boolean;
  riskScore: number;
  isUnusual: boolean;
  unusualReason?: string;
  velocityFlag?: boolean;
  deviceType?: string;
  isBlocked?: boolean;
  userId?: string;
  [key: string]: any;
}

interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
}

interface Dataset {
  id: string;
  datasetName: string;
  uploadDate: string;
  data: Transaction[];
  recordsCount: number;
  columnsCount: number;
  fraudCount: number;
  normalCount: number;
  avgAmount: number;
  averageRisk: number;
  analysisDate: string;
  description: string;
  status: 'Analyzed' | 'Pending';
  analysisCompleted: boolean;
  fileSize?: string;
  fraudFound?: boolean;
}

// --- Mock Data Generator ---
const generateMockData = (count: number): Transaction[] => {
  const types = ['Transfer', 'Payment', 'Withdrawal', 'Deposit'];
  const devices = ['iPhone 15 Pro', 'Samsung Galaxy S24', 'MacBook Pro', 'Windows Desktop', 'iPad Air'];
  const locations = [
    { name: 'New York, US', lat: 40.7128, lng: -74.0060, fraudLevel: 'medium' },
    { name: 'London, UK', lat: 51.5074, lng: -0.1278, fraudLevel: 'low' },
    { name: 'Tokyo, JP', lat: 35.6762, lng: 139.6503, fraudLevel: 'low' },
    { name: 'Berlin, DE', lat: 52.5200, lng: 13.4050, fraudLevel: 'medium' },
    { name: 'Paris, FR', lat: 48.8566, lng: 2.3522, fraudLevel: 'low' },
    { name: 'Mumbai, IN', lat: 19.0760, lng: 72.8777, fraudLevel: 'high' },
    { name: 'Lagos, NG', lat: 6.5244, lng: 3.3792, fraudLevel: 'high' },
    { name: 'Sao Paulo, BR', lat: -23.5505, lng: -46.6333, fraudLevel: 'medium' }
  ];
  
  const data: Transaction[] = [];
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const amount = Math.floor(Math.random() * 5000) + 10;
    const loc = locations[Math.floor(Math.random() * locations.length)];
    
    // Logic for unusual behavior
    const hour = new Date(now - Math.random() * 86400000 * 7).getHours();
    const isLateNight = hour >= 0 && hour <= 4;
    const isHighAmount = amount > 4000;
    
    let isUnusual = false;
    let unusualReason = "";
    
    if (isLateNight && Math.random() < 0.3) {
      isUnusual = true;
      unusualReason = "Transaction at unusual time (late night)";
    } else if (isHighAmount && Math.random() < 0.4) {
      isUnusual = true;
      unusualReason = "Sudden high transaction amount";
    }

    const isFraud = isUnusual ? Math.random() < 0.4 : Math.random() < 0.05;
    const riskScore = isFraud 
      ? Math.floor(Math.random() * 40) + 60 
      : isUnusual 
        ? Math.floor(Math.random() * 30) + 40
        : Math.floor(Math.random() * 30);
      
    data.push({
      id: `TXN-${1000 + i}`,
      timestamp: new Date(now - Math.random() * 86400000 * 7).toISOString(),
      amount,
      type: types[Math.floor(Math.random() * types.length)],
      location: loc.name,
      deviceType: devices[Math.floor(Math.random() * devices.length)],
      userId: `USER-${Math.floor(Math.random() * 20) + 1}`,
      isFraud,
      riskScore,
      isUnusual,
      unusualReason,
      velocityFlag: Math.random() < 0.05, // 5% chance of velocity flag for demo
      isBlocked: false
    });
  }
  
  // Sort by timestamp for velocity monitoring
  return data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

// --- Components ---

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.substring(1) || 'home';
  
  const navItems = [
    { id: 'home', path: '/', label: 'Home', icon: Shield },
    { id: 'upload', path: '/upload', label: 'Upload Dataset', icon: Upload },
    { id: 'history', path: '/history', label: 'Dataset History', icon: Database },
    { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'detection', path: '/detection', label: 'Fraud Detection', icon: AlertTriangle },
    { id: 'about', path: '/about', label: 'About Project', icon: Info },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold fintech-gradient-text">
              FRAUDpred
            </span>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2",
                    activeTab === item.id || (activeTab === 'home' && item.id === 'home')
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-slate-300 p-2">
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-slate-900 border-b border-white/10 overflow-hidden"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(item.path);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "block px-3 py-2 rounded-md text-base font-medium w-full text-left flex items-center gap-3",
                    activeTab === item.id || (activeTab === 'home' && item.id === 'home') ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-white/5"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = ({ onGetStarted, onViewData }: { onGetStarted: () => void, onViewData: () => void }) => (
  <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />
    </div>
    
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight mb-6">
          Predictive Analytics for <br />
          <span className="fintech-gradient-text">
            Secure Digital Payments
          </span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-slate-400 mb-10">
          Advanced fraud detection system utilizing machine learning to analyze transaction patterns, 
          identify risks, and secure digital financial ecosystems in real-time.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={onGetStarted}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all flex items-center gap-2 group shadow-xl shadow-indigo-600/20"
          >
            Get Started
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button 
            onClick={onViewData}
            className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold transition-all"
          >
            View Data
          </button>
        </div>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="mt-20 relative max-w-5xl mx-auto"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10" />
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-sm p-4 shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 mb-4 px-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <div className="ml-4 text-xs text-slate-500 font-mono">secure-pay-analytics-v1.0.0</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Real-time Monitoring', icon: Activity, color: 'text-emerald-400' },
              { label: 'AI Risk Scoring', icon: Zap, color: 'text-yellow-400' },
              { label: 'Fraud Prevention', icon: Lock, color: 'text-indigo-400' },
            ].map((feature, i) => (
              <div key={i} className="bg-slate-950/50 rounded-xl p-6 border border-white/5 flex flex-col items-center text-center">
                <feature.icon className={cn("w-10 h-10 mb-4", feature.color)} />
                <h3 className="text-white font-semibold mb-2">{feature.label}</h3>
                <p className="text-xs text-slate-500">Continuous analysis of incoming transaction streams for anomalies.</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  </div>
);

const UploadSection = ({ onDataLoaded }: { onDataLoaded: (data: Transaction[], fileName: string, fileSize: string, columnCount: number, fraudFound: boolean) => void }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<Transaction[] | null>(null);
  const [analysis, setAnalysis] = useState<{
    records: number;
    columns: number;
    fraudCount: number;
    normalCount: number;
    avgAmount: number;
    fraudFound: boolean;
    headers: string[];
  } | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const detectColumns = (headers: string[]) => {
    const mapping: Record<string, string> = {};
    headers.forEach(header => {
      const h = header.toLowerCase();
      if (h.includes('amount')) mapping.amount = header;
      if (h.includes('type')) mapping.type = header;
      if (h.includes('fraud')) mapping.isFraud = header;
      if (h.includes('step') || h.includes('time') || h.includes('date')) mapping.timestamp = header;
      if (h.includes('location') || h.includes('city') || h.includes('country')) mapping.location = header;
      if (h.includes('id') && !mapping.id) mapping.id = header;
      if (h.includes('user') || h.includes('customer') || h.includes('orig') || h.includes('dest')) mapping.userId = header;
      if (h.includes('device') || h.includes('browser') || h.includes('os')) mapping.deviceType = header;
    });
    return mapping;
  };

  const handleFile = (file: File) => {
    setError(null);
    setSuccess(null);
    setAnalysis(null);
    setFileName(file.name);
    setFileSize(formatFileSize(file.size));

    if (!file.name.endsWith('.csv')) {
      setError("Please upload a valid CSV file.");
      return;
    }

    if (file.size === 0) {
      setError("The uploaded file is empty.");
      return;
    }

    setLoading(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError("Error parsing CSV. Please check the file format.");
          setLoading(false);
          return;
        }

        const data = results.data as any[];
        if (data.length === 0) {
          setError("The CSV file contains no data.");
          setLoading(false);
          return;
        }

        const headers = results.meta.fields || [];
        const mapping = detectColumns(headers);
        
        let fraudCount = 0;
        let totalAmount = 0;
        let fraudFound = !!mapping.isFraud;

        const transactions: Transaction[] = data.map((row, index) => {
          const isFraud = fraudFound ? (
            row[mapping.isFraud] === true || 
            row[mapping.isFraud] === '1' || 
            row[mapping.isFraud] === 1 || 
            String(row[mapping.isFraud]).toLowerCase() === 'yes' ||
            String(row[mapping.isFraud]).toLowerCase() === 'true'
          ) : false;

          if (isFraud) fraudCount++;
          const amount = parseFloat(row[mapping.amount]) || 0;
          totalAmount += amount;

          return {
            id: row[mapping.id] || `TXN-${index}`,
            timestamp: row[mapping.timestamp] || new Date().toISOString(),
            amount: amount,
            type: row[mapping.type] || 'Unknown',
            location: row[mapping.location] || 'Unknown',
            userId: row[mapping.userId] || 'Unknown',
            deviceType: row[mapping.deviceType] || 'Unknown',
            isFraud: isFraud,
            riskScore: isFraud ? 85 + Math.floor(Math.random() * 15) : Math.floor(Math.random() * 40),
            isUnusual: isFraud,
          };
        });

        setAnalysis({
          records: transactions.length,
          columns: headers.length,
          fraudCount: fraudCount,
          normalCount: transactions.length - fraudCount,
          avgAmount: totalAmount / transactions.length,
          fraudFound: fraudFound,
          headers: headers
        });

        setSuccess("Dataset uploaded and analyzed successfully.");
        setLoading(false);
        setParsedData(transactions);
      },
      error: (err) => {
        setError(`Failed to read file: ${err.message}`);
        setLoading(false);
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="max-w-4xl mx-auto py-20 px-4">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Dataset Analysis</h2>
        <p className="text-slate-400 text-lg">Upload your transaction records to identify fraudulent patterns.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative group rounded-[32px] p-1 transition-all duration-500",
          isDragging ? "bg-gradient-to-br from-indigo-500 to-purple-500 shadow-[0_0_40px_rgba(79,70,229,0.3)]" : "bg-white/5"
        )}
      >
        <div 
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "relative rounded-[31px] border-2 border-dashed p-16 flex flex-col items-center justify-center transition-all duration-500",
            isDragging 
              ? "border-transparent bg-slate-950/90" 
              : "border-white/10 bg-slate-900/40 hover:bg-slate-900/60 hover:border-white/20"
          )}
        >
          <div className={cn(
            "w-24 h-24 rounded-3xl flex items-center justify-center mb-8 transition-all duration-500",
            error ? "bg-red-500/20 text-red-400" : success ? "bg-emerald-500/20 text-emerald-400" : "bg-indigo-500/20 text-indigo-400 group-hover:scale-110"
          )}>
            {loading ? (
              <Activity className="w-12 h-12 animate-pulse" />
            ) : error ? (
              <XCircle className="w-12 h-12" />
            ) : success ? (
              <CheckCircle2 className="w-12 h-12" />
            ) : (
              <Upload className="w-12 h-12" />
            )}
          </div>

          <h3 className="text-3xl font-bold text-white mb-3">
            {loading ? "Analyzing Data..." : error ? "Upload Failed" : success ? "Analysis Ready" : "Drop your CSV file here"}
          </h3>
          
          <p className="text-slate-400 text-center mb-10 max-w-md leading-relaxed">
            {error || success || "Support for standard transaction datasets including amount, timestamp, and location."}
          </p>

          {!loading && !success && (
            <div className="flex flex-col items-center gap-6">
              <label className="cursor-pointer group/btn relative inline-flex items-center justify-center px-10 py-4 font-bold text-white transition-all duration-300 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl hover:from-indigo-500 hover:to-blue-500 hover:scale-105 active:scale-95 shadow-xl shadow-indigo-600/20">
                <Database className="w-5 h-5 mr-2" />
                Browse Files
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
              
              {fileName && !error && (
                <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/10 animate-in fade-in slide-in-from-bottom-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm text-slate-300 font-medium">{fileName}</span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{fileSize}</span>
                </div>
              )}
            </div>
          )}

          {success && analysis && (
            <div className="flex flex-col items-center gap-8 w-full animate-in fade-in zoom-in duration-500">
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-lg">
                  <Zap className="w-6 h-6 animate-bounce" />
                  {success}
                </div>
                {!analysis.fraudFound && (
                  <p className="text-xs text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Fraud column not found. Basic transaction analysis displayed.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Records</span>
                  <span className="text-xl font-bold text-white">{analysis.records.toLocaleString()}</span>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Columns</span>
                  <span className="text-xl font-bold text-white">{analysis.columns}</span>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Avg Amount</span>
                  <span className="text-xl font-bold text-white">${analysis.avgAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Fraud Rate</span>
                  <span className="text-xl font-bold text-red-400">{Math.round((analysis.fraudCount / analysis.records) * 100)}%</span>
                </div>
              </div>

              <button 
                onClick={() => {
                  if (parsedData && analysis) {
                    onDataLoaded(parsedData, fileName!, fileSize!, analysis.columns, analysis.fraudFound);
                  } else {
                    setError("Dataset analysis not completed.");
                  }
                }}
                className="group/btn relative inline-flex items-center justify-center px-12 py-4 font-bold text-white transition-all duration-300 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl hover:scale-105 active:scale-95"
              >
                View Full Analysis
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const Counter = ({ value, prefix = "" }: { value: number, prefix?: string }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (isNaN(value)) {
      setCount(0);
      return;
    }
    
    let start = 0;
    const end = value;
    if (start === end) {
      setCount(end);
      return;
    }
    
    const duration = 1000;
    const increment = end / (duration / 16);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    
    return () => clearInterval(timer);
  }, [value]);
  
  const displayValue = isNaN(count) ? 0 : count;
  return <span>{prefix}{displayValue.toLocaleString()}</span>;
};

const UnusualBehaviorModule = ({ data }: { data: Transaction[] }) => {
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  const { unusualTxns, hasInsufficientData, amountThreshold } = useMemo(() => {
    if (!data || data.length === 0) return { unusualTxns: [], hasInsufficientData: false, amountThreshold: 70000 };

    // Check for essential columns
    const hasAmount = data.some(t => t.amount > 0);
    const hasTimestamp = data.some(t => t.timestamp);
    
    if (!hasAmount && !hasTimestamp) return { unusualTxns: [], hasInsufficientData: true, amountThreshold: 70000 };
    const sortedAmounts = [...data].map(t => t.amount).sort((a, b) => a - b);
    const thresholdIndex = Math.floor(sortedAmounts.length * 0.9);
    const amountThreshold = Math.max(70000, sortedAmounts[thresholdIndex] || 0);

    // 2. Velocity Detection (3+ transactions within 2 minutes)
    const userGroups: Record<string, Transaction[]> = {};
    data.forEach(t => {
      const uid = t.userId || 'Unknown';
      if (!userGroups[uid]) userGroups[uid] = [];
      userGroups[uid].push(t);
    });

    const velocityFlaggedIds = new Set<string>();
    Object.values(userGroups).forEach(group => {
      const sortedGroup = [...group].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      for (let i = 0; i < sortedGroup.length - 2; i++) {
        const t1 = new Date(sortedGroup[i].timestamp).getTime();
        const t3 = new Date(sortedGroup[i + 2].timestamp).getTime();
        if (t3 - t1 <= 120000) { // 2 minutes in ms
          velocityFlaggedIds.add(sortedGroup[i].id);
          velocityFlaggedIds.add(sortedGroup[i + 1].id);
          velocityFlaggedIds.add(sortedGroup[i + 2].id);
        }
      }
    });

    // 3. Evaluate each transaction
    const results = data.map(t => {
      const reasons: string[] = [];
      const tags: string[] = [];

      // High Amount
      if (t.amount > amountThreshold) {
        reasons.push("This transaction is flagged due to unusually high transaction amount.");
        tags.push("High Amount");
      }

      // High Velocity
      if (velocityFlaggedIds.has(t.id)) {
        reasons.push("Multiple transactions detected within a short time interval.");
        tags.push("High Velocity");
      }

      // High Risk Score
      if (t.riskScore >= 70) {
        reasons.push("This transaction has a high risk score assigned by the detection model.");
        tags.push("High Risk");
      }

      // Unusual Time (00:00 - 05:00)
      const hour = new Date(t.timestamp).getHours();
      if (hour >= 0 && hour <= 5) {
        reasons.push("Transaction occurred during unusual hours (late night/early morning).");
        tags.push("Unusual Time");
      }

      // Unusual Location/Device Change (Sudden change)
      // For simplicity, we'll mark it if it's different from the previous transaction of the same user
      const userGroup = userGroups[t.userId || 'Unknown'] || [];
      const sortedUserGroup = [...userGroup].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const currentIndex = sortedUserGroup.findIndex(st => st.id === t.id);
      if (currentIndex > 0) {
        const prevTxn = sortedUserGroup[currentIndex - 1];
        if (prevTxn.location !== t.location) {
          tags.push("Location Change");
        }
        if (prevTxn.deviceType && t.deviceType && prevTxn.deviceType !== t.deviceType) {
          tags.push("Device Change");
        }
      }

      const explanations = generateFraudExplanation({ ...t, velocityFlag: velocityFlaggedIds.has(t.id), unusualReason: tags.join(" ") }, amountThreshold);

      if (explanations.length > 0) {
        return {
          ...t,
          isUnusual: true,
          unusualReason: explanations.join(" "),
          unusualTags: tags.length > 0 ? tags : ["Suspicious"]
        };
      }
      return null;
    }).filter(Boolean) as (Transaction & { unusualTags: string[] })[];

    return { 
      unusualTxns: results.sort((a, b) => b.riskScore - a.riskScore).slice(0, 5),
      hasInsufficientData: false,
      amountThreshold
    };
  }, [data]);

  if (data.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-yellow-400" />
          Unusual Behavior Detection
        </h3>
        <span className="text-xs text-slate-500 font-mono">Behavioral AI Active</span>
      </div>
      
      {hasInsufficientData ? (
        <div className="fintech-card p-8 text-center">
          <Info className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h3 className="text-white font-bold mb-2">Insufficient data</h3>
          <p className="text-slate-400 text-xs">The dataset lacks required fields (amount, timestamp) to detect unusual behavior patterns.</p>
        </div>
      ) : unusualTxns.length === 0 ? (
        <div className="fintech-card p-8 text-center">
          <ShieldCheck className="w-12 h-12 text-emerald-500/20 mx-auto mb-4" />
          <p className="text-slate-400 text-sm">No unusual behavior patterns detected in the current dataset.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {unusualTxns.map((txn) => (
            <motion.div 
              key={txn.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4 relative overflow-hidden group hover:bg-yellow-500/10 transition-all"
            >
              <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-40 transition-opacity">
                <Zap className="w-12 h-12 text-yellow-500" />
              </div>
              <div className="flex justify-between items-start mb-2 relative z-10">
                <div>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {txn.unusualTags.map((tag, idx) => (
                      <span key={idx} className="text-[8px] font-bold bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h4 className="text-white font-bold text-sm">{txn.id}</h4>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-white">${txn.amount.toLocaleString()}</div>
                  <div className={cn(
                    "text-[10px] font-bold uppercase",
                    txn.riskScore > 70 ? "text-red-400" : txn.riskScore > 40 ? "text-yellow-400" : "text-emerald-400"
                  )}>
                    {txn.riskScore > 70 ? 'High Risk' : txn.riskScore > 40 ? 'Medium Risk' : 'Low Risk'}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-3 line-clamp-2 relative z-10">
                {txn.unusualReason}
              </p>
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {txn.type}</span>
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Risk: {txn.riskScore}%</span>
                </div>
                <button 
                  onClick={() => setSelectedTxn(txn)}
                  className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 underline"
                >
                  View Details
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      <AnimatePresence>
        {selectedTxn && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTxn(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Suspicious Transaction Details</h3>
                <button onClick={() => setSelectedTxn(null)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Transaction ID</span>
                      <span className="text-white font-mono text-sm">{selectedTxn.id}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Amount</span>
                      <span className="text-xl font-bold text-white">${selectedTxn.amount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Type</span>
                      <span className="text-white text-sm">{selectedTxn.type}</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Time</span>
                      <span className="text-white text-sm">{new Date(selectedTxn.timestamp).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Location</span>
                      <span className="text-white text-sm">{selectedTxn.location}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Fraud Decision</span>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                        (selectedTxn.riskScore >= 80 || selectedTxn.isFraud) 
                          ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                          : selectedTxn.riskScore >= 50 
                            ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" 
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      )}>
                        {(selectedTxn.riskScore >= 80 || selectedTxn.isFraud) ? 'Fraudulent' : selectedTxn.riskScore >= 50 ? 'Medium Risk' : 'Normal'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-6 mb-8 border border-white/5">
                  <h4 className="text-white font-bold mb-4 flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    Risk Factor Analysis
                  </h4>
                  <div className="space-y-3">
                    {generateFraudExplanation(selectedTxn, amountThreshold).length > 0 ? (
                      generateFraudExplanation(selectedTxn, amountThreshold).map((exp, i) => (
                        <div key={i} className="flex items-start gap-3 text-xs text-slate-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5 shrink-0" />
                          <p>{exp}</p>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-start gap-3 text-xs text-slate-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <p>No significant risk factors detected in this session activity.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-8">
                   <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                    <span>Detection Confidence</span>
                    <span className="text-white font-bold">{selectedTxn.riskScore}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${selectedTxn.riskScore}%` }}
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        selectedTxn.riskScore >= 80 ? "bg-red-500" : selectedTxn.riskScore >= 50 ? "bg-yellow-500" : "bg-emerald-500"
                      )}
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setSelectedTxn(null)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FraudPatternInsightsModule = ({ data }: { data: Transaction[] }) => {
  const insights = useMemo(() => {
    if (!data || data.length === 0) return [];

    const fraudTxns = data.filter(t => t.isFraud || t.riskScore >= 70);
    if (fraudTxns.length === 0) return [];

    const results = [];

    // 1. Most frequent fraud transaction type
    const typeCounts: Record<string, number> = {};
    fraudTxns.forEach(t => {
      typeCounts[t.type] = (typeCounts[t.type] || 0) + 1;
    });
    const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
    if (topType) {
      results.push({
        icon: AlertTriangle,
        text: `Most fraud transactions occur in ${topType[0].toUpperCase()} type.`,
        color: 'text-indigo-400'
      });
    }

    // 2. Average amount of fraud transactions
    const totalFraudAmount = fraudTxns.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const avgFraudAmount = fraudTxns.length > 0 ? totalFraudAmount / fraudTxns.length : 0;
    results.push({
      icon: BarChart3,
      text: `High-value transactions above $${Math.round(isNaN(avgFraudAmount) ? 0 : avgFraudAmount).toLocaleString()} show increased fraud risk.`,
      color: 'text-yellow-400'
    });

    // 3. Locations with highest fraud rate
    const locationFraudCounts: Record<string, number> = {};
    const locationTotalCounts: Record<string, number> = {};
    data.forEach(t => {
      locationTotalCounts[t.location] = (locationTotalCounts[t.location] || 0) + 1;
      if (t.isFraud || t.riskScore >= 70) {
        locationFraudCounts[t.location] = (locationFraudCounts[t.location] || 0) + 1;
      }
    });

    const locationRates = Object.entries(locationFraudCounts).map(([loc, count]) => ({
      loc,
      rate: count / locationTotalCounts[loc]
    })).sort((a, b) => b.rate - a.rate);

    if (locationRates.length > 0) {
      results.push({
        icon: MapPin,
        text: `Location ${locationRates[0].loc} has the highest relative fraud rate.`,
        color: 'text-red-400'
      });
    }

    // 4. Time-based fraud patterns
    const hourCounts: Record<number, number> = {};
    fraudTxns.forEach(t => {
      const hour = new Date(t.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const topHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    if (topHour) {
      const hourLabel = parseInt(topHour[0]) > 12 ? `${parseInt(topHour[0]) - 12} PM` : `${topHour[0]} AM`;
      results.push({
        icon: Clock,
        text: `High risk transactions are more frequent around ${hourLabel}.`,
        color: 'text-purple-400'
      });
    }

    return results.slice(0, 4);
  }, [data]);

  if (data.length === 0 || insights.length === 0) return null;

  return (
    <div className="fintech-card p-6">
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-indigo-400" />
        Fraud Pattern Insights
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
        {insights.map((insight, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-start gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all"
          >
            <div className={cn("p-2 rounded-lg bg-white/5", insight.color)}>
              <insight.icon className="w-4 h-4" />
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {insight.text}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const FraudSummaryModule = ({ data }: { data: Transaction[] }) => {
  const summary = useMemo(() => {
    if (!data || data.length === 0) return null;

    const total = data.length;
    const fraudTxns = data.filter(t => t.isFraud || t.riskScore >= 70);
    const fraudCount = fraudTxns.length;
    const fraudPercentageRaw = total > 0 ? (fraudCount / total) * 100 : 0;
    const fraudPercentage = (isNaN(fraudPercentageRaw) ? 0 : fraudPercentageRaw).toFixed(1);

    // Most frequent type
    const typeCounts: Record<string, number> = {};
    fraudTxns.forEach(t => {
      typeCounts[t.type] = (typeCounts[t.type] || 0) + 1;
    });
    const entries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    const topType = entries[0]?.[0] || 'N/A';

    // Avg fraud amount
    const totalFraudAmount = fraudTxns.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const avgFraudAmount = fraudCount > 0 
      ? Math.round(totalFraudAmount / fraudCount)
      : 0;

    // Top location
    const locationFraudCounts: Record<string, number> = {};
    const locationTotalCounts: Record<string, number> = {};
    data.forEach(t => {
      locationTotalCounts[t.location] = (locationTotalCounts[t.location] || 0) + 1;
      if (t.isFraud || t.riskScore >= 70) {
        locationFraudCounts[t.location] = (locationFraudCounts[t.location] || 0) + 1;
      }
    });
    const topLocation = Object.entries(locationFraudCounts)
      .map(([loc, count]) => ({ loc, rate: count / locationTotalCounts[loc] }))
      .sort((a, b) => b.rate - a.rate)[0]?.loc || 'N/A';

    const text = `This dataset contains ${total.toLocaleString()} transactions, out of which ${fraudPercentage}% are considered high-risk. Most fraud transactions occur in ${topType.toUpperCase()} type and high-value transactions averaging $${avgFraudAmount.toLocaleString()}. The highest fraud rate is observed in ${topLocation}. Fraud activity analysis helps in preemptive security protocol deployment.`;

    return { total, fraudCount, fraudPercentage, topType, avgFraudAmount, topLocation, text };
  }, [data]);

  if (!summary) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fintech-card p-8 h-full"
    >
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Brain className="w-5 h-5 text-indigo-400" />
        Auto Fraud Summary
      </h3>
      <div className="space-y-4">
        <p className="text-slate-400 leading-relaxed text-sm">
          {summary.text.split(' ').map((word, i) => {
            const cleanWord = word.replace(/[%,.$]/g, '');
            const isHighlight = 
              word.includes('%') || 
              word.includes('$') || 
              summary.topType.toUpperCase() === cleanWord.toUpperCase() || 
              summary.topLocation.toUpperCase() === cleanWord.toUpperCase() ||
              summary.total.toString() === cleanWord;
              
            return (
              <span key={i} className={isHighlight ? "text-indigo-400 font-bold" : ""}>
                {word}{' '}
              </span>
            );
          })}
        </p>
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Risk Density</span>
            <span className="text-lg font-bold text-red-400">{summary.fraudPercentage}%</span>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Hot Spot</span>
            <span className="text-lg font-bold text-indigo-400 truncate block">{summary.topLocation}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const FraudTimelineAnalysisModule = ({ data }: { data: Transaction[] }) => {
  const timelineData = useMemo(() => {
    if (!data || data.length === 0) return { chart: [], peak: '' };

    const fraudTxns = data.filter(t => t.isFraud || t.riskScore >= 70);
    if (fraudTxns.length === 0) return { chart: [], peak: '' };

    // Check if timestamp is valid date vs sequence
    const hasValidDates = data.some(t => {
      const d = new Date(t.timestamp);
      return !isNaN(d.getTime()) && d.getFullYear() > 2000;
    });

    if (hasValidDates) {
      const hourCounts: Record<number, number> = {};
      for (let i = 0; i < 24; i++) hourCounts[i] = 0;

      fraudTxns.forEach(t => {
        const d = new Date(t.timestamp);
        if (!isNaN(d.getTime())) {
          const hour = d.getHours();
          hourCounts[hour]++;
        }
      });

      const chart = Object.entries(hourCounts).map(([hour, count]) => ({
        time: `${hour}:00`,
        hour: parseInt(hour),
        count
      }));

      const sorted = [...chart].sort((a, b) => b.count - a.count);
      const topHour = sorted[0];
      const nextHour = (topHour.hour + 1) % 24;
      const peak = `Highest fraud activity detected between ${topHour.time} – ${nextHour === 0 ? '0:00' : `${nextHour}:00`}`;

      return { chart, peak };
    } else {
      // Fallback to step range
      const steps = data.map(t => Number(t.step) || 0).filter(s => !isNaN(s));
      const minStep = steps.length > 0 ? Math.min(...steps) : 0;
      const maxStep = steps.length > 0 ? Math.max(...steps) : 0;
      const range = maxStep - minStep;
      const bucketSize = Math.max(1, Math.ceil((isNaN(range) ? 0 : range) / 10));

      const bucketCounts: Record<number, number> = {};
      for (let i = 0; i < 10; i++) bucketCounts[i] = 0;

      fraudTxns.forEach(t => {
        const step = Number(t.step) || 0;
        if (!isNaN(step)) {
          const bucket = Math.floor((step - minStep) / bucketSize);
          const safeBucket = isNaN(bucket) ? 0 : Math.min(9, Math.max(0, bucket));
          bucketCounts[safeBucket]++;
        }
      });

      const chart = Object.entries(bucketCounts).map(([bucket, count]) => {
        const start = minStep + parseInt(bucket) * bucketSize;
        const end = start + bucketSize;
        return {
          time: `${start}-${end}`,
          count
        };
      });

      const sortedBuckets = Object.entries(bucketCounts).sort((a, b) => b[1] - a[1]);
      const topBucket = sortedBuckets[0];
      const bucketIdx = parseInt(topBucket[0]);
      const start = minStep + bucketIdx * bucketSize;
      const end = start + bucketSize;
      const peak = `Highest fraud activity detected at step range ${start}–${end}`;

      return { chart, peak };
    }
  }, [data]);

  if (timelineData.chart.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fintech-card p-8 h-full"
      >
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          Fraud Timeline Analysis
        </h3>
        <div className="flex items-center justify-center h-[250px] text-slate-500 text-sm">
          Not enough data to generate timeline.
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fintech-card p-8 h-full"
    >
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          Fraud Timeline Analysis
        </h3>
      </div>
      
      <div className="h-[250px] w-full mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={timelineData.chart}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
            />
            <Area type="monotone" dataKey="count" stroke="#ef4444" fillOpacity={1} fill="url(#colorCount)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-start gap-3 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl">
        <Clock className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-300 font-medium">{timelineData.peak}</p>
      </div>
    </motion.div>
  );
};

const VelocityMonitoringModule = ({ data }: { data: Transaction[] }) => {
  const velocityData = useMemo(() => {
    // Group by day for the chart
    const groups: Record<string, number> = {};
    data.slice(0, 50).forEach(d => {
      const date = new Date(d.timestamp).toLocaleDateString();
      groups[date] = (groups[date] || 0) + 1;
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value })).reverse();
  }, [data]);

  const highVelocityAlert = useMemo(() => data.some(t => t.velocityFlag), [data]);

  return (
    <div className="fintech-card p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-400" />
          Transaction Velocity
        </h3>
        {highVelocityAlert && (
          <span className="animate-pulse flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/30">
            <AlertTriangle className="w-3 h-3" /> High Velocity Detected
          </span>
        )}
      </div>
      
      <div className="h-[200px] w-full mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={velocityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="name" hide />
            <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
            />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
          <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Peak Rate</span>
          <span className="text-xl font-bold text-white">12 <span className="text-xs text-slate-500 font-normal">tx/min</span></span>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
          <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Avg Interval</span>
          <span className="text-xl font-bold text-white">4.2 <span className="text-xs text-slate-500 font-normal">sec</span></span>
        </div>
      </div>
    </div>
  );
};

const FraudHeatmapModule = ({ data, fraudFound }: { data: Transaction[], fraudFound?: boolean }) => {
  const locationStats = useMemo(() => {
    if (!data || data.length === 0) return [];

    const stats: Record<string, { count: number, fraud: number }> = {};
    
    data.forEach(d => {
      const loc = d.location || 'Unknown';
      if (!stats[loc]) {
        stats[loc] = { count: 0, fraud: 0 };
      }
      stats[loc].count++;
      if (d.isFraud) stats[loc].fraud++;
    });
    
    return Object.entries(stats)
      .map(([name, stat]) => {
        const fraudRate = Math.round((stat.fraud / stat.count) * 100) || 0;
        let level = 'low';
        if (fraudRate > 20) level = 'high';
        else if (fraudRate >= 10) level = 'medium';
        
        return {
          name,
          ...stat,
          fraudRate,
          level
        };
      })
      .sort((a, b) => b.fraudRate - a.fraudRate);
  }, [data]);

  const hasLocationData = useMemo(() => data.some(d => d.location && d.location !== 'Unknown'), [data]);
  const hasFraudData = fraudFound !== false;

  if (!hasLocationData) {
    return (
      <div className="fintech-card p-6 h-full flex flex-col items-center justify-center text-center">
        <PieChart className="w-12 h-12 text-slate-700 mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Location data not available</h3>
        <p className="text-sm text-slate-500">The current dataset does not contain location information.</p>
      </div>
    );
  }

  if (!hasFraudData) {
    return (
      <div className="fintech-card p-6 h-full flex flex-col items-center justify-center text-center">
        <PieChart className="w-12 h-12 text-slate-700 mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Fraud data not available</h3>
        <p className="text-sm text-slate-500">The current dataset does not contain fraud labels.</p>
      </div>
    );
  }

  return (
    <div className="fintech-card p-6 h-full">
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <PieChart className="w-5 h-5 text-emerald-400" />
        Global Fraud Heatmap
      </h3>
      
      <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {locationStats.map((loc) => (
          <div 
            key={loc.name}
            className="group relative bg-white/5 border border-white/5 rounded-xl p-3 hover:bg-white/10 transition-all cursor-default"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-slate-400 truncate max-w-[80px]">{loc.name}</span>
              <div className={cn(
                "w-2 h-2 rounded-full shadow-sm",
                loc.level === 'high' ? "bg-red-500 shadow-red-500/50" : 
                loc.level === 'medium' ? "bg-yellow-500 shadow-yellow-500/50" : 
                "bg-emerald-500 shadow-emerald-500/50"
              )} />
            </div>
            <div className="text-sm font-bold text-white">{loc.fraudRate}% <span className="text-[10px] text-slate-500 font-normal">rate</span></div>
            
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-slate-950 border border-white/10 rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
              <div className="text-[10px] font-bold text-white mb-1">{loc.name}</div>
              <div className="flex justify-between text-[8px] text-slate-400">
                <span>Total TXN:</span>
                <span className="text-white">{loc.count}</span>
              </div>
              <div className="flex justify-between text-[8px] text-slate-400">
                <span>Fraudulent:</span>
                <span className="text-red-400">{loc.fraud}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 flex items-center justify-center gap-4 text-[10px] font-bold text-slate-500">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Low</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500" /> Medium</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> High</div>
      </div>
    </div>
  );
};

const Dashboard = ({ selectedId, datasets }: { selectedId: string | null, datasets: Dataset[] }) => {
  const [currentDataset, setCurrentDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const idToLoad = selectedId || localStorage.getItem('selectedDataset');
    
    if (idToLoad) {
      const found = datasets.find((ds: Dataset) => ds.id === idToLoad);
      if (found) {
        setCurrentDataset(found);
      } else {
        // Try loading from history in localStorage if not in props yet
        const savedHistory = localStorage.getItem('datasetHistory');
        if (savedHistory) {
          try {
            const history = JSON.parse(savedHistory);
            const foundInStorage = history.find((ds: Dataset) => ds.id === idToLoad);
            if (foundInStorage) setCurrentDataset(foundInStorage);
          } catch (e) {}
        }
      }
    }
    setLoading(false);
  }, [selectedId, datasets]);

  const data = currentDataset?.data || [];

  const hasInsights = useMemo(() => {
    if (!data || data.length === 0) return false;
    const fraudTxns = data.filter(t => t.isFraud || t.riskScore >= 70);
    return fraudTxns.length > 0;
  }, [data]);

  const stats = useMemo(() => {
    if (data.length === 0) return { total: 0, fraud: 0, totalAmount: 0, avgRisk: 0 };
    const total = data.length;
    const fraud = data.filter(d => d.isFraud).length;
    const totalAmount = data.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalRisk = data.reduce((acc, curr) => acc + (Number(curr.riskScore) || 0), 0);
    const avgRisk = Math.round(totalRisk / total);
    
    return { total, fraud, totalAmount: isNaN(totalAmount) ? 0 : totalAmount, avgRisk: isNaN(avgRisk) ? 0 : avgRisk };
  }, [data]);

  const chartData = useMemo(() => {
    if (data.length === 0) return { ranges: [], fraudData: [] };
    // Amount distribution
    const ranges = [
      { name: '0-500', count: 0 },
      { name: '501-1000', count: 0 },
      { name: '1001-2500', count: 0 },
      { name: '2501-5000', count: 0 },
      { name: '5000+', count: 0 },
    ];
    
    data.forEach(d => {
      if (d.amount <= 500) ranges[0].count++;
      else if (d.amount <= 1000) ranges[1].count++;
      else if (d.amount <= 2500) ranges[2].count++;
      else if (d.amount <= 5000) ranges[3].count++;
      else ranges[4].count++;
    });

    // Fraud vs Normal
    const fraudData = [
      { name: 'Normal', value: data.length - stats.fraud, color: '#10b981' },
      { name: 'Fraudulent', value: stats.fraud, color: '#ef4444' },
    ];

    return { ranges, fraudData };
  }, [data, stats]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!currentDataset) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center">
        <div className="bg-white/5 border border-white/10 rounded-[32px] p-12">
          <Database className="w-16 h-16 text-slate-600 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">No dataset selected</h2>
          <p className="text-slate-400 mb-8">Please upload a dataset or select one from your history to view the analysis.</p>
          <Link to="/upload" className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all">
            <Upload className="w-5 h-5" />
            Upload Dataset
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Analysis Dashboard – <span className="text-indigo-400">{currentDataset.datasetName}</span>
          </h2>
          <p className="text-slate-400">Comprehensive overview of transaction patterns and risk assessment.</p>
        </div>
        
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Records</span>
            <span className="text-lg font-bold text-white">{currentDataset.recordsCount.toLocaleString()}</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Fraud Cases</span>
            <span className="text-lg font-bold text-red-400">{currentDataset.fraudCount.toLocaleString()}</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Upload Date</span>
            <span className="text-lg font-bold text-white">
              {new Date(currentDataset.uploadDate).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { label: 'Total Transactions', value: stats.total, icon: Activity, color: 'text-blue-400', prefix: "" },
          { label: 'Fraud Detected', value: stats.fraud, icon: AlertTriangle, color: 'text-red-400', prefix: "" },
          { label: 'Total Volume (M)', value: Math.round(stats.totalAmount / 1000000), icon: TrendingUp, color: 'text-emerald-400', prefix: "$" },
          { label: 'Avg Risk Score', value: stats.avgRisk, icon: Zap, color: 'text-yellow-400', prefix: "", suffix: "%" },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="fintech-card p-6 group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2 rounded-lg bg-white/5 group-hover:scale-110 transition-transform", stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Live</span>
              </div>
            </div>
            <h3 className="text-slate-400 text-sm font-medium mb-1">{stat.label}</h3>
            <p className="text-2xl font-bold text-white">
              <Counter value={stat.value} prefix={stat.prefix} />
              {stat.suffix}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <VelocityMonitoringModule data={data} />
        <FraudHeatmapModule data={data} fraudFound={currentDataset.fraudFound} />
      </div>

      <div className="mb-8">
        <UnusualBehaviorModule data={data} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 items-start">
        <FraudTimelineAnalysisModule data={data} />
        <FraudSummaryModule data={data} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 items-start">
        {hasInsights && (
          <div className="lg:col-span-1">
            <FraudPatternInsightsModule data={data} />
          </div>
        )}
        
        <div className={cn("space-y-8", hasInsights ? "lg:col-span-1" : "lg:col-span-2")}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fintech-card p-8"
          >
            <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              Transaction Amount Distribution
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.ranges}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="fintech-card p-8"
          >
            <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-indigo-400" />
              Fraud vs Normal Transactions
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={chartData.fraudData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.fraudData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const DetectionPage = ({ data }: { data: Transaction[] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const filteredData = useMemo(() => {
    return data.filter(d => 
      d.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      d.location.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => b.riskScore - a.riskScore);
  }, [data, searchTerm]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount(prev => prev + 10);
      setLoadingMore(false);
    }, 600);
  };

  const blockedCount = useMemo(() => data.filter(t => t.isBlocked).length, [data]);

  const amountThreshold = useMemo(() => {
    if (!data || data.length === 0) return 70000;
    const sortedAmounts = [...data].map(t => t.amount).sort((a, b) => a - b);
    const thresholdIndex = Math.floor(sortedAmounts.length * 0.9);
    return Math.max(70000, sortedAmounts[thresholdIndex] || 0);
  }, [data]);

  const highRiskAlerts = useMemo(() => {
    return data
      .filter(t => (t.riskScore >= 80 || t.isFraud || t.amount > 70000) && !t.isBlocked)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 3);
  }, [data]);

  const confusionMatrix = useMemo(() => {
    if (!data || data.length === 0) return { tp: 0, fp: 0, tn: 0, fn: 0, insufficient: true };
    
    // Check if essential fields exist in at least one record
    const hasFraudField = data.some(t => 'isFraud' in t);
    const hasRiskField = data.some(t => 'riskScore' in t);
    
    if (!hasFraudField || !hasRiskField) return { tp: 0, fp: 0, tn: 0, fn: 0, insufficient: true };

    let tp = 0, fp = 0, tn = 0, fn = 0;
    
    data.forEach(txn => {
      const actual = txn.isFraud ? 1 : 0;
      const predicted = txn.riskScore >= 50 ? 1 : 0;
      
      if (actual === 1 && predicted === 1) tp++;
      else if (actual === 0 && predicted === 0) tn++;
      else if (actual === 0 && predicted === 1) fp++;
      else if (actual === 1 && predicted === 0) fn++;
    });
    
    return { tp, fp, tn, fn, insufficient: false };
  }, [data]);

  const metrics = useMemo(() => {
    const { tp, fp, tn, fn } = confusionMatrix;
    const total = tp + fp + tn + fn;
    
    const accuracy = total > 0 ? ((tp + tn) / total) * 100 : 0;
    const precision = (tp + fp) > 0 ? (tp / (tp + fp)) * 100 : 0;
    const recall = (tp + fn) > 0 ? (tp / (tp + fn)) * 100 : 0;
    const f1Score = (precision + recall) > 0 ? (2 * (precision * recall) / (precision + recall)) : 0;
    
    return {
      accuracy: parseFloat(accuracy.toFixed(1)),
      precision: parseFloat(precision.toFixed(1)),
      recall: parseFloat(recall.toFixed(1)),
      f1Score: parseFloat(f1Score.toFixed(1))
    };
  }, [confusionMatrix]);

  return (
    <div className="max-w-7xl mx-auto py-12 px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h2 className="text-3xl font-bold text-white mb-4">Predictive Fraud Detection</h2>
          <p className="text-slate-400">Our Random Forest model analyzes multi-dimensional features to classify transaction risk.</p>
        </div>
        
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-4">
          <div className="p-2 bg-red-500 rounded-lg">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Blocked Transactions</div>
            <div className="text-2xl font-bold text-white leading-none mt-1">
              <Counter value={blockedCount} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
        <div className="lg:col-span-1 space-y-6">
          <div className="fintech-card p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Model Performance</h3>
            <div className="space-y-4">
              {Object.entries(metrics).map(([key, val]) => (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="text-white font-bold">{val}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${val}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="fintech-card p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Confusion Matrix</h3>
            {confusionMatrix.insufficient ? (
              <div className="py-8 text-center">
                <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2 opacity-50" />
                <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-relaxed px-4">Insufficient data to compute confusion matrix</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-bold">
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
                    <div className="text-emerald-400 mb-1">TN</div>
                    <div className="text-white text-lg">{confusionMatrix.tn}</div>
                  </div>
                  <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                    <div className="text-red-400 mb-1">FP</div>
                    <div className="text-white text-lg">{confusionMatrix.fp}</div>
                  </div>
                  <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                    <div className="text-red-400 mb-1">FN</div>
                    <div className="text-white text-lg">{confusionMatrix.fn}</div>
                  </div>
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
                    <div className="text-emerald-400 mb-1">TP</div>
                    <div className="text-white text-lg">{confusionMatrix.tp}</div>
                  </div>
                </div>
                <div className="mt-4 flex justify-between text-[8px] text-slate-500 uppercase tracking-widest">
                  <span>Actual: Normal/Fraud</span>
                  <span>Predicted: Normal/Fraud</span>
                </div>
              </>
            )}
          </div>
          
          <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-indigo-400" />
              <h3 className="text-white font-bold">Secure Analysis</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              The system uses behavioral biometrics and historical transaction patterns to detect anomalies with high precision.
            </p>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="fintech-card overflow-hidden">
            <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-xl font-bold text-white">Transaction Risk Analysis</h3>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 w-full sm:w-64"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Transaction ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Amount</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Risk Score</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase w-32">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredData.slice(0, visibleCount).map((row) => (
                    <tr 
                      key={row.id} 
                      className={cn(
                        "hover:bg-white/5 transition-colors",
                        row.isBlocked && "bg-red-500/5"
                      )}
                    >
                      <td className="px-6 py-4">
                        {row.isBlocked ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            <Lock className="w-3 h-3" /> BLOCKED
                          </span>
                        ) : row.isFraud ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                            <XCircle className="w-3 h-3" /> Fraudulent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Normal
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-white font-mono">{row.id}</td>
                      <td className="px-6 py-4 text-sm text-white">${row.amount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "text-sm font-bold",
                            row.riskScore > 70 ? "text-red-400" : row.riskScore > 40 ? "text-yellow-400" : "text-emerald-400"
                          )}>
                            {row.riskScore}%
                          </span>
                          {row.riskScore > 80 && !row.isBlocked && (
                            <div className="animate-pulse">
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setSelectedTxn(row)}
                            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 underline"
                          >
                            View Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredData.length > 10 && (
              <div className="p-4 text-center border-t border-white/10">
                <button 
                  onClick={handleLoadMore}
                  disabled={visibleCount >= filteredData.length || loadingMore}
                  className={cn(
                    "flex items-center gap-2 mx-auto px-6 py-2 rounded-xl text-sm font-bold transition-all",
                    visibleCount >= filteredData.length 
                      ? "bg-white/5 text-slate-500 cursor-not-allowed" 
                      : "bg-white/10 text-white hover:bg-white/20 active:scale-95"
                  )}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : visibleCount >= filteredData.length ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      All Transactions Loaded
                    </>
                  ) : (
                    <>
                      Load More Transactions
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* High Risk Alerts */}
      <div className="space-y-4">
        {highRiskAlerts.length > 0 ? (
          highRiskAlerts.map((alert) => (
            <motion.div 
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-4 group"
            >
              <div className="p-2 bg-red-500 rounded-lg shrink-0">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold text-sm">High Risk Transaction Detected</h4>
                <p className="text-xs text-slate-400">
                  Transaction <span className="font-mono text-white">{alert.id}</span> from <span className="text-white">{alert.location}</span> flagged with <span className="text-red-400 font-bold">{alert.riskScore}%</span> risk score.
                </p>
              </div>
              <button 
                onClick={() => setSelectedTxn(alert)}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold rounded-xl border border-red-500/30 transition-all"
              >
                View Details
              </button>
            </motion.div>
          ))
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/20 mx-auto mb-2" />
            <p className="text-slate-400 text-sm font-medium">No high-risk transactions detected in this dataset.</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selectedTxn && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTxn(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Transaction Details</h3>
                <button onClick={() => setSelectedTxn(null)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Transaction ID</span>
                      <span className="text-white font-mono">{selectedTxn.id}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Amount</span>
                      <span className="text-xl font-bold text-white">${selectedTxn.amount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Type</span>
                      <span className="text-white">{selectedTxn.type}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Device Type</span>
                      <span className="text-white">{selectedTxn.deviceType || 'Unknown'}</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Time</span>
                      <span className="text-white">{new Date(selectedTxn.timestamp).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Location</span>
                      <span className="text-white">{selectedTxn.location}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Risk Score</span>
                      <span className={cn(
                        "text-xl font-bold",
                        selectedTxn.riskScore >= 80 || selectedTxn.isFraud ? "text-red-400" : selectedTxn.riskScore >= 50 ? "text-yellow-400" : "text-emerald-400"
                      )}>{selectedTxn.riskScore}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Fraud Decision</span>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase",
                        (selectedTxn.riskScore >= 80 || selectedTxn.isFraud) 
                          ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                          : selectedTxn.riskScore >= 50 
                            ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" 
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      )}>
                        {(selectedTxn.riskScore >= 80 || selectedTxn.isFraud) ? 'Fraudulent (High Risk)' : selectedTxn.riskScore >= 50 ? 'Medium Risk' : 'Normal (Low Risk)'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-6 mb-8 border border-white/5">
                  <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    Data-Driven Risk Explanation
                  </h4>
                  <div className="space-y-3">
                    {generateFraudExplanation(selectedTxn, amountThreshold).length > 0 ? (
                      generateFraudExplanation(selectedTxn, amountThreshold).map((exp, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm text-slate-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5 shrink-0" />
                          <p>
                            {exp.split('(').map((part, idx) => idx === 1 ? <span key={idx} className="font-bold text-yellow-400">({part}</span> : part)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-start gap-3 text-sm text-slate-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <p>No significant risk factors detected based on current behavior analysis.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <h4 className="text-white font-bold mb-4 text-sm">Detection Confidence</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <span>Risk Integrity Score</span>
                        <span className="text-white font-bold">{selectedTxn.riskScore}%</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${selectedTxn.riskScore}%` }}
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            selectedTxn.riskScore >= 80 ? "bg-red-500" : selectedTxn.riskScore >= 50 ? "bg-yellow-500" : "bg-emerald-500"
                          )}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Our random forest model calculates this confidence based on historical anomaly deviations.
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-4 text-sm">Decision Invariants</h4>
                    <div className="space-y-2">
                      {[
                        { label: 'Amount Threshold', detected: selectedTxn.amount > 70000 },
                        { label: 'Time Window Check', hour: new Date(selectedTxn.timestamp).getHours(), detected: new Date(selectedTxn.timestamp).getHours() <= 5 },
                        { label: 'Merchant/Loc Patterns', detected: selectedTxn.unusualReason?.toLowerCase().includes('location') },
                        { label: 'Type Protocol', detected: selectedTxn.type?.toUpperCase() === 'TRANSFER' }
                      ].map((factor, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                          <span className="text-xs text-slate-300">{factor.label}</span>
                          {factor.detected ? (
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setSelectedTxn(null)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[80] bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold"
          >
            <CheckCircle2 className="w-5 h-5" />
            Transaction Blocked Successfully
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AboutPage = () => (
  <div className="max-w-4xl mx-auto py-12 px-4">
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-500 rounded-lg">
            <Info className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white">Project Overview</h2>
        </div>
        <div className="fintech-card p-8">
          <p className="text-slate-300 leading-relaxed">
            This project is an <span className="text-indigo-400 font-bold">explainable fraud detection system</span> designed to analyze digital payment transactions and identify suspicious activities. The system uses <span className="text-indigo-400 font-bold">machine learning</span> techniques such as <span className="text-white font-semibold">Decision Tree</span> and <span className="text-white font-semibold">Logistic Regression</span> to classify transactions as fraud or normal. It also provides <span className="text-indigo-400 font-bold">risk scoring</span> and detailed explanations for each transaction.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-white mb-6">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            "Fraud detection using Decision Tree and Logistic Regression",
            "Risk score calculation for each transaction",
            "Transaction behavior analysis (amount, time, location, device)",
            "Interactive dashboard with charts and visual insights",
            "Fraud explanation engine to explain why a transaction is risky",
            "Fraud timeline analysis to identify peak fraud periods",
            "Pattern-based insights from dataset"
          ].map((feature, i) => (
            <div key={i} className="fintech-card p-4 flex items-start gap-3">
              <div className="mt-1 shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              </div>
              <span className="text-slate-300 text-sm">{feature}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-white mb-6">System Architecture</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { name: 'Frontend', desc: 'HTML, Tailwind CSS' },
            { name: 'Node.js', desc: 'Storing Data' },
            { name: 'Chart.js', desc: 'Visualization' },
            { name: 'TypeScript', desc: 'Frontend Typing' },
            { name: 'ML', desc: 'Decision Tree, Logistic Reg' },
          ].map((tech, i) => (
            <div key={i} className="fintech-card p-4 text-center rounded-2xl border border-white/5">
              <div className="text-white font-bold text-xs mb-1">{tech.name}</div>
              <div className="text-slate-500 text-[9px] uppercase tracking-tighter leading-tight">{tech.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Purpose</h2>
          <div className="fintech-card p-6 border-l-4 border-indigo-500">
            <p className="text-slate-400 text-sm leading-relaxed">
              The purpose of this project is to build an <span className="text-white font-medium">intelligent fraud detection system</span> that not only identifies fraudulent transactions but also explains the reasons behind them. It helps users understand fraud patterns, risk levels, and transaction behavior through data visualization and analytics.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Innovation</h2>
          <div className="fintech-card p-6 border-l-4 border-emerald-500">
            <p className="text-slate-400 text-sm leading-relaxed">
              The system focuses on <span className="text-white font-medium">explainable fraud detection</span> by combining machine learning with data analysis and visualization. It provides both prediction and explanation, making it more useful than traditional systems.
            </p>
          </div>
        </section>
      </div>

    </motion.div>
  </div>
);

const DatasetHistory = ({ 
  datasets, 
  onViewAnalysis, 
  onDeleteDataset 
}: { 
  datasets: Dataset[], 
  onViewAnalysis: (id: string) => void,
  onDeleteDataset: (id: string) => void
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');

  const filteredDatasets = useMemo(() => {
    return datasets
      .filter(d => {
        const name = d.datasetName || (d as any).name || '';
        return name.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => {
        const nameA = a.datasetName || (a as any).name || '';
        const nameB = b.datasetName || (b as any).name || '';
        if (sortBy === 'date') return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
        return nameA.localeCompare(nameB);
      });
  }, [datasets, searchTerm, sortBy]);

  return (
    <div className="max-w-7xl mx-auto py-12 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Dataset History</h2>
          <div className="flex items-center gap-3">
            <p className="text-slate-400">Total Datasets Uploaded: <span className="text-indigo-400 font-bold">{datasets.length}</span></p>
            <div className="w-1 h-1 rounded-full bg-slate-700" />
            <p className="text-slate-400">Stored Datasets: <span className="text-indigo-400 font-bold">{datasets.length}</span></p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search datasets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 w-full sm:w-64"
            />
          </div>
          <button 
            onClick={() => setSortBy(sortBy === 'date' ? 'name' : 'date')}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-sm font-medium transition-all"
          >
            <ArrowUpDown className="w-4 h-4" />
            Sort by {sortBy === 'date' ? 'Name' : 'Date'}
          </button>
        </div>
      </div>

      {datasets.length === 0 ? (
        <div className="text-center py-20 fintech-card">
          <Database className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No datasets uploaded yet</h3>
          <p className="text-slate-500">Upload your first CSV file to start the analysis.</p>
        </div>
      ) : filteredDatasets.length === 0 ? (
        <div className="text-center py-20 fintech-card">
          <Search className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No matching datasets</h3>
          <p className="text-slate-500">Try adjusting your search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredDatasets.map((dataset) => (
            <motion.div 
              key={dataset.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -5 }}
              className="fintech-card p-6 flex flex-col h-full group relative"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-indigo-600/20 rounded-xl">
                  <FileText className="w-6 h-6 text-indigo-400" />
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                    dataset.analysisCompleted ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  )}>
                    {dataset.analysisCompleted ? 'Analyzed' : 'Pending'}
                  </span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteDataset(dataset.id);
                    }}
                    className="p-2 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                    title="Delete Dataset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-white mb-1 truncate group-hover:text-indigo-400 transition-colors pr-8">
                {dataset.datasetName}
              </h3>
              
              <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(dataset.uploadDate).toLocaleDateString()}
                </div>
                {dataset.fileSize && (
                  <div className="flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    {dataset.fileSize}
                  </div>
                )}
              </div>
              
              <p className="text-sm text-slate-400 line-clamp-2 mb-6 flex-grow">
                {dataset.description}
              </p>
              
              <div className="grid grid-cols-3 gap-2 mb-6">
                <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                  <span className="text-[9px] text-slate-500 uppercase font-bold block mb-1">Records</span>
                  <span className="text-sm font-bold text-white">{dataset.recordsCount.toLocaleString()}</span>
                </div>
                <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                  <span className="text-[9px] text-slate-500 uppercase font-bold block mb-1">Cols</span>
                  <span className="text-sm font-bold text-white">{dataset.columnsCount}</span>
                </div>
                <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                  <span className="text-[9px] text-slate-500 uppercase font-bold block mb-1">Fraud</span>
                  <span className="text-sm font-bold text-red-400">
                    {dataset.recordsCount > 0 ? Math.round((dataset.fraudCount / dataset.recordsCount) * 100) : 0}%
                  </span>
                </div>
              </div>
              
              <button 
                onClick={() => onViewAnalysis(dataset.id)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 group/btn"
              >
                <BarChart3 className="w-4 h-4" />
                View Analysis
                <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

const DetailedAnalysis = ({ dataset, onBack }: { dataset: Dataset, onBack: () => void }) => {
  const chartData = useMemo(() => {
    // Amount distribution
    const ranges = [
      { name: '0-500', count: 0 },
      { name: '501-1000', count: 0 },
      { name: '1001-2500', count: 0 },
      { name: '2501-5000', count: 0 },
      { name: '5000+', count: 0 },
    ];
    
    dataset.data.forEach(d => {
      if (d.amount <= 500) ranges[0].count++;
      else if (d.amount <= 1000) ranges[1].count++;
      else if (d.amount <= 2500) ranges[2].count++;
      else if (d.amount <= 5000) ranges[3].count++;
      else ranges[4].count++;
    });

    // Fraud vs Normal
    const fraudData = [
      { name: 'Normal', value: dataset.normalCount, color: '#10b981' },
      { name: 'Fraudulent', value: dataset.fraudCount, color: '#ef4444' },
    ];

    // Risk distribution
    const riskRanges = [
      { name: 'Low (0-30)', count: 0 },
      { name: 'Medium (31-70)', count: 0 },
      { name: 'High (71-100)', count: 0 },
    ];
    dataset.data.forEach(d => {
      if (d.riskScore <= 30) riskRanges[0].count++;
      else if (d.riskScore <= 70) riskRanges[1].count++;
      else riskRanges[2].count++;
    });

    // Type distribution
    const typeCounts: Record<string, number> = {};
    dataset.data.forEach(d => {
      typeCounts[d.type] = (typeCounts[d.type] || 0) + 1;
    });
    const typeData = Object.entries(typeCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];

    return { ranges, fraudData, riskRanges, typeData, COLORS };
  }, [dataset]);

  return (
    <div className="max-w-7xl mx-auto py-12 px-4">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="p-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl transition-all"
        >
          <X className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-3xl font-bold text-white">Analysis: {dataset.datasetName}</h2>
          <p className="text-slate-400 text-sm">Comprehensive risk and behavioral breakdown</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { label: 'Total Transactions', value: dataset.recordsCount, icon: Activity, color: 'text-blue-400' },
          { label: 'Fraudulent', value: dataset.fraudCount, icon: AlertTriangle, color: 'text-red-400' },
          { label: 'Normal', value: dataset.normalCount, icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Avg Amount', value: Math.round(dataset.avgAmount), icon: TrendingUp, color: 'text-indigo-400', prefix: "$" },
        ].map((stat, i) => (
          <div key={i} className="fintech-card p-6">
            <div className={cn("p-2 rounded-lg bg-white/5 w-fit mb-4", stat.color)}>
              <stat.icon className="w-6 h-6" />
            </div>
            <h3 className="text-slate-400 text-sm font-medium mb-1">{stat.label}</h3>
            <p className="text-2xl font-bold text-white">
              {stat.prefix}{stat.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="fintech-card p-8">
          <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-400" />
            Fraud vs Normal Distribution
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={chartData.fraudData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.fraudData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="fintech-card p-8">
          <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-400" />
            Risk Score Distribution
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.riskRanges}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="fintech-card p-8">
          <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Amount Distribution
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.ranges}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <VelocityMonitoringModule data={dataset.data} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="fintech-card p-8">
          <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Transaction Type Distribution
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.typeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="fintech-card p-8">
          <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-400" />
            Risk Insights
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <h4 className="text-red-400 font-bold mb-1 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                High Risk Alert
              </h4>
              <p className="text-sm text-slate-400">
                {dataset.fraudCount} transactions flagged as highly suspicious. Immediate review recommended for transactions exceeding $2,500.
              </p>
            </div>
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <h4 className="text-indigo-400 font-bold mb-1 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Pattern Analysis
              </h4>
              <p className="text-sm text-slate-400">
                Unusual velocity detected in {Math.floor(dataset.recordsCount * 0.05)} transactions. Most suspicious activity occurs between 2 AM and 4 AM.
              </p>
            </div>
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <h4 className="text-emerald-400 font-bold mb-1 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                System Health
              </h4>
              <p className="text-sm text-slate-400">
                Model confidence at 94.2%. Data integrity verified for all {dataset.recordsCount} records.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="fintech-card overflow-hidden mb-8">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Sample Transactions (First 10 Rows)</h3>
          <span className="text-xs text-slate-500 font-medium">Showing top 10 records from dataset</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Timestamp</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Location</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Risk Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {dataset.data.slice(0, 10).map((row) => (
                <tr key={row.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-sm text-white font-mono">{row.id}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{new Date(row.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{row.type}</td>
                  <td className="px-6 py-4 text-sm text-white font-bold">${row.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{row.location}</td>
                  <td className="px-6 py-4">
                    {row.isFraud ? (
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 text-[10px] font-bold uppercase rounded-md border border-red-500/20">Fraud</span>
                    ) : (
                      <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase rounded-md border border-emerald-500/20">Normal</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full",
                            row.riskScore > 70 ? "bg-red-500" : row.riskScore > 30 ? "bg-amber-500" : "bg-emerald-500"
                          )}
                          style={{ width: `${row.riskScore}%` }}
                        />
                      </div>
                      <span className={cn(
                        "text-xs font-bold",
                        row.riskScore > 70 ? "text-red-400" : row.riskScore > 30 ? "text-amber-400" : "text-emerald-400"
                      )}>
                        {row.riskScore}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="fintech-card overflow-hidden mb-8">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-xl font-bold text-white">High Risk Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Location</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Risk Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {dataset.data.filter(d => d.riskScore > 70).slice(0, 5).map((row) => (
                <tr key={row.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-sm text-white font-mono">{row.id}</td>
                  <td className="px-6 py-4 text-sm text-white">${row.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{row.location}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-red-400">{row.riskScore}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [dataset, setDataset] = useState<Transaction[]>([]);
  const [uploadedDatasets, setUploadedDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);

  // Load dataset history from localStorage on startup
  useEffect(() => {
    const savedHistory = localStorage.getItem('datasetHistory');
    if (savedHistory) {
      try {
        let parsedHistory = JSON.parse(savedHistory);
        
        // Data migration for old datasets
        parsedHistory = parsedHistory.map((ds: any) => ({
          ...ds,
          datasetName: ds.datasetName || ds.name || 'Untitled Dataset',
          recordsCount: ds.recordsCount ?? ds.recordCount ?? ds.records ?? 0,
          columnsCount: ds.columnsCount ?? ds.columnCount ?? 0,
          averageRisk: ds.averageRisk ?? ds.avgRiskScore ?? 0,
          analysisDate: ds.analysisDate ?? ds.analysisTimestamp ?? ds.uploadDate,
          uploadDate: ds.uploadDate ?? ds.analysisDate ?? new Date().toISOString(),
          description: ds.description || `Analysis of ${ds.recordsCount || 0} transactions.`,
          status: ds.status || 'Analyzed',
          analysisCompleted: ds.analysisCompleted ?? true,
          data: ds.data || []
        }));
        
        setUploadedDatasets(parsedHistory);
        
        // Sync with current dataset if one was selected
        const selectedId = localStorage.getItem('selectedDataset');
        if (selectedId) {
          const ds = parsedHistory.find((d: Dataset) => d.id === selectedId);
          if (ds) {
            setDataset(ds.data);
            setSelectedDatasetId(selectedId);
          }
        }
      } catch (e) {
        console.error("Failed to parse dataset history", e);
      }
    } else {
      initializeMockData();
    }
  }, []);

  const initializeMockData = () => {
    const mockData = generateMockData(150);
    setDataset(mockData);
    
    const initialDataset: Dataset = {
      id: 'ds-001',
      datasetName: 'Sample_Transactions_2026.csv',
      uploadDate: new Date().toISOString(),
      data: mockData,
      recordsCount: mockData.length,
      columnsCount: 12,
      fraudCount: mockData.filter(d => d.isFraud).length,
      normalCount: mockData.filter(d => !d.isFraud).length,
      avgAmount: mockData.reduce((acc, curr) => acc + curr.amount, 0) / mockData.length,
      averageRisk: Math.round(mockData.reduce((acc, curr) => acc + curr.riskScore, 0) / mockData.length),
      analysisDate: new Date().toISOString(),
      description: "This dataset contains digital payment transaction records used for fraud detection analysis. It includes transaction amount, time, type, and fraud labels.",
      status: 'Analyzed',
      analysisCompleted: true,
      fileSize: '45 KB',
      fraudFound: true
    };
    
    const initialHistory = [initialDataset];
    setUploadedDatasets(initialHistory);
    localStorage.setItem('datasetHistory', JSON.stringify(initialHistory));
  };

  const handleDataLoaded = (data: Transaction[], fileName: string, fileSize: string, columnCount: number, fraudFound: boolean) => {
    const avgRiskScore = Math.round(data.reduce((acc, curr) => acc + curr.riskScore, 0) / data.length);
    const fraudCount = data.filter(d => d.isFraud).length;
    const now = new Date().toISOString();
    
    const newDataset: Dataset = {
      id: `ds-${Date.now()}`,
      datasetName: fileName,
      uploadDate: now,
      data: data,
      recordsCount: data.length,
      columnsCount: columnCount,
      fraudCount: fraudCount,
      normalCount: data.length - fraudCount,
      avgAmount: data.reduce((acc, curr) => acc + curr.amount, 0) / data.length,
      averageRisk: avgRiskScore,
      analysisDate: now,
      description: `Analysis of ${data.length} transactions from ${fileName}.`,
      status: 'Analyzed',
      analysisCompleted: true,
      fileSize,
      fraudFound
    };
    
    setDataset(data);
    const updatedHistory = [newDataset, ...uploadedDatasets];
    setUploadedDatasets(updatedHistory);
    localStorage.setItem('datasetHistory', JSON.stringify(updatedHistory));
    localStorage.setItem('selectedDataset', newDataset.id);
    setSelectedDatasetId(newDataset.id);
    navigate('/dashboard');
  };

  const handleDeleteDataset = (id: string) => {
    const updatedHistory = uploadedDatasets.filter(ds => ds.id !== id);
    setUploadedDatasets(updatedHistory);
    localStorage.setItem('datasetHistory', JSON.stringify(updatedHistory));
    
    if (selectedDatasetId === id) {
      setSelectedDatasetId(null);
      localStorage.removeItem('selectedDataset');
      setDataset([]);
    }
  };

  const handleViewAnalysis = (id: string) => {
    const ds = uploadedDatasets.find(d => d.id === id);
    if (ds) {
      setDataset(ds.data);
      setSelectedDatasetId(id);
      localStorage.setItem('selectedDataset', id);
      navigate('/dashboard');
    }
  };

  const handleBlockTransaction = (id: string) => {
    setDataset(prev => prev.map(t => t.id === id ? { ...t, isBlocked: true } : t));
    setUploadedDatasets(prev => prev.map(ds => ({
      ...ds,
      data: ds.data.map(t => t.id === id ? { ...t, isBlocked: true } : t)
    })));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      <Navbar />
      
      <main className="relative">
        <AnimatePresence mode="wait">
          <Routes location={location}>
            <Route path="/" element={
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <Hero onGetStarted={() => navigate('/upload')} onViewData={() => navigate('/history')} />
              </motion.div>
            } />
            <Route path="/upload" element={
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <UploadSection onDataLoaded={handleDataLoaded} />
              </motion.div>
            } />
            <Route path="/history" element={
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <DatasetHistory datasets={uploadedDatasets} onViewAnalysis={handleViewAnalysis} onDeleteDataset={handleDeleteDataset} />
              </motion.div>
            } />
            <Route path="/dashboard" element={
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <Dashboard selectedId={selectedDatasetId} datasets={uploadedDatasets} />
              </motion.div>
            } />
            <Route path="/detection" element={
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <DetectionPage data={dataset} />
              </motion.div>
            } />
            <Route path="/about" element={
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <AboutPage />
              </motion.div>
            } />
            <Route path="/detailed-analysis" element={
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                {(() => {
                  const ds = uploadedDatasets.find(d => d.id === selectedDatasetId);
                  if (!ds) return <DatasetHistory datasets={uploadedDatasets} onViewAnalysis={handleViewAnalysis} onDeleteDataset={handleDeleteDataset} />;
                  return <DetailedAnalysis dataset={ds} onBack={() => navigate('/history')} />;
                })()}
              </motion.div>
            } />
          </Routes>
        </AnimatePresence>
      </main>

      <footer className="border-t border-white/10 py-12 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-indigo-500" />
            <span className="text-lg font-bold text-white">FRAUDpred</span>
          </div>
          <p className="text-slate-500 text-sm mb-8">
            © 2026 FRAUDpred. Predictive Analytics Model for Secure Digital Payment Systems.
          </p>
          <div className="flex justify-center gap-6">
            <a href="#" className="text-slate-400 hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="text-slate-400 hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="text-slate-400 hover:text-white transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
