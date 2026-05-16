import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area 
} from 'recharts';
import { 
  ArrowDownCircle, ArrowUpCircle, Wallet, TrendingUp, 
  PieChart as PieIcon, BarChart3, AlertTriangle, Landmark, 
  Gauge, Coins, ClipboardCheck 
} from 'lucide-react';

const Dashboard = () => {
  // --- STATE MANAGEMENT ---
  const [summary, setSummary] = useState({ totalMasuk: 0, totalKeluar: 0, saldo: 0 });
  const [budgetSummary, setBudgetSummary] = useState({ totalRAB: 0, totalSerapan: 0, sisaRAB: 0, persenSerapan: 0 });
  const [evaluationAlerts, setEvaluationAlerts] = useState([]);
  const [periode, setPeriode] = useState('bulanan');
  const [chartData, setChartData] = useState({ barData: [], pieData: [], periodicData: [], rabVsSerapanData: [] });
  const [loading, setLoading] = useState(true);

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

  useEffect(() => {
    fetchDashboardData();
  }, [periode]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [trxResponse, accResponse] = await Promise.all([
        supabase.from('transactions').select('*, accounts(id, account_name, account_code, initial_budget)').order('transaction_date', { ascending: true }),
        supabase.from('accounts').select('*').order('account_code')
      ]);

      if (trxResponse.error) throw trxResponse.error;
      if (accResponse.error) throw accResponse.error;

      const data = trxResponse.data || [];
      const accounts = accResponse.data || [];

      if (data) {
        const masuk = data.reduce((sum, t) => sum + (t.debit || 0), 0);
        const keluar = data.reduce((sum, t) => sum + (t.credit || 0), 0);
        const totalRAB = accounts.reduce((sum, acc) => sum + (acc.initial_budget || 0), 0);
        
        setSummary({ totalMasuk: masuk, totalKeluar: keluar, saldo: masuk - keluar });
        setBudgetSummary({ totalRAB, totalSerapan: keluar, sisaRAB: totalRAB - keluar, persenSerapan: totalRAB > 0 ? (keluar / totalRAB) * 100 : 0 });

        const allAlerts = accounts
          .map(acc => {
            const realisasi = data.filter(t => t.account_id === acc.id).reduce((sum, t) => sum + (t.credit || 0), 0);
            const persen = acc.initial_budget > 0 ? (realisasi / acc.initial_budget) * 100 : 0;
            return { 
              name: acc.account_name, 
              realisasi, 
              budget: acc.initial_budget, 
              persen, 
              over: persen > 100 ? persen - 100 : 0 
            };
          })
          .filter(item => item.persen >= 90)
          .sort((a, b) => b.persen - a.persen);
        
        setEvaluationAlerts(allAlerts);

        const unitMap = {};
        data.filter(t => t.credit > 0).forEach(t => {
          const unit = t.reference_no?.split('/')[2] || 'LAINNYA';
          unitMap[unit] = (unitMap[unit] || 0) + t.credit;
        });

        const trenMap = {};
        data.forEach(t => {
          const date = new Date(t.transaction_date);
          let label = date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
          if (!trenMap[label]) trenMap[label] = { label, masuk: 0, keluar: 0 };
          trenMap[label].masuk += (t.debit || 0);
          trenMap[label].keluar += (t.credit || 0);
        });

        setChartData({ 
          barData: [], 
          pieData: Object.keys(unitMap).map(key => ({ name: key, value: unitMap[key] })), 
          periodicData: Object.values(trenMap), 
          rabVsSerapanData: allAlerts.slice(0, 5) 
        });
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const formatIDR = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  if (loading) return <div className="p-8 text-center font-black text-slate-400 animate-pulse">MEMPROSES DATA NFBS...</div>;

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      {/* SECTION 1: RINGKASAN KAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-blue-600 uppercase mb-2">Total Pemasukan</p>
          <h3 className="text-xl font-black text-slate-800">{formatIDR(summary.totalMasuk)}</h3>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-red-600 uppercase mb-2">Total Pengeluaran</p>
          <h3 className="text-xl font-black text-slate-800">{formatIDR(summary.totalKeluar)}</h3>
        </div>
        <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl">
          <p className="text-[10px] font-black text-blue-400 uppercase mb-2">Saldo Aktif</p>
          <h3 className="text-2xl font-black">{formatIDR(summary.saldo)}</h3>
        </div>
      </div>

      {/* SECTION 2: RINGKASAN ANGGARAN (RAB) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase mb-1 flex items-center gap-2"><Landmark size={12}/> Total RAB</p>
          <h4 className="text-sm font-black text-slate-700">{formatIDR(budgetSummary.totalRAB)}</h4>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-black text-blue-600 uppercase mb-1 flex items-center gap-2"><Gauge size={12}/> Serapan</p>
          <h4 className="text-sm font-black text-blue-600">{formatIDR(budgetSummary.totalSerapan)}</h4>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-black text-green-600 uppercase mb-1 flex items-center gap-2"><Coins size={12}/> Sisa RAB</p>
          <h4 className="text-sm font-black text-green-600">{formatIDR(budgetSummary.sisaRAB)}</h4>
        </div>
        <div className="bg-blue-600 p-5 rounded-3xl text-white flex items-center justify-between shadow-md">
            <div className="flex-1 bg-blue-800 h-2 rounded-full overflow-hidden mr-3">
                <div className="bg-white h-full transition-all duration-1000" style={{ width: `${budgetSummary.persenSerapan}%` }}></div>
            </div>
            <span className="text-[10px] font-black">{budgetSummary.persenSerapan.toFixed(1)}%</span>
        </div>
      </div>

      {/* SECTION 3: PANEL EVALUASI */}
      <div className="bg-white p-8 rounded-[2.5rem] border-2 border-red-50 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle size={20} className="text-red-500"/>
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Catatan Evaluasi Anggaran</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {evaluationAlerts.length > 0 ? (
            evaluationAlerts.map((alert, i) => (
              <div key={i} className={`p-4 rounded-2xl border-l-4 flex justify-between items-center ${alert.persen > 100 ? 'bg-red-50 border-red-500' : 'bg-orange-50 border-orange-400'}`}>
                <div>
                  <p className="text-xs font-black text-slate-800 uppercase">{alert.name}</p>
                  <p className={`text-[10px] font-bold italic mt-1 ${alert.persen > 100 ? 'text-red-600' : 'text-orange-600'}`}>
                    {alert.persen > 100 
                      ? `⚠️ Melebihi Pagu RAB sebesar ${alert.over.toFixed(1)}%` 
                      : '💡 Serapan Kritis (Segera Efisiensi)'}
                  </p>
                </div>
                <div className="text-right flex flex-col">
                  <span className={`text-sm font-black ${alert.persen > 100 ? 'text-red-600' : 'text-orange-600'}`}>{alert.persen.toFixed(1)}%</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Serapan</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 p-6 bg-green-50 rounded-2xl border border-green-100 flex items-center gap-4">
              <ClipboardCheck className="text-green-600" />
              <p className="text-xs font-bold text-green-700 uppercase">Seluruh pos anggaran dalam batas aman.</p>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: GRAFIK-GRAFIK */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* TREN AREA CHART */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 md:col-span-2 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2"><TrendingUp size={16} className="text-blue-600"/> Tren Arus Kas</h4>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {['pekanan', 'bulanan', 'semesteran', 'tahunan'].map((p) => (
                <button key={p} onClick={() => setPeriode(p)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${periode === p ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>{p}</button>
              ))}
            </div>
          </div>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.periodicData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="masuk" name="Masuk" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={3} />
                <Area type="monotone" dataKey="keluar" name="Keluar" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PROPORSI UNIT */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <h4 className="text-xs font-black text-slate-800 mb-8 uppercase tracking-widest flex items-center justify-center gap-2">
            <PieIcon size={16} className="text-blue-600"/> Proporsi Biaya Unit
          </h4>
          <div className="w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData.pieData} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                  {chartData.pieData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5 AKUN SERAPAN TERTINGGI (FIXED VERSION) */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <h4 className="text-xs font-black text-slate-800 mb-8 uppercase tracking-widest flex items-center justify-center gap-2">
            <BarChart3 size={16} className="text-blue-600"/> 5 Akun Serapan Tertinggi
          </h4>
          <div className="w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.rabVsSerapanData} layout="vertical" margin={{ left: 5, right: 30, top: 20, bottom: 20 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={140} 
                  tick={{fontSize: 9, fontWeight: 'bold', fill: '#64748b'}} 
                  axisLine={false} 
                  tickLine={false}
                />
                <Tooltip formatter={(val) => formatIDR(val)} />
                <Bar dataKey="realisasi" name="Serapan" radius={[0, 10, 10, 0]} barSize={15}>
                  {chartData.rabVsSerapanData.map((entry, index) => (
                    <Cell key={index} fill={entry.persen > 100 ? '#ef4444' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;