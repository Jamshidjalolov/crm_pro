const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'crmpro_secret';

app.use(cors());
app.use(express.json({ limit: '3mb' }));

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, default: 'Admin' },
    role: { type: String, enum: ['admin', 'manager', 'user'], default: 'user' },
    isActive: { type: Boolean, default: true },
    avatarData: { type: String, default: '' },
    phone: { type: String, default: '', trim: true },
    company: { type: String, default: '', trim: true },
    language: { type: String, enum: ['uz', 'ru', 'en'], default: 'uz' },
    notifications: {
      email: { type: Boolean, default: true },
      leads: { type: Boolean, default: true },
      tasks: { type: Boolean, default: true },
    },
    systemSettings: {
      timeZone: { type: String, enum: ['Asia/Tashkent', 'UTC', 'Europe/Moscow'], default: 'Asia/Tashkent' },
      dateFormat: { type: String, enum: ['DD.MM.YYYY', 'YYYY-MM-DD'], default: 'DD.MM.YYYY' },
    },
  },
  { timestamps: true }
);

const customerSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, default: '' },
    company: { type: String, default: '' },
    city: { type: String, default: '' },
    status: {
      type: String,
      enum: ['new', 'contacted', 'active', 'inactive'],
      default: 'new',
    },
    source: {
      type: String,
      enum: ['telegram', 'instagram', 'website', 'other'],
      default: 'other',
    },
    budget: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    budget: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['new', 'contacted', 'proposal', 'won'],
      default: 'new',
    },
    wonAt: { type: Date, default: null },
    contactName: { type: String, required: true, trim: true },
    owner: { type: String, default: 'JD', trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    notes: [{
      text: { type: String, required: true, trim: true },
      author: { type: String, default: 'JD', trim: true },
      createdAt: { type: Date, default: Date.now },
    }],
    activities: [{
      text: { type: String, required: true, trim: true },
      createdAt: { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);
const Customer = mongoose.model('Customer', customerSchema);
const Lead = mongoose.model('Lead', leadSchema);

const normalizeCustomerPayload = (body) => {
  const input = body || {};
  const fullName = typeof input.fullName === 'string' ? input.fullName.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const budget = Number(input.budget ?? 0);

  if (fullName.length < 2 || fullName.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'A contact name and valid email address are required' };
  }
  if (!Number.isFinite(budget) || budget < 0) {
    return { error: 'Budget must be a non-negative number' };
  }

  const status = input.status || 'new';
  const source = input.source || 'other';
  if (!['new', 'contacted', 'active', 'inactive'].includes(status)) {
    return { error: 'Invalid contact status' };
  }
  if (!['telegram', 'instagram', 'website', 'other'].includes(source)) {
    return { error: 'Invalid contact source' };
  }
  const asTrimmedString = (value) => typeof value === 'string' ? value.trim() : '';
  const phone = asTrimmedString(input.phone);
  const company = asTrimmedString(input.company);
  const city = asTrimmedString(input.city);
  const notes = asTrimmedString(input.notes);
  if (phone.length > 30 || (phone && !/^[+()\d\s-]+$/.test(phone))) {
    return { error: 'Invalid phone number' };
  }
  if (company.length > 120 || city.length > 120 || notes.length > 2000) {
    return { error: 'Contact details exceed the allowed length' };
  }
  return {
    payload: {
      fullName,
      email,
      phone,
      company,
      city,
      status,
      source,
      budget,
      notes,
    },
  };
};

const generateToken = (user) =>
  jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token not provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const adminMiddleware = (req, res, next) => {
  const configuredAdminEmail = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase().trim();
  if (req.user.role !== 'admin' && req.user.email !== configuredAdminEmail) {
    return res.status(403).json({ message: 'Administrator access required' });
  }
  next();
};

const managerMiddleware = (req, res, next) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ message: 'Manager access required' });
  }
  next();
};

const serializeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role || 'user',
  isActive: user.isActive !== false,
  createdAt: user.createdAt,
});

const serializeSessionUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role || 'user',
  isActive: user.isActive !== false,
  avatarData: user.avatarData || '',
  phone: user.phone || '',
  company: user.company || '',
  language: user.language || 'uz',
  notifications: user.notifications,
  systemSettings: user.systemSettings,
});

