import { AlertCircle, Clock, CheckCircle, Inbox } from 'lucide-react';

export const StatsBar = ({ stats }) => {
  const statItems = [
    {
      label: 'Total',
      value: stats.total,
      icon: Inbox,
      color: 'from-indigo-500 to-indigo-600',
      bgLight: 'bg-indigo-950/20',
      borderColor: 'border-indigo-500/30',
    },
    {
      label: 'Open',
      value: stats.open,
      icon: AlertCircle,
      color: 'from-red-500 to-red-600',
      bgLight: 'bg-red-950/20',
      borderColor: 'border-red-500/30',
    },
    {
      label: 'In Progress',
      value: stats.inProgress,
      icon: Clock,
      color: 'from-amber-500 to-amber-600',
      bgLight: 'bg-amber-950/20',
      borderColor: 'border-amber-500/30',
    },
    {
      label: 'Resolved',
      value: stats.resolved,
      icon: CheckCircle,
      color: 'from-green-500 to-green-600',
      bgLight: 'bg-green-950/20',
      borderColor: 'border-green-500/30',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map((item, index) => (
        <div
          key={index}
          className={`${item.bgLight} rounded-xl border ${item.borderColor} p-6 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/20 cursor-pointer animate-slideInUp`}
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-slate-400 text-xs uppercase font-semibold tracking-widest mb-2">
                {item.label}
              </p>
              <p className="text-4xl font-bold text-white">{item.value}</p>
            </div>
            <div className={`bg-gradient-to-br ${item.color} p-4 rounded-xl shadow-lg`}>
              <item.icon size={28} className="text-white" />
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
              style={{
                width: `${Math.min((item.value / (stats.total || 1)) * 100, 100)}%`,
                transition: 'width 0.5s ease-out',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
