import { useState } from 'react';
import { Eye, EyeOff, Loader2, LockKeyhole, LogIn, Mail, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatusLine } from '../components/StatusLine.jsx';
import { request } from '../lib/api.js';

export function AdminLogin({ setAuth }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await request('/api/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password
        })
      });
      const auth = { role: 'admin', admin: data.admin };
      localStorage.setItem('lyka_token', data.token);
      localStorage.setItem('lyka_auth', JSON.stringify(auth));
      setAuth(auth);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="authWrap">
      <form className="authPanel adminLoginPanel" onSubmit={submit}>
        <span className="authIcon"><LockKeyhole size={26} /></span>
        <h1>Admin Login</h1>
        <p>Sign in with the Lyka admin account to manage games, packages, orders, and settings.</p>
        <label>
          <span>Email</span>
          <span className="fieldWithIcon">
            <Mail size={16} />
            <input
              autoComplete="email"
              inputMode="email"
              onChange={(event) => updateField('email', event.target.value)}
              placeholder="admin@example.com"
              required
              type="email"
              value={form.email}
            />
          </span>
        </label>
        <label>
          <span>Password</span>
          <span className="fieldWithIcon">
            <ShieldCheck size={16} />
            <input
              autoComplete="current-password"
              onChange={(event) => updateField('password', event.target.value)}
              placeholder="Enter password"
              required
              type={showPassword ? 'text' : 'password'}
              value={form.password}
            />
            <button
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="inlineIcon"
              onClick={() => setShowPassword((visible) => !visible)}
              type="button"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </span>
        </label>
        <button className="primary wide" disabled={busy} type="submit">
          {busy ? <Loader2 className="spin" size={18} /> : <LogIn size={18} />} Login to Admin
        </button>
        {error && <StatusLine tone="bad" icon={<ShieldCheck />} text={error} />}
      </form>
    </main>
  );
}
