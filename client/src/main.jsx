import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  Gamepad2,
  LayoutDashboard,
  Loader2,
  LogIn,
  LogOut,
  Mail,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UserRound
} from 'lucide-react';
import './styles.css';

const apiBase = '';

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

async function request(path, options = {}) {
  const token = localStorage.getItem('lyka_token');
  const res = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

function useBootstrap() {
  const [state, setState] = useState({ loading: true, games: [], storefront: null, error: '' });

  useEffect(() => {
    request('/api/storefront/bootstrap')
      .then((data) => setState({ loading: false, games: data.games || [], storefront: data.storefront, error: '' }))
      .catch((error) => setState((current) => ({ ...current, loading: false, error: error.message })));
  }, []);

  return state;
}

function Header({ route, setRoute, auth, setAuth }) {
  function logout() {
    localStorage.removeItem('lyka_token');
    localStorage.removeItem('lyka_auth');
    setAuth(null);
    setRoute({ name: 'home' });
  }

  return (
    <header className="topbar">
      <button className="brand" onClick={() => setRoute({ name: 'home' })} type="button">
        <span className="brandMark">L</span>
        <span>
          <strong>Lyka Topup</strong>
          <small>KHQR game recharge</small>
        </span>
      </button>
      <nav className="navActions" aria-label="Primary navigation">
        <button className={route.name === 'home' ? 'active iconText' : 'iconText'} onClick={() => setRoute({ name: 'home' })} type="button">
          <Gamepad2 size={18} /> Store
        </button>
        <button className={route.name === 'orders' ? 'active iconText' : 'iconText'} onClick={() => setRoute({ name: 'orders' })} type="button">
          <ShoppingBag size={18} /> Track
        </button>
        <button className={route.name === 'admin' ? 'active iconText' : 'iconText'} onClick={() => setRoute({ name: 'admin' })} type="button">
          <LayoutDashboard size={18} /> Admin
        </button>
        {auth ? (
          <button className="iconOnly" onClick={logout} type="button" title="Sign out" aria-label="Sign out">
            <LogOut size={18} />
          </button>
        ) : (
          <button className="primary small" onClick={() => setRoute({ name: 'login' })} type="button">
            <LogIn size={18} /> Login
          </button>
        )}
      </nav>
    </header>
  );
}

function Home({ games, loading, error, setRoute }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return games;
    return games.filter((game) => [game.name, game.category, game.publisher].filter(Boolean).join(' ').toLowerCase().includes(text));
  }, [games, query]);

  return (
    <main>
      <section className="hero">
        <div className="heroCopy">
          <span className="eyebrow"><Sparkles size={16} /> Pastel-fast Cambodia top-ups</span>
          <h1>Lyka Topup</h1>
          <p>Pick a game, verify the account, pay by Bakong KHQR, and track the order from the same page.</p>
          <div className="heroActions">
            <button className="primary" onClick={() => document.getElementById('games')?.scrollIntoView({ behavior: 'smooth' })} type="button">
              <Gamepad2 size={19} /> Browse games
            </button>
            <button className="secondary" onClick={() => setRoute({ name: 'orders' })} type="button">
              <Search size={19} /> Track order
            </button>
          </div>
        </div>
        <div className="heroVisual" aria-hidden="true">
          {games.slice(0, 5).map((game, index) => (
            <div className={`orbitTile tile${index}`} key={game._id || game.slug}>
              {game.imageUrl ? <img src={game.imageUrl} alt="" /> : <Gamepad2 />}
              <span>{game.shortName || game.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="sectionHead" id="games">
        <div>
          <h2>Choose your game</h2>
          <p>{filtered.length} active game services</p>
        </div>
        <label className="searchBox">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search games" />
        </label>
      </section>

      {loading && <StatusLine icon={<Loader2 className="spin" />} text="Loading catalog" />}
      {error && <StatusLine tone="bad" icon={<ShieldCheck />} text={error} />}
      <div className="gameGrid">
        {filtered.map((game) => (
          <button className="gameCard" key={game._id || game.slug} onClick={() => setRoute({ name: 'game', slug: game.slug })} type="button">
            <span className="gameImage">{game.imageUrl ? <img src={game.imageUrl} alt="" /> : <Gamepad2 />}</span>
            <span className="gameMeta">
              <strong>{game.shortName || game.name}</strong>
              <small>{game.category || 'Game'} • from {game.lowestPrice ? money(game.lowestPrice) : 'soon'}</small>
            </span>
            <span className="pill">{game.packageCount || 0} packs</span>
          </button>
        ))}
      </div>
    </main>
  );
}

function GameDetail({ slug, setRoute, auth }) {
  const [state, setState] = useState({ loading: true, game: null, packages: [], error: '' });
  const [selected, setSelected] = useState(null);
  const [accountInfo, setAccountInfo] = useState({});
  const [contact, setContact] = useState({ email: auth?.user?.email || '', telegramUsername: '' });
  const [username, setUsername] = useState(null);
  const [busy, setBusy] = useState('');
  const [orderResult, setOrderResult] = useState(null);

  useEffect(() => {
    request(`/api/games/${slug}`)
      .then((data) => {
        setState({ loading: false, game: data.game, packages: data.packages || [], error: '' });
        setSelected(data.packages?.[0] || null);
      })
      .catch((error) => setState((current) => ({ ...current, loading: false, error: error.message })));
  }, [slug]);

  const fields = state.game?.requiredFields?.length ? state.game.requiredFields : [{ key: 'userId', label: 'User ID', required: true }];
  const canSubmit = selected && fields.every((field) => !field.required || accountInfo[field.key]);

  async function checkUsername() {
    setBusy('check');
    setUsername(null);
    try {
      const result = await request(`/api/games/${slug}/check-username`, {
        method: 'POST',
        body: JSON.stringify({ accountInfo })
      });
      setUsername(result);
    } catch (error) {
      setUsername({ found: false, message: error.message });
    } finally {
      setBusy('');
    }
  }

  async function createOrder() {
    setBusy('order');
    try {
      const result = await request('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          gameId: state.game._id,
          packageId: selected._id,
          accountInfo,
          contact
        })
      });
      setOrderResult(result);
    } catch (error) {
      setUsername({ found: false, message: error.message });
    } finally {
      setBusy('');
    }
  }

  if (state.loading) return <StatusLine icon={<Loader2 className="spin" />} text="Loading game" />;
  if (state.error) return <StatusLine tone="bad" icon={<ShieldCheck />} text={state.error} />;
  if (orderResult) return <PaymentPanel result={orderResult} setRoute={setRoute} />;

  return (
    <main>
      <button className="backBtn" onClick={() => setRoute({ name: 'home' })} type="button">
        <ArrowLeft size={18} /> Back
      </button>
      <section className="checkoutLayout">
        <div className="gameIntro">
          <span className="largeGameImage">{state.game.imageUrl ? <img src={state.game.imageUrl} alt="" /> : <Gamepad2 />}</span>
          <h1>{state.game.name}</h1>
          <p>{state.game.description || `Top up ${state.game.currencyLabel || 'credits'} with KHQR checkout.`}</p>
          <div className="trustRow">
            <span><BadgeCheck size={16} /> Account check</span>
            <span><CreditCard size={16} /> KHQR</span>
            <span><PackageCheck size={16} /> Order tracking</span>
          </div>
        </div>

        <div className="checkoutPanel">
          <h2>1. Select package</h2>
          <div className="packageGrid">
            {state.packages.map((pkg) => (
              <button className={selected?._id === pkg._id ? 'packageCard selected' : 'packageCard'} key={pkg._id} onClick={() => setSelected(pkg)} type="button">
                <strong>{pkg.amountLabel}</strong>
                <span>{pkg.name}</span>
                <em>{money(pkg.priceUsd)}</em>
              </button>
            ))}
          </div>

          <h2>2. Account details</h2>
          <div className="formGrid">
            {fields.map((field) => (
              <label key={field.key}>
                <span>{field.label}</span>
                <input
                  value={accountInfo[field.key] || ''}
                  onChange={(event) => setAccountInfo((current) => ({ ...current, [field.key]: event.target.value }))}
                  placeholder={field.placeholder || field.label}
                />
              </label>
            ))}
            <label>
              <span>Email receipt</span>
              <input value={contact.email} onChange={(event) => setContact((current) => ({ ...current, email: event.target.value }))} placeholder="you@gmail.com" />
            </label>
            <label>
              <span>Telegram username</span>
              <input
                value={contact.telegramUsername}
                onChange={(event) => setContact((current) => ({ ...current, telegramUsername: event.target.value }))}
                placeholder="@username"
              />
            </label>
          </div>

          <div className="checkoutActions">
            <button className="secondary" disabled={!canSubmit || busy === 'check'} onClick={checkUsername} type="button">
              {busy === 'check' ? <Loader2 className="spin" size={18} /> : <UserRound size={18} />} Check name
            </button>
            <button className="primary" disabled={!canSubmit || busy === 'order'} onClick={createOrder} type="button">
              {busy === 'order' ? <Loader2 className="spin" size={18} /> : <CreditCard size={18} />} Create KHQR
            </button>
          </div>
          {username && (
            <StatusLine
              tone={username.found ? 'good' : 'bad'}
              icon={username.found ? <CheckCircle2 /> : <ShieldCheck />}
              text={username.found ? `Found: ${username.username}` : username.message || 'Could not verify account'}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function PaymentPanel({ result, setRoute }) {
  const [status, setStatus] = useState('');
  const payment = result.payment || {};
  const order = result.order || {};

  async function checkPayment() {
    setStatus('Checking payment...');
    try {
      const data = await request(`/api/payments/${payment._id}/check`, { method: 'POST' });
      setStatus(data.payment?.status === 'paid' ? 'Payment confirmed' : 'Payment is still pending');
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <main className="paymentWrap">
      <section className="paymentPanel">
        <span className="successIcon"><CheckCircle2 size={34} /></span>
        <h1>Order {order.orderNo}</h1>
        <p>Scan the KHQR below and check payment after sending.</p>
        <div className="qrBox">
          {payment.qrImageUrl ? <img src={payment.qrImageUrl} alt="KHQR code" /> : payment.qrDataUrl ? <img src={payment.qrDataUrl} alt="KHQR code" /> : <span>{payment.qrText}</span>}
        </div>
        <div className="paymentFacts">
          <span>{order.gameName}</span>
          <strong>{money(order.priceUsd)}</strong>
          <span>{order.packageName}</span>
        </div>
        <div className="checkoutActions">
          <button className="primary" onClick={checkPayment} type="button">
            <CreditCard size={18} /> Check payment
          </button>
          <button className="secondary" onClick={() => setRoute({ name: 'orders', orderNo: order.orderNo })} type="button">
            <Search size={18} /> Track order
          </button>
        </div>
        {status && <StatusLine text={status} icon={<BadgeCheck />} tone={status.includes('confirmed') ? 'good' : ''} />}
      </section>
    </main>
  );
}

function Login({ setRoute, setAuth }) {
  const [mode, setMode] = useState('buyer');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const path = mode === 'admin' ? '/api/auth/admin/login' : mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload = mode === 'register' ? form : { email: form.email, password: form.password };
      const data = await request(path, { method: 'POST', body: JSON.stringify(payload) });
      const auth = { role: data.admin ? 'admin' : 'buyer', user: data.user, admin: data.admin };
      localStorage.setItem('lyka_token', data.token);
      localStorage.setItem('lyka_auth', JSON.stringify(auth));
      setAuth(auth);
      setRoute({ name: data.admin ? 'admin' : 'home' });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="authWrap">
      <form className="authPanel" onSubmit={submit}>
        <span className="authIcon"><Mail size={26} /></span>
        <h1>Lyka login</h1>
        <div className="segmented">
          <button className={mode === 'buyer' ? 'selected' : ''} onClick={() => setMode('buyer')} type="button">Buyer</button>
          <button className={mode === 'register' ? 'selected' : ''} onClick={() => setMode('register')} type="button">Register</button>
          <button className={mode === 'admin' ? 'selected' : ''} onClick={() => setMode('admin')} type="button">Admin</button>
        </div>
        {mode === 'register' && (
          <label>
            <span>Name</span>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Your name" />
          </label>
        )}
        <label>
          <span>Email</span>
          <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="you@gmail.com" type="email" />
        </label>
        <label>
          <span>Password</span>
          <input value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Password" type="password" />
        </label>
        <button className="primary wide" disabled={busy} type="submit">
          {busy ? <Loader2 className="spin" size={18} /> : <LogIn size={18} />} Continue
        </button>
        {error && <StatusLine tone="bad" icon={<ShieldCheck />} text={error} />}
      </form>
    </main>
  );
}

function Orders({ initialOrderNo }) {
  const [orderNo, setOrderNo] = useState(initialOrderNo || '');
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
        <h1>Track order</h1>
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

function Admin({ auth, setRoute }) {
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
          <button className="primary wide" onClick={() => setRoute({ name: 'login' })} type="button">
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

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusLine({ icon, text, tone = '' }) {
  return (
    <div className={`statusLine ${tone}`}>
      {icon}
      <span>{text}</span>
    </div>
  );
}

function App() {
  const bootstrap = useBootstrap();
  const [route, setRoute] = useState({ name: 'home' });
  const [auth, setAuth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('lyka_auth'));
    } catch {
      return null;
    }
  });

  let screen = <Home {...bootstrap} setRoute={setRoute} />;
  if (route.name === 'game') screen = <GameDetail slug={route.slug} setRoute={setRoute} auth={auth} />;
  if (route.name === 'login') screen = <Login setRoute={setRoute} setAuth={setAuth} />;
  if (route.name === 'orders') screen = <Orders initialOrderNo={route.orderNo} />;
  if (route.name === 'admin') screen = <Admin auth={auth} setRoute={setRoute} />;

  return (
    <>
      <Header route={route} setRoute={setRoute} auth={auth} setAuth={setAuth} />
      {screen}
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
