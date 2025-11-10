const mongoose = require('mongoose');

// Define the schema for student records
const studentSchema = new mongoose.Schema({
  studentID: { type: String, required: true },
  name: { type: String, required: true },
  age: Number,
  major: String,
  gpa: Number
});

// Export the model
module.exports = mongoose.model('Student', studentSchema);
