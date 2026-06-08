import { useEffect, useState } from 'react';
import { History, Search, ShieldCheck, ShoppingBag } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { StatusLine } from '../components/StatusLine.jsx';
import { request } from '../lib/api.js';
import { money } from '../lib/format.js';
import { displayOrderStatus } from '../lib/orderStatus.js';

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function OrderCard({ order }) {
  const paymentStatus = order.payment?.status ? `Payment ${order.payment.status}` : 'Payment pending';
  return (
    <article className="orderCard">
      <div>
        <strong>{order.orderNo}</strong>
        <small>{formatDate(order.createdAt)}</small>
      </div>
      <span>{order.gameName}</span>
      <span>{order.packageName}</span>
      <div>
        <em>{displayOrderStatus(order.status)}</em>
        <b>{money(order.priceUsd)}</b>
      </div>
      <small>{paymentStatus}</small>
    </article>
  );
}

export function ContactUs({ auth }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [orderNo, setOrderNo] = useState(searchParams.get('order') || '');
  const [result, setResult] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [error, setError] = useState('');
  const isBuyer = auth?.role === 'buyer';

  useEffect(() => {
    if (!isBuyer) return undefined;
    let alive = true;
    setLoadingOrders(true);
    request('/api/orders/mine')
      .then((data) => {
        if (alive) setOrders(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (alive) setError(err.message);
      })
      .finally(() => {
        if (alive) setLoadingOrders(false);
      });
    return () => {
      alive = false;
    };
  }, [isBuyer]);

  async function track(event) {
    event.preventDefault();
    const cleanOrderNo = orderNo.trim();
    if (!cleanOrderNo) {
      setError('Enter an order number to track.');
      return;
    }
    setError('');
    setResult(null);
    try {
      const data = await request(`/api/orders/status/${cleanOrderNo}`);
      setResult(data.order);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="authWrap">
      <section className="authPanel trackPanel ordersPanel">
        <span className="authIcon"><ShoppingBag size={26} /></span>
        <h1>Orders</h1>
        <p>View your recent orders when signed in, or track any order by order number.</p>

        {isBuyer ? (
          <div className="orderHistory">
            <div className="orderHistoryHead">
              <strong><History size={16} /> My orders</strong>
              <small>{loadingOrders ? 'Loading...' : `${orders.length} shown`}</small>
            </div>
            {orders.map((order) => <OrderCard key={order._id || order.orderNo} order={order} />)}
            {!loadingOrders && !orders.length && <p className="emptyOrderState">No orders linked to this account yet.</p>}
          </div>
        ) : (
          <button className="secondary wide" onClick={() => navigate('/profile')} type="button">
            <ShieldCheck size={18} /> Sign in to show your orders
          </button>
        )}

        <form className="trackForm" onSubmit={track}>
          <label>
            <span>Order number</span>
            <input value={orderNo} onChange={(event) => setOrderNo(event.target.value)} placeholder="LY..." />
          </label>
          <button className="primary wide" type="submit">
            <Search size={18} /> Track order
          </button>
        </form>

        {error && <StatusLine tone="bad" icon={<ShieldCheck />} text={error} />}
        {result && <OrderCard order={result} />}
      </section>
    </main>
  );
}
