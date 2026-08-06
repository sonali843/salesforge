import React, { useLayoutEffect, lazy, Suspense } from "react";
import {
  BrowserRouter, Routes, Route, Navigate, useLocation,
} from "react-router-dom";
import ErrorBoundary from "../ErrorBoundary";
import { useAuth } from "@/context/AuthContext";

// ── Lazy-loaded pages & components ───────────────────────────────────────────
// Each lazy() call becomes a separate async chunk — the browser only downloads
// what the current route needs, slashing initial bundle size.

// Auth
const Login           = lazy(() => import("../pages/Auth/Login"));
const AdminLogin      = lazy(() => import("../pages/Auth/AdminLogin"));
const AcceptInvite    = lazy(() => import("../pages/Auth/AcceptInvite"));

// Landing
const Landing         = lazy(() => import("../pages/Landing/LandingPage"));

// Layout
const DashboardLayout = lazy(() => import("../components/layout/DashboardLayout"));

// Dashboard & CRM pages
const Dashboard    = lazy(() => import("../pages/Dashboard/Dashboard"));
const Leads        = lazy(() => import("../pages/Dashboard/Leads"));
const LeadDetail   = lazy(() => import("../pages/Dashboard/LeadDetail"));
const Deals        = lazy(() => import("../pages/Dashboard/Deals"));
const Activities   = lazy(() => import("../pages/Dashboard/Activities"));
const Calendar     = lazy(() => import("../pages/Dashboard/Calendar"));
const Billing      = lazy(() => import("../pages/Dashboard/Billing"));
const Team         = lazy(() => import("../pages/Dashboard/Team"));
const Templates    = lazy(() => import("../pages/Dashboard/Templates"));
const Sequences    = lazy(() => import("../pages/Dashboard/Sequences"));
const Workflows    = lazy(() => import("../pages/Dashboard/Workflows"));
const Reports      = lazy(() => import("../pages/Dashboard/Reports"));
const Integrations = lazy(() => import("../pages/Dashboard/Integrations"));
const Quotes       = lazy(() => import("../pages/Dashboard/Quotes"));
const QuoteDetail  = lazy(() => import("../pages/Dashboard/QuoteDetail"));
const Products     = lazy(() => import("../pages/Dashboard/Products"));
const Playbooks    = lazy(() => import("../pages/Dashboard/Playbooks"));
const Analytics    = lazy(() => import("../pages/Dashboard/Analytics"));
const Contacts     = lazy(() => import("../pages/Dashboard/Contacts"));
const Quotas       = lazy(() => import("../pages/Dashboard/Quotas"));
const Commissions  = lazy(() => import("../pages/Dashboard/Commissions"));
const Territories  = lazy(() => import("../pages/Dashboard/Territories"));
const Calls        = lazy(() => import("../pages/Dashboard/Calls"));
const Documents    = lazy(() => import("../pages/Dashboard/Documents"));
const Contracts    = lazy(() => import("../pages/Dashboard/Contracts"));
const Tickets      = lazy(() => import("../pages/Dashboard/Tickets"));
const Surveys      = lazy(() => import("../pages/Dashboard/Surveys"));
const Campaigns    = lazy(() => import("../pages/Dashboard/Campaigns"));
const KB           = lazy(() => import("../pages/Dashboard/KB"));
const HealthScores = lazy(() => import("../pages/Dashboard/HealthScores"));
const AIInsights   = lazy(() => import("../pages/Dashboard/AIInsights"));
const CustomFields = lazy(() => import("../pages/Dashboard/CustomFields"));

// Settings exports (named) — wrap each in its own lazy thunk
const ApiKeys     = lazy(() => import("../pages/Dashboard/ApiKeys").then(m => ({ default: m.ApiKeys })));
const Webhooks    = lazy(() => import("../pages/Dashboard/ApiKeys").then(m => ({ default: m.Webhooks })));
const Usage       = lazy(() => import("../pages/Dashboard/Settings").then(m => ({ default: m.Usage })));
const Audit       = lazy(() => import("../pages/Dashboard/Settings").then(m => ({ default: m.Audit })));
const Sessions    = lazy(() => import("../pages/Dashboard/Settings").then(m => ({ default: m.Sessions })));
const TwoFactor   = lazy(() => import("../pages/Dashboard/Settings").then(m => ({ default: m.TwoFactor })));

