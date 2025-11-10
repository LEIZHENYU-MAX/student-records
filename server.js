// ======================
// Import required modules
// ======================
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const Student = require('./models/student');

// ======================
// Initialize the app
// ======================
const app = express();

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
app.use(
  session({
    secret: 'secretkey123',
    resave: false,
    saveUninitialized: false,
  })
);

// ======================
// MongoDB connection (Local + Cloud Compatible)
// ======================
const mongoURI =
  process.env.MONGODB_URI ||
  'mongodb+srv://admin:password112@cluster0.9ya5ucp.mongodb.net/studentDB?retryWrites=true&w=majority';

mongoose
  .connect(mongoURI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));

// ======================
// Basic route
// ======================
app.get('/', (req, res) => {
  res.redirect('/students');
});

// ======================
// Web CRUD (EJS pages)
// ======================

// Show all students (search by name, major, or 8-digit studentID)
app.get('/students', async (req, res) => {
  const raw = (req.query.name || '').trim();
  let students = [];

  if (raw === '') {
    students = await Student.find({});
  } else if (/^\d+$/.test(raw)) {
    if (raw.length === 8) {
      students = await Student.find({ studentID: raw });
    } else {
      students = [];
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

// Add student page
app.get('/add', (req, res) => {
  res.render('layout', { partial: 'add' });
});

// Handle Add submission (validate 8-digit and unique studentID)
app.post('/add', async (req, res) => {
  const { studentID, name, age, major, gpa } = req.body;

  // Validate 8-digit ID
  if (!/^\d{8}$/.test(studentID)) {
    return res.send(
      `<script>alert("Student ID must be exactly 8 digits!"); window.location.href='/add';</script>`
    );
  }

  // Check if studentID already exists
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

// Edit student page
app.get('/edit/:id', async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) {
    return res.send(
      `<script>alert("Student not found!"); window.location.href='/students';</script>`
    );
  }
  res.render('layout', { partial: 'edit', student });
});

// Handle Edit submission (validate 8-digit and unique studentID)
app.post('/edit/:id', async (req, res) => {
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

// Delete student
app.get('/delete/:id', async (req, res) => {
  await Student.findByIdAndDelete(req.params.id);
  res.redirect('/students');
});

// ======================
// RESTful API (for curl or Postman)
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

