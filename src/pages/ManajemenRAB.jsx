import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Search, BookOpen, Target, Activity, 
  ArrowDownCircle, Wallet, Info, ReceiptText, RefreshCcw
} from 'lucide-react';

const ManajemenRAB = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccId, setSelectedAccId] = useState('');
  const [detailData, setDetailData] = useState({
    info: null,
    transactions: [],
    stats: { totalRAB: 0, totalSerapan: 0, sisa: 0, persen: 0 }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    const { data, error } = await supabase.from('accounts').select('*').order('account_name');
    if (data) setAccounts(data);
  };

  const handleAccountSelect = async (id) => {
    if (!id) {
      setDetailData({ info: null, transactions: [], stats: { totalRAB: 0, totalSerapan: 0, sisa: 0, persen: 0 } });
      return;
    }
    
    setSelectedAccId(id);
    setLoading(true);
    
    try {
      // 1. Ambil data Akun terbaru dari DB (untuk memastikan Pagu terupdate)
      const { data: accData, error: accError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', id)
        .single();

      // 2. Ambil semua transaksi terkait akun ini
      const { data: trxs, error: trxError } = await supabase
        .from('transactions')
        .select('*')
        .eq('account_id', id)
        .order('transaction_date', { ascending: false });

      if (accData) {
        // Konversi ke angka untuk keamanan kalkulasi
        const pagu = Number(accData.initial_budget) || 0;
        const totalSerapan = trxs?.reduce((sum, t) => sum + (Number(t.credit) || 0), 0) || 0;
        const sisa = pagu - totalSerapan;
        const persen = pagu > 0 ? (totalSerapan / pagu) * 100 : 0;

        setDetailData({
          info: accData,
          transactions: trxs || [],
          stats: { totalRAB: pagu, totalSerapan, sisa, persen }
        });
      }
    } catch (err) {
      console.error("Detail Error:", err);
    } finally {
      // Kita beri sedikit delay 300ms agar transisi loading terasa smooth
      setTimeout(() => setLoading(false), 300);
    }
  };

  const formatIDR = (val) => new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR', 
    maximumFractionDigits: 0 
  }).format(val);

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
          <BookOpen className="text-blue-600" /> MONITORING ANGGARAN
        </h1>
        <p className="text-slate-500 text-sm font-medium italic">Data real-time serapan anggaran NFBS</p>
      </div>

      {/* Dropdown Pencarian */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-3 block tracking-widest">Pilih Pos Akun</label>
        <div className="relative">
          <Search className="absolute left-5 top-4 text-slate-400" size={20} />
          <select 
            className="w-full pl-14 pr-6 py-4 bg-slate-100 border-none rounded-2xl font-bold text-slate-700 appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500"
            value={selectedAccId}
            onChange={(e) => handleAccountSelect(e.target.value)}
          >
            <option value="">-- PILIH AKUN --</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.account_code} - {acc.account_name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
           <RefreshCcw className="text-blue-500 animate-spin mb-4" size={32} />
           <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">Mengambil Data...</p>
        </div>
      ) : detailData.info ? (
        <div className="space-y-8 animate-in fade-in duration-700">
          {/* Kartu Statistik */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-7 rounded-[2.5rem] border border-slate-200">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Pagu RAB</p>
              <h3 className="text-xl font-black text-slate-800">{formatIDR(detailData.stats.totalRAB)}</h3>
            </div>
            <div className="bg-white p-7 rounded-[2.5rem] border border-slate-200">
              <p className="text-[10px] font-black text-red-600 uppercase mb-2">Total Serapan</p>
              <h3 className="text-xl font-black text-red-600">{formatIDR(detailData.stats.totalSerapan)}</h3>
            </div>
            <div className={`p-7 rounded-[2.5rem] shadow-xl text-white ${detailData.stats.sisa < 0 ? 'bg-red-600' : 'bg-slate-900'}`}>
              <p className="text-[10px] font-black text-blue-300 uppercase mb-2">Sisa Saldo</p>
              <h3 className="text-2xl font-black">{formatIDR(detailData.stats.sisa)}</h3>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-5 font-black">
              <span className="text-xs uppercase text-slate-800">Persentase Serapan</span>
              <span className="text-blue-600">{detailData.stats.persen.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${detailData.stats.persen > 100 ? 'bg-red-500' : 'bg-blue-600'}`} 
                style={{ width: `${Math.min(detailData.stats.persen, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Tabel Riwayat */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-7 border-b border-slate-100 font-black text-xs uppercase text-slate-800 tracking-widest">
              Riwayat Transaksi: {detailData.info.account_name}
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-4">Tanggal</th>
                  <th className="px-8 py-4">Referensi</th>
                  <th className="px-8 py-4">Keterangan</th>
                  <th className="px-8 py-4 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detailData.transactions.map(t => (
                  <tr key={t.id} className="text-xs">
                    <td className="px-8 py-4 font-bold text-slate-500">{t.transaction_date}</td>
                    <td className="px-8 py-4 font-black text-blue-600 font-mono uppercase">{t.reference_no}</td>
                    <td className="px-8 py-4 text-slate-600 italic">{t.description}</td>
                    <td className="px-8 py-4 text-right font-black text-red-600">{formatIDR(t.credit || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center bg-slate-100 rounded-[2.5rem] border-2 border-dashed border-slate-200">
           <Info className="text-slate-300 mb-2" size={32} />
           <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Silakan pilih akun untuk melihat sisa saldo</p>
        </div>
      )}
    </div>
  );
};

export default ManajemenRAB;