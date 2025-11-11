// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const dotenv = require('dotenv');
const Student = require('./models/student');

dotenv.config();
console.log("Loaded callback URL:", process.env.GOOGLE_CALLBACK_URL);

const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const isProd = process.env.NODE_ENV === 'production';
app.set('trust proxy', 1);
app.use(
  session({
    secret: 'secretkey123',
    resave: false,
    saveUninitialized: true,
    proxy: true,
    cookie: {
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
    },
  })
);

app.use((req, res, next) => {
  res.locals.session = req.session;
  res.locals.message = req.session.message || null;
  delete req.session.message;
  next();
});

const mongoURI =
  process.env.MONGODB_URI ||
  'mongodb+srv://admin:password112@cluster0.9ya5ucp.mongodb.net/studentDB?retryWrites=true&w=majority';

mongoose
  .connect(mongoURI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    (accessToken, refreshToken, profile, done) => {
      console.log('Google profile received:', profile.displayName);
      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

app.use(passport.initialize());
app.use(passport.session());

const adminUser = {
  username: 'admin',
  password: '123456',
};

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

app.get(
  '/auth/google',
  (req, res, next) => {
    console.log('Redirecting to Google login...');
    next();
  },
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get(
  '/auth/google/callback',
  (req, res, next) => {
    console.log('Callback route reached, authenticating...');
    next();
  },
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    if (req.user) {
      console.log('Authenticated as:', req.user.displayName);
      req.session.user = req.user.displayName || 'Google User';
      res.redirect('/students');
    } else {
      console.log('No user info found, redirecting to login');
      res.redirect('/login');
    }
  }
);

app.get('/auth/google/*', (req, res) => {
  console.log('Fallback triggered: route not matched, redirecting to /login');
  res.redirect('/login');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

function requireLogin(req, res, next) {
  if (!req.session.user && !req.isAuthenticated()) {
    req.session.message = 'Please log in first.';
    return res.redirect('/login');
  }
  next();
}

app.get('/', (req, res) => res.redirect('/login'));

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

app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
  console.log(`Server is running and listening on port ${process.env.PORT || 3000}`);
});


