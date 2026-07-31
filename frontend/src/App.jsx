import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppShell from './components/layout/AppShell.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import { useAuth } from './context/AuthContext.jsx';

// Landing is the first thing anyone sees, so it stays in the main bundle.
// Everything else is route-split: a first-time visitor pays for the
// marketing page only, not the dashboard's chart library or the wallet
// kit's signing flow, until they actually navigate there.
import Landing from './pages/Landing.jsx';

const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Marketplace = lazy(() => import('./pages/Marketplace.jsx'));
const TaskDetail = lazy(() => import('./pages/TaskDetail.jsx'));
const WalletPage = lazy(() => import('./pages/Wallet.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Notifications = lazy(() => import('./pages/Notifications.jsx'));
const Activity = lazy(() => import('./pages/Activity.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-cyan" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export default function App() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-indigo focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<AppShell />}>
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/marketplace/:id" element={<TaskDetail />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route path="/wallet" element={<WalletPage />} />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <Settings />
              </RequireAuth>
            }
          />
          <Route
            path="/notifications"
            element={
              <RequireAuth>
                <Notifications />
              </RequireAuth>
            }
          />
          <Route path="/activity" element={<Activity />} />
        </Route>

        <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}
