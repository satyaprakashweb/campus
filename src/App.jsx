import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PortalDataProvider } from './context/PortalDataContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AdminLayout from './components/AdminLayout';
import FacultyLayout from './components/FacultyLayout';
import { PrivateRoute, StudentRoute, FacultyRoute, AdminRoute } from './components/RouteGuards';
import './index.css';

// Lazy-load all route pages for faster initial load
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const BrowseItems = lazy(() => import('./pages/BrowseItems'));
const ItemDetail = lazy(() => import('./pages/ItemDetail'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const FacultyLogin = lazy(() => import('./pages/FacultyLogin'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Profile = lazy(() => import('./pages/Profile'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const FacultyDashboard = lazy(() => import('./pages/FacultyDashboard'));
const ReportItem = lazy(() => import('./pages/ReportItem'));
const MatchResults = lazy(() => import('./pages/MatchResults'));
const PhotoComparison = lazy(() => import('./pages/PhotoComparison'));
const AIEvaluation = lazy(() => import('./pages/AIEvaluation'));
const ClaimForm = lazy(() => import('./pages/ClaimForm'));
const ClaimStatus = lazy(() => import('./pages/ClaimStatus'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ManageItems = lazy(() => import('./pages/ManageItems'));
const ManageUsers = lazy(() => import('./pages/ManageUsers'));
const NotFound = lazy(() => import('./pages/NotFound'));

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const target = document.querySelector(hash);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname, hash]);
  return null;
}

function PageLoader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        paddingTop: 'var(--navbar-height)',
      }}
      role="status"
      aria-label="Loading page"
    >
      <svg
        width="38"
        height="38"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ animation: 'pageSpin 0.9s linear infinite' }}
      >
        <circle cx="20" cy="20" r="17" stroke="var(--sand-300)" strokeWidth="3" />
        <path d="M20 3a17 17 0 0 1 17 17" stroke="var(--bronze-700)" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <style>{`@keyframes pageSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function MainLayout() {
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <main id="main-content" style={{ minHeight: 'calc(100vh - var(--navbar-height))' }}>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PortalDataProvider>
        <BrowserRouter>
          <Routes>
            {/* Dedicated Administrator Control Center Layout (Completely Separate from Student & Faculty) */}
            <Route
              element={
                <AdminRoute>
                  <ScrollToTop />
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/analytics" element={<AdminDashboard />} />
              <Route path="/admin/matches" element={<AdminDashboard />} />
              <Route path="/admin/claims" element={<AdminDashboard />} />
              <Route path="/admin/reports" element={<AdminDashboard />} />
              <Route path="/admin/notifications" element={<AdminDashboard />} />
              <Route path="/admin/logs" element={<AdminDashboard />} />
              <Route path="/admin/settings" element={<AdminDashboard />} />
              <Route path="/admin/items" element={<ManageItems />} />
              <Route path="/admin/users" element={<ManageUsers />} />
              <Route path="/admin/students" element={<ManageUsers />} />
              <Route path="/admin/faculty" element={<ManageUsers />} />
            </Route>

            {/* Dedicated Faculty Dashboard Layout (Completely Separate from Student & Admin) */}
            <Route
              element={
                <FacultyRoute>
                  <ScrollToTop />
                  <FacultyLayout />
                </FacultyRoute>
              }
            >
              <Route path="/faculty" element={<FacultyDashboard />} />
              <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
              <Route path="/faculty/report" element={<FacultyDashboard />} />
              <Route path="/faculty/items" element={<FacultyDashboard />} />
              <Route path="/faculty/lost-reports" element={<FacultyDashboard />} />
              <Route path="/faculty/found-reports" element={<FacultyDashboard />} />
              <Route path="/faculty/ai-matches" element={<FacultyDashboard />} />
              <Route path="/faculty/claims" element={<FacultyDashboard />} />
              <Route path="/faculty/notifications" element={<FacultyDashboard />} />
              <Route path="/faculty/profile" element={<FacultyDashboard />} />
              <Route path="/faculty/settings" element={<FacultyDashboard />} />
            </Route>

            {/* Public & Student Campus Portal Layout */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/browse" element={<BrowseItems />} />
              <Route path="/items/:id" element={<ItemDetail />} />
              <Route path="/matches" element={<MatchResults />} />
              <Route path="/photo-match" element={<PhotoComparison />} />
              <Route path="/photo-match/:matchId" element={<PhotoComparison />} />
              <Route path="/evaluation" element={<AIEvaluation />} />
              <Route path="/login" element={<Login />} />
              <Route path="/faculty/login" element={<FacultyLogin />} />
              <Route path="/register" element={<Register />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Authenticated Profile Route */}
              <Route
                path="/profile"
                element={
                  <PrivateRoute allowedRoles={['student', 'faculty', 'staff', 'admin']}>
                    <Profile />
                  </PrivateRoute>
                }
              />
              {/* Dedicated Student Dashboard (Strictly Student Role Only) */}
              <Route
                path="/dashboard"
                element={
                  <StudentRoute>
                    <Dashboard />
                  </StudentRoute>
                }
              />
              <Route
                path="/report"
                element={
                  <PrivateRoute allowedRoles={['student', 'faculty', 'staff', 'admin']}>
                    <ReportItem />
                  </PrivateRoute>
                }
              />
              <Route
                path="/matches/:itemId"
                element={
                  <PrivateRoute allowedRoles={['student', 'faculty', 'staff', 'admin']}>
                    <MatchResults />
                  </PrivateRoute>
                }
              />
              <Route
                path="/claim/:itemId"
                element={
                  <PrivateRoute allowedRoles={['student', 'faculty', 'staff']}>
                    <ClaimForm />
                  </PrivateRoute>
                }
              />
              <Route
                path="/claims/:claimId"
                element={
                  <PrivateRoute allowedRoles={['student', 'faculty', 'staff', 'admin']}>
                    <ClaimStatus />
                  </PrivateRoute>
                }
              />

              {/* System 404 */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </PortalDataProvider>
    </AuthProvider>
  );
}
