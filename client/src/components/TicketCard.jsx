import { Trash2, Clock, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export const TicketCard = ({ ticket, onDelete, onStatusChange }) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const statusColors = {
    open: 'bg-red-950/50 border-red-600/60 text-red-300',
    'in-progress': 'bg-amber-950/50 border-amber-600/60 text-amber-300',
    resolved: 'bg-green-950/50 border-green-600/60 text-green-300',
    closed: 'bg-slate-700/50 border-slate-600 text-slate-300',
  };

  const priorityBadgeColors = {
    low: 'bg-green-950/40 border-green-600/60 text-green-300',
    medium: 'bg-amber-950/40 border-amber-600/60 text-amber-300',
    high: 'bg-red-950/40 border-red-600/60 text-red-300',
  };

  const statusOptions = ['open', 'in-progress', 'resolved', 'closed'];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="card p-6 hover:shadow-2xl hover:shadow-indigo-500/10 group transition-all duration-300 hover:-translate-y-1">
      {/* Header */}
      <div className="mb-4 pb-4 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-indigo-300 transition-colors line-clamp-2">
          {ticket.title}
        </h3>
        <p className="text-slate-400 text-sm line-clamp-2">
          {ticket.description}
        </p>
      </div>

      {/* Badges */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <span
          className={`badge ${
            statusColors[ticket.status] || statusColors.open
          }`}
        >
          {ticket.status.replace('-', ' ')}
        </span>
        <span className={`badge ${priorityBadgeColors[ticket.priority]}`}>
          {ticket.priority}
        </span>
      </div>

      {/* Date */}
      <div className="text-xs text-slate-400 mb-4 pb-4 border-b border-slate-700">
        Created {formatDate(ticket.created_at)}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600/20 to-cyan-600/20 hover:from-indigo-600/40 hover:to-cyan-600/40 border border-indigo-500/30 rounded-lg text-indigo-300 text-sm font-medium transition-all duration-200 group-hover:border-indigo-500/60 group-hover:shadow-lg group-hover:shadow-indigo-500/20"
          >
            <Clock size={16} />
            Update Status
            <ChevronDown
              size={14}
              className={`transition-transform duration-300 ${
                showStatusMenu ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Status Dropdown */}
          {showStatusMenu && (
            <div className="absolute top-full left-0 mt-2 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-20 backdrop-blur-sm animate-slideInUp overflow-hidden">
              {statusOptions.map((status, idx) => (
                <button
                  key={status}
                  onClick={() => {
                    onStatusChange(ticket.id, status);
                    setShowStatusMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm capitalize font-medium transition-all duration-200 border-b border-slate-700 last:border-b-0 ${
                    ticket.status === status
                      ? 'bg-indigo-950/60 text-indigo-300 border-l-2 border-l-indigo-500 pl-3'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  {status.replace('-', ' ')}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => onDelete(ticket.id)}
          className="px-4 py-2.5 bg-red-950/20 hover:bg-red-950/40 border border-red-600/30 hover:border-red-600/60 rounded-lg text-red-300 transition-all duration-200 font-medium hover:shadow-lg hover:shadow-red-500/20 active:scale-95"
          title="Delete ticket"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};
