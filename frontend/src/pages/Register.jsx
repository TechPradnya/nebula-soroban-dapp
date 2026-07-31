import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Orbit, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Register() {
  const [form, setForm] = useState({ displayName: '', email: '', password: '', role: 'freelancer' });
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register(form);
      toast.success('Account created');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel w-full max-w-sm p-8"
      >
        <Link to="/" className="mb-8 flex items-center gap-2 font-display text-lg font-bold text-white">
          <Orbit size={20} className="text-cyan" /> Nebula
        </Link>
        <h1 className="mb-1 font-display text-2xl font-semibold text-white">Create an account</h1>
        <p className="mb-6 text-sm text-mist-dim">Post tasks or start earning as a freelancer.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-mist-dim" htmlFor="displayName">
              Name
            </label>
            <input
              id="displayName"
              required
              value={form.displayName}
              onChange={update('displayName')}
              className="input-field"
              placeholder="Ada Lovelace"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-mist-dim" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={update('email')}
              className="input-field"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-mist-dim" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={update('password')}
              className="input-field"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-mist-dim" htmlFor="role">
              I want to
            </label>
            <select id="role" value={form.role} onChange={update('role')} className="input-field">
              <option value="freelancer">Find work</option>
              <option value="client">Hire freelancers</option>
            </select>
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Create account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-mist-dim">
          Already have an account?{' '}
          <Link to="/login" className="text-cyan hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
