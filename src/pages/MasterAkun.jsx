import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Plus, Search, Edit2, Trash2, 
  Database, Building2, Upload, FileSpreadsheet, DownloadCloud 
} from 'lucide-react';
import * as XLSX from 'xlsx';

const MasterAkun = () => {
  const [activeTab, setActiveTab] = useState('akun'); // 'akun' atau 'dept'
  const [accounts, setAccounts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form States
  const [accountForm, setAccountForm] = useState({ 
    id: null, 
    account_code: '', 
    account_name: '', 
    initial_budget: '', 
    account_type: 'Beban', 
    account_group: '' 
  });
  const [deptForm, setDeptForm] = useState({ 
    id: null, 
    dept_code: '', 
    dept_name: '' 
  });

  // Pilihan Grup Akun Rekomendasi Akuntansi Keuangan NFBS
  const groupOptions = [
    'Pemasukan / Pendapatan',
    'Biaya Operasional & SDM',
    'Biaya Program & Kegiatan',
    'Biaya Investasi & Aset'
  ];

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    if (activeTab === 'akun') {
      const { data } = await supabase.from('accounts').select('*').order('account_code');
      if (data) setAccounts(data);
    } else {
      const { data } = await supabase.from('departments').select('*').order('dept_code');
      if (data) setDepartments(data);
    }
    setLoading(false);
  };

  // --- LOGIKA TEMPLATE & IMPORT EXCEL ---
  const downloadTemplate = () => {
    const templateData = [
      {
        "Kode": "5-111-001",
        "Nama": "Gaji Guru Pengajar",
        "Tipe": "Beban",
        "Grup": "Biaya Operasional & SDM",
        "Anggaran": 50000000
      },
      {
        "Kode": "4-111-001",
        "Nama": "Pagu Anggaran Yayasan",
        "Tipe": "Pendapatan",
        "Grup": "Pemasukan / Pendapatan",
        "Anggaran": 150000000
      },
      {
        "Kode": "6-111-001",
        "Nama": "Pelatihan Kompetensi Guru",
        "Tipe": "Beban",
        "Grup": "Biaya Program & Kegiatan",
        "Anggaran": 12000000
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Akun");
    XLSX.writeFile(wb, "Template_Import_Akun_NFBS.xlsx");
  };

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const formattedData = data.map(item => ({
        account_code: item.Kode || item.account_code,
        account_name: item.Nama || item.account_name,
        account_type: item.Tipe || 'Beban',
        account_group: item.Grup || item.account_group || '',
        initial_budget: parseFloat(item.Anggaran || item.initial_budget) || 0
      }));

      const { error } = await supabase.from('accounts').insert(formattedData);
      if (!error) {
        alert("Import Berhasil disinkronkan ke Supabase!");
        fetchData();
      } else {
        alert("Gagal Import: " + error.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // --- LOGIKA SIMPAN DATA ---
  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!accountForm.account_group) {
      alert("Mohon pilih Grup Akun terlebih dahulu, Umi.");
      return;
    }

    const payload = { 
      account_code: accountForm.account_code,
      account_name: accountForm.account_name,
      account_type: accountForm.account_type,
      account_group: accountForm.account_group,
      initial_budget: parseFloat(accountForm.initial_budget) || 0
    };

    if (accountForm.id) {
      await supabase.from('accounts').update(payload).eq('id', accountForm.id);
    } else {
      await supabase.from('accounts').insert([payload]);
    }
    resetAccountForm();
    fetchData();
  };

  const handleSaveDept = async (e) => {
    e.preventDefault();
    const payload = { dept_code: deptForm.dept_code, dept_name: deptForm.dept_name };
    if (deptForm.id) {
      await supabase.from('departments').update(payload).eq('id', deptForm.id);
    } else {
      await supabase.from('departments').insert([payload]);
    }
    setDeptForm({ id: null, dept_code: '', dept_name: '' });
    fetchData();
  };

  const resetAccountForm = () => {
    setAccountForm({ id: null, account_code: '', account_name: '', initial_budget: '', account_type: 'Beban', account_group: '' });
  };

  const formatIDR = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* ATAS: HEADER & NAVIGASI TAB */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2 uppercase tracking-tighter">
            <Database className="text-blue-600" /> Data Master
          </h1>
          <p className="text-slate-500 text-sm font-medium">Pengaturan Akun & Unit Kerja NFBS Lembang</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-2xl border-2 border-slate-200 shadow-inner">
          <button onClick={() => setActiveTab('akun')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeTab === 'akun' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>
            Daftar Akun
          </button>
          <button onClick={() => setActiveTab('dept')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeTab === 'dept' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>
            Departemen
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* KOLOM KIRI: FORM ENTRI & ALAT AKSES */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-md">
            <h2 className="font-black text-slate-800 mb-6 flex items-center gap-2 text-xs uppercase tracking-widest text-blue-600">
              {activeTab === 'akun' ? (accountForm.id ? '✏️ Ubah Akun Master' : '➕ Tambah Akun Master') : (deptForm.id ? '✏️ Ubah Unit Kerja' : '➕ Tambah Unit Kerja')}
            </h2>

            {activeTab === 'akun' ? (
              <form onSubmit={handleSaveAccount} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Kode Akun</label>
                  <input required className="w-full p-3.5 border-2 border-slate-100 rounded-xl text-sm font-bold bg-slate-50 font-mono focus:border-blue-500 outline-none" placeholder="Contoh: 5-111" value={accountForm.account_code} onChange={e => setAccountForm({...accountForm, account_code: e.target.value})} />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tipe Akun</label>
                  <select className="w-full p-3.5 border-2 border-slate-100 rounded-xl text-sm bg-white font-bold text-slate-700 focus:border-blue-500 outline-none" value={accountForm.account_type} onChange={e => setAccountForm({...accountForm, account_type: e.target.value})}>
                    <option value="Aset">Aset (Kas/Bank/Piutang)</option>
                    <option value="Kewajiban">Kewajiban (Hutang)</option>
                    <option value="Ekuitas">Ekuitas (Modal)</option>
                    <option value="Pendapatan">Pendapatan (SPP/Donasi)</option>
                    <option value="Beban">Beban (Biaya Operasional)</option>
                  </select>
                </div>

                {/* MODIFIKASI: DROPDOWN GRUP AKUN REKOMENDASI */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Grup Akun (Akuntansi)</label>
                  <select required className="w-full p-3.5 border-2 border-slate-100 rounded-xl text-sm bg-white font-bold text-slate-700 focus:border-blue-500 outline-none" value={accountForm.account_group} onChange={e => setAccountForm({...accountForm, account_group: e.target.value})}>
                    <option value="">-- Pilih Kelompok Grup --</option>
                    {groupOptions.map((group, index) => (
                      <option key={index} value={group}>{group}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nama Mata Anggaran</label>
                  <input required className="w-full p-3.5 border-2 border-slate-100 rounded-xl text-sm font-bold bg-slate-50 focus:border-blue-500 outline-none" placeholder="Nama Akun Lengkap" value={accountForm.account_name} onChange={e => setAccountForm({...accountForm, account_name: e.target.value})} />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Pagu Anggaran Awal (RAB)</label>
                  <input required type="number" className="w-full p-3.5 border-2 border-blue-100 rounded-xl text-sm font-black text-blue-600 bg-blue-50/50 focus:border-blue-500 outline-none" placeholder="Rp 0" value={accountForm.initial_budget} onChange={e => setAccountForm({...accountForm, initial_budget: e.target.value})} />
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-blue-700 shadow-md transition-all">
                    Simpan Akun
                  </button>
                  {accountForm.id && (
                    <button type="button" onClick={resetAccountForm} className="bg-slate-200 text-slate-600 px-4 rounded-xl font-bold text-xs uppercase hover:bg-slate-300">
                      Batal
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <form onSubmit={handleSaveDept} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Kode Departemen</label>
                  <input required className="w-full p-3.5 border-2 border-slate-100 rounded-xl text-sm font-bold bg-slate-50 focus:border-slate-900 outline-none uppercase" placeholder="Contoh: HRD / SARPRAS" value={deptForm.dept_code} onChange={e => setDeptForm({...deptForm, dept_code: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nama Unit / Bidang</label>
                  <input required className="w-full p-3.5 border-2 border-slate-100 rounded-xl text-sm font-bold bg-slate-50 focus:border-slate-900 outline-none" placeholder="Nama Lembaga / Unit" value={deptForm.dept_name} onChange={e => setDeptForm({...deptForm, dept_name: e.target.value})} />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 bg-slate-900 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-black shadow-md transition-all">
                    Simpan Departemen
                  </button>
                  {deptForm.id && (
                    <button type="button" onClick={() => setDeptForm({ id: null, dept_code: '', dept_name: '' })} className="bg-slate-200 text-slate-600 px-4 rounded-xl font-bold text-xs uppercase hover:bg-slate-300">
                      Batal
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>

          {activeTab === 'akun' && (
            <div className="bg-emerald-50/60 p-6 rounded-[2rem] border-2 border-emerald-200 border-dashed shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-emerald-800 font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                  <FileSpreadsheet size={16} className="text-emerald-600" /> Massal Import Excel
                </h3>
                <button onClick={downloadTemplate} className="text-[10px] bg-white border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-xl font-extrabold flex items-center gap-1 hover:bg-emerald-100 shadow-sm transition-all">
                  <DownloadCloud size={12} /> Ambil Template
                </button>
              </div>
              <label className="block">
                <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[11px] file:font-black file:uppercase file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer transition-all"/>
              </label>
            </div>
          )}
        </div>

        {/* KOLOM KANAN: BILAH PENCARIAN & TABEL VIEW */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm flex items-center gap-3">
            <Search className="text-slate-400" size={18} />
            <input type="text" placeholder={activeTab === 'akun' ? "Cari nama atau kode anggaran..." : "Cari nama unit kerja..."} className="flex-1 outline-none text-sm font-bold text-slate-700 placeholder-slate-400" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-white font-black uppercase text-[9px] tracking-widest border-b border-slate-800">
                  {activeTab === 'akun' ? (
                    <tr>
                      <th className="px-6 py-4.5">Kode / Grup</th>
                      <th className="px-6 py-4.5">Nama Mata Anggaran</th>
                      <th className="px-6 py-4.5">Tipe</th>
                      <th className="px-6 py-4.5 text-right">Pagu Anggaran</th>
                      <th className="px-6 py-4.5 text-center w-24">Aksi</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="px-6 py-4.5">Kode Unit</th>
                      <th className="px-6 py-4.5">Nama Unit Kerja / Departemen</th>
                      <th className="px-6 py-4.5 text-center w-24">Aksi</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr><td colSpan="5" className="text-center py-12 text-slate-400 font-bold tracking-tight">Menyelaraskan data, mohon tunggu...</td></tr>
                  ) : activeTab === 'akun' ? (
                    accounts.filter(acc => acc.account_name.toLowerCase().includes(searchTerm.toLowerCase()) || acc.account_code.includes(searchTerm)).map(acc => (
                      <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-mono font-black text-blue-600 text-sm">{acc.account_code}</div>
                          {/* PENANDA WARNA BADGE SESUAI GRUP AKUNTANSI BARU */}
                          <div className="mt-1">
                            <span className={`text-[9px] px-2 py-0.5 font-black uppercase rounded-md tracking-tighter border
                              ${acc.account_group === 'Pemasukan / Pendapatan' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : ''}
                              ${acc.account_group === 'Biaya Operasional & SDM' ? 'bg-blue-50 text-blue-700 border-blue-100' : ''}
                              ${acc.account_group === 'Biaya Program & Kegiatan' ? 'bg-purple-50 text-purple-700 border-purple-100' : ''}
                              ${acc.account_group === 'Biaya Investasi & Aset' ? 'bg-amber-50 text-amber-700 border-amber-100' : ''}
                              ${!acc.account_group ? 'bg-slate-50 text-slate-400 border-slate-100 italic' : ''}
                            `}>
                              {acc.account_group || 'Belum Ditata'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-black text-slate-700 text-sm">{acc.account_name}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            acc.account_type === 'Aset' ? 'bg-blue-100 text-blue-800' :
                            acc.account_type === 'Beban' ? 'bg-red-100 text-red-800' :
                            acc.account_type === 'Pendapatan' ? 'bg-green-100 text-green-800' :
                            'bg-slate-100 text-slate-600'
                          }`}>{acc.account_type}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-black text-slate-900 text-sm">{formatIDR(acc.initial_budget)}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center items-center gap-1">
                            <button onClick={() => setAccountForm(acc)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 size={14} /></button>
                            <button onClick={() => handleDelete('accounts', acc.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    departments.filter(d => d.dept_name.toLowerCase().includes(searchTerm.toLowerCase()) || d.dept_code.toLowerCase().includes(searchTerm.toLowerCase())).map(d => (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-mono font-black text-blue-600 text-sm">{d.dept_code}</td>
                        <td className="px-6 py-4 font-black text-slate-700 text-sm uppercase tracking-tight">{d.dept_name}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center items-center gap-1">
                            <button onClick={() => setDeptForm(d)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 size={14} /></button>
                            <button onClick={() => handleDelete('departments', d.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  async function handleDelete(table, id) {
    if (window.confirm("Apakah Umi yakin ingin menghapus data master ini secara permanen?")) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (!error) fetchData();
    }
  }
};

export default MasterAkun;