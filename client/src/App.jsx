import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { LoadingView } from './components/LoadingView.jsx';
import { useBootstrap } from './hooks/useBootstrap.js';
import { Admin } from './pages/Admin.jsx';
import { AdminLogin } from './pages/AdminLogin.jsx';
import { Catalog } from './pages/Catalog.jsx';
import { ContactUs } from './pages/ContactUs.jsx';
import { GameDetail } from './pages/GameDetail.jsx';
import { Home } from './pages/Home.jsx';
import { Profile } from './pages/Profile.jsx';

export function App() {
  const bootstrap = useBootstrap();
  const [auth, setAuth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('lyka_auth'));
    } catch {
      return null;
    }
  });

  if (bootstrap.loading) {
    return <LoadingView splash title="Lyka Topup" subtitle="Loading games, packages, and payment settings..." />;
  }

  return (
    <Routes>
      <Route element={<Layout auth={auth} setAuth={setAuth} />}>
        <Route index element={<Home {...bootstrap} />} />
        <Route path="catalog" element={<Catalog {...bootstrap} />} />
        <Route path="orders" element={<ContactUs auth={auth} />} />
        <Route path="contact" element={<ContactUs auth={auth} />} />
        <Route path="profile" element={<Profile setAuth={setAuth} />} />
        <Route path="games/:slug" element={<GameDetail />} />
        <Route path="admin" element={<Admin auth={auth} />} />
        <Route path="admin/login" element={<AdminLogin setAuth={setAuth} />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Route>
    </Routes>
  );
}
