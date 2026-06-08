import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Gamepad2, LogOut, MessageCircle, Moon, Search, Send, ShoppingBag, Sun, UserRound } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Home', icon: Gamepad2, end: true },
  { to: '/catalog', label: 'Catalog', icon: Search },
  { to: '/contact', label: 'Contact Us', icon: ShoppingBag },
  { to: '/profile', label: 'Profile', icon: UserRound }
];

function AppNav({ placement = 'footer' }) {
  return (
    <nav className={`appNav ${placement === 'header' ? 'headerNav' : 'footerNav'}`} aria-label="Primary navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink className={({ isActive }) => (isActive ? 'active' : '')} end={item.end} key={item.to} to={item.to}>
            <Icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export function Layout({ auth, setAuth }) {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem('lyka_theme') || 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('lyka_theme', theme);
  }, [theme]);

  function logout() {
    localStorage.removeItem('lyka_token');
    localStorage.removeItem('lyka_auth');
    setAuth(null);
    navigate('/');
  }

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  }

  return (
    <>
      <header className="topbar">
        <div className="brand" aria-label="Lyka Topup">
          <span className="brandLogo">
            <img src="/lyka-logo.png" alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
            <span className="brandMark">L</span>
          </span>
          <span>
            <strong>Lyka Topup</strong>
          </span>
        </div>
        <AppNav placement="header" />
        <div className="headerActions" aria-label="Contact shortcuts">
          <button
            className="iconOnly themeToggle"
            onClick={toggleTheme}
            type="button"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link className="socialIcon messengerIcon" to="/contact?channel=messenger" title="Messenger" aria-label="Messenger">
            <MessageCircle size={18} />
          </Link>
          <Link className="socialIcon telegramIcon" to="/contact?channel=telegram" title="Telegram" aria-label="Telegram">
            <Send size={18} />
          </Link>
          {auth && (
            <button className="iconOnly" onClick={logout} type="button" title="Sign out" aria-label="Sign out">
              <LogOut size={18} />
            </button>
          )}
        </div>
      </header>
      <Outlet />
      <AppNav />
    </>
  );
}
