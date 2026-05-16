import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  ArrowLeftRight, Plus, Search, 
  AlertCircle, Edit2, Trash2, 
  CheckCircle2, Hash, RefreshCw, Save
} from 'lucide-react';

const Transaksi = () => {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    id: null,
    transaction_date: new Date().toISOString().split('T')[0],
    reference_no: '',
    account_id: '',
    description: '',
    debit: 0,
    credit: 0,
    dept_code: '' 
  });

  const [budgetInfo, setBudgetInfo] = useState({ name: '', pagu: 0, sisa: 0, status: '' });

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Perbaikan: Pastikan Auto-Ref hanya berjalan jika form bukan dalam mode EDIT
  useEffect(() => {
    if (!formData.id && formData.dept_code && (formData.debit > 0 || formData.credit > 0)) {
      generateAutoRef();
    }
  }, [formData.transaction_date, formData.dept_code, formData.debit, formData.credit]);

  useEffect(() => {
    if (formData.account_id) {
      calculateLiveBudget();
    }
  }, [formData.credit, formData.account_id]);

  const fetchInitialData = async () => {
    setLoading(true);
    const { data: acc } = await supabase.from('accounts').select('*');
    const { data: dept } = await supabase.from('departments').select('*');
    const { data: trans } = await supabase
      .from('transactions')
      .select('*, accounts(account_name, account_code)')
      .order('transaction_date', { ascending: false })
      .order('id', { ascending: false })
      .limit(15);

    if (acc) setAccounts(acc);
    if (dept) setDepartments(dept);
    if (trans) setTransactions(trans);
    setLoading(false);
  };

  const calculateLiveBudget = async () => {
    const selectedAcc = accounts.find(a => a.id === parseInt(formData.account_id));
    if (!selectedAcc) return;

    const { data: totalUsed } = await supabase
      .from('transactions')
      .select('credit')
      .eq('account_id', formData.account_id);

    const totalSpent = totalUsed?.reduce((sum, t) => sum + (t.credit || 0), 0) || 0;
    const sisaSaatIni = selectedAcc.initial_budget - totalSpent;
    const nominalInput = formData.credit || 0;

    let status = 'safe';
    if (nominalInput > sisaSaatIni) status = 'danger';
    else if (nominalInput > sisaSaatIni * 0.8) status = 'warning';

    setBudgetInfo({
      name: selectedAcc.account_name,
      pagu: selectedAcc.initial_budget,
      sisa: sisaSaatIni,
      status: status
    });
  };

  // LOGIKA BARU: Lebih akurat menghitung nomor urut agar tidak bentrok
  const generateAutoRef = async () => {
    const isDebit = formData.debit > 0;
    const type = isDebit ? 'BKM' : 'BKK';
    const date = new Date(formData.transaction_date);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const firstDay = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const lastDay = new Date(year, month, 0).toISOString().split('T')[0];

    // Ambil data nomor urut terakhir yang BENAR-BENAR ada di database bulan ini
    const { data: existingTrx } = await supabase
      .from('transactions')
      .select('reference_no')
      .gte('transaction_date', firstDay)
      .lte('transaction_date', lastDay)
      .ilike('reference_no', `${type}/%`);

    let nextNumber = 1;
    if (existingTrx && existingTrx.length > 0) {
      // Cari angka tertinggi dari nomor referensi yang ada
      const numbers = existingTrx.map(t => {
        const parts = t.reference_no.split('/');
        return parseInt(parts[1]) || 0;
      });
      nextNumber = Math.max(...numbers) + 1;
    }

    const nextNumberStr = String(nextNumber).padStart(3, '0');
    const romanMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
    const dept = formData.dept_code || 'UMUM';
    
    const autoNo = `${type}/${nextNumberStr}/${dept}/${romanMonths[month-1]}/${year}`;
    setFormData(prev => ({ ...prev, reference_no: autoNo }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (formData.credit > budgetInfo.sisa && !formData.id) {
      const confirm = window.confirm(`⚠️ DANA TIDAK CUKUP!\nSisa RAB: ${formatIDR(budgetInfo.sisa)}\nInput: ${formatIDR(formData.credit)}\n\nTetap paksa simpan?`);
      if (!confirm) return;
    }

    const payload = { ...formData };
    const id = payload.id;
    delete payload.id;
    delete payload.dept_code; 

    const result = id 
      ? await supabase.from('transactions').update(payload).eq('id', id)
      : await supabase.from('transactions').insert([payload]);

    if (!result.error) {
      resetForm();
      fetchInitialData();
      alert("Transaksi Berhasil Dicatat!");
    } else {
      if (result.error.code === '23505') {
        alert("Gagal: Nomor Referensi sudah terpakai. Silakan klik tombol 'Sync' di dekat No. Referensi untuk memperbarui nomor.");
      } else {
        alert("Error: " + result.error.message);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      id: null,
      transaction_date: new Date().toISOString().split('T')[0],
      reference_no: '',
      account_id: '',
      description: '',
      debit: 0,
      credit: 0,
      dept_code: ''
    });
    setBudgetInfo({ name: '', pagu: 0, sisa: 0, status: '' });
  };

  const formatIDR = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const handleDelete = async (id) => {
    if (window.confirm("Hapus catatan transaksi ini? Tindakan ini tidak bisa dibatalkan.")) {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (!error) fetchInitialData();
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2 uppercase tracking-tighter">
          <ArrowLeftRight className="text-blue-600" /> Arus Kas & Validasi RAB
        </h1>
        <p className="text-slate-500 text-sm font-medium italic">Manajemen BKM/BKK Otomatis NFBS Lembang</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5">
          <form onSubmit={handleSave} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-5 sticky top-8">
            <h2 className="font-black text-slate-700 flex items-center gap-2 mb-2 uppercase text-[10px] tracking-widest">
              <Plus size={16} className="text-blue-500" /> {formData.id ? 'Edit Data Transaksi' : 'Input Transaksi Baru'}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Tanggal</label>
                <input required type="date" className="w-full p-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700" value={formData.transaction_date} onChange={e => setFormData({...formData, transaction_date: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Unit Kerja</label>
                <select required className="w-full p-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700" value={formData.dept_code} onChange={e => setFormData({...formData, dept_code: e.target.value})}>
                  <option value="">Pilih...</option>
                  {departments.map(d => <option key={d.id} value={d.dept_code}>{d.dept_name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex justify-between">
                <span>No. Referensi (Otomatis)</span>
                <button type="button" onClick={generateAutoRef} className="text-blue-600 font-bold flex items-center gap-1 hover:underline"><RefreshCw size={10} /> Sync</button>
              </label>
              <input required className="w-full p-3 bg-blue-50 border-none rounded-2xl text-xs font-black text-blue-700 tracking-wider" value={formData.reference_no} readOnly />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Pilih Akun RAB</label>
              <select required className="w-full p-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700" value={formData.account_id} onChange={e => setFormData({...formData, account_id: e.target.value})}>
                <option value="">-- Pilih Akun --</option>
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.account_code} - {acc.account_name}</option>)}
              </select>
              
              {budgetInfo.name && (
                <div className={`mt-3 p-4 rounded-2xl border-l-4 shadow-sm ${budgetInfo.status === 'danger' ? 'bg-red-50 border-red-500' : budgetInfo.status === 'warning' ? 'bg-orange-50 border-orange-500' : 'bg-green-50 border-green-500'}`}>
                  <p className="text-[9px] font-black text-slate-500 uppercase">Sisa RAB Aktif</p>
                  <p className={`text-lg font-black ${budgetInfo.status === 'danger' ? 'text-red-600' : 'text-slate-800'}`}>
                    {formatIDR(budgetInfo.sisa)}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Deskripsi</label>
              <textarea required className="w-full p-3 bg-slate-50 border-none rounded-2xl text-sm font-medium text-slate-600" rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Contoh: Pembelian tinta printer..."></textarea>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-2xl">
                <label className="text-[9px] font-black text-blue-600 uppercase mb-1 block">Uang Masuk</label>
                <input type="number" className="w-full bg-transparent text-xl font-black text-blue-700 outline-none" value={formData.debit} onChange={e => setFormData({...formData, debit: parseFloat(e.target.value) || 0, credit: 0})} />
              </div>
              <div className="bg-red-50 p-4 rounded-2xl">
                <label className="text-[9px] font-black text-red-600 uppercase mb-1 block">Uang Keluar</label>
                <input type="number" className="w-full bg-transparent text-xl font-black text-red-700 outline-none" value={formData.credit} onChange={e => setFormData({...formData, credit: parseFloat(e.target.value) || 0, debit: 0})} />
              </div>
            </div>

            <div className="flex gap-2">
              {formData.id && (
                <button type="button" onClick={resetForm} className="flex-1 bg-slate-200 text-slate-700 py-4 rounded-2xl font-black uppercase tracking-widest text-xs">Batal</button>
              )}
              <button type="submit" className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl flex items-center justify-center gap-2">
                <Save size={18} /> {formData.id ? 'Update' : 'Simpan'} Transaksi
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-white">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Riwayat Transaksi Terbaru</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[9px] tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Info Transaksi</th>
                    <th className="px-6 py-4 text-right">Debit</th>
                    <th className="px-6 py-4 text-right">Kredit</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {transactions.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-black text-slate-700 text-xs">{new Date(t.transaction_date).toLocaleDateString('id-ID')}</div>
                        <div className="text-[10px] text-blue-500 font-black font-mono mt-0.5">{t.reference_no}</div>
                        <div className="text-[10px] text-slate-400 font-medium italic mt-1 line-clamp-1">{t.description}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-blue-600 font-black text-xs">{t.debit > 0 ? formatIDR(t.debit) : '-'}</td>
                      <td className="px-6 py-4 text-right text-red-600 font-black text-xs">{t.credit > 0 ? formatIDR(t.credit) : '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => {
                            setFormData({...t, dept_code: t.reference_no.split('/')[2]});
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }} className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl"><Edit2 size={14} /></button>
                          <button onClick={() => handleDelete(t.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-xl"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transaksi;