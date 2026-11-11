import { AlertCircle, Clock, CheckCircle, Inbox } from 'lucide-react';

export const StatsBar = ({ stats }) => {
  const statItems = [
    {
      label: 'Total',
      value: stats.total,
      icon: Inbox,
      color: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Open',
      value: stats.open,
      icon: AlertCircle,
      color: 'from-red-500 to-red-600',
    },
    {
      label: 'In Progress',
      value: stats.inProgress,
      icon: Clock,
      color: 'from-yellow-500 to-yellow-600',
    },
    {
      label: 'Resolved',
      value: stats.resolved,
      icon: CheckCircle,
      color: 'from-green-500 to-green-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {statItems.map((item, index) => (
        <div
          key={index}
          className="bg-slate-900 rounded-lg border border-slate-800 p-4 hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">{item.label}</p>
              <p className="text-3xl font-bold text-white">{item.value}</p>
            </div>
            <div className={`bg-gradient-to-br ${item.color} p-3 rounded-lg`}>
              <item.icon size={24} className="text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
