import { useEffect, useState, type ReactNode } from 'react';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Menu,
  Switch,
  Tab,
  Tabs,
  TextField,
  ThemeProvider,
  Typography,
  createTheme,
} from '@mui/material';
import {
  AccountCircle,
  Add,
  AdminPanelSettingsOutlined,
  ArrowBack,
  AssessmentOutlined,
  BusinessOutlined,
  CalendarMonthOutlined,
  ChevronLeft,
  ChevronRight,
  DashboardOutlined,
  Diamond,
  Email,
  FilterList,
  AttachFileOutlined,
  GroupsOutlined,
  EditOutlined,
  DeleteOutlined,
  Lock,
  LogoutOutlined,
  NotificationsNoneOutlined,
  PersonOutlineOutlined,
  PersonAddAlt1,
  NotificationsActiveOutlined,
  SecurityOutlined,
  LanguageOutlined,
  SaveOutlined,
  SearchOutlined,
  SettingsOutlined,
  TaskAltOutlined,
  TableRowsOutlined,
  Visibility,
  VisibilityOff,
  ViewKanbanOutlined,
} from '@mui/icons-material';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import {
  addLeadNote,
  createAdminUser,
  getCustomers,
  getDashboardStats,
  getMonthlySales,
  getCurrentUser,
  getStoredUser,
  createCustomer,
  deleteCustomer,
  deleteAdminUser,
  createLead,
  deleteLead,
  getLeads,
  getAdminUsers,
  getToken,
  login,
  register,
  removeToken,
  saveToken,
  saveSessionUser,
  updateCustomer,
  updateAdminUser,
  updatePassword,
  updatePreferences,
  updateProfile,
  updateLead,
  updateLeadStatus,
} from './api';
import type { AdminUser, AdminUserStats, Customer, CustomerSource, CustomerStatus, DashboardStats, Lead, LeadStatus, MonthlySales, MonthlySalesDetails, SessionUser, UserPreferences, UserRole } from './types';