// Extras exports (named)
const Changelog               = lazy(() => import("../pages/Dashboard/Extras").then(m => ({ default: m.Changelog })));
const Onboarding              = lazy(() => import("../pages/Dashboard/Extras").then(m => ({ default: m.Onboarding })));
const NotificationPreferences = lazy(() => import("../pages/Dashboard/Extras").then(m => ({ default: m.NotificationPreferences })));
const DataExport              = lazy(() => import("../pages/Dashboard/Extras").then(m => ({ default: m.DataExport })));

// Admin
const AdminDashboard    = lazy(() => import("../pages/Dashboard/AdminDashboard"));
const AdminMainLayout   = lazy(() => import("../components/admin/AdminMainLayout"));
const AdminUsers        = lazy(() => import("../components/admin/AdminUsers"));
const AdminServerHealth = lazy(() => import("../components/admin/AdminServerHealth"));
const AdminAuditLogs    = lazy(() => import("../components/admin/AdminAuditLogs"));
const AdminSettings     = lazy(() => import("../components/admin/AdminSettings"));

// Tools
const IntelHub  = lazy(() => import("../components/Tools/IntelHub/IntelHub"));
const Settings1 = lazy(() => import("../components/Tools/Settings1/Settings1"));
const Notifications = lazy(() => import("../components/Tools/Notifications/Notification"));

// IntelHub sub-tools (kept lazy for completeness; IntelHub itself handles routing)
const EmailSearch    = lazy(() => import("../components/Tools/Email/EmailSearch"));
const DomainSearch   = lazy(() => import("../components/Tools/Domain/DomainSearch"));
const DatabaseSearch = lazy(() => import("../components/Tools/Database/DatabaseSearch"));
const URLSearch      = lazy(() => import("../components/Tools/SocialUrl/SocialUrlSearch"));

// Modules
const InsightDashboard    = lazy(() => import("../modules/InsightDashboard/Insight"));
const OrganizationsList   = lazy(() => import("../modules/Organization").then(m => ({ default: m.OrganizationsList })));
const AddOrganization     = lazy(() => import("../modules/Organization").then(m => ({ default: m.AddOrganization })));
const EditOrganization    = lazy(() => import("../modules/Organization").then(m => ({ default: m.EditOrganization })));
const OrganizationDetails = lazy(() => import("../modules/Organization").then(m => ({ default: m.OrganizationDetails })));

// Shared ChatBot & CommandPalette (small, loaded with shell)
const ChatBot        = lazy(() => import("../components/ChatBot"));
const CommandPalette = lazy(() => import("../components/CommandPalette"));

