import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Transaksi from './pages/Transaksi';
import ManajemenRAB from './pages/ManajemenRAB';
import MasterAkun from './pages/MasterAkun'; // Pastikan import ini ada
import LaporanDetail from './pages/LaporanDetail'; // Pastikan import ini ada
import Lpu from './pages/Lpu'; // Import halaman LPU yang baru

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ambil sesi login saat ini
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Dengar perubahan status login
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

  // Jika belum login, tampilkan hanya halaman Login
  if (!session) {
    return <Login />;
  }

  return (
    <Router>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden">
          <Routes>
            {/* Pastikan path di sini sama persis dengan yang ada di Sidebar.jsx */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/master-akun" element={<MasterAkun />} />
            <Route path="/transaksi" element={<Transaksi />} />
            <Route path="/manajemen-rab" element={<ManajemenRAB />} />
            <Route path="/laporan" element={<LaporanDetail />} />
            <Route path="/lpu" element={<Lpu />} />
            
            {/* Jika user mengetik alamat asal-asalan, lempar ke Dashboard */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;