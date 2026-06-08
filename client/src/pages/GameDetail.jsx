import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Box,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock,
  Coins,
  CreditCard,
  Crosshair,
  Crown,
  Flame,
  Gamepad2,
  Gem,
  Info,
  Loader2,
  Package,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Swords,
  Ticket,
  Trophy,
  UserRound,
  X,
  Zap
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { LoadingView } from '../components/LoadingView.jsx';
import { StatusLine } from '../components/StatusLine.jsx';
import { request } from '../lib/api.js';
import { money } from '../lib/format.js';
import { displayImageUrl, hideBrokenImage, imageFrameClass } from '../lib/images.js';
import { displayOrderStatus } from '../lib/orderStatus.js';
import { packageTypeLabel } from '../lib/packages.js';

const defaultPackageIcons = {
  'item-package': Gem,
  pass: Crown,
  other: Package
};

const gamePackageIcons = {
  'mobile-legends': {
    'item-package': Gem,
    pass: Crown,
    other: Ticket
  },
  'magic-chess-go-go': {
    'item-package': Star,
    pass: Trophy,
    other: Box
  },
  'free-fire': {
    'item-package': Flame,
    pass: Ticket,
    other: Package
  },
  'pubg-mobile': {
    'item-package': Crosshair,
    pass: Shield,
    other: Box
  },
  'honor-of-kings': {
    'item-package': Swords,
    pass: Crown,
    other: Trophy
  },
  'valorant-cambodia': {
    'item-package': Crosshair,
    pass: Shield,
    other: Sparkles
  },
  'blood-strike': {
    'item-package': Crosshair,
    pass: Flame,
    other: Package
  },
  'genshin-impact-cambodia': {
    'item-package': Sparkles,
    pass: Star,
    other: Ticket
  },
  'honkai-star-rail': {
    'item-package': Star,
    pass: Sparkles,
    other: Ticket
  },
  'zenless-zone-zero': {
    'item-package': Zap,
    pass: Star,
    other: Box
  },
  'wuthering-waves': {
    'item-package': Sparkles,
    pass: Swords,
    other: Package
  },
  'delta-force': {
    'item-package': Crosshair,
    pass: Shield,
    other: Package
  },
  'arena-breakout': {
    'item-package': Box,
    pass: Shield,
    other: Package
  },
  'call-of-duty-mobile-garena': {
    'item-package': Crosshair,
    pass: Flame,
    other: Shield
  },
  'identity-v': {
    'item-package': Ticket,
    pass: Star,
    other: Box
  },
  'wild-rift-cambodia': {
    'item-package': Swords,
    pass: Crown,
    other: Shield
  },
  'farlight-84': {
    'item-package': Zap,
    pass: Shield,
    other: Package
  },
  zepeto: {
    'item-package': Coins,
    pass: Ticket,
    other: CircleDollarSign
  }
};

const packageTypeOrder = ['item-package', 'pass', 'other'];
const khqrCountdownSeconds = 5 * 60;

function PackageTypeIcon({ gameSlug = '', type = 'item-package', size = 18 }) {
  const normalized = type || 'item-package';
  const Icon = gamePackageIcons[gameSlug]?.[normalized] || defaultPackageIcons[normalized] || Package;
  return <Icon className="packageTypeIcon" size={size} aria-hidden="true" />;
}