// ── Spinner shown while a lazy chunk is loading ───────────────────────────────
const PageSpinner = () => (
  <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
  </div>
);

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useLayoutEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const App = () => (
  <BrowserRouter>
    <ScrollToTop />
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route path="/" element={<ErrorBoundary><RootRedirect /></ErrorBoundary>} />
        <Route path="/login-gateway" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<ErrorBoundary><Login /></ErrorBoundary>} />
        <Route path="/signup" element={<Navigate to="/login" replace />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/reset-password" element={<Navigate to="/login" replace />} />
        <Route path="/admin-login" element={<ErrorBoundary><AdminLogin /></ErrorBoundary>} />
        <Route path="/invite/accept" element={<ErrorBoundary><AcceptInvite /></ErrorBoundary>} />

        <Route element={<RequireAuth><ErrorBoundary><DashboardLayout /></ErrorBoundary></RequireAuth>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/onboarding" element={<Onboarding />} />

          <Route path="/insights" element={<InsightDashboard />} />
          <Route path="/insights/reports" element={<InsightDashboard />} />
          <Route path="/insights/trend-analysis" element={<InsightDashboard />} />
          <Route path="/insights/feedback" element={<InsightDashboard />} />

          {/* Legacy analytics dashboard route */}
          <Route path="/analytics/dashboard" element={<Navigate to="/dashboard" replace />} />

          {/* CRM */}
          <Route path="/leads" element={<Leads />} />
          <Route path="/leads/:id" element={<LeadDetail />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/quotes" element={<Quotes />} />
          <Route path="/quotes/:id" element={<QuoteDetail />} />
          <Route path="/products" element={<Products />} />
          <Route path="/playbooks" element={<Playbooks />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/calendar" element={<Calendar />} />

          <Route path="/organizations" element={<OrganizationsList />} />
          <Route path="/organizations/add" element={<AddOrganization />} />
          <Route path="/organizations/:id" element={<OrganizationDetails />} />
          <Route path="/organizations/:id/edit" element={<EditOrganization />} />

          <Route path="/contacts" element={<Contacts />} />
          <Route path="/territories" element={<Territories />} />
          <Route path="/quotas" element={<Quotas />} />
          <Route path="/commissions" element={<Commissions />} />
          <Route path="/calls" element={<Calls />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/surveys" element={<Surveys />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/kb" element={<KB />} />
          <Route path="/health-scores" element={<HealthScores />} />
          <Route path="/ai-insights" element={<AIInsights />} />

          <Route path="/tools/email" element={<IntelHub defaultModule="email_intelligence" />} />
          <Route path="/tools/domain" element={<IntelHub defaultModule="domain_intelligence" />} />
          <Route path="/tools/database" element={<IntelHub defaultModule="person_search" />} />
          <Route path="/tools/url" element={<IntelHub defaultModule="social_media_search" />} />
          <Route path="/tools/intel" element={<IntelHub />} />

          {/* Automation */}
          <Route path="/templates" element={<Templates />} />
          <Route path="/sequences" element={<Sequences />} />
          <Route path="/workflows" element={<Workflows />} />
          <Route path="/custom-fields" element={<CustomFields />} />

          {/* Insights & reports */}
          <Route path="/reports" element={<Reports />} />
          <Route path="/changelog" element={<Changelog />} />

          {/* Team & billing */}
          <Route path="/team" element={<Team />} />
          <Route path="/billing" element={<Billing />} />

          {/* Developer */}
          <Route path="/api-keys" element={<ApiKeys />} />
          <Route path="/webhooks" element={<Webhooks />} />
          <Route path="/integrations" element={<Integrations />} />

          {/* Account */}
          <Route path="/usage" element={<Usage />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/notifications-prefs" element={<NotificationPreferences />} />
          <Route path="/data" element={<DataExport />} />
          <Route path="/settings" element={<Settings1 />} />
          <Route path="/settings/sessions" element={<Sessions />} />
          <Route path="/settings/2fa" element={<TwoFactor />} />

          <Route path="/notifications" element={<Notifications />} />
          <Route path="/Maindashboard" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Admin Dashboard with nested sub-pages */}
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <ErrorBoundary>
                <RequireAdmin>
                  <AdminDashboard />
                </RequireAdmin>
              </ErrorBoundary>
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminMainLayout />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="server-health" element={<AdminServerHealth />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        <Route path="/admin-dashboard" element={<Navigate to="/admin/dashboard" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>

    {/* Shell-level overlays — loaded lazily but kept outside Suspense route tree */}
    <Suspense fallback={null}>
      <ChatBot />
      <CommandPalette />
    </Suspense>
  </BrowserRouter>
);

const RequireAuth = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

const RequireAdmin = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user?.role !== "ADMIN") return <Navigate to="/" replace />;
  return children;
};

const RootRedirect = () => {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
    </div>
  );
  if (isAuthenticated) {
    // Role-based redirect: ADMIN users go to admin dashboard
    if (user?.role === "ADMIN") return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <ErrorBoundary><Landing /></ErrorBoundary>;
};

export default App;