const seedDefaultUser = async () => {
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const existing = await User.findOne({ email });

    if (!existing) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.create({
        email,
        password: hashedPassword,
        name: 'Admin',
        role: 'admin',
      });
      console.log(`Default admin created: ${email} / ${password}`);
    } else if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
    }
  } catch (error) {
    console.error('Seed user error:', error.message);
  }
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CRM Pro API is running' });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: 'A valid email address is required' });
    }
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is inactive' });
    }

    const token = generateToken(user);
    return res.json({
      token,
      user: serializeSessionUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  return res.json(serializeSessionUser(req.user));
});

app.put('/api/auth/profile', authMiddleware, async (req, res) => {
  const input = req.body || {};
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const phone = typeof input.phone === 'string' ? input.phone.trim() : '';
  const company = typeof input.company === 'string' ? input.company.trim() : '';
  const language = input.language;
  const avatarData = input.avatarData;

  if (name.length < 2 || name.length > 100) {
    return res.status(400).json({ message: 'Name must contain 2 to 100 characters' });
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'A valid email address is required' });
  }
  if (phone.length > 30 || (phone && !/^[+()\d\s-]+$/.test(phone)) || company.length > 120) {
    return res.status(400).json({ message: 'Phone or company value is too long' });
  }
  if (!['uz', 'ru', 'en'].includes(language)) {
    return res.status(400).json({ message: 'Invalid language selection' });
  }
  if (avatarData !== undefined && (typeof avatarData !== 'string'
    || avatarData.length > 2800000
    || (avatarData && !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(avatarData)))) {
    return res.status(400).json({ message: 'Profile image must be a PNG, JPG or WEBP image up to 2 MB' });
  }

  try {
    const existingEmail = await User.findOne({ email, _id: { $ne: req.user._id } });
    if (existingEmail) {
      return res.status(409).json({ message: 'This email is already in use' });
    }
    const update = { name, email, phone, company, language };
    if (avatarData !== undefined) update.avatarData = avatarData;
    const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true, runValidators: true });
    return res.json(serializeSessionUser(user));
  } catch (error) {
    return res.status(400).json({ message: 'Failed to update profile', error: error.message });
  }
});

app.put('/api/auth/password', authMiddleware, async (req, res) => {
  const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
  if (!currentPassword || !/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)) {
    return res.status(400).json({ message: 'Enter the current password and a valid new password' });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!await bcrypt.compare(currentPassword, user.password)) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    return res.status(400).json({ message: 'Failed to update password', error: error.message });
  }
});

app.put('/api/auth/preferences', authMiddleware, async (req, res) => {
  const input = req.body || {};
  const notifications = input.notifications || {};
  const systemSettings = input.systemSettings || {};
  if (['email', 'leads', 'tasks'].some((key) => typeof notifications[key] !== 'boolean')) {
    return res.status(400).json({ message: 'All notification preferences must be true or false' });
  }
  if (!['Asia/Tashkent', 'UTC', 'Europe/Moscow'].includes(systemSettings.timeZone)
    || !['DD.MM.YYYY', 'YYYY-MM-DD'].includes(systemSettings.dateFormat)) {
    return res.status(400).json({ message: 'Invalid system preference selection' });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { notifications, systemSettings } },
      { new: true, runValidators: true },
    );
    return res.json({
      notifications: user.notifications,
      systemSettings: user.systemSettings,
    });
  } catch (error) {
    return res.status(400).json({ message: 'Failed to update preferences', error: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (normalizedName.length < 2 || normalizedName.length > 100) {
    return res.status(400).json({ message: 'Name must contain 2 to 100 characters' });
  }
  if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ message: 'A valid email address is required' });
  }
  if (typeof password !== 'string' || !/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
    return res.status(400).json({ message: 'Password must contain at least 8 characters, one uppercase letter and one number' });
  }

  try {
    const existing = await User.findOne({ email: normalizedEmail });

    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      role: 'user',
      isActive: true,
    });

    const token = generateToken(user);

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        phone: user.phone || '',
        company: user.company || '',
        language: user.language || 'uz',
        notifications: user.notifications,
        systemSettings: user.systemSettings,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

app.get('/api/customers', authMiddleware, managerMiddleware, async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    return res.json(customers);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch customers', error: error.message });
  }
});

