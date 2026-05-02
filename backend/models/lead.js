const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid'); // we'll use mongoose _id instead

const NoteSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

const LeadSchema = new mongoose.Schema({
  leadId: {
    type: String,
    default: () => 'L-' + Math.random().toString(36).substr(2,6).toUpperCase(),
    unique: true
  },
  name:    { type: String, required: [true, 'Name is required'], trim: true },
  email:   {
    type: String, required: [true, 'Email is required'], trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address']
  },
  phone:   {
    type: String, required: [true, 'Phone is required'], trim: true,
    match: [/^[\d\s\+\-\(\)]{7,15}$/, 'Invalid phone number']
  },
  message: { type: String, trim: true, default: '' },
  status:  {
    type: String,
    enum: ['new', 'contacted', 'closed'],
    default: 'new'
  },
  notes:   [NoteSchema]
}, { timestamps: true });

module.exports = mongoose.model('Lead', LeadSchema);
