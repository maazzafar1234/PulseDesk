import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="bg-slate-900 border-b border-slate-800 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            PulseDesk
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-slate-400">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-900/20 border border-red-500/50 hover:bg-red-900/30 rounded-lg text-red-300 transition-colors"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Welcome to PulseDesk</h2>
          <p className="text-slate-400 mb-6">Dashboard UI coming in Module 5...</p>
          <p className="text-slate-500">Logged in as: <span className="text-blue-400">{user?.email}</span></p>
        </div>
      </div>
    </div>
  );
};
