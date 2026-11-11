import { RefreshCw } from 'lucide-react';

export const FilterBar = ({
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  onRefresh,
}) => {
  const statuses = [
    { value: '', label: 'All Status' },
    { value: 'open', label: 'Open' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
  ];

  const priorities = [
    { value: '', label: 'All Priority' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-red-500/50 hover:bg-red-500/10';
      case 'medium':
        return 'border-yellow-500/50 hover:bg-yellow-500/10';
      case 'low':
        return 'border-green-500/50 hover:bg-green-500/10';
      default:
        return 'border-slate-700 hover:bg-slate-800';
    }
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-white text-sm"
      >
        {statuses.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>

      <select
        value={priorityFilter}
        onChange={(e) => setPriorityFilter(e.target.value)}
        className={`px-3 py-2 bg-slate-800 border rounded-lg focus:outline-none focus:border-blue-500 text-white text-sm ${getPriorityColor(
          priorityFilter
        )}`}
      >
        {priorities.map((priority) => (
          <option key={priority.value} value={priority.value}>
            {priority.label}
          </option>
        ))}
      </select>

      <button
        onClick={onRefresh}
        className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-lg text-white text-sm transition-colors"
      >
        <RefreshCw size={16} />
        Refresh
      </button>
    </div>
  );
};
