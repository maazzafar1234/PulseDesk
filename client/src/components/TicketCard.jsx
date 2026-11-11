import { Trash2, Clock, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export const TicketCard = ({ ticket, onDelete, onStatusChange }) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const statusColors = {
    open: 'bg-red-900/30 border-red-500/50 text-red-300',
    'in-progress': 'bg-yellow-900/30 border-yellow-500/50 text-yellow-300',
    resolved: 'bg-green-900/30 border-green-500/50 text-green-300',
    closed: 'bg-slate-700 border-slate-600 text-slate-300',
  };

  const priorityColors = {
    low: 'text-green-400',
    medium: 'text-yellow-400',
    high: 'text-red-400',
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
    <div className="bg-slate-900 rounded-lg border border-slate-800 hover:border-slate-700 p-4 transition-colors">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-white mb-1 line-clamp-2">
          {ticket.title}
        </h3>
        <p className="text-slate-400 text-sm line-clamp-2">
          {ticket.description}
        </p>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          <span
            className={`px-2 py-1 rounded text-xs font-semibold border ${
              statusColors[ticket.status] || statusColors.open
            }`}
          >
            {ticket.status}
          </span>
          <span
            className={`px-2 py-1 rounded text-xs font-semibold bg-slate-800 border border-slate-700 ${
              priorityColors[ticket.priority]
            }`}
          >
            {ticket.priority}
          </span>
        </div>
      </div>

      <div className="text-xs text-slate-500 mb-3">
        Created {formatDate(ticket.created_at)}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-white text-sm transition-colors"
          >
            <Clock size={16} />
            Update Status
            <ChevronDown size={14} />
          </button>

          {showStatusMenu && (
            <div className="absolute top-full left-0 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-10">
              {statusOptions.map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    onStatusChange(ticket.id, status);
                    setShowStatusMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-slate-700 text-sm capitalize transition-colors ${
                    ticket.status === status ? 'bg-slate-700 text-blue-400' : ''
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => onDelete(ticket.id)}
          className="px-3 py-2 bg-red-900/20 hover:bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};
