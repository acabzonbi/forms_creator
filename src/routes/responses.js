const express = require('express');
const { v4: uuidv4 } = require('uuid');
const storage = require('../utils/storage');

const router = express.Router();

router.get('/:formId', async (req, res) => {
  try {
    const responses = await storage.listResponses(req.params.formId);
    res.json({ success: true, data: responses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:formId', async (req, res) => {
  try {
    const form = await storage.readForm(req.params.formId);
    if (!form) return res.status(404).json({ success: false, error: 'Form not found' });

    const response = {
      id: uuidv4(),
      formId: req.params.formId,
      answers: req.body.answers || {},
      submittedAt: new Date().toISOString(),
    };

    await storage.writeResponse(response);
    res.status(201).json({ success: true, data: response });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
