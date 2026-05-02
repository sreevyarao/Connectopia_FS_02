const express = require('express');
const router  = express.Router();
const Lead    = require('../models/Lead');
const protect = require('../middleware/auth');

// All routes protected
router.use(protect);

// GET /leads  — with optional ?search=&status=
router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (search) {
      const re = new RegExp(search, 'i');
      query.$or = [{ name: re }, { email: re }];
    }
    const leads = await Lead.find(query).sort({ createdAt: -1 });
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /leads
router.post('/', async (req, res) => {
  try {
    const lead = await Lead.create(req.body);
    res.status(201).json(lead);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /leads/:id  — update fields or add/delete notes
router.put('/:id', async (req, res) => {
  try {
    const { addNote, deleteNoteId, ...fields } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // Add note
    if (addNote) {
      lead.notes.push({ text: addNote });
      await lead.save();
      return res.json(lead);
    }
    // Delete note
    if (deleteNoteId) {
      lead.notes = lead.notes.filter(n => n._id.toString() !== deleteNoteId);
      await lead.save();
      return res.json(lead);
    }
    // Update fields
    Object.assign(lead, fields);
    await lead.save();
    res.json(lead);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /leads/:id
router.delete('/:id', async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