const theme = createTheme({
  palette: {
    primary: {
      main: '#4a5efb',
      dark: '#2b38c9',
      light: '#8ca2ff',
    },
    background: {
      default: '#f5f7fb',
    },
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    h1: { fontWeight: 800 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  shape: {
    borderRadius: 16,
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<LoginPage defaultRegister />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leads"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contacts"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspace"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          {['companies', 'tasks', 'calendar', 'reports', 'settings'].map((section) => (
            <Route
              key={section}
              path={`/${section}`}
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
          ))}
          <Route path="*" element={<Navigate to={getToken() ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = getToken();
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<SessionUser | null>(() => getStoredUser());
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getCurrentUser()
      .then((currentUser) => {
        saveSessionUser(currentUser);
        setUser(currentUser);
      })
      .catch(() => {
        toast.error('Foydalanuvchi ma’lumotlarini tekshirib bo‘lmadi. Qayta kiring.');
        removeToken();
        navigate('/login', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [location.pathname, navigate, token]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (loading || !user) {
    return <div className="loading-panel"><CircularProgress size={28} /><span>Hisob tekshirilmoqda...</span></div>;
  }

  const pathAllowed = user.role === 'admin'
    ? ['/dashboard', '/admin', '/settings'].includes(location.pathname)
    : user.role === 'manager'
      ? location.pathname !== '/admin' && location.pathname !== '/workspace'
      : ['/workspace', '/settings'].includes(location.pathname);

  if (!pathAllowed) {
    const homePath = user.role === 'user' ? '/workspace' : '/dashboard';
    return <Navigate to={homePath} replace />;
  }

  return <>{children}</>;
}

function LoginPage({ defaultRegister = false }: { defaultRegister?: boolean }) {
  const [isRegister, setIsRegister] = useState(defaultRegister);
  const [fullName, setFullName] = useState('John Doe');
  const [email, setEmail] = useState(defaultRegister ? 'john@example.com' : 'admin@example.com');
  const [password, setPassword] = useState(defaultRegister ? 'Pass1234' : 'admin123');
  const [confirmPassword, setConfirmPassword] = useState('Pass1234');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const passwordRulesPassed = /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);

  const handleSubmit = async () => {
    if (isRegister) {
      if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
        toast.error('Barcha majburiy maydonlarni to‘ldiring');
        return;
      }

      if (fullName.trim().length < 2 || fullName.trim().length > 100) {
        toast.error('Ism 2 dan 100 tagacha belgidan iborat bo‘lishi kerak');
        return;
      }

      if (email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        toast.error('Email manzil formati noto‘g‘ri');
        return;
      }

      if (!passwordRulesPassed) {
        toast.error('Parolda kamida 8 ta belgi, bitta katta harf va bitta raqam bo‘lishi kerak');
        return;
      }

      if (password !== confirmPassword) {
        toast.error('Parollar mos kelmadi');
        return;
      }
    } else {
      if (!email.trim() || !password) {
        toast.error('Email va parolni kiriting');
        return;
      }
      if (email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        toast.error('Email manzil formati noto‘g‘ri');
        return;
      }
    }

    setLoading(true);

    try {
      const response = isRegister
        ? await register({ name: fullName.trim(), email: email.trim().toLowerCase(), password })
        : await login({ email: email.trim().toLowerCase(), password });

      saveToken(response.token);
      saveSessionUser(response.user);
      if (rememberMe) {
        localStorage.setItem('crmpro_email', email);
      } else {
        localStorage.removeItem('crmpro_email');
      }

      toast.success(isRegister ? 'Registration successful' : 'Login successful');
      navigate(response.user.role === 'user' ? '/workspace' : '/dashboard');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || (isRegister ? 'Registration failed' : 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsRegister(defaultRegister);
    const savedEmail = localStorage.getItem('crmpro_email');
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, [defaultRegister]);

  return (
    <Box className="auth-shell">
      <Box className="auth-panel auth-panel-left">
        <Box className="brand-mark" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box className="brand-icon">
            <Diamond fontSize="small" />
          </Box>
          <Typography variant="h6" className="brand-text">
            CRM Pro
          </Typography>
        </Box>

        <Box sx={{ maxWidth: 520 }}>
          <Typography variant="h2" className="hero-title">
            Mijozlarni boshqaring.
            <br />
            Biznesingizni rivojlantiring.
          </Typography>
          <Typography variant="body1" className="hero-subtitle">
            Mijozlar, sotuvlar, vazifalar va jamoangiz faoliyatini yagona platformada boshqaring.
          </Typography>
        </Box>

        <Box className="mock-dashboard" sx={{ width: '100%' }}>
          <Box className="mock-header">CRM Dashboard</Box>
          <Box className="mock-lines" />
          <Box className="mock-lines short" />
          <Box className="mock-lines shorter" />
        </Box>
      </Box>

      <Box className="auth-panel auth-panel-right">
        <Box className="login-wrap">
          <Box className="brand-inline" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <Box className="brand-icon small">
              <Diamond fontSize="small" />
            </Box>
            <Typography variant="h5" className="brand-title">
              CRM Pro
            </Typography>
          </Box>

          <Typography variant="h3" className="login-title">
            {isRegister ? 'Ro‘yxatdan o‘tish' : 'Tizimga kirish'}
          </Typography>
          <Typography variant="body2" className="login-subtitle">
            {isRegister ? 'Yangi hisob yaratish va CRM tizimidan foydalaning.' : 'Hisobingizga kirish uchun ma’lumotlarni kiriting.'}
          </Typography>

          {isRegister && (
            <TextField
              fullWidth
              label="To‘liq ism *"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              margin="dense"
              size="small"
              placeholder="John Doe"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccountCircle fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          )}

          <TextField
            fullWidth
            label={isRegister ? 'Email manzil *' : 'Email manzil'}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            margin="dense"
            size="small"
            placeholder={isRegister ? 'john@example.com' : 'admin@example.com'}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Email fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />

          <TextField
            fullWidth
            label="Parol *"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            margin="dense"
            size="small"
            placeholder={isRegister ? '********' : '********'}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPassword((value) => !value)}>
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          {isRegister && (
            <>
              <TextField
                fullWidth
                label="Parolni tasdiqlang *"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                margin="dense"
                size="small"
                placeholder="********"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Typography variant="body2" className={passwordRulesPassed ? 'password-valid' : 'password-hint'}>
                {password ? (passwordRulesPassed ? '✓ Kamida 8 ta belgi, raqam va katta harf' : 'Kamida 8 ta belgi, raqam va katta harf') : 'Kamida 8 ta belgi, raqam va katta harf'}
              </Typography>
            </>
          )}

          {!isRegister && (
            <Box className="login-extra-row">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} size="small" />
                <Typography variant="body2">Meni eslab qolish</Typography>
              </Box>
              <Typography variant="body2" className="link-label">
                Parolni unutdingizmi?
              </Typography>
            </Box>
          )}

          <Button variant="contained" fullWidth className="login-button" onClick={handleSubmit} disabled={loading}>
            {loading ? <CircularProgress size={22} color="inherit" /> : isRegister ? 'Hisob yaratish' : 'Kirish'}
          </Button>

          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            {isRegister ? 'Hisobingiz bormi?' : 'Hisobingiz yo‘qmi?'}{' '}
            <span
              className="link-label"
              onClick={() => {
                setIsRegister((value) => !value);
                navigate(isRegister ? '/login' : '/register');
              }}
            >
              {isRegister ? 'Kirish' : 'Ro‘yhatdan o‘tish'}
            </span>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [accountMenuAnchor, setAccountMenuAnchor] = useState<HTMLElement | null>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const showingLeads = location.pathname === '/leads';
  const showingContacts = location.pathname === '/contacts';
  const showingAdmin = location.pathname === '/admin';
  const showingWorkspace = location.pathname === '/workspace';
  const sessionUser = getStoredUser();
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    newCustomers: 0,
    activeCustomers: 0,
    contactedCustomers: 0,
    recentCustomers: [],
    totalSales: 0,
    totalWonLeads: 0,
    leadStatusCounts: { new: 0, contacted: 0, proposal: 0, won: 0 },
    monthlySales: [],
    undatedSales: 0,
    undatedDealCount: 0,
    salesOutsideChartWindow: 0,
    dealsOutsideChartWindow: 0,
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<MonthlySales | null>(null);
  const [selectedMonthDetails, setSelectedMonthDetails] = useState<MonthlySalesDetails | null>(null);
  const [salesDetailsLoading, setSalesDetailsLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (location.pathname !== '/dashboard') {
      setLoading(false);
      return;
    }
    const loadDashboardData = async () => {
      try {
        const dashboardData = await getDashboardStats();

        setStats(dashboardData);
        setCustomers(dashboardData.recentCustomers);
        setSelectedMonth((current) => current || dashboardData.monthlySales[dashboardData.monthlySales.length - 1] || null);
      } catch (error) {
        toast.error('Dashboard ma’lumotlari yuklanmadi');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [location.pathname, sessionUser?.role]);

  useEffect(() => {
    if (!selectedMonth || location.pathname !== '/dashboard') return;
    let cancelled = false;
    setSalesDetailsLoading(true);
    setSelectedMonthDetails(null);
    getMonthlySales(selectedMonth.year, selectedMonth.month)
      .then((details) => {
        if (!cancelled) setSelectedMonthDetails(details);
      })
      .catch(() => {
        if (!cancelled) toast.error('Tanlangan oy savdo ma’lumotlarini yuklab bo‘lmadi');
      })
      .finally(() => {
        if (!cancelled) setSalesDetailsLoading(false);
      });
    return () => { cancelled = true; };
  }, [location.pathname, selectedMonth?.year, selectedMonth?.month]);

  const allNavItems: { label: string; icon: ReactNode; path: string }[] = [
    { label: 'Dashboard', icon: <DashboardOutlined />, path: '/dashboard' },
    { label: 'Leads', icon: <GroupsOutlined />, path: '/leads' },
    { label: 'Contacts', icon: <PersonOutlineOutlined />, path: '/contacts' },
    { label: 'Companies', icon: <BusinessOutlined />, path: '/companies' },
    { label: 'Tasks', icon: <TaskAltOutlined />, path: '/tasks' },
    { label: 'Calendar', icon: <CalendarMonthOutlined />, path: '/calendar' },
    { label: 'Reports', icon: <AssessmentOutlined />, path: '/reports' },
    { label: 'Admin', icon: <GroupsOutlined />, path: '/admin' },
    { label: 'Settings', icon: <SettingsOutlined />, path: '/settings' },
  ];
  const navItems = sessionUser?.role === 'admin'
    ? allNavItems.filter((item) => ['/dashboard', '/admin', '/settings'].includes(item.path))
    : sessionUser?.role === 'user'
      ? [
        { label: 'Mening sahifam', icon: <PersonOutlineOutlined />, path: '/workspace' },
        { label: 'Settings', icon: <SettingsOutlined />, path: '/settings' },
      ]
      : allNavItems.filter((item) => item.path !== '/admin');

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  const statusLabels: Record<string, string> = {
    new: 'Yangi',
    contacted: 'Bog‘langan',
    active: 'Faol',
    inactive: 'Nofaol',
  };

  const statCards = [
    { label: 'Jami kontaktlar', value: stats.totalCustomers.toLocaleString('uz-UZ'), change: `${stats.newCustomers} ta yangi`, color: '#1f2340' },
    { label: 'Faol kontaktlar', value: stats.activeCustomers.toLocaleString('uz-UZ'), change: `${stats.contactedCustomers} ta bog‘langan`, color: '#4855f3' },
    { label: 'Yutuqli bitimlar', value: stats.totalWonLeads.toLocaleString('uz-UZ'), change: 'Won holatidagi leadlar', color: '#3d4cc7' },
    { label: 'Sotuv hajmi', value: formatCurrency(stats.totalSales), change: 'Yutuqli leadlar budjeti', color: '#7277d8' },
  ];

  const leadStatusEntries: { key: LeadStatus; label: string; color: string }[] = [
    { key: 'new', label: 'Yangi', color: '#4a5efb' },
    { key: 'contacted', label: 'Bog‘langan', color: '#6e7adf' },
    { key: 'proposal', label: 'Taklif yuborilgan', color: '#dbdfe7' },
    { key: 'won', label: 'Yutuqli', color: '#bfc5d6' },
  ];
  const totalLeads = Object.values(stats.leadStatusCounts).reduce((total, count) => total + count, 0);
  let leadStatusStop = 0;
  const leadStatusGradient = totalLeads
    ? `conic-gradient(${leadStatusEntries.map(({ key, color }) => {
      const start = leadStatusStop;
      leadStatusStop += (stats.leadStatusCounts[key] / totalLeads) * 100;
      return `${color} ${start}% ${leadStatusStop}%`;
    }).join(', ')})`
    : 'conic-gradient(#e5e8ef 0 100%)';
  const maxMonthlySales = Math.max(1, ...stats.monthlySales.map(({ totalSales }) => totalSales));
  const monthLabel = (year: number, month: number, options: { month?: 'short' | 'long'; year?: 'numeric' } = {}) => {
    const shortMonths = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
    const longMonths = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
    const name = (options.month === 'long' ? longMonths : shortMonths)[month - 1];
    return options.year ? `${name} ${year}` : name;
  };

  const recentCustomers = customers.slice(0, 5);

  return (
    <Box className="premium-dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <span className="brand-diamond"><Diamond fontSize="small" /></span>
          <span>CRM Pro</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`nav-item ${item.path === location.pathname ? 'active' : ''}`}
              type="button"
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot" />
          <span>Tizim faol</span>
        </div>
        <div className="version-tag">CRM Pro • v1.0</div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="search-box">
            <SearchOutlined fontSize="small" />
            <input type="text" placeholder="Qidirish..." aria-label="Search" />
          </div>

          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="notifications">
              <NotificationsNoneOutlined fontSize="small" />
            </button>
            <button
              className="user-pill"
              type="button"
              aria-haspopup="menu"
              aria-expanded={Boolean(accountMenuAnchor)}
              onClick={(event) => setAccountMenuAnchor(event.currentTarget)}
            >
              <div className="avatar-circle">{(sessionUser?.name || 'JD').split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
              <span>{sessionUser?.name || 'Foydalanuvchi'}</span>
              <span className="user-pill-chevron">⌄</span>
            </button>
            <Menu
              anchorEl={accountMenuAnchor}
              open={Boolean(accountMenuAnchor)}
              onClose={() => setAccountMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{ list: { 'aria-label': 'Hisob menyusi' } }}
            >
              <MenuItem onClick={() => { setAccountMenuAnchor(null); navigate('/settings'); }}>
                <SettingsOutlined fontSize="small" sx={{ mr: 1.25 }} />
                Sozlamalar
              </MenuItem>
              <MenuItem onClick={() => { setAccountMenuAnchor(null); setLogoutDialogOpen(true); }}>
                <LogoutOutlined fontSize="small" sx={{ mr: 1.25 }} />
                Tizimdan chiqish
              </MenuItem>
            </Menu>
          </div>
        </header>

        <Dialog
          open={logoutDialogOpen}
          onClose={() => setLogoutDialogOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Tizimdan chiqish</DialogTitle>
          <DialogContent>
            <Typography>Haqiqatan ham tizimdan chiqmoqchimisiz?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLogoutDialogOpen(false)}>Bekor qilish</Button>
            <Button
              color="error"
              variant="contained"
              startIcon={<LogoutOutlined />}
              onClick={() => {
                removeToken();
                setLogoutDialogOpen(false);
                navigate('/login', { replace: true });
              }}
            >
              Chiqish
            </Button>
          </DialogActions>
        </Dialog>

        <div className="dashboard-content">
          {showingAdmin ? (
            <AdminPanel />
          ) : showingWorkspace ? (
            <UserWorkspace userName={sessionUser?.name || 'Foydalanuvchi'} />
          ) : location.pathname === '/settings' ? (
            <SettingsPage />
          ) : showingContacts ? (
            <ContactsPage />
          ) : showingLeads ? (
            <LeadsBoard />
          ) : location.pathname !== '/dashboard' ? (
            <ModulePlaceholder title={allNavItems.find((item) => item.path === location.pathname)?.label || 'Bo‘lim'} />
          ) : (
          <>
          <div className="page-title-wrap">
            <h1>Dashboard</h1>
            <p>Xush kelibsiz! Bugungi biznes ko‘rsatkichlari.</p>
          </div>

          {loading ? (
            <div className="loading-panel">
              <CircularProgress size={28} />
              <span>Ma’lumotlar yuklanmoqda...</span>
            </div>
          ) : (
            <>
              <div className="stat-grid">
                {statCards.map((item) => (
                  <div className="stat-card" key={item.label}>
                    <div className="stat-label">{item.label}</div>
                    <div className="stat-value">{item.value}</div>
                    <div className="stat-change" style={{ color: item.label.includes('Ochiq') ? '#d54b4b' : '#1ab97a' }}>
                      {item.change}
                    </div>
                  </div>
                ))}
              </div>

              <div className="analytics-row">
                <div className="panel chart-panel">
                  <div className="chart-panel-heading">
                    <div>
                      <h3>Sotuvlar dinamikasi</h3>
                      <p>So‘nggi 12 oyda Won holatiga o‘tgan leadlar summasi</p>
                    </div>
                  </div>
                  <div className="bars-wrap">
                    {stats.monthlySales.map((month) => {
                      const selected = selectedMonth?.year === month.year && selectedMonth.month === month.month;
                      const barHeight = month.totalSales ? Math.max(4, (month.totalSales / maxMonthlySales) * 75) : 0;
                      return (
                        <button
                          key={`${month.year}-${month.month}`}
                          type="button"
                          className={`bar-col ${selected ? 'selected' : ''}`}
                          aria-pressed={selected}
                          aria-label={`${monthLabel(month.year, month.month, { month: 'long', year: 'numeric' })}: ${formatCurrency(month.totalSales)}, ${month.dealCount} ta bitim`}
                          title={`${formatCurrency(month.totalSales)} • ${month.dealCount} ta yutuqli bitim`}
                          onClick={() => setSelectedMonth(month)}
                        >
                          <span className={`bar ${month.totalSales ? '' : 'empty'}`} style={{ height: `${barHeight}%` }} />
                          <span className="bar-month">{monthLabel(month.year, month.month)}</span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedMonth && (
                    <div className="selected-month-panel" aria-live="polite">
                      <div className="selected-month-summary">
                        <div>
                          <strong>{monthLabel(selectedMonth.year, selectedMonth.month, { month: 'long', year: 'numeric' })}</strong>
                          <span>{selectedMonthDetails?.dealCount ?? selectedMonth.dealCount} ta yutuqli bitim</span>
                        </div>
                        <strong>{formatCurrency(selectedMonthDetails?.totalSales ?? selectedMonth.totalSales)}</strong>
                      </div>
                      {salesDetailsLoading ? (
                        <div className="sales-details-loading"><CircularProgress size={18} /> Bitimlar yuklanmoqda...</div>
                      ) : selectedMonthDetails?.deals.length ? (
                        <div className="sales-deal-list">
                          {selectedMonthDetails.deals.map((deal) => (
                            <div className="sales-deal-row" key={deal._id}>
                              <span><strong>{deal.name}</strong><small>{deal.company}</small></span>
                              <strong>{formatCurrency(deal.budget)}</strong>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="sales-empty-state">Bu oyda qayd etilgan yutuqli bitim yo‘q.</p>
                      )}
                    </div>
                  )}
                  {(stats.undatedDealCount > 0 || stats.dealsOutsideChartWindow > 0) && (
                    <p className="sales-data-note">
                      {stats.undatedDealCount > 0 && (
                        <>Yana {stats.undatedDealCount} ta avvaldan Won bo‘lgan leadning yutish sanasi saqlanmagan ({formatCurrency(stats.undatedSales)}). </>
                      )}
                      {stats.dealsOutsideChartWindow > 0 && (
                        <>{stats.dealsOutsideChartWindow} ta bitim so‘nggi 12 oydan tashqarida ({formatCurrency(stats.salesOutsideChartWindow)}).</>
                      )}
                      {' '}Ular tanlangan oylar grafigiga kiritilmagan.
                    </p>
                  )}
                </div>

                <div className="panel donut-panel">
                  <h3>Leadlar holati</h3>
                  <div className="donut-chart-wrap">
                    <div className="donut-chart" style={{ background: leadStatusGradient }}>
                      <div className="donut-center">
                        <strong>{totalLeads.toLocaleString('uz-UZ')}</strong>
                        <span>jami lead</span>
                      </div>
                    </div>
                  </div>
                  <div className="legend-list">
                    {leadStatusEntries.map(({ key, label, color }) => {
                      const count = stats.leadStatusCounts[key];
                      const percentage = totalLeads ? Math.round((count / totalLeads) * 100) : 0;
                      return (
                        <span className="legend-item" key={key}>
                          <i className="dot" style={{ backgroundColor: color }} />
                          {label}: {count} ({percentage}%)
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="panel activity-panel">
                <h3>Oxirgi mijozlar</h3>
                <div className="customer-table-wrap">
                  <table className="customer-table">
                    <thead>
                      <tr>
                        <th>Ism</th>
                        <th>Kompaniya</th>
                        <th>Status</th>
                        <th>Byudjet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentCustomers.length ? recentCustomers.map((customer) => (
                          <tr key={customer._id || customer.email}>
                            <td>{customer.fullName}</td>
                            <td>{customer.company || '—'}</td>
                            <td>
                              <span className={`status-badge ${customer.status}`}>
                                {statusLabels[customer.status] || customer.status}
                              </span>
                            </td>
                            <td>{formatCurrency(Number(customer.budget || 0))}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={4} className="dashboard-empty-cell">Hozircha kontaktlar mavjud emas.</td></tr>
                        )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
          </>
          )}
        </div>
      </main>
    </Box>
  );
}

const customerStatusOptions: { value: CustomerStatus; label: string }[] = [
  { value: 'new', label: 'Yangi' },
  { value: 'contacted', label: 'Bog‘langan' },
  { value: 'active', label: 'Faol' },
  { value: 'inactive', label: 'Nofaol' },
];

const customerSourceOptions: { value: CustomerSource; label: string }[] = [
  { value: 'telegram', label: 'Telegram' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'website', label: 'Veb-sayt' },
  { value: 'other', label: 'Boshqa' },
];

const userRoleOptions: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'user', label: 'User' },
];

const defaultPreferences: UserPreferences = {
  notifications: { email: true, leads: true, tasks: true },
  systemSettings: { timeZone: 'Asia/Tashkent', dateFormat: 'DD.MM.YYYY' },
};

function SettingsPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', company: '', language: 'uz' as 'uz' | 'ru' | 'en', avatarData: '' });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  useEffect(() => {
    getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        saveSessionUser(currentUser);
        setProfile({
          name: currentUser.name,
          email: currentUser.email,
          phone: currentUser.phone || '',
          company: currentUser.company || '',
          language: currentUser.language || 'uz',
          avatarData: currentUser.avatarData || '',
        });
        setPreferences({
          notifications: currentUser.notifications || defaultPreferences.notifications,
          systemSettings: currentUser.systemSettings || defaultPreferences.systemSettings,
        });
      })
      .catch(() => toast.error('Sozlamalar ma’lumotlarini yuklab bo‘lmadi'))
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async () => {
    const name = profile.name.trim();
    const email = profile.email.trim().toLowerCase();
    if (name.length < 2 || name.length > 100) {
      toast.error('Ism 2 dan 100 tagacha belgidan iborat bo‘lishi kerak');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Email manzil formati noto‘g‘ri');
      return;
    }
    if (profile.phone.length > 30 || (profile.phone && !/^[+()\d\s-]+$/.test(profile.phone))) {
      toast.error('Telefon raqam formati noto‘g‘ri');
      return;
    }
    if (profile.company.trim().length > 120) {
      toast.error('Kompaniya nomi 120 belgidan oshmasligi kerak');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateProfile({
        name,
        email,
        phone: profile.phone.trim(),
        company: profile.company.trim(),
        language: profile.language,
        avatarData: profile.avatarData,
      });
      setUser(updated);
      saveSessionUser(updated);
      toast.success('Profil ma’lumotlari saqlandi');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Profilni saqlab bo‘lmadi');
    } finally {
      setSaving(false);
    }
  };

  const saveNewPassword = async () => {
    if (!currentPassword) {
      toast.error('Joriy parolni kiriting');
      return;
    }
    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)) {
      toast.error('Yangi parolda kamida 8 ta belgi, bitta katta harf va bitta raqam bo‘lishi kerak');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('Yangi parollar mos kelmadi');
      return;
    }

    setSaving(true);
    try {
      await updatePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      toast.success('Parol muvaffaqiyatli yangilandi');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Parolni yangilab bo‘lmadi');
    } finally {
      setSaving(false);
    }
  };

  const saveUserPreferences = async () => {
    setSaving(true);
    try {
      const updated = await updatePreferences(preferences);
      setPreferences({
        notifications: updated.notifications || defaultPreferences.notifications,
        systemSettings: updated.systemSettings || defaultPreferences.systemSettings,
      });
      if (user) saveSessionUser({ ...user, ...updated });
      toast.success('Sozlamalar saqlandi');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Sozlamalarni saqlab bo‘lmadi');
    } finally {
      setSaving(false);
    }
  };

  const roleTitle = userRoleOptions.find((option) => option.value === user?.role)?.label || 'User';

  return (
    <section className="settings-page">
      <div className="page-title-wrap settings-title-wrap">
        <h1>Sozlamalar</h1>
        <p>Shaxsiy ma’lumot va xavfsizlik parametrlarini sozlang.</p>
      </div>

      {loading ? (
        <div className="loading-panel"><CircularProgress size={28} /><span>Sozlamalar yuklanmoqda...</span></div>
      ) : (
        <div className="settings-panel">
          <Tabs
            value={selectedTab}
            onChange={(_event, nextTab: number) => setSelectedTab(nextTab)}
            variant="scrollable"
            scrollButtons="auto"
            className="settings-tabs"
            aria-label="Sozlamalar bo‘limlari"
          >
            <Tab label="Profil" />
            <Tab label="Parolni o‘zgartirish" icon={<SecurityOutlined fontSize="small" />} iconPosition="start" />
            <Tab label="Bildirishnomalar" icon={<NotificationsActiveOutlined fontSize="small" />} iconPosition="start" />
            <Tab label="Tizim sozlamalari" icon={<LanguageOutlined fontSize="small" />} iconPosition="start" />
          </Tabs>

          {selectedTab === 0 && (
            <div className="settings-tab-content">
              <div className="settings-avatar-section">
                <div className="settings-avatar-preview">
                  {profile.avatarData
                    ? <img src={profile.avatarData} alt="Profil rasmi" />
                    : <span>{profile.name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'U'}</span>}
                </div>
                <div className="settings-avatar-actions">
                  <strong>Profil rasmi</strong>
                  <span>PNG, JPG yoki WEBP. Maksimal hajmi 2 MB.</span>
                  <Button component="label" variant="outlined" size="small">
                    Rasm tanlash
                    <input
                      hidden
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (!file) return;
                        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
                          toast.error('PNG, JPG yoki WEBP rasm tanlang (maksimal 2 MB)');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === 'string') setProfile((current) => ({ ...current, avatarData: reader.result as string }));
                        };
                        reader.onerror = () => toast.error('Rasmni o‘qib bo‘lmadi');
                        reader.readAsDataURL(file);
                      }}
                    />
                  </Button>
                  {profile.avatarData && <Button size="small" color="error" onClick={() => setProfile((current) => ({ ...current, avatarData: '' }))}>Olib tashlash</Button>}
                </div>
              </div>
              <div className="settings-profile-grid">
                <TextField label="Ism familya *" value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} slotProps={{ htmlInput: { maxLength: 100 } }} fullWidth />
                <TextField label="Lavozim" value={roleTitle} disabled fullWidth />
                <TextField label="Email manzil *" type="email" value={profile.email} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} fullWidth />
                <TextField label="Telefon" type="tel" value={profile.phone} onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))} fullWidth />
                <TextField label="Kompaniya" value={profile.company} onChange={(event) => setProfile((current) => ({ ...current, company: event.target.value }))} fullWidth />
                <TextField select label="Til" value={profile.language} onChange={(event) => setProfile((current) => ({ ...current, language: event.target.value as 'uz' | 'ru' | 'en' }))} fullWidth>
                  <MenuItem value="uz">O‘zbekcha</MenuItem>
                  <MenuItem value="ru">Русский</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                </TextField>
              </div>
              <Button variant="contained" startIcon={<SaveOutlined />} onClick={() => void saveProfile()} disabled={saving} className="settings-save-button">
                {saving ? <CircularProgress size={20} color="inherit" /> : 'O‘zgarishlarni saqlash'}
              </Button>
            </div>
          )}

          {selectedTab === 1 && (
            <div className="settings-tab-content settings-security-content">
              <div className="settings-section-intro"><SecurityOutlined /><div><strong>Hisob xavfsizligi</strong><span>Hisobingizni himoya qilish uchun kuchli parol tanlang.</span></div></div>
              <div className="settings-password-grid">
                <TextField label="Joriy parol *" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} fullWidth />
                <span />
                <TextField label="Yangi parol *" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} helperText="Kamida 8 belgi, katta harf va raqam" fullWidth />
                <TextField label="Yangi parolni tasdiqlang *" type="password" value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} fullWidth />
              </div>
              <Button variant="contained" startIcon={<SecurityOutlined />} onClick={() => void saveNewPassword()} disabled={saving} className="settings-save-button">
                {saving ? <CircularProgress size={20} color="inherit" /> : 'Parolni yangilash'}
              </Button>
            </div>
          )}

          {selectedTab === 2 && (
            <div className="settings-tab-content settings-preferences-content">
              <div className="settings-section-intro"><NotificationsActiveOutlined /><div><strong>Bildirishnoma tanlovlari</strong><span>Qaysi xabarlarni olishni belgilang.</span></div></div>
              <div className="settings-switch-list">
                <FormControlLabel control={<Switch checked={preferences.notifications.email} onChange={(event) => setPreferences((current) => ({ ...current, notifications: { ...current.notifications, email: event.target.checked } }))} />} label="Email orqali muhim bildirishnomalar" />
                <FormControlLabel control={<Switch checked={preferences.notifications.leads} onChange={(event) => setPreferences((current) => ({ ...current, notifications: { ...current.notifications, leads: event.target.checked } }))} />} label="Yangi leadlar va status o‘zgarishlari" />
                <FormControlLabel control={<Switch checked={preferences.notifications.tasks} onChange={(event) => setPreferences((current) => ({ ...current, notifications: { ...current.notifications, tasks: event.target.checked } }))} />} label="Vazifalar va eslatmalar" />
              </div>
              <Button variant="contained" onClick={() => void saveUserPreferences()} disabled={saving} className="settings-save-button">
                {saving ? <CircularProgress size={20} color="inherit" /> : 'Bildirishnomalarni saqlash'}
              </Button>
            </div>
          )}

          {selectedTab === 3 && (
            <div className="settings-tab-content settings-system-content">
              <div className="settings-section-intro"><LanguageOutlined /><div><strong>Hudud va formatlar</strong><span>CRM interfeysida ishlatiladigan sana va vaqtni tanlang.</span></div></div>
              <div className="settings-profile-grid settings-system-grid">
                <TextField select label="Vaqt mintaqasi" value={preferences.systemSettings.timeZone} onChange={(event) => setPreferences((current) => ({ ...current, systemSettings: { ...current.systemSettings, timeZone: event.target.value } }))} fullWidth>
                  <MenuItem value="Asia/Tashkent">Toshkent (UTC+05:00)</MenuItem>
                  <MenuItem value="UTC">UTC</MenuItem>
                  <MenuItem value="Europe/Moscow">Moskva (UTC+03:00)</MenuItem>
                </TextField>
                <TextField select label="Sana formati" value={preferences.systemSettings.dateFormat} onChange={(event) => setPreferences((current) => ({ ...current, systemSettings: { ...current.systemSettings, dateFormat: event.target.value as 'DD.MM.YYYY' | 'YYYY-MM-DD' } }))} fullWidth>
                  <MenuItem value="DD.MM.YYYY">DD.MM.YYYY</MenuItem>
                  <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                </TextField>
              </div>
              <Button variant="contained" startIcon={<SaveOutlined />} onClick={() => void saveUserPreferences()} disabled={saving} className="settings-save-button">
                {saving ? <CircularProgress size={20} color="inherit" /> : 'Tizim sozlamalarini saqlash'}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function AdminPanel() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminUserStats>({
    totalUsers: 0,
    administrators: 0,
    managers: 0,
    activeUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 7;
  const [accessDenied, setAccessDenied] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as UserRole,
    isActive: true,
  });

  useEffect(() => {
    getAdminUsers()
      .then((response) => {
        setUsers(response.users);
        setStats(response.stats);
      })
      .catch((error: { response?: { status?: number } }) => {
        if (error.response?.status === 403) {
          setAccessDenied(true);
        } else {
          toast.error('Foydalanuvchilarni yuklab bo‘lmadi');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const updateStats = (updatedUsers: AdminUser[]) => {
    setStats({
      totalUsers: updatedUsers.length,
      administrators: updatedUsers.filter((user) => user.role === 'admin').length,
      managers: updatedUsers.filter((user) => user.role === 'manager').length,
      activeUsers: updatedUsers.filter((user) => user.isActive).length,
    });
  };

  const resetForm = () => {
    setEditingUser(null);
    setForm({ name: '', email: '', password: '', role: 'user', isActive: true });
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (user: AdminUser) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      isActive: user.isActive,
    });
    setDialogOpen(true);
  };

  const handleSaveUser = async () => {
    const name = form.name.trim();
    const email = form.email.trim();
    if (name.length < 2 || name.length > 100 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Ism va to‘g‘ri email manzilini kiriting');
      return;
    }
    const strongPassword = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!editingUser && !strongPassword.test(form.password)) {
      toast.error('Parolda kamida 8 ta belgi, bitta katta harf va bitta raqam bo‘lishi kerak');
      return;
    }
    if (form.password && !strongPassword.test(form.password)) {
      toast.error('Yangi parolda kamida 8 ta belgi, bitta katta harf va bitta raqam bo‘lishi kerak');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        email,
        role: form.role,
        isActive: form.isActive,
        ...(form.password ? { password: form.password } : {}),
      };
      if (editingUser) {
        const updated = await updateAdminUser(editingUser._id, payload);
        const nextUsers = users.map((user) => user._id === updated._id ? updated : user);
        setUsers(nextUsers);
        updateStats(nextUsers);
        const signedInUser = getStoredUser();
        if (signedInUser?.id === updated._id) {
          saveSessionUser({ ...signedInUser, name: updated.name, email: updated.email, role: updated.role, isActive: updated.isActive });
          if (!updated.isActive) {
            removeToken();
            navigate('/login', { replace: true });
          } else if (signedInUser.role !== updated.role) {
            navigate(updated.role === 'user' ? '/workspace' : '/dashboard', { replace: true });
          }
        }
        toast.success('Foydalanuvchi ma’lumotlari yangilandi');
      } else {
        const created = await createAdminUser({ ...payload, password: form.password });
        const nextUsers = [created, ...users];
        setUsers(nextUsers);
        updateStats(nextUsers);
        toast.success('Yangi foydalanuvchi qo‘shildi');
      }
      setDialogOpen(false);
      resetForm();
    } catch {
      toast.error(editingUser ? 'Foydalanuvchini yangilab bo‘lmadi' : 'Foydalanuvchini qo‘shib bo‘lmadi');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      await deleteAdminUser(deletingUser._id);
      const nextUsers = users.filter((user) => user._id !== deletingUser._id);
      setUsers(nextUsers);
      updateStats(nextUsers);
      setDeletingUser(null);
      toast.success('Foydalanuvchi o‘chirildi');
    } catch {
      toast.error('Foydalanuvchini o‘chirib bo‘lmadi. O‘zingizni yoki oxirgi adminni o‘chirib bo‘lmaydi.');
    } finally {
      setDeleting(false);
    }
  };

  const visibleUsers = users.filter((user) => {
    const query = search.trim().toLocaleLowerCase();
    return (!query || `${user.name} ${user.email}`.toLocaleLowerCase().includes(query))
      && (!roleFilter || user.role === roleFilter)
      && (!statusFilter || String(user.isActive) === statusFilter);
  });
  const pageCount = Math.max(1, Math.ceil(visibleUsers.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageUsers = visibleUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const statItems = [
    { label: 'Jami foydalanuvchi', value: stats.totalUsers },
    { label: 'Administratorlar', value: stats.administrators },
    { label: 'Managerlar', value: stats.managers },
    { label: 'Faol foydalanuvchilar', value: stats.activeUsers },
  ];

  if (accessDenied) {
    return (
      <section className="admin-page">
        <div className="page-title-wrap"><h1>Admin Panel</h1><p>Foydalanuvchilar, rollar va ruxsatlarni boshqaring.</p></div>
        <div className="admin-access-denied">
          <AdminPanelSettingsOutlined />
          <strong>Bu bo‘lim faqat administratorlar uchun.</strong>
          <span>Admin ruxsati bo‘lgan hisob bilan qayta kiring.</span>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-page">
      <div className="page-title-wrap admin-title-wrap">
        <h1>Admin Panel</h1>
        <p>Foydalanuvchilar, rollar va ruxsatlarni boshqaring.</p>
      </div>

      {loading ? (
        <div className="loading-panel"><CircularProgress size={28} /><span>Foydalanuvchilar yuklanmoqda...</span></div>
      ) : (
        <>
          <div className="admin-stats-grid">
            {statItems.map((item, index) => (
              <div className="admin-stat-card" key={item.label}>
                <span className={`admin-stat-icon tone-${index}`}><AdminPanelSettingsOutlined fontSize="small" /></span>
                <div>
                  <span>{item.label}</span>
                  <strong>{item.value.toLocaleString('uz-UZ')}</strong>
                </div>
              </div>
            ))}
          </div>

          <div className="admin-section-heading">
            <div><h2>Foydalanuvchilar ro‘yxati</h2><p>Hisoblar va ularga berilgan ruxsatlarni boshqaring.</p></div>
            <Button variant="contained" startIcon={<PersonAddAlt1 />} onClick={openCreateDialog} className="new-lead-button">
              Foydalanuvchi qo‘shish
            </Button>
          </div>

          <div className="contacts-toolbar admin-toolbar">
            <div className="contacts-tools">
              <label className="leads-search contacts-search">
                <SearchOutlined fontSize="small" />
                <input aria-label="Foydalanuvchi qidirish" placeholder="Ism yoki email qidirish..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
              </label>
              <label className="leads-filter">
                <FilterList fontSize="small" />
                <select aria-label="Rol bo‘yicha filter" value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setPage(1); }}>
                  <option value="">Barcha rollar</option>
                  {userRoleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="leads-filter">
                <select aria-label="Holat bo‘yicha filter" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
                  <option value="">Barcha holatlar</option>
                  <option value="true">Faol</option>
                  <option value="false">Nofaol</option>
                </select>
              </label>
            </div>
          </div>

          <div className="contacts-table-panel admin-table-panel">
            <div className="leads-table-scroll">
              <table className="contacts-table admin-table">
                <thead>
                  <tr><th>Foydalanuvchi</th><th>Email</th><th>Rol</th><th>Holati</th><th>Amallar</th></tr>
                </thead>
                <tbody>
                  {pageUsers.map((user) => (
                    <tr key={user._id}>
                      <td className="contacts-name"><span className="admin-user-avatar">{user.name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>{user.name}</td>
                      <td>{user.email}</td>
                      <td><span className={`admin-role-badge ${user.role}`}>{userRoleOptions.find((option) => option.value === user.role)?.label || user.role}</span></td>
                      <td><span className={`admin-status-badge ${user.isActive ? 'active' : 'inactive'}`}>{user.isActive ? 'Faol' : 'Nofaol'}</span></td>
                      <td>
                        <div className="lead-table-actions">
                          <IconButton aria-label={`${user.name} foydalanuvchisini tahrirlash`} title="Tahrirlash" onClick={() => openEditDialog(user)}><EditOutlined fontSize="small" /></IconButton>
                          <IconButton aria-label={`${user.name} foydalanuvchisini o‘chirish`} title="O‘chirish" onClick={() => setDeletingUser(user)}><DeleteOutlined fontSize="small" /></IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!pageUsers.length && (
                    <tr><td className="leads-table-empty" colSpan={5}>{users.length ? 'Filterga mos foydalanuvchi topilmadi' : 'Hozircha foydalanuvchilar mavjud emas'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="leads-pagination">
              <span>{visibleUsers.length} ta foydalanuvchi</span>
              <div className="leads-pagination-controls">
                <IconButton size="small" aria-label="Oldingi sahifa" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft fontSize="small" /></IconButton>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                  <button key={pageNumber} type="button" className={currentPage === pageNumber ? 'active' : ''} onClick={() => setPage(pageNumber)}>{pageNumber}</button>
                ))}
                <IconButton size="small" aria-label="Keyingi sahifa" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}><ChevronRight fontSize="small" /></IconButton>
              </div>
            </div>
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle className="admin-dialog-title">
          <span className="admin-dialog-icon"><PersonAddAlt1 /></span>
          <span>{editingUser ? 'Foydalanuvchini tahrirlash' : 'Yangi foydalanuvchi'}</span>
        </DialogTitle>
        <DialogContent className="admin-form-grid">
          <TextField label="Foydalanuvchi ismi *" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} autoFocus fullWidth />
          <TextField label="Email manzili *" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} fullWidth />
          <TextField
            label={editingUser ? 'Yangi parol (ixtiyoriy)' : 'Parol *'}
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            helperText={editingUser ? 'O‘zgartirmaslik uchun bo‘sh qoldiring' : 'Kamida 8 ta belgi'}
            fullWidth
          />
          <TextField select label="Foydalanuvchi roli *" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as UserRole }))} fullWidth>
            {userRoleOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
          </TextField>
          <TextField select label="Hisob holati *" value={String(form.isActive)} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === 'true' }))} fullWidth>
            <MenuItem value="true">Faol</MenuItem>
            <MenuItem value="false">Nofaol</MenuItem>
          </TextField>
          <div className="admin-permission-hint">
            <AdminPanelSettingsOutlined fontSize="small" />
            <span>Admin — Dashboard va admin panelni boshqaradi. Manager barcha CRM bo‘limlariga, User esa faqat o‘z ish sahifasiga kira oladi.</span>
          </div>
        </DialogContent>
        <DialogActions className="admin-dialog-actions">
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Bekor qilish</Button>
          <Button variant="contained" onClick={() => void handleSaveUser()} disabled={saving}>
            {saving ? <CircularProgress size={20} color="inherit" /> : editingUser ? 'O‘zgarishlarni saqlash' : 'Foydalanuvchi yaratish'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deletingUser)} onClose={() => !deleting && setDeletingUser(null)} maxWidth="xs" fullWidth>
        <DialogTitle className="delete-dialog-title">Foydalanuvchini o‘chirish</DialogTitle>
        <DialogContent>
          <Typography><strong>{deletingUser?.name}</strong> foydalanuvchisini haqiqatan ham o‘chirmoqchimisiz?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Bu amalni ortga qaytarib bo‘lmaydi. Oxirgi administrator hisobini o‘chirib bo‘lmaydi.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingUser(null)} disabled={deleting}>Bekor qilish</Button>
          <Button color="error" variant="contained" onClick={() => void confirmDeleteUser()} disabled={deleting}>
            {deleting ? <CircularProgress size={20} color="inherit" /> : 'Ha, o‘chirish'}
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}

function ContactsPage() {
  const [contacts, setContacts] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Customer | null>(null);
  const [deletingContact, setDeletingContact] = useState<Customer | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 7;
  const [form, setForm] = useState<Customer>({
    fullName: '',
    email: '',
    phone: '',
    company: '',
    city: '',
    status: 'new',
    source: 'other',
    budget: 0,
    notes: '',
  });

  useEffect(() => {
    getCustomers()
      .then(setContacts)
      .catch(() => toast.error('Kontaktlarni yuklab bo‘lmadi'))
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setEditingContact(null);
    setForm({
      fullName: '',
      email: '',
      phone: '',
      company: '',
      city: '',
      status: 'new',
      source: 'other',
      budget: 0,
      notes: '',
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (contact: Customer) => {
    setEditingContact(contact);
    setForm({ ...contact, budget: Number(contact.budget || 0) });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const email = form.email.trim();
    if (form.fullName.trim().length < 2 || form.fullName.trim().length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Ism-familiya (2–120 belgi) va to‘g‘ri email manzilini kiriting');
      return;
    }
    const customerBudget = Number(form.budget);
    if (!Number.isFinite(customerBudget) || customerBudget < 0) {
      toast.error('Byudjet nol yoki undan katta son bo‘lishi kerak');
      return;
    }
    if (form.phone.length > 30 || (form.phone && !/^[+()\d\s-]+$/.test(form.phone))) {
      toast.error('Telefon raqam formati noto‘g‘ri');
      return;
    }

    setSaving(true);
    const payload: Customer = {
      ...form,
      fullName: form.fullName.trim(),
      email,
      phone: form.phone.trim(),
      company: form.company.trim(),
      city: form.city.trim(),
      notes: form.notes.trim(),
      budget: customerBudget,
    };

    try {
      if (editingContact?._id) {
        const updated = await updateCustomer(editingContact._id, payload);
        setContacts((current) => current.map((contact) => contact._id === updated._id ? updated : contact));
        toast.success('Kontakt ma’lumotlari yangilandi');
      } else {
        const created = await createCustomer(payload);
        setContacts((current) => [created, ...current]);
        toast.success('Yangi kontakt qo‘shildi');
      }
      setDialogOpen(false);
      resetForm();
    } catch {
      toast.error(editingContact ? 'Kontaktni yangilab bo‘lmadi' : 'Kontaktni qo‘shib bo‘lmadi');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingContact?._id) return;
    setDeleting(true);
    try {
      await deleteCustomer(deletingContact._id);
      setContacts((current) => current.filter((contact) => contact._id !== deletingContact._id));
      setDeletingContact(null);
      toast.success('Kontakt o‘chirildi');
    } catch {
      toast.error('Kontaktni o‘chirib bo‘lmadi');
    } finally {
      setDeleting(false);
    }
  };

  const visibleContacts = contacts.filter((contact) => {
    const query = search.trim().toLocaleLowerCase();
    const matchesSearch = !query
      || `${contact.fullName} ${contact.company} ${contact.email} ${contact.phone}`.toLocaleLowerCase().includes(query);
    return matchesSearch
      && (!statusFilter || contact.status === statusFilter)
      && (!sourceFilter || contact.source === sourceFilter);
  });
  const pageCount = Math.max(1, Math.ceil(visibleContacts.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageContacts = visibleContacts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const updateForm = <K extends keyof Customer>(key: K, value: Customer[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="contacts-page">
      <div className="page-title-wrap contacts-title-wrap">
        <h1>Kontaktlar</h1>
        <p>Mijozlar bilan aloqa ma’lumotlarini boshqarish.</p>
      </div>

      <div className="contacts-toolbar">
        <div className="contacts-tools">
          <label className="leads-search contacts-search">
            <SearchOutlined fontSize="small" />
            <input
              aria-label="Kontakt qidirish"
              placeholder="Kontakt qidirish..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <Button
            className={`contacts-filter-button ${filterOpen ? 'selected' : ''}`}
            startIcon={<FilterList />}
            onClick={() => setFilterOpen((open) => !open)}
            aria-expanded={filterOpen}
          >
            Filtr
          </Button>
          {filterOpen && (
            <div className="contacts-filter-fields">
              <label className="leads-filter">
                <select aria-label="Kontakt statusi bo‘yicha filter" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
                  <option value="">Barcha statuslar</option>
                  {customerStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="leads-filter">
                <select aria-label="Kontakt manbasi bo‘yicha filter" value={sourceFilter} onChange={(event) => { setSourceFilter(event.target.value); setPage(1); }}>
                  <option value="">Barcha manbalar</option>
                  {customerSourceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>
          )}
        </div>
        <Button variant="contained" startIcon={<Add />} onClick={openCreateDialog} className="new-lead-button">
          Kontakt qo‘shish
        </Button>
      </div>

      {loading ? (
        <div className="loading-panel"><CircularProgress size={28} /><span>Kontaktlar yuklanmoqda...</span></div>
      ) : (
        <div className="contacts-table-panel">
          <div className="leads-table-scroll">
            <table className="contacts-table">
              <thead>
                <tr>
                  <th>Ism familya</th>
                  <th>Kompaniya</th>
                  <th>Elektron pochta</th>
                  <th>Telefon</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {pageContacts.map((contact) => (
                  <tr key={contact._id || contact.email}>
                    <td className="contacts-name">{contact.fullName}</td>
                    <td>{contact.company || '—'}</td>
                    <td><a href={`mailto:${contact.email}`}>{contact.email}</a></td>
                    <td>{contact.phone || '—'}</td>
                    <td>
                      <div className="lead-table-actions">
                        <IconButton aria-label={`${contact.fullName} kontaktini tahrirlash`} title="Tahrirlash" onClick={() => openEditDialog(contact)}>
                          <EditOutlined fontSize="small" />
                        </IconButton>
                        <IconButton aria-label={`${contact.fullName} kontaktini o‘chirish`} title="O‘chirish" onClick={() => setDeletingContact(contact)}>
                          <DeleteOutlined fontSize="small" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
                {!pageContacts.length && (
                  <tr><td className="leads-table-empty" colSpan={5}>{contacts.length ? 'Filterga mos kontakt topilmadi' : 'Hozircha kontaktlar mavjud emas'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="leads-pagination">
            <span>{visibleContacts.length} ta kontakt</span>
            <div className="leads-pagination-controls">
              <IconButton size="small" aria-label="Oldingi sahifa" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                <ChevronLeft fontSize="small" />
              </IconButton>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                <button key={pageNumber} type="button" className={currentPage === pageNumber ? 'active' : ''} onClick={() => setPage(pageNumber)}>
                  {pageNumber}
                </button>
              ))}
              <IconButton size="small" aria-label="Keyingi sahifa" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
                <ChevronRight fontSize="small" />
              </IconButton>
            </div>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle className="delete-dialog-title">{editingContact ? 'Kontaktni tahrirlash' : 'Yangi kontakt'}</DialogTitle>
        <DialogContent className="contact-form-grid">
          <TextField label="Ism familya *" value={form.fullName} onChange={(event) => updateForm('fullName', event.target.value)} autoFocus fullWidth />
          <TextField label="Kompaniya" value={form.company} onChange={(event) => updateForm('company', event.target.value)} fullWidth />
          <TextField label="Elektron pochta *" type="email" value={form.email} onChange={(event) => updateForm('email', event.target.value)} fullWidth />
          <TextField label="Telefon" value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} fullWidth />
          <TextField label="Shahar" value={form.city} onChange={(event) => updateForm('city', event.target.value)} fullWidth />
          <TextField label="Byudjet" type="number" slotProps={{ htmlInput: { min: 0 } }} value={form.budget} onChange={(event) => updateForm('budget', Math.max(0, Number(event.target.value)))} fullWidth />
          <TextField select label="Status" value={form.status} onChange={(event) => updateForm('status', event.target.value as CustomerStatus)} fullWidth>
            {customerStatusOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
          </TextField>
          <TextField select label="Manba" value={form.source} onChange={(event) => updateForm('source', event.target.value as CustomerSource)} fullWidth>
            {customerSourceOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
          </TextField>
          <TextField label="Izoh" value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} multiline minRows={2} className="contact-notes-field" fullWidth />
        </DialogContent>
        <DialogActions className="lead-dialog-actions">
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Bekor qilish</Button>
          <Button variant="contained" onClick={() => void handleSave()} disabled={saving}>
            {saving ? <CircularProgress size={20} color="inherit" /> : editingContact ? 'Saqlash' : 'Kontakt qo‘shish'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deletingContact)} onClose={() => !deleting && setDeletingContact(null)} maxWidth="xs" fullWidth>
        <DialogTitle className="delete-dialog-title">Kontaktni o‘chirish</DialogTitle>
        <DialogContent>
          <Typography>
            <strong>{deletingContact?.fullName}</strong> kontaktini haqiqatan ham o‘chirmoqchimisiz?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Bu amalni ortga qaytarib bo‘lmaydi.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingContact(null)} disabled={deleting}>Bekor qilish</Button>
          <Button color="error" variant="contained" onClick={() => void confirmDelete()} disabled={deleting}>
            {deleting ? <CircularProgress size={20} color="inherit" /> : 'Ha, o‘chirish'}
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}

const leadStages: { id: LeadStatus; label: string; className: string }[] = [
  { id: 'new', label: 'Yangi', className: 'new' },
  { id: 'contacted', label: 'Jarayonda', className: 'contacted' },
  { id: 'proposal', label: 'Taklif yuborilgan', className: 'proposal' },
  { id: 'won', label: 'Yutildi', className: 'won' },
];

function UserWorkspace({ userName }: { userName: string }) {
  return (
    <section className="user-workspace">
      <div className="page-title-wrap">
        <h1>Xush kelibsiz, {userName}</h1>
        <p>Sizning ish sahifangiz tayyor. Ruxsatlaringiz kengaytirilganda yangi bo‘limlar shu yerda paydo bo‘ladi.</p>
      </div>
      <div className="user-workspace-card">
        <span className="user-workspace-icon"><AccountCircle /></span>
        <div>
          <h2>Mening sahifam</h2>
          <p>Hisobingiz faol. CRM bo‘limlariga kirish huquqi administrator tomonidan belgilanadi.</p>
        </div>
        <span className="admin-status-badge active">Faol hisob</span>
      </div>
    </section>
  );
}

function ModulePlaceholder({ title }: { title: string }) {
  return (
    <section className="module-placeholder">
      <div className="page-title-wrap"><h1>{title}</h1><p>Ushbu bo‘lim tez orada ishga tushadi.</p></div>
      <div className="admin-access-denied"><TaskAltOutlined /><strong>{title} bo‘limi tayyorlanmoqda</strong><span>Bu sahifani keyingi bosqichda to‘liq CRM ma’lumotlari bilan ulaymiz.</span></div>
    </section>
  );
}

function LeadsBoard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [initialLeadStatus, setInitialLeadStatus] = useState<LeadStatus>('new');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [contactName, setContactName] = useState('');
  const [owner, setOwner] = useState('JD');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const selectedLead = leads.find((lead) => lead._id === selectedLeadId) || null;

  useEffect(() => {
    getLeads()
      .then(setLeads)
      .catch(() => toast.error('Leadlar yuklanmadi'))
      .finally(() => setLoading(false));
  }, []);

  const moveLead = async (lead: Lead, status: LeadStatus) => {
    if (lead.status === status) return;
    const oldStatus = lead.status;
    setLeads((current) => current.map((item) => item._id === lead._id ? { ...item, status } : item));
    try {
      const updated = await updateLeadStatus(lead._id, status);
      setLeads((current) => current.map((item) => item._id === updated._id ? updated : item));
    } catch {
      setLeads((current) => current.map((item) => item._id === lead._id ? { ...item, status: oldStatus } : item));
      toast.error('Lead statusini yangilab bo‘lmadi');
    }
  };

  const resetLeadForm = () => {
    setEditingLead(null);
    setName('');
    setCompany('');
    setContactName('');
    setOwner('JD');
    setEmail('');
    setPhone('');
    setDescription('');
    setBudget('');
    setInitialLeadStatus('new');
  };

  const openEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setName(lead.name || lead.company);
    setCompany(lead.company);
    setContactName(lead.contactName || '');
    setOwner(lead.owner || 'JD');
    setEmail(lead.email || '');
    setPhone(lead.phone || '');
    setDescription(lead.description || '');
    setBudget(String(lead.budget));
    setInitialLeadStatus(lead.status);
    setDialogOpen(true);
  };

  const handleSaveLead = async () => {
    const amount = Number(budget);
    if (name.trim().length < 2 || name.trim().length > 160
      || company.trim().length < 2 || company.trim().length > 160
      || contactName.trim().length < 2 || contactName.trim().length > 120
      || !email.trim() || !budget || !Number.isFinite(amount) || amount < 0) {
      toast.error('Yulduzcha bilan belgilangan maydonlarni to‘ldiring');
      return;
    }
    if (email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Email manzil formati noto‘g‘ri');
      return;
    }
    if (phone.length > 30 || (phone && !/^[+()\d\s-]+$/.test(phone))) {
      toast.error('Telefon raqam formati noto‘g‘ri');
      return;
    }
    if (description.length > 2000) {
      toast.error('Tavsif 2000 belgidan oshmasligi kerak');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        company: company.trim(),
        budget: amount,
        status: editingLead ? initialLeadStatus : 'new',
        contactName: contactName.trim(),
        owner,
        email: email.trim(),
        phone: phone.trim(),
        description: description.trim(),
      };
      if (editingLead) {
        const updatedLead = await updateLead(editingLead._id, payload);
        setLeads((current) => current.map((lead) => lead._id === updatedLead._id ? updatedLead : lead));
        if (selectedLeadId === updatedLead._id) setSelectedLeadId(updatedLead._id);
        toast.success('Lead ma’lumotlari yangilandi');
      } else {
        const newLead = await createLead(payload);
        setLeads((current) => [newLead, ...current]);
        toast.success('Yangi lead qo‘shildi');
      }
      resetLeadForm();
      setDialogOpen(false);
    } catch {
      toast.error(editingLead ? 'Leadni tahrirlab bo‘lmadi' : 'Lead qo‘shib bo‘lmadi');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteLead = async () => {
    if (!deletingLead) return;
    setDeleting(true);
    try {
      await deleteLead(deletingLead._id);
      setLeads((current) => current.filter((lead) => lead._id !== deletingLead._id));
      if (selectedLeadId === deletingLead._id) setSelectedLeadId(null);
      toast.success('Lead o‘chirildi');
      setDeletingLead(null);
    } catch {
      toast.error('Leadni o‘chirib bo‘lmadi');
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

  const visibleLeads = leads.filter((lead) => {
    const matchesSearch = `${lead.name || ''} ${lead.company} ${lead.contactName || ''} ${lead.email || ''} ${lead.description}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || lead.status === statusFilter;
    const matchesOwner = !ownerFilter || lead.owner === ownerFilter;
    const leadDate = lead.createdAt ? new Date(lead.createdAt) : null;
    const today = new Date();
    const matchesDate = !dateFilter || (leadDate && (
      dateFilter === 'today'
        ? leadDate.toDateString() === today.toDateString()
        : dateFilter === 'week'
          ? leadDate >= new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)
          : leadDate.getMonth() === today.getMonth() && leadDate.getFullYear() === today.getFullYear()
    ));
    return matchesSearch && matchesStatus && matchesOwner && matchesDate;
  });
  const pageCount = Math.max(1, Math.ceil(visibleLeads.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginatedLeads = visibleLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const formatLeadDate = (date?: string) => date
    ? new Intl.DateTimeFormat('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date))
    : '—';

  const handleAddNote = async () => {
    if (!selectedLead || !noteText.trim()) {
      toast.error('Izoh matnini kiriting');
      return;
    }
    setSavingNote(true);
    try {
      const updatedLead = await addLeadNote(selectedLead._id, noteText.trim());
      setLeads((current) => current.map((lead) => lead._id === updatedLead._id ? updatedLead : lead));
      setNoteText('');
      toast.success('Izoh qo‘shildi');
    } catch {
      toast.error('Izohni saqlab bo‘lmadi');
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <section className="leads-page">
      {selectedLead ? (
        <LeadDetails
          lead={selectedLead}
          formatCurrency={formatCurrency}
          formatDate={formatLeadDate}
          onBack={() => setSelectedLeadId(null)}
          onEdit={() => openEditLead(selectedLead)}
          onDelete={() => setDeletingLead(selectedLead)}
          onAdvance={() => {
            const nextStage = leadStages[leadStages.findIndex((stage) => stage.id === selectedLead.status) + 1];
            if (nextStage) void moveLead(selectedLead, nextStage.id);
          }}
          noteText={noteText}
          onNoteTextChange={setNoteText}
          onAddNote={() => void handleAddNote()}
          savingNote={savingNote}
        />
      ) : (
      <>
      <div className="page-title-wrap leads-title-wrap">
        <h1>{viewMode === 'list' ? 'Leads ro‘yxati' : 'Leads — Kanban'}</h1>
        <p>{viewMode === 'list' ? 'Mijoz so‘rovlarini qidiring, filtrlab va boshqaring.' : 'Kartalarni ustunlar o‘rtasida sudrab, bitim statusini o‘zgartiring.'}</p>
      </div>

      <div className="leads-toolbar">
        <div className="leads-tools">
          <label className="leads-search">
            <SearchOutlined fontSize="small" />
            <input
              aria-label="Lead qidirish"
              placeholder="Qidirish..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <IconButton
            className={`lead-view-toggle ${viewMode === 'list' ? 'selected' : ''}`}
            aria-label={viewMode === 'kanban' ? 'Ro‘yxat ko‘rinishiga o‘tish' : 'Kanban ko‘rinishiga o‘tish'}
            title={viewMode === 'kanban' ? 'Ro‘yxat ko‘rinishi' : 'Kanban ko‘rinishi'}
            onClick={() => {
              setViewMode((mode) => mode === 'kanban' ? 'list' : 'kanban');
              setPage(1);
            }}
          >
            {viewMode === 'kanban' ? <TableRowsOutlined /> : <ViewKanbanOutlined />}
          </IconButton>
          <label className="leads-filter">
            <FilterList fontSize="small" />
            <select aria-label="Status bo‘yicha filter" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
              <option value="">Barcha statuslar</option>
              {leadStages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
            </select>
          </label>
          {viewMode === 'list' && (
            <>
              <label className="leads-filter">
                <select aria-label="Mas’ul bo‘yicha filter" value={ownerFilter} onChange={(event) => { setOwnerFilter(event.target.value); setPage(1); }}>
                  <option value="">Mas’ul</option>
                  {[...new Set(leads.map((lead) => lead.owner).filter(Boolean))].map((leadOwner) => (
                    <option key={leadOwner} value={leadOwner}>{leadOwner}</option>
                  ))}
                </select>
              </label>
              <label className="leads-filter">
                <select aria-label="Sana bo‘yicha filter" value={dateFilter} onChange={(event) => { setDateFilter(event.target.value); setPage(1); }}>
                  <option value="">Sana</option>
                  <option value="today">Bugun</option>
                  <option value="week">Oxirgi 7 kun</option>
                  <option value="month">Shu oy</option>
                </select>
              </label>
            </>
          )}
        </div>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            resetLeadForm();
            setInitialLeadStatus('new');
            setDialogOpen(true);
          }}
          className="new-lead-button"
        >
          Yangi Lead
        </Button>
      </div>

      {loading ? (
        <div className="loading-panel"><CircularProgress size={28} /><span>Leadlar yuklanmoqda...</span></div>
      ) : viewMode === 'list' ? (
        <div className="leads-table-panel">
          <div className="leads-table-scroll">
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Mijoz</th>
                  <th>Kompaniya</th>
                  <th>Qiymat</th>
                  <th>Holat</th>
                  <th>Mas’ul</th>
                  <th>Sana</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLeads.map((lead) => (
                  <tr key={lead._id}>
                    <td className="lead-table-name">
                      <button type="button" className="lead-open-details" onClick={() => setSelectedLeadId(lead._id)}>
                        {lead.contactName || lead.name || lead.company}
                      </button>
                    </td>
                    <td>{lead.company}</td>
                    <td className="lead-table-value">{formatCurrency(lead.budget)}</td>
                    <td>
                      <span className={`lead-status-pill ${lead.status}`}>
                        {leadStages.find((stage) => stage.id === lead.status)?.label || lead.status}
                      </span>
                    </td>
                    <td>{lead.owner}</td>
                    <td>{formatLeadDate(lead.createdAt)}</td>
                    <td>
                      <div className="lead-table-actions">
                        <IconButton
                          size="small"
                          aria-label="Leadni tahrirlash"
                          title="Tahrirlash"
                          onClick={() => openEditLead(lead)}
                        >
                          <EditOutlined fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          aria-label="Leadni o‘chirish"
                          title="O‘chirish"
                          onClick={() => setDeletingLead(lead)}
                        >
                          <DeleteOutlined fontSize="small" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
                {!paginatedLeads.length && (
                  <tr><td className="leads-table-empty" colSpan={7}>Filterga mos lead topilmadi</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="leads-pagination">
            <span>{visibleLeads.length} ta lead</span>
            <div className="leads-pagination-controls">
              <IconButton size="small" aria-label="Oldingi sahifa" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                <ChevronLeft fontSize="small" />
              </IconButton>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                <button key={pageNumber} type="button" className={currentPage === pageNumber ? 'active' : ''} onClick={() => setPage(pageNumber)}>
                  {pageNumber}
                </button>
              ))}
              <IconButton size="small" aria-label="Keyingi sahifa" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
                <ChevronRight fontSize="small" />
              </IconButton>
              <select aria-label="Sahifadagi leadlar soni" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
                <option value={10}>10 / sahifa</option>
                <option value={25}>25 / sahifa</option>
                <option value={50}>50 / sahifa</option>
              </select>
            </div>
          </div>
        </div>
      ) : (
        <div className="kanban-board">
          {leadStages.map((stage) => {
            const stageLeads = visibleLeads.filter((lead) => lead.status === stage.id);
            return (
              <section
                key={stage.id}
                className={`kanban-column ${stage.className}`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const leadId = event.dataTransfer.getData('text/plain');
                  const lead = leads.find((item) => item._id === leadId);
                  if (lead) void moveLead(lead, stage.id);
                }}
              >
                <header className="kanban-column-header">
                  <span>{stage.label}</span>
                  <span className="kanban-count">{stageLeads.length}</span>
                  {stage.id === 'new' && (
                    <button
                      className="kanban-add-button"
                      type="button"
                      aria-label="Yangi ustuniga lead qo‘shish"
                      onClick={() => {
                        resetLeadForm();
                        setInitialLeadStatus('new');
                        setDialogOpen(true);
                      }}
                    >+</button>
                  )}
                </header>
                <div className="kanban-cards">
                  {stageLeads.map((lead) => {
                    return (
                      <article
                        className="lead-card"
                        key={lead._id}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData('text/plain', lead._id);
                          event.dataTransfer.effectAllowed = 'move';
                        }}
                      >
                        <div className="lead-card-title">
                          <button type="button" className="lead-open-details" onClick={() => setSelectedLeadId(lead._id)}>
                            {lead.name || lead.company}
                          </button>
                        </div>
                        <p>{lead.description || 'CRM va xizmatlar bo‘yicha hamkorlik'}</p>
                        <div className="lead-card-meta">
                          <strong>{formatCurrency(lead.budget)}</strong>
                          <span><i className="lead-owner-dot" />{lead.owner}</span>
                        </div>
                        <div className="lead-card-actions">
                          <button type="button" onClick={() => openEditLead(lead)} aria-label="Leadni tahrirlash">
                            <EditOutlined fontSize="small" />
                          </button>
                          <button type="button" onClick={() => setDeletingLead(lead)} aria-label="Leadni o‘chirish">
                            <DeleteOutlined fontSize="small" />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                  {!stageLeads.length && <div className="kanban-empty">Bu ustunda lead yo‘q</div>}
                </div>
              </section>
            );
          })}
        </div>
      )}
      </>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => {
          if (!saving) {
            setDialogOpen(false);
            resetLeadForm();
          }
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle className="lead-dialog-title">
          <span>{editingLead ? 'Leadni tahrirlash' : 'Yangi Lead yaratish'}</span>
          <small>{editingLead ? 'Lead ma’lumotlarini yangilang.' : 'Yangi bitim qo‘shish uchun formani to‘ldiring.'}</small>
        </DialogTitle>
        <DialogContent className="lead-dialog-content">
          <div className="lead-form-section-title">Lead ma’lumotlari</div>
          <div className="lead-form-grid">
            <TextField
              autoFocus
              required
              fullWidth
              label="Lead nomi"
              placeholder="Yangi hamkorlik loyihasi"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <TextField
              required
              fullWidth
              label="Kompaniya"
              placeholder="Kompaniyani tanlang yoki nomini kiriting"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              slotProps={{ htmlInput: { list: 'lead-company-options' } }}
            />
            <TextField
              required
              fullWidth
              label="Qiymat (USD)"
              placeholder="$ 5,000"
              type="number"
              slotProps={{ htmlInput: { min: 0 } }}
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
            />
            {editingLead ? (
              <TextField
                select
                required
                fullWidth
                label="Status"
                value={initialLeadStatus}
                onChange={(event) => setInitialLeadStatus(event.target.value as LeadStatus)}
              >
                {leadStages.map((stage) => <MenuItem key={stage.id} value={stage.id}>{stage.label}</MenuItem>)}
              </TextField>
            ) : (
              <div className="lead-new-status-field">
                <span>Status</span>
                <strong><i />Yangi</strong>
                <small>Yangi leadlar avval “Yangi” bosqichida yaratiladi.</small>
              </div>
            )}
            <TextField
              required
              fullWidth
              label="Kontakt shaxs"
              placeholder="Ism familiya"
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
            />
            <TextField
              select
              required
              fullWidth
              label="Mas’ul xodim"
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
            >
              <MenuItem value="JD">John Doe</MenuItem>
              <MenuItem value="AD">Admin</MenuItem>
            </TextField>
            <TextField
              required
              fullWidth
              label="Email"
              type="email"
              placeholder="contact@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <TextField
              fullWidth
              label="Telefon"
              type="tel"
              placeholder="+998 90 123 45 67"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <TextField
              className="lead-description-field"
              fullWidth
              label="Tavsif"
              placeholder="Loyiha haqidagi qo‘shimcha ma’lumotlar..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <datalist id="lead-company-options">
            {[...new Set(leads.map((lead) => lead.company).filter(Boolean))].map((companyName) => (
              <option key={companyName} value={companyName} />
            ))}
          </datalist>
        </DialogContent>
        <DialogActions className="lead-dialog-actions">
          <span className="lead-form-hint">* Majburiy maydonlar. Email formati va qiymat tekshiriladi.</span>
          <div>
            <Button
              onClick={() => {
                setDialogOpen(false);
                resetLeadForm();
              }}
              disabled={saving}
              className="lead-cancel-button"
            >
              Bekor qilish
            </Button>
            <Button variant="contained" onClick={() => void handleSaveLead()} disabled={saving} className="lead-save-button">
              {saving ? <CircularProgress size={20} color="inherit" /> : editingLead ? '✓ O‘zgarishlarni saqlash' : '✓ Saqlash'}
            </Button>
          </div>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(deletingLead)}
        onClose={() => !deleting && setDeletingLead(null)}
        fullWidth
        maxWidth="xs"
        aria-labelledby="confirm-delete-lead-title"
      >
        <DialogTitle id="confirm-delete-lead-title" className="delete-dialog-title">
          Leadni o‘chirish
        </DialogTitle>
        <DialogContent className="delete-dialog-content">
          <span className="delete-dialog-icon"><DeleteOutlined /></span>
          <p>
            <strong>{deletingLead?.name || deletingLead?.company}</strong> leadini haqiqatan ham o‘chirmoqchimisiz?
          </p>
          <small>Bu amalni ortga qaytarib bo‘lmaydi.</small>
        </DialogContent>
        <DialogActions className="delete-dialog-actions">
          <Button onClick={() => setDeletingLead(null)} disabled={deleting} className="lead-cancel-button">
            Bekor qilish
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => void confirmDeleteLead()}
            disabled={deleting}
            className="delete-confirm-button"
          >
            {deleting ? <CircularProgress size={20} color="inherit" /> : 'Ha, o‘chirish'}
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}

function LeadDetails({
  lead,
  formatCurrency,
  formatDate,
  onBack,
  onEdit,
  onDelete,
  onAdvance,
  noteText,
  onNoteTextChange,
  onAddNote,
  savingNote,
}: {
  lead: Lead;
  formatCurrency: (amount: number) => string;
  formatDate: (date?: string) => string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAdvance: () => void;
  noteText: string;
  onNoteTextChange: (text: string) => void;
  onAddNote: () => void;
  savingNote: boolean;
}) {
  const [tab, setTab] = useState(0);
  const statusLabel = leadStages.find((stage) => stage.id === lead.status)?.label || lead.status;
  const activities = [...(lead.activities || [])].reverse();
  const notes = [...(lead.notes || [])].reverse();

  return (
    <div className="lead-details-page">
      <button className="lead-details-back" type="button" onClick={onBack}>
        <ArrowBack fontSize="small" /> Leads ro‘yxatiga qaytish
      </button>
      <header className="lead-details-heading">
        <div>
          <h1>Lead tafsilotlari</h1>
          <p>Lead / {lead.company}</p>
        </div>
        <div className="lead-details-actions">
          <Button variant="outlined" startIcon={<EditOutlined />} onClick={onEdit}>Tahrirlash</Button>
          <Button variant="contained" color="error" startIcon={<DeleteOutlined />} onClick={onDelete}>O‘chirish</Button>
          <Button variant="contained" onClick={onAdvance} disabled={lead.status === 'won'}>
            {lead.status === 'won' ? 'Yutildi ✓' : 'Keyingi bosqich ✓'}
          </Button>
        </div>
      </header>
      <div className="lead-details-summary">{lead.company} — {lead.name}</div>

      <div className="lead-details-layout">
        <aside className="lead-information-card">
          <h2>{lead.company}</h2>
          <span className={`lead-status-pill ${lead.status}`}>{statusLabel}</span>
          <div className="lead-information-row"><span>Qiymat</span><strong>{formatCurrency(lead.budget)}</strong></div>
          <div className="lead-information-row"><span>Kompaniya</span><strong>{lead.company}</strong></div>
          <div className="lead-information-row"><span>Kontakt</span><strong>{lead.contactName || '—'}</strong></div>
          <div className="lead-information-row">
            <span>Email</span>
            {lead.email ? <a href={`mailto:${lead.email}`}>{lead.email}</a> : <strong>—</strong>}
          </div>
          <div className="lead-information-row">
            <span>Telefon</span>
            {lead.phone ? <a href={`tel:${lead.phone}`}>{lead.phone}</a> : <strong>—</strong>}
          </div>
          <div className="lead-information-row"><span>Mas’ul</span><strong>{lead.owner}</strong></div>
          <div className="lead-information-row"><span>Yaratilgan</span><strong>{formatDate(lead.createdAt)}</strong></div>
          {lead.description && <p className="lead-information-description">{lead.description}</p>}
        </aside>

        <section className="lead-details-workspace">
          <Tabs value={tab} onChange={(_, value: number) => setTab(value)} className="lead-details-tabs">
            <Tab label="Faoliyatlar" />
            <Tab label={`Izohlar${notes.length ? ` (${notes.length})` : ''}`} />
            <Tab label="Vazifalar" />
            <Tab label="Fayllar" />
          </Tabs>
          {tab === 0 && (
            <div className="lead-activity-content">
              <div className="lead-activity-compose">
                <span className="lead-activity-compose-icon"><Add fontSize="small" /></span>
                <div>
                  <strong>Lead faoliyati</strong>
                  <p>Status o‘zgarishlari va bajarilgan amallar shu yerda ko‘rinadi.</p>
                </div>
              </div>
              {activities.length ? activities.map((activity, index) => (
                <div className="lead-activity-row" key={activity._id || `${activity.createdAt}-${index}`}>
                  <span className="lead-activity-marker" />
                  <span>{activity.text}</span>
                  <time>{formatDate(activity.createdAt)}</time>
                </div>
              )) : (
                <div className="lead-detail-empty">Hozircha faoliyat yo‘q.</div>
              )}
            </div>
          )}
          {tab === 1 && (
            <div className="lead-notes-content">
              <div className="lead-note-compose">
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  maxRows={4}
                  placeholder="Yangi izoh qo‘shish..."
                  value={noteText}
                  onChange={(event) => onNoteTextChange(event.target.value)}
                />
                <Button variant="contained" startIcon={<Add />} onClick={onAddNote} disabled={savingNote || !noteText.trim()}>
                  {savingNote ? <CircularProgress size={18} color="inherit" /> : 'Izoh qo‘shish'}
                </Button>
              </div>
              {notes.length ? notes.map((note, index) => (
                <article className="lead-note-card" key={note._id || `${note.createdAt}-${index}`}>
                  <div><strong>{note.author}</strong><time>{formatDate(note.createdAt)}</time></div>
                  <p>{note.text}</p>
                </article>
              )) : <div className="lead-detail-empty">Bu lead uchun hali izoh yo‘q.</div>}
            </div>
          )}
          {tab === 2 && (
            <div className="lead-detail-empty lead-feature-placeholder">
              <TaskAltOutlined />
              <strong>Vazifalar hozircha yo‘q</strong>
              <span>Leadga tegishli vazifalar shu bo‘limda ko‘rinadi.</span>
            </div>
          )}
          {tab === 3 && (
            <div className="lead-detail-empty lead-feature-placeholder">
              <AttachFileOutlined />
              <strong>Fayllar hozircha yo‘q</strong>
              <span>Bu leadga biriktirilgan fayllar shu bo‘limda ko‘rinadi.</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