app.post('/api/customers', authMiddleware, managerMiddleware, async (req, res) => {
  try {
    const { payload, error } = normalizeCustomerPayload(req.body);
    if (error) {
      return res.status(400).json({ message: error });
    }
    const newCustomer = await Customer.create(payload);
    return res.status(201).json(newCustomer);
  } catch (error) {
    return res.status(400).json({ message: 'Failed to create customer', error: error.message });
  }
});

app.put('/api/customers/:id', authMiddleware, managerMiddleware, async (req, res) => {
  try {
    const { payload, error } = normalizeCustomerPayload(req.body);
    if (error) {
      return res.status(400).json({ message: error });
    }
    const customer = await Customer.findByIdAndUpdate(req.params.id, { $set: payload }, {
      new: true,
      runValidators: true,
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    return res.json(customer);
  } catch (error) {
    return res.status(400).json({ message: 'Failed to update customer', error: error.message });
  }
});

app.delete('/api/customers/:id', authMiddleware, managerMiddleware, async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    return res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete customer', error: error.message });
  }
});

app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [users, totalUsers, administrators, managers, activeUsers] = await Promise.all([
      User.find().sort({ createdAt: -1 }),
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'manager' }),
      User.countDocuments({ isActive: { $ne: false } }),
    ]);

    return res.json({
      users: users.map(serializeUser),
      stats: { totalUsers, administrators, managers, activeUsers },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
});

app.post('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  const input = req.body || {};
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const role = input.role || 'user';
  const isActive = input.isActive === undefined ? true : input.isActive;

  if (name.length < 2 || name.length > 100 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'A name and valid email address are required' });
  }
  if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
    return res.status(400).json({ message: 'Password must contain at least 8 characters, one uppercase letter and one number' });
  }
  if (!['admin', 'manager', 'user'].includes(role)) {
    return res.status(400).json({ message: 'Invalid user role' });
  }
  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ message: 'A valid account status is required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword, role, isActive });
    return res.status(201).json(serializeUser(user));
  } catch (error) {
    return res.status(400).json({ message: 'Failed to create user', error: error.message });
  }
});

app.put('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  const input = req.body || {};
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const role = input.role;
  const isActive = input.isActive;
  const password = typeof input.password === 'string' ? input.password : '';

  if (name.length < 2 || name.length > 100 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'A name and valid email address are required' });
  }
  if (!['admin', 'manager', 'user'].includes(role)) {
    return res.status(400).json({ message: 'Invalid user role' });
  }
  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ message: 'A valid account status is required' });
  }
  if (password && !/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
    return res.status(400).json({ message: 'Password must contain at least 8 characters, one uppercase letter and one number' });
  }

  try {
    const existing = await User.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'User not found' });
    }

    const configuredAdminEmail = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase().trim();
    const isExistingAdmin = existing.role === 'admin' || existing.email === configuredAdminEmail;
    if (isExistingAdmin && (role !== 'admin' || !isActive)) {
      const activeAdmins = await User.countDocuments({
        $and: [
          { $or: [{ role: 'admin' }, { email: configuredAdminEmail }] },
          { isActive: { $ne: false } },
        ],
      });
      if (activeAdmins <= 1) {
        return res.status(400).json({ message: 'At least one active administrator must remain' });
      }
    }

    existing.name = name;
    existing.email = email;
    existing.role = role;
    existing.isActive = isActive;
    if (password) {
      existing.password = await bcrypt.hash(password, 10);
    }
    await existing.save();
    return res.json(serializeUser(existing));
  } catch (error) {
    return res.status(400).json({ message: 'Failed to update user', error: error.message });
  }
});

app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  try {
    if (req.params.id === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const configuredAdminEmail = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase().trim();
    if (user.role === 'admin' || user.email === configuredAdminEmail) {
      const activeAdmins = await User.countDocuments({
        $and: [
          { $or: [{ role: 'admin' }, { email: configuredAdminEmail }] },
          { isActive: { $ne: false } },
        ],
      });
      if (user.isActive !== false && activeAdmins <= 1) {
        return res.status(400).json({ message: 'At least one active administrator must remain' });
      }
    }

    await user.deleteOne();
    return res.json({ message: 'User deleted successfully' });
  } catch (error) {
    return res.status(400).json({ message: 'Failed to delete user', error: error.message });
  }
});

