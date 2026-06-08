import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BadgeCheck, CheckCircle2, ChevronDown, CreditCard, Gamepad2, Info, Loader2, Search, ShieldCheck, Sparkles, Star, UserRound, Zap } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { StatusLine } from '../components/StatusLine.jsx';
import { request } from '../lib/api.js';
import { money } from '../lib/format.js';
import { displayImageUrl, hideBrokenImage } from '../lib/images.js';
import { packageTypeLabel } from '../lib/packages.js';

export function GameDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, game: null, packages: [], error: '' });
  const [selected, setSelected] = useState(null);
  const [packageType, setPackageType] = useState('item-package');
  const [accountInfo, setAccountInfo] = useState({});
  const [username, setUsername] = useState(null);
  const [busy, setBusy] = useState('');
  const [orderResult, setOrderResult] = useState(null);
  const [agreed, setAgreed] = useState(true);

  useEffect(() => {
    request(`/api/games/${slug}`)
      .then((data) => {
        setState({ loading: false, game: data.game, packages: data.packages || [], error: '' });
        setSelected(data.packages?.[0] || null);
        setPackageType(data.packages?.[0]?.packageCategory || 'item-package');
      })
      .catch((error) => setState((current) => ({ ...current, loading: false, error: error.message })));
  }, [slug]);

  const fields = state.game?.requiredFields?.length ? state.game.requiredFields : [{ key: 'userId', label: 'User ID', required: true }];
  const packageTypes = useMemo(() => {
    const types = Array.from(new Set(state.packages.map((pkg) => pkg.packageCategory || 'item-package')));
    return types.length ? types : ['item-package'];
  }, [state.packages]);
  const visiblePackages = useMemo(() => state.packages.filter((pkg) => (pkg.packageCategory || 'item-package') === packageType), [packageType, state.packages]);
  const fieldsComplete = fields.every((field) => !field.required || accountInfo[field.key]);
  const canSubmit = selected && agreed && fieldsComplete;

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
          contact: {}
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
  if (orderResult) return <PaymentPanel result={orderResult} />;

  return (
    <main className="gameDetailPage">
      <button className="backBtn" onClick={() => navigate(-1)} type="button">
        <ArrowLeft size={18} /> Back
      </button>
      <section className="detailHero" style={{ '--game-bg': `url("${displayImageUrl(state.game)}")` }}>
        <div className="detailHeroCard">
          <span>{displayImageUrl(state.game) ? <img src={displayImageUrl(state.game)} alt="" onError={hideBrokenImage} /> : <Gamepad2 />}</span>
          <div>
            <h1>{state.game.name}</h1>
            <p>{state.game.currencyLabel || 'Credits'} | {state.game.category || 'Game'} | Instant delivery</p>
            <strong><Star size={14} /> 4.8 <small>(2K reviews)</small></strong>
          </div>
        </div>
      </section>
      <section className="detailStats" aria-label="Service statistics">
        <span><strong>98K+</strong><small>Orders</small></span>
        <span><strong>99.9%</strong><small>Success Rate</small></span>
        <span><strong>&lt;1Min</strong><small>Avg. Time</small></span>
      </section>
      <section className="checkoutLayout">
        <div className="checkoutPanel">
          <h2><span>1</span> Enter Your Player ID</h2>
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
          </div>
          <div className="checkoutActions">
            <button className="secondary" disabled={!fieldsComplete || busy === 'check'} onClick={checkUsername} type="button">
              {busy === 'check' ? (
                <>
                  <Loader2 className="spin" size={18} /> Verifying...
                </>
              ) : username?.found ? (
                <>
                  <CheckCircle2 size={18} /> {username.username || 'Verified'}
                </>
              ) : (
                <>
                  <UserRound size={18} /> Verify
                </>
              )}
            </button>
          </div>

          <h2><span>2</span> Select Package <small>{visiblePackages.length} options</small></h2>
          <div className="packageTabs" aria-label="Package categories">
            {packageTypes.map((type) => (
              <button className={type === packageType ? 'active' : ''} key={type} onClick={() => {
                setPackageType(type);
                const next = state.packages.find((pkg) => (pkg.packageCategory || 'item-package') === type);
                if (next) setSelected(next);
              }} type="button">
                {packageTypeLabel(type)}
              </button>
            ))}
          </div>
          <div className="packageGrid">
            {visiblePackages.map((pkg) => (
              <button className={selected?._id === pkg._id ? 'packageCard selected' : 'packageCard'} key={pkg._id} onClick={() => setSelected(pkg)} type="button">
                <Sparkles size={18} />
                <strong>{pkg.amountLabel}</strong>
                <span>{packageTypeLabel(pkg.packageCategory || 'item-package')}</span>
                <em>{money(pkg.priceUsd)}</em>
              </button>
            ))}
          </div>

          <section className="detailBox termsStep">
            <h3><span>3</span> Accept Terms & Process Payment</h3>
            <label className="termsBox">
              <input checked={agreed} onChange={(event) => setAgreed(event.target.checked)} type="checkbox" />
              <span>I agree to the terms. Money paid cannot be refunded after payment is completed.</span>
            </label>
            <div className="detailBox paymentChoice">
              <h3><span><CreditCard size={16} /></span> Payment Method</h3>
              <button type="button">
                <span className="khqrBadge">KHQR</span>
                <span>
                  <strong>Bakong KHQR</strong>
                  <small>Scan and pay with any KHQR supported banking app</small>
                </span>
                <ChevronDown size={16} />
              </button>
            </div>
          </section>

          <section className="detailBox aboutGame">
            <h3><span><Info size={16} /></span> About This Game</h3>
            <p>{state.game.description || `Top up ${state.game.currencyLabel || 'credits'} with KHQR checkout.`}</p>
            <button type="button">Read more <ChevronDown size={13} /></button>
          </section>

          <section className="detailBox howToTopup">
            <h3><span><Sparkles size={16} /></span> How to Top Up</h3>
            <ol>
              <li>Enter your {state.game.name} account ID in the fields above.</li>
              <li>Select your desired package from the options above.</li>
              <li>Click Process Payment and complete your payment.</li>
              <li>Your package will be delivered automatically.</li>
            </ol>
          </section>

          {username && !username.found && (
            <StatusLine tone="bad" icon={<ShieldCheck />} text={username.message || 'Could not verify account'} />
          )}
        </div>
      </section>
      {selected && (
        <div className="detailStickyBar">
          <div>
            <Sparkles size={18} />
            <span>
              <strong>{selected.amountLabel}</strong>
              <small>{state.game.name}</small>
            </span>
            <em>{money(selected.priceUsd)}</em>
          </div>
          <button className="primary" disabled={!canSubmit || busy === 'order'} onClick={createOrder} type="button">
            {busy === 'order' ? <Loader2 className="spin" size={18} /> : <Zap size={18} />} Process Payment -&gt;
          </button>
        </div>
      )}
    </main>
  );
}

function PaymentPanel({ result }) {
  const navigate = useNavigate();
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
        <p>Scan the KHQR code, complete payment, then check the payment status.</p>
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
          <button className="secondary" onClick={() => navigate(`/contact?order=${encodeURIComponent(order.orderNo || '')}`)} type="button">
            <Search size={18} /> Track order
          </button>
        </div>
        {status && <StatusLine text={status} icon={<BadgeCheck />} tone={status.includes('confirmed') ? 'good' : ''} />}
      </section>
    </main>
  );
}

