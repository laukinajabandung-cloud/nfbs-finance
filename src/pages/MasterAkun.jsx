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

  // --- LOGIKA TEMPLATE & IMPORT ---
  const downloadTemplate = () => {
    const templateData = [
      {
        "Kode": "5-111-001",
        "Nama": "Gaji Guru Pengajar",
        "Tipe": "Beban",
        "Grup": "Gaji & Tunjangan",
        "Anggaran": 50000000
      },
      {
        "Kode": "1-111-001",
        "Nama": "Kas Operasional Sekolah",
        "Tipe": "Aset",
        "Grup": "Kas & Bank",
        "Anggaran": 0
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
        account_group: item.Grup || '',
        initial_budget: parseFloat(item.Anggaran || item.initial_budget) || 0
      }));

      const { error } = await supabase.from('accounts').insert(formattedData);
      if (!error) {
        alert("Import Berhasil!");
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
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Database className="text-blue-600" /> Data Master
          </h1>
          <p className="text-slate-500 text-sm">Pengaturan Akun & Unit Kerja NFBS Lembang</p>
        </div>
        
        <div className="flex bg-slate-200 p-1 rounded-xl">
          <button onClick={() => setActiveTab('akun')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'akun' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>
            Daftar Akun
          </button>
          <button onClick={() => setActiveTab('dept')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'dept' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>
            Departemen
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: FORM & IMPORT */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="font-bold text-slate-700 mb-6 flex items-center gap-2 text-sm uppercase tracking-wider">
              {activeTab === 'akun' ? (accountForm.id ? 'Ubah Akun' : 'Tambah Akun') : (deptForm.id ? 'Ubah Dept' : 'Tambah Dept')}
            </h2>

            {activeTab === 'akun' ? (
              <form onSubmit={handleSaveAccount} className="space-y-4">
                <input required className="w-full p-3 border rounded-xl text-sm bg-slate-50" placeholder="Kode Akun (5-xxx)" value={accountForm.account_code} onChange={e => setAccountForm({...accountForm, account_code: e.target.value})} />
                <select className="w-full p-3 border rounded-xl text-sm bg-white font-medium" value={accountForm.account_type} onChange={e => setAccountForm({...accountForm, account_type: e.target.value})}>
                  <option value="Aset">Aset (Kas/Bank/Piutang)</option>
                  <option value="Kewajiban">Kewajiban (Hutang)</option>
                  <option value="Ekuitas">Ekuitas (Modal)</option>
                  <option value="Pendapatan">Pendapatan (SPP/Donasi)</option>
                  <option value="Beban">Beban (Biaya Operasional)</option>
                </select>
                <input className="w-full p-3 border rounded-xl text-sm bg-slate-50" placeholder="Grup (Contoh: Gaji)" value={accountForm.account_group} onChange={e => setAccountForm({...accountForm, account_group: e.target.value})} />
                <input required className="w-full p-3 border rounded-xl text-sm bg-slate-50" placeholder="Nama Akun" value={accountForm.account_name} onChange={e => setAccountForm({...accountForm, account_name: e.target.value})} />
                <input required type="number" className="w-full p-3 border rounded-xl text-sm font-bold text-blue-600 bg-slate-50" placeholder="Pagu Anggaran" value={accountForm.initial_budget} onChange={e => setAccountForm({...accountForm, initial_budget: e.target.value})} />
                <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg">Simpan Akun</button>
              </form>
            ) : (
              <form onSubmit={handleSaveDept} className="space-y-4">
                <input required className="w-full p-3 border rounded-xl text-sm bg-slate-50" placeholder="Kode Dept (HRD/SARPRAS)" value={deptForm.dept_code} onChange={e => setDeptForm({...deptForm, dept_code: e.target.value})} />
                <input required className="w-full p-3 border rounded-xl text-sm bg-slate-50" placeholder="Nama Departemen" value={deptForm.dept_name} onChange={e => setDeptForm({...deptForm, dept_name: e.target.value})} />
                <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-black shadow-lg">Simpan Departemen</button>
              </form>
            )}
          </div>

          {activeTab === 'akun' && (
            <div className="bg-green-50 p-6 rounded-2xl border border-green-200 border-dashed">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-green-700 font-bold text-xs uppercase flex items-center gap-2">
                  <FileSpreadsheet size={16} /> Import Excel
                </h3>
                <button onClick={downloadTemplate} className="text-[10px] bg-green-200 text-green-700 px-2 py-1 rounded-lg font-bold flex items-center gap-1 hover:bg-green-300">
                  <DownloadCloud size={12} /> Template
                </button>
              </div>
              <label className="block">
                <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-green-600 file:text-white hover:file:bg-green-700 cursor-pointer"/>
              </label>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: LIST TABLE */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <Search className="text-slate-400" size={20} />
            <input type="text" placeholder="Cari data..." className="flex-1 outline-none text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-widest">
                {activeTab === 'akun' ? (
                  <tr>
                    <th className="px-6 py-4">Kode / Grup</th>
                    <th className="px-6 py-4">Nama Akun</th>
                    <th className="px-6 py-4">Tipe</th>
                    <th className="px-6 py-4 text-right">Pagu RAB</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-6 py-4">Kode Dept</th>
                    <th className="px-6 py-4">Nama Departemen</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="5" className="text-center py-10 text-slate-400 font-medium">Memuat data...</td></tr>
                ) : activeTab === 'akun' ? (
                  accounts.filter(acc => acc.account_name.toLowerCase().includes(searchTerm.toLowerCase())).map(acc => (
                    <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-700">{acc.account_code}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{acc.account_group || 'Tanpa Grup'}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-600">{acc.account_name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          acc.account_type === 'Aset' ? 'bg-blue-100 text-blue-700' :
                          acc.account_type === 'Beban' ? 'bg-red-100 text-red-700' :
                          acc.account_type === 'Pendapatan' ? 'bg-green-100 text-green-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>{acc.account_type}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-800">{formatIDR(acc.initial_budget)}</td>
                      <td className="px-6 py-4 flex justify-center gap-1">
                        <button onClick={() => setAccountForm(acc)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete('accounts', acc.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))
                ) : (
                  departments.filter(d => d.dept_name.toLowerCase().includes(searchTerm.toLowerCase())).map(d => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-black text-blue-600">{d.dept_code}</td>
                      <td className="px-6 py-4 font-bold text-slate-700 uppercase">{d.dept_name}</td>
                      <td className="px-6 py-4 flex justify-center gap-1">
                        <button onClick={() => setDeptForm(d)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete('departments', d.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
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
  );

  async function handleDelete(table, id) {
    if (window.confirm("Hapus data ini secara permanen?")) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (!error) fetchData();
    }
  }
};

export default MasterAkun;