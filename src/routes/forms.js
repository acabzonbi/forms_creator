const express = require('express');
const { v4: uuidv4 } = require('uuid');
const storage = require('../utils/storage');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const forms = await storage.listForms();
    res.json({ success: true, data: forms });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const form = await storage.readForm(req.params.id);
    if (!form) return res.status(404).json({ success: false, error: 'Form not found' });
    res.json({ success: true, data: form });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, description, fields } = req.body;
    if (!title) return res.status(400).json({ success: false, error: 'Title is required' });

    const form = {
      id: uuidv4(),
      title,
      description: description || '',
      fields: fields || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await storage.writeForm(form);
    res.status(201).json({ success: true, data: form });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const form = await storage.readForm(req.params.id);
    if (!form) return res.status(404).json({ success: false, error: 'Form not found' });

    const updated = { ...form, ...req.body, id: form.id, updatedAt: new Date().toISOString() };
    await storage.writeForm(updated);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await storage.deleteForm(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
