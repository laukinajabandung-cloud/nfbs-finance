import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { 
  LayoutDashboard, 
  Database, 
  ArrowLeftRight, 
  FileBarChart, 
  BookOpen,
  FileCheck,
  LogOut,
  Settings
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { 
      path: '/', 
      name: 'Dashboard', 
      icon: <LayoutDashboard size={20} /> 
    },
    { 
      path: '/master-akun', 
      name: 'Master Akun', 
      icon: <Database size={20} /> 
    },
    { 
      path: '/transaksi', 
      name: 'Arus Kas', 
      icon: <ArrowLeftRight size={20} /> 
    },
    { 
      path: '/manajemen-rab', 
      name: 'Manajemen RAB', 
      icon: <BookOpen size={20} /> 
    },
    { 
      path: '/lpu', 
      name: 'Laporan LPU', 
      icon: <FileCheck size={20} /> 
    },
    { 
      path: '/laporan', 
      name: 'Laporan Detail', 
      icon: <FileBarChart size={20} /> 
    },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Apakah Umi yakin ingin keluar dari sistem?");
    if (confirmLogout) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        alert("Gagal logout: " + error.message);
      }
    }
  };

  return (
    <div className="w-72 bg-slate-900 h-screen sticky top-0 flex flex-col p-6 text-white shadow-2xl print:hidden">
      {/* LOGO & HEADER */}
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
          <span className="font-black text-xl italic">N</span>
        </div>
        <div>
          <h1 className="font-black text-sm tracking-tighter uppercase leading-none">NFBS Finance</h1>
          <p className="text-[8px] text-slate-400 font-bold tracking-widest uppercase mt-1">Lembang System</p>
        </div>
      </div>

      {/* MENU NAVIGATION */}
      <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 ml-2">Main Menu</p>
        
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
              isActive(item.path)
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-bold'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <span className={`${isActive(item.path) ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} transition-colors`}>
              {item.icon}
            </span>
            <span className="text-xs uppercase tracking-wider font-black">
              {item.name}
            </span>
            {isActive(item.path) && (
              <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
            )}
          </Link>
        ))}
      </nav>

      {/* BOTTOM SECTION (SETTINGS & LOGOUT) */}
      <div className="pt-6 border-t border-slate-800 space-y-2">
        <button className="w-full flex items-center gap-4 px-4 py-3 text-slate-400 hover:text-white transition-colors group">
          <Settings size={18} className="group-hover:rotate-45 transition-transform duration-500" />
          <span className="text-[10px] font-black uppercase tracking-widest">Pengaturan</span>
        </button>
        
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-4 py-4 bg-slate-800/50 hover:bg-red-500/10 rounded-2xl text-red-400 transition-all group"
        >
          <LogOut size={18} />
          <span className="text-[10px] font-black uppercase tracking-widest">Logout</span>
        </button>
      </div>

      {/* FOOTER */}
      <div className="mt-6 px-2">
        <div className="p-4 bg-slate-800/30 rounded-2xl border border-slate-800 text-center">
          <p className="text-[8px] text-slate-500 font-bold uppercase leading-relaxed tracking-tighter">
            &copy; 2026 Nurul Fikri <br /> Boarding School Lembang
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;