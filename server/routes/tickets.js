const express = require('express');
const router = express.Router();

// Ticket routes to be implemented in Module 3
router.get('/', (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});

router.post('/', (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});

router.put('/:id', (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});

router.delete('/:id', (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});

module.exports = router;
