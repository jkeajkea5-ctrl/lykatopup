import { lazy, Suspense, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { LoadingView } from './components/LoadingView.jsx';
import { useBootstrap } from './hooks/useBootstrap.js';
import { Home } from './pages/Home.jsx';

const Admin = lazy(() => import('./pages/Admin.jsx').then((module) => ({ default: module.Admin })));
const AdminLogin = lazy(() => import('./pages/AdminLogin.jsx').then((module) => ({ default: module.AdminLogin })));
const Catalog = lazy(() => import('./pages/Catalog.jsx').then((module) => ({ default: module.Catalog })));
const ContactUs = lazy(() => import('./pages/ContactUs.jsx').then((module) => ({ default: module.ContactUs })));
const GameDetail = lazy(() => import('./pages/GameDetail.jsx').then((module) => ({ default: module.GameDetail })));
const Profile = lazy(() => import('./pages/Profile.jsx').then((module) => ({ default: module.Profile })));

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
    <Suspense fallback={<LoadingView title="Loading Page" subtitle="Opening the next screen..." />}>
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
    </Suspense>
  );
}
