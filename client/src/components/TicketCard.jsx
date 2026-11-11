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
    <div className="bg-slate-900 rounded-xl border border-slate-700 hover:border-slate-600 hover:shadow-lg p-5 transition-all duration-200 backdrop-blur-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-white mb-2 line-clamp-2">
          {ticket.title}
        </h3>
        <p className="text-slate-400 text-sm line-clamp-2">
          {ticket.description}
        </p>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          <span
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
              statusColors[ticket.status] || statusColors.open
            }`}
          >
            {ticket.status.replace('-', ' ')}
          </span>
          <span
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
              priorityBadgeColors[ticket.priority]
            }`}
          >
            {ticket.priority}
          </span>
        </div>
      </div>

      <div className="text-xs text-slate-400 mb-4 pb-3 border-t border-slate-700">
        <p className="mt-3">Created {formatDate(ticket.created_at)}</p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm font-medium transition-all duration-200"
          >
            <Clock size={16} />
            Status
            <ChevronDown size={14} className={`transition-transform ${showStatusMenu ? 'rotate-180' : ''}`} />
          </button>

          {showStatusMenu && (
            <div className="absolute top-full left-0 mt-2 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-20 backdrop-blur-sm">
              {statusOptions.map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    onStatusChange(ticket.id, status);
                    setShowStatusMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 hover:bg-slate-700 text-sm capitalize font-medium transition-colors ${
                    ticket.status === status ? 'bg-indigo-950/60 text-indigo-300 border-l-2 border-indigo-500' : 'text-slate-300'
                  }`}
                >
                  {status.replace('-', ' ')}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => onDelete(ticket.id)}
          className="px-3 py-2.5 bg-red-950/40 hover:bg-red-950/60 border border-red-600/60 rounded-lg text-red-300 transition-colors duration-200 font-medium"
          title="Delete ticket"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};
