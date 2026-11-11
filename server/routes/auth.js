const express = require('express');
const router = express.Router();

// Auth routes to be implemented in Module 2
router.post('/register', (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});

router.post('/login', (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});

router.post('/logout', (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});

router.get('/me', (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});

module.exports = router;