function formatCountdown(seconds = 0) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

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
  const packageTypeCounts = useMemo(() => state.packages.reduce((counts, pkg) => {
    const type = pkg.packageCategory || 'item-package';
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {}), [state.packages]);
  const packageTypes = useMemo(() => {
    const types = Array.from(new Set(state.packages.map((pkg) => pkg.packageCategory || 'item-package')));
    return (types.length ? types : ['item-package']).sort((left, right) => {
      const leftIndex = packageTypeOrder.indexOf(left);
      const rightIndex = packageTypeOrder.indexOf(right);
      return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex);
    });
  }, [state.packages]);
  const visiblePackages = useMemo(() => state.packages.filter((pkg) => (pkg.packageCategory || 'item-package') === packageType), [packageType, state.packages]);
  const fieldsComplete = fields.every((field) => !field.required || accountInfo[field.key]);
  const canSubmit = selected && agreed && fieldsComplete && username?.found;

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

  if (state.loading) return <LoadingView title="Loading Game Detail" subtitle="Preparing account fields and package options..." />;
  if (state.error) return <StatusLine tone="bad" icon={<ShieldCheck />} text={state.error} />;

  return (
    <main className="gameDetailPage">
      <button className="backBtn" onClick={() => navigate(-1)} type="button">
        <ArrowLeft size={18} /> Back
      </button>
      <section className="detailHero" style={{ '--game-bg': `url("${displayImageUrl(state.game)}")` }}>
        <div className="detailHeroCard">
          <span className={imageFrameClass(state.game).trim()}>{displayImageUrl(state.game) ? <img src={displayImageUrl(state.game)} alt="" onError={hideBrokenImage} /> : <Gamepad2 />}</span>
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
          <div className={`formGrid accountFields game-${state.game.slug || slug}`}>
            {fields.map((field) => (
              <label className={`accountField field-${field.key}`} key={field.key}>
                <span>{field.label}</span>
                <input
                  value={accountInfo[field.key] || ''}
                  onChange={(event) => {
                    setUsername(null);
                    setAccountInfo((current) => ({ ...current, [field.key]: event.target.value }));
                  }}
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
                <PackageTypeIcon gameSlug={state.game.slug || slug} type={type} size={15} />
                <span>{packageTypeLabel(type)}</span>
                <small>{packageTypeCounts[type] || 0}</small>
              </button>
            ))}
          </div>
          <div className="packageGrid">
            {visiblePackages.map((pkg) => (
              <button className={selected?._id === pkg._id ? 'packageCard selected' : 'packageCard'} key={pkg._id} onClick={() => setSelected(pkg)} type="button">
                <PackageTypeIcon gameSlug={state.game.slug || slug} type={pkg.packageCategory || 'item-package'} size={20} />
                <strong>{pkg.amountLabel}</strong>
                <span>{pkg.bonusLabel || packageTypeLabel(pkg.packageCategory || 'item-package')}</span>
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
            {busy === 'order' ? <Loader2 className="spin" size={18} /> : <Zap size={18} />} {username?.found ? 'Process Payment ->' : 'Verify ID First'}
          </button>
        </div>
      )}
      {orderResult && <PaymentPanel result={orderResult} onClose={() => setOrderResult(null)} />}
    </main>
  );
}

