// Bismillah aplikasi keuangan NFBS Lembang sembuh dari 404
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'; 
import { supabase } from './lib/supabaseClient';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Transaksi from './pages/Transaksi';
import ManajemenRAB from './pages/ManajemenRAB';
import MasterAkun from './pages/MasterAkun'; // <-- Ini sudah dikembalikan ke nama asli Umi
import LaporanDetail from './pages/LaporanDetail'; 
import Lpu from './pages/Lpu'; 

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden">
        <Routes>
          {/* Rute murni diselaraskan dengan vercel.json tanpa bentrok */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/master-akun" element={<MasterAkun />} />
          <Route path="/transaksi" element={<Transaksi />} />
          <Route path="/manajemen-rab" element={<ManajemenRAB />} />
          <Route path="/laporan" element={<LaporanDetail />} />
          <Route path="/lpu" element={<Lpu />} />
          
          {/* Jika kesasar, otomatis kembalikan ke dashboard */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;