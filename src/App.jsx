// Bismillah aplikasi keuangan NFBS Lembang - optimized & stable version

import React, { useEffect, useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import Sidebar from './components/Sidebar';

// Lazy load pages (code splitting)
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Transaksi = lazy(() => import('./pages/Transaksi'));
const ManajemenRAB = lazy(() => import('./pages/ManajemenRAB'));
const MasterAkun = lazy(() => import('./pages/MasterAkun'));
const LaporanDetail = lazy(() => import('./pages/LaporanDetail'));
const Lpu = lazy(() => import('./pages/Lpu'));

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ambil session awal (lebih aman pakai async function)
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    };

    getSession();

    // Listener perubahan auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Loading awal saat cek session
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Jika belum login
  if (!session) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            Loading...
          </div>
        }
      >
        <Login />
      </Suspense>
    );
  }

  // Jika sudah login
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="flex-1 overflow-x-hidden">
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center">
              Loading page...
            </div>
          }
        >
          <Routes>
            {/* Route utama */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/master-akun" element={<MasterAkun />} />
            <Route path="/transaksi" element={<Transaksi />} />
            <Route path="/manajemen-rab" element={<ManajemenRAB />} />
            <Route path="/laporan" element={<LaporanDetail />} />
            <Route path="/lpu" element={<Lpu />} />

            {/* Redirect jika route tidak ditemukan */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default App;