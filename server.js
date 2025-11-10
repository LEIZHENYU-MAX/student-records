// ======================
// Import required modules
// ======================
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const dotenv = require('dotenv');
const Student = require('./models/student');

dotenv.config();

// ======================
// Initialize the app
// ======================
const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1);

// ======================
// Middleware settings
// ======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ======================
// Session configuration
// ======================
const isProd = process.env.NODE_ENV === 'production';
app.use(
  session({
    secret: 'secretkey123',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
    },
  })
);

// ✅ 让 EJS 模板可以直接访问 session + 提示消息
app.use((req, res, next) => {
  res.locals.session = req.session;
  res.locals.message = req.session.message || null;
  delete req.session.message; // 显示一次后清空
  next();
});

// ======================
// MongoDB connection
// ======================
const mongoURI =
  process.env.MONGODB_URI ||
  'mongodb+srv://admin:password112@cluster0.9ya5ucp.mongodb.net/studentDB?retryWrites=true&w=majority';

mongoose
  .connect(mongoURI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// ======================
// Google OAuth Configuration
// ======================
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// ======================
// Admin Account
// ======================
const adminUser = {
  username: 'admin',
  password: '123456',
};

// ======================
// Login / Logout routes
// ======================
app.get('/login', (req, res) => {
  res.render('login', { error: null, message: res.locals.message });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === adminUser.username && password === adminUser.password) {
    req.session.user = username;
    res.redirect('/students');
  } else {
    res.render('login', { error: 'Invalid username or password', message: null });
  }
});

// ✅ Google 登录入口
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// ✅ Google 登录回调
app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    req.session.user = req.user.displayName || req.user.emails[0].value;
    res.redirect('/students');
  }
);

// ✅ Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// Middleware: Protect routes
function requireLogin(req, res, next) {
  if (!req.session.user) {
    req.session.message = '⚠️ Please log in first.';
    return res.redirect('/login');
  }
  next();
}

// ======================
// Basic route
// ======================
app.get('/', (req, res) => res.redirect('/login'));

// ======================
// CRUD Web Routes
// ======================
app.get('/students', requireLogin, async (req, res) => {
  const raw = (req.query.name || '').trim();
  let students = [];

  if (raw === '') {
    students = await Student.find({});
  } else if (/^\d+$/.test(raw)) {
    if (raw.length === 8) {
      students = await Student.find({ studentID: raw });
    }
  } else {
    const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    students = await Student.find({
      $or: [
        { name: { $regex: escaped, $options: 'i' } },
        { major: { $regex: escaped, $options: 'i' } },
      ],
    });
  }

  res.render('layout', { partial: 'students', students, keyword: raw });
});

app.get('/add', requireLogin, (req, res) => {
  res.render('layout', { partial: 'add' });
});

app.post('/add', requireLogin, async (req, res) => {
  const { studentID, name, age, major, gpa } = req.body;

  if (!/^\d{8}$/.test(studentID)) {
    return res.send(
      `<script>alert("Student ID must be exactly 8 digits!"); window.location.href='/add';</script>`
    );
  }

  const existing = await Student.findOne({ studentID });
  if (existing) {
    return res.send(
      `<script>alert("Student ID already exists! Please enter another."); window.location.href='/add';</script>`
    );
  }

  const newStu = new Student({ studentID, name, age, major, gpa });
  await newStu.save();
  res.redirect('/students');
});

app.get('/edit/:id', requireLogin, async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) {
    return res.send(
      `<script>alert("Student not found!"); window.location.href='/students';</script>`
    );
  }
  res.render('layout', { partial: 'edit', student });
});

app.post('/edit/:id', requireLogin, async (req, res) => {
  const { studentID, name, age, major, gpa } = req.body;

  if (!/^\d{8}$/.test(studentID)) {
    return res.send(
      `<script>alert("Student ID must be exactly 8 digits!"); window.location.href='/edit/${req.params.id}';</script>`
    );
  }

  const duplicate = await Student.findOne({
    studentID,
    _id: { $ne: req.params.id },
  });
  if (duplicate) {
    return res.send(
      `<script>alert("Student ID already exists! Please enter another."); window.location.href='/edit/${req.params.id}';</script>`
    );
  }

  await Student.findByIdAndUpdate(req.params.id, {
    studentID,
    name,
    age,
    major,
    gpa,
  });
  res.redirect('/students');
});

app.get('/delete/:id', requireLogin, async (req, res) => {
  await Student.findByIdAndDelete(req.params.id);
  res.redirect('/students');
});

// ======================
// RESTful API
// ======================
app.get('/api/students', async (req, res) => {
  const students = await Student.find();
  res.json(students);
});

app.get('/api/students/:id', async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ message: 'Student not found' });
  res.json(student);
});

app.post('/api/students', async (req, res) => {
  const newStu = new Student(req.body);
  await newStu.save();
  res.json(newStu);
});

app.put('/api/students/:id', async (req, res) => {
  const updated = await Student.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!updated) return res.status(404).json({ message: 'Student not found' });
  res.json(updated);
});

app.delete('/api/students/:id', async (req, res) => {
  const deleted = await Student.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: 'Student not found' });
  res.json({ message: 'Deleted successfully' });
});

// ======================
// Start the server
// ======================
app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});

