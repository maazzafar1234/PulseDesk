import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ticketsAPI } from '../services/api';
import { LogOut, Plus, Settings, Loader, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CreateTicketModal } from '../components/CreateTicketModal';
import { TicketCard } from '../components/TicketCard';
import { StatsBar } from '../components/StatsBar';
import { FilterBar } from '../components/FilterBar';

export const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await ticketsAPI.getTickets(statusFilter, priorityFilter);
      setTickets(response.tickets || []);
    } catch (err) {
      setError('Failed to load tickets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCreateTicket = async (ticketData) => {
    try {
      await ticketsAPI.createTicket(
        ticketData.title,
        ticketData.description,
        ticketData.priority,
        ticketData.status
      );
      setShowCreateModal(false);
      fetchTickets();
    } catch (err) {
      setError('Failed to create ticket');
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (confirm('Are you sure you want to delete this ticket?')) {
      try {
        await ticketsAPI.deleteTicket(ticketId);
        fetchTickets();
      } catch (err) {
        setError('Failed to delete ticket');
      }
    }
  };

  const handleUpdateStatus = async (ticketId, newStatus) => {
    try {
      await ticketsAPI.updateTicket(ticketId, { status: newStatus });
      fetchTickets();
    } catch (err) {
      setError('Failed to update ticket');
    }
  };

  const filteredTickets = tickets.filter((ticket) =>
    ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === 'open').length,
    inProgress: tickets.filter((t) => t.status === 'in-progress').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/10 to-slate-950 flex flex-col">
      {/* Navbar */}
      <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700 sticky top-0 z-40 animate-slideInDown">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gradient">PulseDesk</h1>
            <p className="text-xs text-slate-400 mt-1">Support Ticketing System</p>
          </div>

          <div className="flex items-center gap-6">
            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-smooth group"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                  {user?.email.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-semibold text-white line-clamp-1">{user?.email}</p>
                  <p className="text-xs text-slate-400">Support Agent</p>
                </div>
                <ChevronDown size={16} className={`transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl animate-slideInDown z-50">
                  <button className="w-full text-left px-4 py-3 hover:bg-slate-700 transition-smooth flex items-center gap-2">
                    <Settings size={18} />
                    Profile Settings
                  </button>
                  <div className="h-px bg-slate-700" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 hover:bg-red-950/30 text-red-300 transition-smooth flex items-center gap-2"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full section-spacing">
        {/* Error Alert */}
        {error && (
          <div className="alert-error mb-8">
            <span>⚠️</span>
            <div>
              <p className="font-semibold">Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Stats Section */}
        <div className="mb-12 animate-slideInUp">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-white">Ticket Overview</h2>
            <p className="text-slate-400 mt-1">Quick summary of your support tickets</p>
          </div>
          <StatsBar stats={stats} />
        </div>

        {/* Controls Section */}
        <div className="mb-8 animate-slideInUp" style={{ animationDelay: '0.1s' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-200 mb-2">Search Tickets</label>
              <input
                type="text"
                placeholder="Search by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">&nbsp;</label>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary w-full flex items-center justify-center gap-2 h-11"
              >
                <Plus size={20} />
                New Ticket
              </button>
            </div>
          </div>

          {/* Filters */}
          <FilterBar
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            onRefresh={fetchTickets}
          />
        </div>

        {/* Tickets Grid */}
        <div className="animate-slideInUp" style={{ animationDelay: '0.2s' }}>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">Tickets</h2>
            <p className="text-slate-400 mt-1">
              {filteredTickets.length === 0
                ? 'No tickets found'
                : `Showing ${filteredTickets.length} ticket${filteredTickets.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <Loader size={48} className="animate-spin text-indigo-400 mx-auto mb-4" />
                <p className="text-slate-400">Loading tickets...</p>
              </div>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-16 card">
              <div className="inline-block p-4 rounded-full bg-slate-800 mb-4">
                <Plus size={32} className="text-slate-400" />
              </div>
              <p className="text-slate-400 text-lg">No tickets found</p>
              <p className="text-slate-500 mt-2">Create your first ticket to get started</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary mt-6"
              >
                Create Ticket
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTickets.map((ticket, index) => (
                <div key={ticket.id} style={{ animationDelay: `${index * 0.05}s` }} className="animate-slideInUp">
                  <TicketCard
                    ticket={ticket}
                    onDelete={handleDeleteTicket}
                    onStatusChange={handleUpdateStatus}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900/50 backdrop-blur-sm border-t border-slate-700 mt-auto py-8 px-6 animate-slideInUp">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-bold text-gradient mb-3">PulseDesk</h3>
              <p className="text-slate-400 text-sm">Professional support ticketing system for modern teams</p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-3">Quick Links</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Dashboard</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Support</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-3">Resources</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-indigo-400 transition-colors">GitHub</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Report Issues</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-700 pt-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-slate-400 text-sm">&copy; 2026 PulseDesk. All rights reserved.</p>
              <div className="flex gap-4 text-sm text-slate-400 mt-4 md:mt-0">
                <a href="#" className="hover:text-indigo-400 transition-colors">Privacy</a>
                <span className="text-slate-600">•</span>
                <a href="#" className="hover:text-indigo-400 transition-colors">Terms</a>
                <span className="text-slate-600">•</span>
                <a href="#" className="hover:text-indigo-400 transition-colors">Contact</a>
                <span className="text-slate-600">•</span>
                <span className="text-indigo-400 font-semibold">v1.0.0</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTicket}
        />
      )}
    </div>
  );
};
