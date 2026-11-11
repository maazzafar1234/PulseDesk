import { AlertCircle, Clock, CheckCircle, Inbox } from 'lucide-react';

export const StatsBar = ({ stats }) => {
  const statItems = [
    {
      label: 'Total',
      value: stats.total,
      icon: Inbox,
      color: 'from-indigo-500 to-indigo-600',
      bgLight: 'bg-indigo-950/40',
    },
    {
      label: 'Open',
      value: stats.open,
      icon: AlertCircle,
      color: 'from-red-500 to-red-600',
      bgLight: 'bg-red-950/40',
    },
    {
      label: 'In Progress',
      value: stats.inProgress,
      icon: Clock,
      color: 'from-amber-500 to-amber-600',
      bgLight: 'bg-amber-950/40',
    },
    {
      label: 'Resolved',
      value: stats.resolved,
      icon: CheckCircle,
      color: 'from-green-500 to-green-600',
      bgLight: 'bg-green-950/40',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {statItems.map((item, index) => (
        <div
          key={index}
          className={`${item.bgLight} rounded-xl border border-slate-700 p-5 hover:border-slate-600 hover:shadow-lg transition-all duration-200 backdrop-blur-sm`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs uppercase font-semibold mb-2 tracking-wide">{item.label}</p>
              <p className="text-3xl font-bold text-white">{item.value}</p>
            </div>
            <div className={`bg-gradient-to-br ${item.color} p-3 rounded-lg shadow-lg`}>
              <item.icon size={24} className="text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
