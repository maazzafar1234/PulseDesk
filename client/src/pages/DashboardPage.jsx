import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { ticketsAPI } from "../services/api";
import {
  LogOut,
  Plus,
  Settings,
  Loader2,
  ChevronDown,
  Search,
  Ticket,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CreateTicketModal } from "../components/CreateTicketModal";
import { TicketCard } from "../components/TicketCard";
import { StatsBar } from "../components/StatsBar";
import { FilterBar } from "../components/FilterBar";

export const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");

  // Menu State & DOM Reference for Outside Click Detection
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  // Close user menu when clicking anywhere outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await ticketsAPI.getTickets(
        statusFilter,
        priorityFilter,
      );
      setTickets(response.tickets || []);
    } catch (err) {
      setError("Failed to fetch tickets from server.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter]);

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
    navigate("/login");
  };

  const handleAccountSettings = () => {
    setShowUserMenu(false);
    alert(
      `Account Settings for ${user?.email}\nAgent ID: ${user?.id || "AG-101"}\nRole: Support Agent`,
    );
  };

  const handleCreateTicket = async (ticketData) => {
    try {
      await ticketsAPI.createTicket(
        ticketData.title,
        ticketData.description,
        ticketData.priority,
        ticketData.status,
      );
      setShowCreateModal(false);
      fetchTickets();
    } catch (err) {
      setError("Failed to create ticket. Please check backend API.");
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (window.confirm("Are you sure you want to delete this ticket?")) {
      try {
        await ticketsAPI.deleteTicket(ticketId);
        fetchTickets();
      } catch (err) {
        setError("Failed to delete ticket.");
      }
    }
  };

  const handleUpdateStatus = async (ticketId, newStatus) => {
    try {
      await ticketsAPI.updateTicket(ticketId, { status: newStatus });
      fetchTickets();
    } catch (err) {
      setError("Failed to update ticket status.");
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const titleMatch = ticket.title
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    const descMatch = ticket.description
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    return titleMatch || descMatch;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status?.toLowerCase() === "open").length,
    inProgress: tickets.filter(
      (t) => t.status?.toLowerCase().replace("-", " ") === "in progress",
    ).length,
    resolved: tickets.filter((t) => t.status?.toLowerCase() === "resolved")
      .length,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <nav className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <Ticket size={22} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-sky-300 to-cyan-400">
                PulseDesk
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                Customer Support Portal
              </p>
            </div>
          </div>

          {/* User Profile Controls with Outside Click Listener */}
          <div className="flex items-center gap-4">
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setShowUserMenu((prev) => !prev)}
                className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                  {user?.email?.charAt(0).toUpperCase() || "A"}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold text-slate-200 truncate max-w-[150px]">
                    {user?.email}
                  </p>
                  <p className="text-[10px] text-indigo-400 font-medium">
                    Support Agent
                  </p>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`}
                />
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="p-3 border-b border-slate-800 bg-slate-950/50">
                    <p className="text-[11px] text-slate-400">Signed in as</p>
                    <p className="text-xs font-semibold text-slate-200 truncate">
                      {user?.email}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAccountSettings}
                    className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                  >
                    <Settings size={15} />
                    Account Settings
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors border-t border-slate-800/80"
                  >
                    <LogOut size={15} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        {/* Error Alert Banner */}
        {error && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchTickets}
              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        )}

        {/* Stats Summary */}
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              Ticket Metrics Overview
            </h2>
            <p className="text-xs text-slate-400">
              Live breakdown of active support request queue
            </p>
          </div>
          <StatsBar stats={stats} />
        </section>

        {/* Toolbar */}
        <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Search Input Box */}
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                placeholder="Search tickets by title or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>

            {/* Create Ticket Trigger */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] shrink-0"
            >
              <Plus size={18} />
              <span>New Ticket</span>
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
        </section>

        {/* Tickets Grid Display */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                Support Tickets
              </h2>
              <p className="text-xs text-slate-400">
                {filteredTickets.length === 0
                  ? "No matching tickets found"
                  : `Displaying ${filteredTickets.length} ticket${filteredTickets.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          {/* Loading / Empty / Grid States */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-900/30 border border-slate-800/50 rounded-2xl">
              <Loader2
                size={36}
                className="animate-spin text-indigo-400 mb-3"
              />
              <p className="text-xs text-slate-400">Loading support queue...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Ticket size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-200">
                  No tickets found
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  There are no support tickets matching your current search or
                  filter criteria.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all inline-flex items-center gap-2"
              >
                <Plus size={16} /> Create New Ticket
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900/40 border-t border-slate-900 mt-auto py-6 px-4 sm:px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>&copy; 2026 PulseDesk. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-400 cursor-pointer">
              Privacy Policy
            </span>
            <span>•</span>
            <span className="hover:text-slate-400 cursor-pointer">
              Terms of Service
            </span>
            <span>•</span>
            <span className="text-indigo-400 font-semibold">v1.0.0</span>
          </div>
        </div>
      </footer>

      {/* Modal Component */}
      <CreateTicketModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateTicket}
      />
    </div>
  );
};
