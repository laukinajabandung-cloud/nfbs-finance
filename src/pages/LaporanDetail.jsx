import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import * as XLSX from 'xlsx'; // Pastikan sudah install: npm install xlsx
import { 
  FileText, Search, Printer, 
  Loader2, Download, Calendar, 
  Filter
} from 'lucide-react';

const LaporanDetail = () => {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filter, setFilter] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    accountId: '',
    deptCode: ''
  });

  useEffect(() => {
    fetchInitialData();
    handleFetchLaporan();
  }, []);

  const fetchInitialData = async () => {
    const { data: acc } = await supabase.from('accounts').select('*').order('account_code');
    const { data: dept } = await supabase.from('departments').select('*').order('dept_code');
    if (acc) setAccounts(acc);
    if (dept) setDepartments(dept);
  };

  const handleFetchLaporan = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .select('*, accounts(account_name, account_code)')
        .gte('transaction_date', filter.startDate)
        .lte('transaction_date', filter.endDate)
        .order('transaction_date', { ascending: true });

      if (filter.accountId) query = query.eq('account_id', filter.accountId);
      if (filter.deptCode) query = query.ilike('reference_no', `%/${filter.deptCode}/%`);

      const { data, error } = await query;
      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error("Gagal tarik laporan:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // FUNGSI EXPORT EXCEL
  const exportToExcel = () => {
    if (transactions.length === 0) {
      alert("Tidak ada data untuk di-export");
      return;
    }

    const dataUntukExcel = transactions.map((t, index) => ({
      "No": index + 1,
      "Tanggal": t.transaction_date,
      "No. Referensi": t.reference_no,
      "Kode Akun": t.accounts?.account_code,
      "Nama Akun": t.accounts?.account_name,
      "Keterangan": t.description,
      "Debit (M)": t.debit || 0,
      "Kredit (K)": t.credit || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataUntukExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Transaksi");

    const fileName = `Laporan_NFBS_${filter.startDate}_sd_${filter.endDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const formatIDR = (val) => new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR', 
    maximumFractionDigits: 0 
  }).format(val);

  const totalDebit = transactions.reduce((sum, t) => sum + (Number(t.debit) || 0), 0);
  const totalCredit = transactions.reduce((sum, t) => sum + (Number(t.credit) || 0), 0);

  const today = new Date().toLocaleDateString('id-ID', { 
    day: 'numeric', month: 'long', year: 'numeric' 
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 bg-white min-h-screen">
      {/* CSS MASTER CONTROL UNTUK CETAK */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hilangkan semua elemen UI kecuali area printable */
          body * { visibility: hidden; }
          .printable-area, .printable-area * { visibility: visible; }
          
          .printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          @page { 
            size: A4 landscape; 
            margin: 15mm; 
          }

          /* Force colors & images */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

          /* Header tabel muncul lagi di tiap halaman */
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }

          /* Cegah pemotongan baris di tengah */
          tr { page-break-inside: avoid; }
          
          table { width: 100% !important; border-collapse: collapse !important; border: 1px solid black !important; }
          th { 
            border: 1px solid black !important; 
            padding: 10px !important; 
            text-align: center !important; 
            vertical-align: middle !important;
            background-color: #f8fafc !important;
            font-size: 9pt !important;
          }
          td { border: 1px solid black !important; padding: 8px !important; font-size: 9pt !important; }
          
          .print-hidden { display: none !important; }
        }
        .print-only { display: none; }
        @media print { .print-only { display: block; } }
      `}} />

      {/* HEADER TAMPILAN WEB */}
      <div className="flex justify-between items-end print-hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <FileText className="text-blue-600" /> LAPORAN DETAIL TRANSAKSI
          </h1>
          <p className="text-slate-500 text-sm font-medium italic">Nurul Fikri Boarding School Lembang</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={exportToExcel} 
            className="bg-green-600 text-white px-6 py-3 rounded-2xl text-xs font-black flex items-center gap-2 hover:bg-green-700 transition-all shadow-lg active:scale-95"
          >
            <Download size={18} /> EXCEL
          </button>
          <button 
            onClick={() => window.print()} 
            className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black flex items-center gap-2 hover:bg-blue-600 transition-all shadow-xl active:scale-95"
          >
            <Printer size={18} /> CETAK
          </button>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-slate-50 p-7 rounded-[2.5rem] border border-slate-200 print-hidden grid grid-cols-1 md:grid-cols-5 gap-4 items-end shadow-sm">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block ml-2">Mulai</label>
          <input type="date" className="w-full p-2.5 border rounded-xl text-sm font-bold text-slate-700 bg-white" value={filter.startDate} onChange={e => setFilter({...filter, startDate: e.target.value})} />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block ml-2">Sampai</label>
          <input type="date" className="w-full p-2.5 border rounded-xl text-sm font-bold text-slate-700 bg-white" value={filter.endDate} onChange={e => setFilter({...filter, endDate: e.target.value})} />
        </div>
        <div className="md:col-span-2 flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block ml-2">Unit</label>
              <select className="w-full p-2.5 border rounded-xl text-sm bg-white font-bold text-slate-700" value={filter.deptCode} onChange={e => setFilter({...filter, deptCode: e.target.value})}>
                <option value="">Semua Unit</option>
                {departments.map(d => <option key={d.id} value={d.dept_code}>{d.dept_name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block ml-2">Akun</label>
              <select className="w-full p-2.5 border rounded-xl text-sm bg-white font-bold text-slate-700" value={filter.accountId} onChange={e => setFilter({...filter, accountId: e.target.value})}>
                <option value="">Semua Akun</option>
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.account_code} - {acc.account_name}</option>)}
              </select>
            </div>
        </div>
        <button 
          onClick={handleFetchLaporan} 
          disabled={loading}
          className="bg-blue-600 text-white p-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all flex justify-center items-center gap-2 shadow-md shadow-blue-100"
        >
          {loading ? <Loader2 className="animate-spin" size={16}/> : <Search size={16}/>}
          Tampilkan
        </button>
      </div>

      {/* AREA UTAMA (BISA DICETAK) */}
      <div className="printable-area">
        
        {/* KOP SURAT CETAK */}
        <div className="hidden print:block mb-8 border-b-[3px] border-double border-slate-900 pb-5">
           <div className="flex items-center justify-center gap-8 px-10">
              <img 
                src="https://i.ibb.co.com/Q0Tfwcz/logo.png" 
                alt="Logo NFBS" 
                className="w-22 h-22 object-contain"
              />
              <div className="text-center">
                <h1 className="text-2xl font-black uppercase text-slate-900 tracking-tight leading-none">Nurul Fikri Boarding School Lembang</h1>
                <p className="text-[10px] font-medium text-slate-600 italic mt-1">Jl. Maribaya No.1, Cibodas, Kec. Lembang, Kabupaten Bandung Barat, Jawa Barat 40391</p>
                <div className="mt-3 py-1 bg-slate-900 text-white rounded-md">
                   <h2 className="text-sm font-bold uppercase tracking-[0.2em]">Laporan Rincian Transaksi Keuangan</h2>
                </div>
                <p className="text-[10px] font-bold mt-2 text-slate-800 uppercase">Periode: {filter.startDate} s/d {filter.endDate}</p>
              </div>
           </div>
        </div>

        {/* TABEL DATA */}
        <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden print:border-none print:rounded-none">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-[9px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-4 py-4 text-center border">Tanggal</th>
                <th className="px-4 py-4 text-center border">No. Referensi</th>
                <th className="px-4 py-4 text-center border">Akun & Keterangan</th>
                <th className="px-4 py-4 text-center w-36 border">Debit (M)</th>
                <th className="px-4 py-4 text-center w-36 border">Kredit (K)</th>
              </tr>
            </thead>
            <tbody className="text-[10px]">
              {transactions.length > 0 ? (
                transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 text-center border font-bold text-slate-500 whitespace-nowrap">{t.transaction_date}</td>
                    <td className="px-4 py-3 font-mono text-blue-700 font-bold border text-center text-[9px] uppercase">{t.reference_no}</td>
                    <td className="px-4 py-3 border">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 uppercase leading-tight">{t.accounts?.account_name}</span>
                        <span className="text-slate-500 italic text-[9px] mt-1">{t.description}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-green-600 border">{t.debit > 0 ? formatIDR(t.debit) : '-'}</td>
                    <td className="px-4 py-3 text-right font-black text-red-600 border">{t.credit > 0 ? formatIDR(t.credit) : '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-20 text-slate-400 font-bold italic border tracking-[0.2em]">Data tidak ditemukan.</td>
                </tr>
              )}
            </tbody>
            {transactions.length > 0 && (
              <tfoot className="bg-slate-900 text-white font-black print:text-black print:bg-slate-100">
                <tr>
                  <td colSpan="3" className="px-6 py-4 text-center uppercase text-[10px] tracking-widest border">Total Akumulasi Periode</td>
                  <td className="px-4 py-4 text-right border text-green-500 print:text-green-700">{formatIDR(totalDebit)}</td>
                  <td className="px-4 py-4 text-right border text-red-500 print:text-red-700">{formatIDR(totalCredit)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* AREA TANDA TANGAN */}
        <div className="hidden print:block mt-16">
          <div className="flex justify-between px-20 text-[11pt]">
            <div className="text-center w-80">
              <p className="mb-2">Mengetahui,</p>
              <p className="font-black uppercase tracking-wider">Pimpinan NFBS Lembang</p>
              <div className="h-28"></div>
              <p className="font-black underline uppercase">( ........................................ )</p>
            </div>
            
            <div className="text-center w-80">
              <p className="mb-2 text-slate-500">Lembang, {today}</p>
              <p className="font-black uppercase tracking-wider">Bendahara</p>
              <div className="h-28"></div>
              <p className="font-black underline uppercase">Deudeun Muhtar</p>
              <p className="text-[9pt] font-medium text-slate-500 italic">Administrator Keuangan</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LaporanDetail;