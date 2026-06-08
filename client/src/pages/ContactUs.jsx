import { useState } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { StatusLine } from '../components/StatusLine.jsx';
import { request } from '../lib/api.js';

export function ContactUs() {
  const [searchParams] = useSearchParams();
  const [orderNo, setOrderNo] = useState(searchParams.get('order') || '');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function track(event) {
    event.preventDefault();
    setError('');
    setResult(null);
    try {
      const data = await request(`/api/orders/status/${orderNo.trim()}`);
      setResult(data.order);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="authWrap">
      <form className="authPanel trackPanel" onSubmit={track}>
        <span className="authIcon"><Search size={26} /></span>
        <h1>Contact Us</h1>
        <p>Track your order or contact Lyka support through Telegram after signing in.</p>
        <label>
          <span>Order number</span>
          <input value={orderNo} onChange={(event) => setOrderNo(event.target.value)} placeholder="LY..." />
        </label>
        <button className="primary wide" type="submit">
          <Search size={18} /> Track
        </button>
        {error && <StatusLine tone="bad" icon={<ShieldCheck />} text={error} />}
        {result && (
          <div className="orderResult">
            <strong>{result.orderNo}</strong>
            <span>{result.gameName}</span>
            <span>{result.packageName}</span>
            <em>{result.status}</em>
          </div>
        )}
      </form>
    </main>
  );
}

