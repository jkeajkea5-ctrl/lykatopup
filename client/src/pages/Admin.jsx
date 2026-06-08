import { useEffect, useState } from 'react';
import { LogIn, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Stat } from '../components/Stat.jsx';
import { StatusLine } from '../components/StatusLine.jsx';
import { request } from '../lib/api.js';
import { money } from '../lib/format.js';

export function Admin({ auth }) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (auth?.role !== 'admin') return;
    request('/api/admin/summary')
      .then(setSummary)
      .catch((err) => setError(err.message));
  }, [auth]);

  if (auth?.role !== 'admin') {
    return (
      <main className="authWrap">
        <section className="authPanel">
          <span className="authIcon"><ShieldCheck size={26} /></span>
          <h1>Admin access</h1>
          <p>Login with the Lyka admin email and password to manage the store.</p>
          <button className="primary wide" onClick={() => navigate('/profile')} type="button">
            <LogIn size={18} /> Admin login
          </button>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="sectionHead">
        <div>
          <h2>Admin dashboard</h2>
          <p>{auth.admin?.email}</p>
        </div>
      </section>
      {error && <StatusLine tone="bad" icon={<ShieldCheck />} text={error} />}
      <div className="statGrid">
        <Stat label="Games" value={summary?.games ?? '--'} />
        <Stat label="Packages" value={summary?.packages ?? '--'} />
        <Stat label="Orders" value={summary?.orders ?? '--'} />
        <Stat label="Revenue" value={summary ? money(summary.revenue) : '--'} />
      </div>
    </main>
  );
}

