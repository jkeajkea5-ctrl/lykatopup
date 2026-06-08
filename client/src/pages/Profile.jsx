import { useEffect, useRef, useState } from 'react';
import { Loader2, LogIn, Mail, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatusLine } from '../components/StatusLine.jsx';
import { request } from '../lib/api.js';

export function Profile({ setAuth }) {
  const navigate = useNavigate();
  const telegramRef = useRef(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'loginfinch_bot';

  useEffect(() => {
    if (!telegramRef.current || !botName) return undefined;
    telegramRef.current.innerHTML = '';

    window.handleLykaTelegramAuth = async (telegramUser) => {
      setBusy(true);
      setError('');
      try {
        const data = await request('/api/auth/telegram', {
          method: 'POST',
          body: JSON.stringify(telegramUser)
        });
        const auth = { role: 'buyer', user: data.user };
        localStorage.setItem('lyka_token', data.token);
        localStorage.setItem('lyka_auth', JSON.stringify(auth));
        setAuth(auth);
        navigate('/');
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    };

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-userpic', 'false');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-onauth', 'window.handleLykaTelegramAuth(user)');
    telegramRef.current.appendChild(script);

    return () => {
      delete window.handleLykaTelegramAuth;
    };
  }, [botName, navigate, setAuth]);

  async function demoTelegramLogin() {
    setBusy(true);
    setError('');
    try {
      throw new Error('Use the Telegram button to sign in.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="authWrap">
      <section className="authPanel">
        <span className="authIcon"><Mail size={26} /></span>
        <h1>Welcome to Lyka</h1>
        <p>Sign in with Telegram only to top up your favorite games instantly and securely.</p>
        <div className="telegramOnly">
          <div ref={telegramRef} className="telegramWidget" />
          <button className="secondary wide" disabled={busy} onClick={demoTelegramLogin} type="button">
            {busy ? <Loader2 className="spin" size={18} /> : <LogIn size={18} />} Login with Telegram
          </button>
        </div>
        {error && <StatusLine tone="bad" icon={<ShieldCheck />} text={error} />}
      </section>
    </main>
  );
}