app.get('/api/leads', authMiddleware, managerMiddleware, async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    return res.json(leads);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch leads', error: error.message });
  }
});

app.post('/api/leads', authMiddleware, managerMiddleware, async (req, res) => {
  try {
    const input = req.body || {};
    const { name, company, description, budget, contactName, owner, email, phone } = input;
    const amount = Number(budget);
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 160
      || typeof company !== 'string' || company.trim().length < 2 || company.trim().length > 160
      || typeof contactName !== 'string' || contactName.trim().length < 2 || contactName.trim().length > 120
      || typeof email !== 'string' || email.trim().length > 254
      || budget === undefined || budget === null || budget === '' || !Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({ message: 'Lead name, company, contact, email, and a valid budget are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      || (phone !== undefined && (typeof phone !== 'string' || phone.length > 30 || (phone && !/^[+()\d\s-]+$/.test(phone))))
      || (description !== undefined && (typeof description !== 'string' || description.length > 2000))
      || (owner !== undefined && (typeof owner !== 'string' || !owner.trim() || owner.length > 80))) {
      return res.status(400).json({ message: 'A valid email address is required' });
    }

    const lead = await Lead.create({
      name: name.trim(),
      company: company.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      budget: amount,
      status: 'new',
      contactName: contactName.trim(),
      owner: typeof owner === 'string' ? owner.trim() : 'JD',
      email: email.trim(),
      phone: typeof phone === 'string' ? phone.trim() : '',
      activities: [{ text: 'Lead yaratildi' }],
    });
    return res.status(201).json(lead);
  } catch (error) {
    return res.status(400).json({ message: 'Failed to create lead', error: error.message });
  }
});

app.put('/api/leads/:id', authMiddleware, managerMiddleware, async (req, res) => {
  try {
    const input = req.body || {};
    const { name, company, description, budget, status, contactName, owner, email, phone } = input;
    const amount = Number(budget);
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 160
      || typeof company !== 'string' || company.trim().length < 2 || company.trim().length > 160
      || typeof contactName !== 'string' || contactName.trim().length < 2 || contactName.trim().length > 120
      || typeof email !== 'string' || email.trim().length > 254
      || budget === undefined || budget === null || budget === '' || !Number.isFinite(amount) || amount < 0
      || !['new', 'contacted', 'proposal', 'won'].includes(status)) {
      return res.status(400).json({ message: 'Lead name, company, contact, email, and a valid budget are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      || (phone !== undefined && (typeof phone !== 'string' || phone.length > 30 || (phone && !/^[+()\d\s-]+$/.test(phone))))
      || (description !== undefined && (typeof description !== 'string' || description.length > 2000))
      || (owner !== undefined && (typeof owner !== 'string' || !owner.trim() || owner.length > 80))) {
      return res.status(400).json({ message: 'A valid email address is required' });
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    const wasWon = lead.status === 'won';
    lead.name = name.trim();
    lead.company = company.trim();
    lead.description = typeof description === 'string' ? description.trim() : '';
    lead.budget = amount;
    lead.status = status;
    lead.contactName = contactName.trim();
    lead.owner = typeof owner === 'string' ? owner.trim() : 'JD';
    lead.email = email.trim();
    lead.phone = typeof phone === 'string' ? phone.trim() : '';
    if (status === 'won' && !wasWon) lead.wonAt = new Date();
    if (status !== 'won') lead.wonAt = null;
    lead.activities.push({ text: 'Lead ma’lumotlari yangilandi' });
    await lead.save();
    return res.json(lead);
  } catch (error) {
    return res.status(400).json({ message: 'Failed to update lead', error: error.message });
  }
});

app.delete('/api/leads/:id', authMiddleware, managerMiddleware, async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    return res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    return res.status(400).json({ message: 'Failed to delete lead', error: error.message });
  }
});

app.patch('/api/leads/:id/status', authMiddleware, managerMiddleware, async (req, res) => {
  const allowedStatuses = ['new', 'contacted', 'proposal', 'won'];
  if (!allowedStatuses.includes(req.body?.status)) {
    return res.status(400).json({ message: 'Invalid lead status' });
  }

  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    if (lead.status !== req.body.status) {
      lead.status = req.body.status;
      lead.wonAt = req.body.status === 'won' ? new Date() : null;
      lead.activities.push({ text: `Status "${req.body.status}" holatiga o‘zgartirildi` });
      await lead.save();
    }
    return res.json(lead);
  } catch (error) {
    return res.status(400).json({ message: 'Failed to update lead status', error: error.message });
  }
});

