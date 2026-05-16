import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { FileCheck, Printer, Loader2 } from 'lucide-react';

const Lpu = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAcc, setSelectedAcc] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [pjKegiatan, setPjKegiatan] = useState('');
  const [namaKegiatanManual, setNamaKegiatanManual] = useState('');
  const [feedbackAccounting, setFeedbackAccounting] = useState('');
  
  // State untuk melacak perubahan pilihan Nota dan teks Keterangan per baris transaksi
  const [rowDetails, setRowDetails] = useState({});

  // 1. Mengambil daftar akun saat pertama kali komponen dimuat
  useEffect(() => {
    const fetchAccounts = async () => {
      const { data } = await supabase.from('accounts').select('*').order('account_code');
      if (data) setAccounts(data);
    };
    fetchAccounts();
  }, []);

  // 2. OTOMATIS mendeteksi perubahan dropdown Akun untuk mengambil data transaksi (UUID String)
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!selectedAcc) {
        setTransactions([]);
        return;
      }
      
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('account_id', selectedAcc)
        .order('transaction_date', { ascending: true });
      
      if (!error && data) {
        setTransactions(data);
        
        // Inisialisasi status awal dropdown Nota & Keterangan untuk tiap transaksi BKK
        const initialDetails = {};
        data.forEach(t => {
          if (Number(t.credit) > 0) {
            initialDetails[t.id] = {
              nota: 'Ada Bukti',
              ket: ''
            };
          }
        });
        setRowDetails(initialDetails);
      }
      setLoading(false);
    };
    fetchTransactions();
  }, [selectedAcc]);

  // Sinkronisasi data akun aktif berdasarkan selectedAcc (UUID String)
  const activeAcc = accounts.find(a => String(a.id) === String(selectedAcc));

  // Menghitung Tahun Pelajaran (TP) otomatis berdasarkan waktu berjalan saat ini
  const masehiNow = new Date();
  const currentMonth = masehiNow.getMonth(); // 0 = Januari, 6 = Juli
  const currentYear = masehiNow.getFullYear();
  let tahunPelajaran = "";
  if (currentMonth >= 6) {
    tahunPelajaran = `TP. ${currentYear}/${currentYear + 1}`;
  } else {
    tahunPelajaran = `TP. ${currentYear - 1}/${currentYear}`;
  }

  // Filter Data Keuangan untuk Tabel I & II
  const dataBkm = transactions.filter(t => Number(t.debit) > 0); 
  const totalBkm = dataBkm.reduce((sum, t) => sum + Number(t.debit || 0), 0);
  
  const dataBkk = transactions.filter(t => Number(t.credit) > 0);
  const totalBkk = dataBkk.reduce((sum, t) => sum + Number(t.credit || 0), 0);
  
  const selisih = totalBkm - totalBkk;

  // Fungsi pengubah dropdown Nota & pengisian otomatis teks Keterangan
  const handleNotaChange = (id, value) => {
    setRowDetails(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        nota: value,
        ket: value === 'Tidak Ada' ? '(Tidak Ada Kwitansi/Nota)' : ''
      }
    }));
  };

  const handleKeteranganChange = (id, value) => {
    setRowDetails(prev => ({
      ...prev,
      [id]: { ...prev[id], ket: value }
    }));
  };

  const formatIDR = (val) => Number(val).toLocaleString('id-ID');

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 bg-white min-h-screen">
      {/* STYLE CONFIG CETAK (A4 Portrait) - PERBAIKAN GARIS TABEL */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Reset Border untuk Web View agar rapi */
        .lpu-table {
          border-collapse: collapse !important;
          width: 100%;
        }
        .lpu-table th, .lpu-table td {
          border: 1px solid black !important;
        }
        
        @media print {
          body * { visibility: hidden; }
          .printable-lpu, .printable-lpu * { visibility: visible; }
          .printable-lpu { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
          .print-hidden { display: none !important; }
          @page { size: A4 portrait; margin: 12mm; }
          
          /* Memastikan ketebalan garis sama rata 1px solid black */
          table { border-collapse: collapse !important; width: 100% !important; border: 1px solid black !important; margin-bottom: 0px; }
          th, td { border: 1px solid black !important; padding: 5px 8px !important; font-size: 8.5pt !important; box-sizing: border-box; }
          
          /* Supaya input dan select tidak merusak atau menebalkan garis */
          select, input, textarea { border: none !important; background: transparent !important; outline: none !important; appearance: none; -webkit-appearance: none; padding: 0 !important; width: 100%; }
          .no-print-bg { background-color: transparent !important; }
        }
      `}} />

      {/* PANEL KONTROL WEB (Hidden on Print) */}
      <div className="print-hidden space-y-6 bg-slate-50 p-6 md:p-8 rounded-[2.5rem] border-2 border-blue-100 shadow-md">
        <h1 className="text-xl font-black text-slate-800 flex items-center gap-2 uppercase tracking-tighter">
          <FileCheck className="text-blue-600" /> Form Penyelesaian Uang (LPU)
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Pilih Akun Anggaran</label>
            <select 
              className="w-full p-4 bg-white border-2 border-blue-100 rounded-2xl font-bold text-blue-700 outline-none focus:border-blue-500 shadow-sm transition-all"
              value={selectedAcc}
              onChange={(e) => setSelectedAcc(e.target.value)}
            >
              <option value="">-- PILIH AKUN --</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.account_code} - {acc.account_name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">PJ Kegiatan</label>
            <input type="text" className="w-full p-4 bg-white border-2 border-blue-100 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all text-slate-700" value={pjKegiatan} onChange={(e) => setPjKegiatan(e.target.value)} placeholder="Contoh: Efrika Ayu Vegawati, S.Psi" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Detail Nama Kegiatan</label>
            <input type="text" className="w-full p-4 bg-white border-2 border-blue-100 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all text-slate-700" value={namaKegiatanManual} onChange={(e) => setNamaKegiatanManual(e.target.value)} placeholder="Contoh: Cetak Buku Saku SDM / Pelatihan Guru" />
          </div>
        </div>

        <button 
          onClick={() => window.print()} 
          disabled={!selectedAcc || loading}
          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase flex items-center justify-center gap-3 shadow-lg hover:bg-blue-600 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Printer size={20} />}
          Cetak Dokumen LPU
        </button>
      </div>

      {/* AREA DOKUMEN CETAK LPU */}
      <div className="printable-lpu bg-white p-2">
        {/* KOP SURAT STRUKTUR YAYASAN */}
        <div className="flex items-start gap-4 border-b-2 border-black pb-2 mb-4">
          <img src="https://i.ibb.co.com/Q0Tfwcz/logo.png" alt="Logo NFBS" className="w-18 h-18 object-contain" />
          <div className="flex-1 text-center pr-12">
            <h2 className="text-[11pt] font-bold uppercase leading-tight">Yayasan Pesantren Pendidikan Islam Madani</h2>
            <h3 className="text-[11pt] font-bold uppercase leading-tight">Nurul Fikri Boarding School Lembang</h3>
            <h3 className="text-[10pt] font-bold uppercase leading-tight italic text-slate-700">Human Resource Departement</h3>
            <h3 className="text-[11pt] font-bold uppercase underline leading-tight mt-1">Laporan Penyelesaian Uang</h3>
            <p className="text-[9pt] font-bold text-blue-900 tracking-wider">{tahunPelajaran}</p>
          </div>
        </div>

        {/* METADATA INFORMASI (AUTOMATED) */}
        <div className="text-[9pt] mb-4 space-y-0.5 font-medium text-slate-800">
          <div className="flex"><span className="w-40">Bendahara</span><span>: Deudeun Muhtar K., S.Pd.I</span></div>
          <div className="flex"><span className="w-40">PJ Kegiatan</span><span>: {pjKegiatan || '................................................'}</span></div>
          <div className="flex"><span className="w-40">Kegiatan</span><span>: {namaKegiatanManual || '................................................'}</span></div>
          <div className="flex font-bold uppercase"><span className="w-40">Mata Anggaran</span><span>: {activeAcc ? activeAcc.account_code : '................................................'}</span></div>
          <div className="flex font-bold uppercase"><span className="w-40">Program Kegiatan</span><span>: {activeAcc ? activeAcc.account_name : '................................................'}</span></div>
        </div>

        {/* TABEL I: ANGGARAN & BUKTI KAS */}
        <table className="lpu-table">
          <thead>
            <tr className="bg-[#E0C3FC] print:bg-[#E0C3FC]"><th colSpan="5" className="text-center font-bold uppercase py-1 text-[9pt]">Anggaran / Bukti Kas</th></tr>
            <tr className="text-center font-bold bg-slate-50 text-[8.5pt]">
              <th className="w-8">NO</th>
              <th className="w-24">TANGGAL</th>
              <th>NO. BUKTI (BKM/BKK)</th>
              <th className="w-32">NILAI</th>
              <th>KETERANGAN</th>
            </tr>
          </thead>
          <tbody>
            {/* Bagian Masuk (BKM) */}
            <tr className="bg-[#E0C3FC]/20 font-bold text-[8pt]"><td colSpan="5" className="pl-4 italic">BUKTI KAS MASUK (BKM)</td></tr>
            {dataBkm.length > 0 ? dataBkm.map((t, i) => (
              <tr key={t.id} className="text-[8.5pt]">
                <td className="text-center">{i + 1}</td>
                <td className="text-center">{t.transaction_date}</td>
                <td className="text-center font-mono text-[8pt]">{t.reference_no}</td>
                <td className="p-0"><div className="flex justify-between px-2 py-1"><span>Rp</span><span>{formatIDR(t.debit)}</span></div></td>
                <td className="text-slate-600">{t.description}</td>
              </tr>
            )) : (
              <tr className="text-[8.5pt]"><td colSpan="5" className="text-center italic text-slate-400 py-1">Tidak ada rincian data dana masuk (BKM)</td></tr>
            )}
            <tr className="font-bold text-[8.5pt] bg-slate-50/50">
              <td colSpan="3" className="text-right pr-4">TOTAL BKM</td>
              <td className="p-0"><div className="flex justify-between px-2 py-1"><span>Rp</span><span>{formatIDR(totalBkm)}</span></div></td>
              <td></td>
            </tr>

            {/* Bagian Keluar (BKK) */}
            <tr className="bg-slate-100 font-bold text-[8pt]"><td colSpan="5" className="pl-4 italic">BUKTI KAS KELUAR (BKK)</td></tr>
            {dataBkk.length > 0 ? dataBkk.map((t, i) => (
              <tr key={t.id} className="text-[8.5pt]">
                <td className="text-center">{i + 1}</td>
                <td className="text-center">{t.transaction_date}</td>
                <td className="text-center font-mono text-[8pt]">{t.reference_no}</td>
                <td className="p-0"><div className="flex justify-between px-2 py-1"><span>Rp</span><span>{formatIDR(t.credit)}</span></div></td>
                <td className="text-slate-600">{t.description}</td>
              </tr>
            )) : (
              <tr className="text-[8.5pt]"><td colSpan="5" className="text-center italic text-slate-400 py-1">Tidak ada rincian data dana panjar (BKK)</td></tr>
            )}
            <tr className="font-bold text-[8.5pt] bg-slate-100/50">
              <td colSpan="3" className="text-right pr-4">TOTAL BKK</td>
              <td className="p-0"><div className="flex justify-between px-2 py-1"><span>Rp</span><span>{formatIDR(totalBkk)}</span></div></td>
              <td></td>
            </tr>

            {/* Total Kalkulasi Selisih */}
            <tr className="font-black bg-slate-200/60 text-[9pt]">
              <td colSpan="3" className="text-right uppercase pr-4 tracking-tight">TOTAL (SELISIH LEBIH / KURANG)</td>
              <td className="p-0"><div className="flex justify-between px-2 py-1"><span>Rp</span><span>{formatIDR(selisih)}</span></div></td>
              <td></td>
            </tr>
          </tbody>
        </table>

        {/* TABEL II: RINCIAN AKTUAL BIAYA */}
        <table className="lpu-table mt-6">
          <thead>
            <tr className="bg-slate-300 print:bg-slate-300"><th colSpan="6" className="text-center font-bold uppercase py-1 text-[9pt]">II. Aktual Biaya (Rincian BKK)</th></tr>
            <tr className="text-center font-bold bg-slate-50 text-[8.5pt]">
              <th className="w-8">NO</th>
              <th className="w-20">TANGGAL</th>
              <th>URAIAN PENGELUARAN AKTUAL</th>
              <th className="w-24 text-[7.5pt] tracking-tighter">KWITANSI / NOTA</th>
              <th className="w-28">NILAI</th>
              <th className="w-44 text-[7.5pt]">KETERANGAN / CATATAN BUKTI</th>
            </tr>
          </thead>
          <tbody>
            {dataBkk.length > 0 ? dataBkk.map((t, i) => (
              <tr key={t.id} className="text-[8.5pt]">
                <td className="text-center">{i + 1}</td>
                <td className="text-center text-[7.5pt] whitespace-nowrap">{t.transaction_date}</td>
                <td className="font-medium text-slate-800">{t.description}</td>
                <td className="text-center p-0">
                  <select 
                    className="w-full text-center text-[8.5pt] font-bold text-slate-700 cursor-pointer p-1 no-print-bg bg-blue-50/40 outline-none border-none"
                    value={rowDetails[t.id]?.nota || 'Ada Bukti'}
                    onChange={(e) => handleNotaChange(t.id, e.target.value)}
                  >
                    <option value="Ada Bukti">Ada Bukti</option>
                    <option value="Tidak Ada">Tidak Ada</option>
                  </select>
                </td>
                <td className="p-0"><div className="flex justify-between px-2 py-1 font-mono"><span>Rp</span><span>{formatIDR(t.credit)}</span></div></td>
                <td className="p-0">
                  <input 
                    type="text" 
                    className={`w-full h-full px-2 py-1.5 text-[8pt] font-medium outline-none no-print-bg bg-slate-50/50 border-none ${rowDetails[t.id]?.nota === 'Tidak Ada' ? 'text-red-600 font-bold' : 'text-slate-700 italic'}`}
                    placeholder="Tambah keterangan..."
                    value={rowDetails[t.id]?.ket || ''}
                    onChange={(e) => handleKeteranganChange(t.id, e.target.value)}
                  />
                </td>
              </tr>
            )) : (
              <tr className="text-[8.5pt]"><td colSpan="6" className="text-center italic text-slate-400 py-12">Belum ada rincian data pengeluaran aktual yang ter-input.</td></tr>
            )}
            <tr className="font-black bg-slate-100 text-[8.5pt]">
              <td colSpan="4" className="text-right pr-4 uppercase">Total Realisasi Aktual (II)</td>
              <td className="p-0"><div className="flex justify-between px-2 py-1"><span>Rp</span><span>{formatIDR(totalBkk)}</span></div></td>
              <td></td>
            </tr>
          </tbody>
        </table>

        {/* AREA TANDA TANGAN REKONSILIASI (4 KOLOM) */}
        <div className="grid grid-cols-4 gap-0 mt-6 text-[8pt] border border-black font-medium text-slate-800">
          <div className="border-r border-black p-2 h-28 flex flex-col justify-between">
            <p className="text-center font-bold text-[7.5pt]">Tanggal: {masehiNow.toLocaleDateString('id-ID')}</p>
            <div className="text-center">
              <p className="font-bold underline italic text-[8.5pt]">Gugun Gunawan, Lc</p>
              <p className="text-slate-500 font-bold text-[7.5pt]">Keuangan/Accounting</p>
            </div>
          </div>
          <div className="border-r border-black p-2 h-28 flex flex-col justify-between">
            <p className="text-center font-bold text-[7.5pt]">Tanggal: {masehiNow.toLocaleDateString('id-ID')}</p>
            <div className="text-center">
              <p className="font-bold underline italic text-[8.5pt]">Afipuddin, A.Md</p>
              <p className="text-slate-500 font-bold text-[7.5pt]">Manajer HRD</p>
            </div>
          </div>
          <div className="border-r border-black p-2 h-28 flex flex-col justify-between">
            <p className="text-center font-bold text-[7.5pt]">Tanggal: {masehiNow.toLocaleDateString('id-ID')}</p>
            <div className="text-center">
              <p className="font-bold underline italic text-[8.5pt]">Deudeun Muhtar, S.Pd.I</p>
              <p className="text-slate-500 font-bold text-[7.5pt]">Kepegawaian</p>
            </div>
          </div>
          <div className="p-2 h-28 flex flex-col justify-between">
            <p className="text-center font-bold text-[7.5pt]">Tanggal: {masehiNow.toLocaleDateString('id-ID')}</p>
            <div className="text-center">
              <p className="font-bold underline italic text-[8.5pt]">Deudeun Muhtar, S.Pd.I</p>
              <p className="text-slate-500 font-bold text-[7.5pt]">Bendahara Dept. HRD</p>
            </div>
          </div>
        </div>

        {/* AREA FEEDBACK ACCOUNTING */}
        <div className="mt-4 border border-black p-3 text-[8pt] space-y-3">
          <p className="font-bold uppercase tracking-tight text-slate-800">Koreksi / Feedback Accounting:</p>
          <div className="w-full">
            <textarea
              className="w-full min-h-[4rem] p-2 text-[8.5pt] border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 print:border-none print:bg-transparent font-medium text-slate-700 placeholder:italic placeholder:text-slate-300 resize-none outline-none"
              placeholder="Ketik catatan feedback di sini sebelum dicetak, atau kosongkan jika ingin ditulis tangan..."
              value={feedbackAccounting}
              onChange={(e) => setFeedbackAccounting(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lpu;