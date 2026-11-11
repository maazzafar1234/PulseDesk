import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, AlertCircle, Loader } from 'lucide-react';

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 flex flex-col items-center justify-center relative overflow-hidden p-4">
      {/* Animated Background Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-12 animate-slideInDown">
          <h1 className="text-5xl font-bold text-gradient mb-2">
            PulseDesk
          </h1>
          <p className="text-slate-400 text-lg">Customer Support Ticketing System</p>
        </div>

        {/* Auth Card */}
        <div className="card p-8 shadow-2xl animate-slideInUp">
          {/* Tabs */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => isLogin && toggleMode()}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${
                !isLogin
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Sign Up
            </button>
            <button
              onClick={() => !isLogin && toggleMode()}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${
                isLogin
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Sign In
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="alert-error mb-6">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Email Address
              </label>
              <div className="relative group">
                <Mail size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="input-field pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Password
              </label>
              <div className="relative group">
                <Lock size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  className="input-field pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-8"
            >
              {loading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Please wait...
                </>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-slate-400 text-sm">or</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          {/* Toggle Text */}
          <p className="text-center text-slate-400">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={toggleMode}
              className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
              disabled={loading}
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>

        {/* Demo Info */}
        {isLogin && (
          <div className="mt-8 p-4 bg-slate-900/50 rounded-lg border border-slate-700 text-center animate-slideInUp" style={{ animationDelay: '0.2s' }}>
            <p className="text-slate-400 text-sm">
              <span className="font-semibold text-indigo-400">Demo Account:</span><br />
              Use any email with password (min 6 chars)
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 py-6 text-center text-slate-500 text-sm border-t border-slate-800">
        <p>&copy; 2026 PulseDesk. All rights reserved. | <span className="text-indigo-400">v1.0.0</span></p>
      </footer>
    </div>
  );
};
