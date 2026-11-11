import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ticketsAPI } from '../services/api';
import { LogOut, Plus, Trash2, RefreshCw, Loader } from 'lucide-react';
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

  // Fetch tickets
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

  // Fetch on mount and when filters change
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

  // Filter tickets by search term
  const filteredTickets = tickets.filter((ticket) =>
    ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === 'open').length,
    inProgress: tickets.filter((t) => t.status === 'in-progress').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              PulseDesk
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm">{user?.email}</span>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {/* Stats Bar */}
        <StatsBar stats={stats} />

        {/* Controls Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-slate-500"
            />
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-lg font-semibold transition-all"
          >
            <Plus size={20} />
            New Ticket
          </button>
        </div>

        {/* Filters */}
        <FilterBar
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          onRefresh={fetchTickets}
        />

        {/* Tickets Grid */}
        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader size={32} className="animate-spin text-blue-400" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12 bg-slate-900 rounded-lg border border-slate-800">
              <p className="text-slate-400">No tickets found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onDelete={handleDeleteTicket}
                  onStatusChange={handleUpdateStatus}
                />
              ))}
            </div>
          )}
        </div>
      </main>

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