function PaymentPanel({ result, onClose }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [checking, setChecking] = useState(false);
  const [payment, setPayment] = useState(result.payment || {});
  const [order, setOrder] = useState(result.order || {});
  const [remainingSeconds, setRemainingSeconds] = useState(khqrCountdownSeconds);
  const checkingRef = useRef(false);
  const isPaid = payment.status === 'paid';
  const invoiceDisplayStatus = 'Order Complete';
  const invoiceCheckUrl = order.orderNo ? `${window.location.origin}/orders?order=${encodeURIComponent(order.orderNo)}` : '';

  async function checkPayment({ silent = false } = {}) {
    if (!payment._id || checkingRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    if (!silent) setStatus('Checking payment...');
    try {
      const data = await request(`/api/payments/${payment._id}/check`, { method: 'POST' });
      if (data.payment) setPayment(data.payment);
      if (data.order) setOrder(data.order);
      setStatus(data.payment?.status === 'paid' ? `Order ${displayOrderStatus(data.order?.status)}` : 'Order Pending');
    } catch (error) {
      setStatus(error.message);
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  }

  async function refreshOrder({ silent = false } = {}) {
    if (!order.orderNo || checkingRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    if (!silent) setStatus('Refreshing order status...');
    try {
      const data = await request(`/api/orders/status/${order.orderNo}`);
      if (data.order) {
        setOrder(data.order);
        setPayment(data.order.payment || payment);
        setStatus(`Order ${displayOrderStatus(data.order.status)}`);
      }
    } catch (error) {
      setStatus(error.message);
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  }

  useEffect(() => {
    const isFinal = ['completed', 'failed', 'cancelled'].includes(order.status);
    if ((!payment._id && !order.orderNo) || isFinal) return undefined;
    if (!status) setStatus(payment.status === 'paid' ? `Order ${displayOrderStatus(order.status)}` : 'Order Pending');
    const timer = window.setInterval(() => {
      if (payment.status === 'paid') {
        refreshOrder({ silent: true });
      } else {
        checkPayment({ silent: true });
      }
    }, 1500);
    return () => window.clearInterval(timer);
  }, [order.orderNo, order.status, payment._id, payment.status, status]);

  useEffect(() => {
    if (isPaid) return undefined;
    setRemainingSeconds(khqrCountdownSeconds);
    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isPaid, payment._id]);

  return (
    <div className={`paymentModalOverlay ${isPaid ? 'invoiceOverlay' : 'khqrOverlay'}`} role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
      <section className={`paymentPanel paymentModal ${isPaid ? 'invoiceModal' : 'khqrModal'}`}>
        <button className="modalClose" onClick={onClose} type="button" aria-label="Close payment popup">
          <X size={18} />
        </button>
        <span className="successIcon">{isPaid ? <BadgeCheck size={34} /> : <CreditCard size={34} />}</span>
        {isPaid && (
          <>
            <h1 id="payment-modal-title">Invoice</h1>
            <p>Payment confirmed.</p>
          </>
        )}
        {!isPaid && <h1 id="payment-modal-title" className="srOnly">KHQR payment</h1>}
        {isPaid ? (
          <div className="invoiceBox">
            <div>
              <span>Invoice No.</span>
              <strong>{order.orderNo}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{invoiceDisplayStatus}</strong>
            </div>
            <div>
              <span>Game</span>
              <strong>{order.gameName}</strong>
            </div>
            <div>
              <span>Package</span>
              <strong>{order.packageName}</strong>
            </div>
            <div>
              <span>Total Paid</span>
              <strong>{money(order.priceUsd)}</strong>
            </div>
            <div>
              <span>Payment</span>
              <strong>KHQR confirmed</strong>
            </div>
            {invoiceCheckUrl && (
              <div>
                <span>Check URL</span>
                <strong>
                  <a href={invoiceCheckUrl}>{invoiceCheckUrl}</a>
                </strong>
              </div>
            )}
          </div>
        ) : (
          <div className="khqrSlip" aria-label="KHQR payment code">
            <div className="khqrSlipHead">
              <strong>KHQR</strong>
            </div>
            <div className="khqrSlipBody">
              <div className="khqrMerchant">
                <div>
                  <span>Lyka Topup</span>
                  <strong>{money(order.priceUsd)} <small>USD</small></strong>
                </div>
                <span className="khqrCountdown" aria-label={`Remaining time ${formatCountdown(remainingSeconds)}`}>
                  <Clock size={13} />
                  {formatCountdown(remainingSeconds)}
                </span>
              </div>
              <div className="khqrDivider" />
              <div className="qrBox">
                {payment.qrImageUrl ? <img src={payment.qrImageUrl} alt="KHQR code" /> : payment.qrDataUrl ? <img src={payment.qrDataUrl} alt="KHQR code" /> : <span>{payment.qrText}</span>}
                <i aria-hidden="true">$</i>
              </div>
            </div>
          </div>
        )}
        {isPaid && (
          <div className="checkoutActions invoiceActions">
            <>
              <StatusLine text={invoiceDisplayStatus} icon={<BadgeCheck />} tone="good" />
              <button className="primary" onClick={() => navigate('/catalog')} type="button">
                <Gamepad2 size={18} /> More TopUp
              </button>
            </>
          </div>
        )}
      </section>
    </div>
  );
}