app.post('/api/leads/:id/notes', authMiddleware, managerMiddleware, async (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text || text.length > 2000) {
    return res.status(400).json({ message: 'Note text is required' });
  }

  try {
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          notes: { text, author: req.user.name || 'JD' },
          activities: { text: 'Yangi izoh qo‘shildi' },
        },
      },
      { new: true, runValidators: true },
    );
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    return res.json(lead);
  } catch (error) {
    return res.status(400).json({ message: 'Failed to add lead note', error: error.message });
  }
});

app.get('/api/dashboard', authMiddleware, async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Dashboard access is not available for this role' });
  }
  try {
    const [totalCustomers, newCustomers, activeCustomers, contactedCustomers, recentCustomers, leadStatuses, wonLeads] = await Promise.all([
      Customer.countDocuments(),
      Customer.countDocuments({ status: 'new' }),
      Customer.countDocuments({ status: 'active' }),
      Customer.countDocuments({ status: 'contacted' }),
      Customer.find().sort({ createdAt: -1 }).limit(5),
      Lead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Lead.find({ status: 'won' }).select('name company budget wonAt').lean(),
    ]);

    const now = new Date();
    const monthCount = 12;
    const firstMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthCount + 1, 1));
    const monthlySales = Array.from({ length: monthCount }, (_, index) => {
      const date = new Date(Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + index, 1));
      return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        totalSales: 0,
        dealCount: 0,
      };
    });
    let undatedSales = 0;
    let undatedDealCount = 0;
    let salesOutsideChartWindow = 0;
    let dealsOutsideChartWindow = 0;
    let totalSales = 0;
    const salesByMonth = new Map(monthlySales.map((month) => [`${month.year}-${month.month}`, month]));
    for (const lead of wonLeads) {
      const budget = Number(lead.budget) || 0;
      totalSales += budget;
      if (!lead.wonAt) {
        undatedSales += budget;
        undatedDealCount += 1;
        continue;
      }
      const wonDate = new Date(lead.wonAt);
      const month = salesByMonth.get(`${wonDate.getUTCFullYear()}-${wonDate.getUTCMonth() + 1}`);
      if (month) {
        month.totalSales += budget;
        month.dealCount += 1;
      } else {
        salesOutsideChartWindow += budget;
        dealsOutsideChartWindow += 1;
      }
    }
    const leadStatusCounts = { new: 0, contacted: 0, proposal: 0, won: 0 };
    for (const row of leadStatuses) {
      if (Object.hasOwn(leadStatusCounts, row._id)) leadStatusCounts[row._id] = row.count;
    }

    res.json({
      totalCustomers,
      newCustomers,
      activeCustomers,
      contactedCustomers,
      recentCustomers,
      totalSales,
      totalWonLeads: wonLeads.length,
      leadStatusCounts,
      monthlySales,
      undatedSales,
      undatedDealCount,
      salesOutsideChartWindow,
      dealsOutsideChartWindow,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Dashboard failed', error: error.message });
  }
});

app.get('/api/dashboard/sales', authMiddleware, async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Dashboard access is not available for this role' });
  }
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  if (!Number.isInteger(year) || year < 2000 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12) {
    return res.status(400).json({ message: 'A valid year and month are required' });
  }

  try {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    const deals = await Lead.find({ status: 'won', wonAt: { $gte: start, $lt: end } })
      .select('name company budget wonAt')
      .sort({ wonAt: -1 })
      .lean();
    return res.json({
      year,
      month,
      totalSales: deals.reduce((total, deal) => total + (Number(deal.budget) || 0), 0),
      dealCount: deals.length,
      deals,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load monthly sales', error: error.message });
  }
});

const startServer = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crmpro';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully');
    await seedDefaultUser();
    app.listen(PORT, () => {
      console.log(`CRM Pro API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Mongo connection failed:', error.message);
    console.log('Server started without MongoDB connection. Please ensure MongoDB is running.');
    app.listen(PORT, () => {
      console.log(`CRM Pro API running on http://localhost:${PORT}`);
    });
  }
};

startServer();
