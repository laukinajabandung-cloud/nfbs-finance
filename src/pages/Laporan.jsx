import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  FileText, Download, Filter, 
  Calendar, Building2, Search, Printer 
} from 'lucide-react';
import * as XLSX from 'xlsx';

const Laporan = () => {
  const [transactions, setTransactions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter States
  const [filterDept, setFilterDept] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const { data: deptData } = await supabase.from('departments').select('*').order('dept_code');
    if (deptData) setDepartments(deptData);
    handleFilter();
  };

  const handleFilter = async () => {
    setLoading(true);
    let query = supabase
      .from('transactions')
      .select('*, accounts(account_code, account_name)')
      .order('transaction_date', { ascending: false });

    if (filterDept !== 'all') {
      query = query.ilike('reference_no', `%/${filterDept}/%`);
    }

    if (startDate) query = query.gte('transaction_date', startDate);
    if (endDate) query = query.lte('transaction_date', endDate);

    const { data, error } = await query;
    if (data) setTransactions(data);
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const exportToExcel = () => {
    const reportData = transactions.map(t => ({
      'Tanggal': t.transaction_date,
      'No. Referensi': t.reference_no,
      'Departemen': t.reference_no.split('/')[2],
      'Kode Akun': t.accounts?.account_code,
      'Nama Akun': t.accounts?.account_name,
      'Keterangan': t.description,
      'Masuk (Rp)': t.debit,
      'Keluar (Rp)': t.credit
    }));

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Keuangan");
    XLSX.writeFile(wb, `Laporan_NFBS_${filterDept}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const formatIDR = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const filteredItems = transactions.filter(t => 
    t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.reference_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Perhitungan Saldo
  const totalMasuk = filteredItems.reduce((acc, t) => acc + (t.debit || 0), 0);
  const totalKeluar = filteredItems.reduce((acc, t) => acc + (t.credit || 0), 0);
  const saldoAkhir = totalMasuk - totalKeluar;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* HEADER SECTION - Sembunyi saat cetak */}
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-blue-600" /> Analisa & Laporan
          </h1>
          <p className="text-slate-500 text-sm">Rekapitulasi transaksi NFBS Lembang</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handlePrint}
            className="bg-slate-800 hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all"
          >
            <Printer size={18} /> Cetak PDF
          </button>
          <button 
            onClick={exportToExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all"
          >
            <Download size={18} /> Export Excel
          </button>
        </div>
      </div>

      {/* FILTER BAR - Sembunyi saat cetak */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end print:hidden">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Departemen</label>
          <select className="w-full p-2.5 border rounded-xl text-sm bg-slate-50" value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
            <option value="all">Semua Departemen</option>
            {departments.map(d => <option key={d.id} value={d.dept_code}>{d.dept_code} - {d.dept_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Dari Tanggal</label>
          <input type="date" className="w-full p-2.5 border rounded-xl text-sm bg-slate-50" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Sampai Tanggal</label>
          <input type="date" className="w-full p-2.5 border rounded-xl text-sm bg-slate-50" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <button onClick={handleFilter} className="bg-blue-600 text-white p-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-all">
          <Filter size={18} /> Tampilkan
        </button>
      </div>

      {/* AREA LAPORAN YANG DICETAK */}
      <div id="printable-area" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
        
        {/* Header Khusus Cetak */}
        <div className="hidden print:block p-8 border-b-2 border-slate-900 text-center">
          <h1 className="text-2xl font-black uppercase">Laporan Keuangan Yayasan</h1>
          <p className="text-sm font-bold uppercase tracking-widest mt-1">Nurul Fikri Boarding School Lembang</p>
          <div className="mt-4 flex justify-between text-[10px] uppercase font-bold text-slate-500">
            <span>Departemen: {filterDept}</span>
            <span>Periode: {startDate || '-'} s/d {endDate || '-'}</span>
          </div>
        </div>

        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 print:hidden">
          <h3 className="font-bold text-slate-700 text-sm">Rincian Transaksi ({filteredItems.length})</h3>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input 
              type="text" placeholder="Cari..." 
              className="pl-9 pr-4 py-2 border rounded-lg text-xs w-48 focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] print:bg-white print:border-b">
              <tr>
                <th className="px-6 py-4">Tanggal / Ref</th>
                <th className="px-6 py-4">Akun RAB</th>
                <th className="px-6 py-4">Keterangan</th>
                <th className="px-6 py-4 text-right">Debet</th>
                <th className="px-6 py-4 text-right">Kredit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors print:break-inside-avoid">
                  <td className="px-6 py-4">
                    <div className="font-bold">{t.transaction_date}</div>
                    <div className="text-[10px] text-blue-500 font-mono">{t.reference_no}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-600">{t.accounts?.account_code}</div>
                    <div className="text-[10px]">{t.accounts?.account_name}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{t.description}</td>
                  <td className="px-6 py-4 text-right font-bold text-green-600">{t.debit > 0 ? formatIDR(t.debit) : '-'}</td>
                  <td className="px-6 py-4 text-right font-bold text-red-600">{t.credit > 0 ? formatIDR(t.credit) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FOOTER TOTAL (Saldo) */}
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center print:bg-white print:text-black print:border-t-2 print:border-slate-900 print:mt-4">
          <div className="flex gap-8">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-1 print:text-slate-600">Pemasukan</p>
              <p className="text-lg font-black text-green-400 print:text-green-700">{formatIDR(totalMasuk)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-1 print:text-slate-600">Pengeluaran</p>
              <p className="text-lg font-black text-red-400 print:text-red-700">{formatIDR(totalKeluar)}</p>
            </div>
          </div>
          <div className="text-right border-l border-slate-700 pl-8 print:border-slate-300">
            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1 print:text-slate-600">Saldo Akhir</p>
            <p className="text-2xl font-black text-blue-400 print:text-blue-700">{formatIDR(saldoAkhir)}</p>
          </div>
        </div>

        {/* Tanda Tangan Khusus Cetak */}
        <div className="hidden print:grid grid-cols-2 gap-20 p-12 text-center text-xs font-bold uppercase">
          <div>
            <p>Mengetahui,</p>
            <div className="mt-16 border-t border-black pt-2">Bendahara Lembaga</div>
          </div>
          <div>
            <p>Bandung, {new Date().toLocaleDateString('id-ID')}</p>
            <div className="mt-16 border-t border-black pt-2">Petugas Administrasi</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Laporan;