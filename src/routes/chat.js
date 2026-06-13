const express = require('express');
const { getPool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/users', requireAuth, async (req, res) => {
  const pool = getPool();
  const [users] = await pool.query(
    `SELECT id, first_name, last_name, login
     FROM users
     WHERE id != ?
     ORDER BY first_name, last_name, login`,
    [req.session.user.id]
  );

  res.render('users/index', { title: 'Пользователи', users });
});

router.get('/chat/:userId', requireAuth, async (req, res) => {
  const companionId = Number(req.params.userId);

  if (!Number.isInteger(companionId) || companionId === req.session.user.id) {
    req.flash('error', 'Собеседник не найден.');
    return res.redirect('/users');
  }

  const pool = getPool();
  const [companions] = await pool.query(
    'SELECT id, first_name, last_name, login FROM users WHERE id = ? LIMIT 1',
    [companionId]
  );
  const companion = companions[0];

  if (!companion) {
    req.flash('error', 'Собеседник не найден.');
    return res.redirect('/users');
  }

  const [messages] = await pool.query(
    `SELECT id, sender_id, receiver_id, body, created_at
     FROM messages
     WHERE (sender_id = ? AND receiver_id = ?)
        OR (sender_id = ? AND receiver_id = ?)
     ORDER BY created_at ASC, id ASC`,
    [req.session.user.id, companionId, companionId, req.session.user.id]
  );

  return res.render('chat/show', {
    title: `Чат с ${companion.first_name}`,
    companion,
    messages
  });
});

router.post('/chat/:userId/messages', requireAuth, async (req, res) => {
  const companionId = Number(req.params.userId);
  const body = String(req.body.body || '').trim();

  if (!Number.isInteger(companionId) || companionId === req.session.user.id) {
    req.flash('error', 'Собеседник не найден.');
    return res.redirect('/users');
  }

  if (!body) {
    req.flash('error', 'Сообщение не может быть пустым.');
    return res.redirect(`/chat/${companionId}`);
  }

  const pool = getPool();
  const [companions] = await pool.query('SELECT id FROM users WHERE id = ? LIMIT 1', [companionId]);

  if (!companions[0]) {
    req.flash('error', 'Собеседник не найден.');
    return res.redirect('/users');
  }

  await pool.query('INSERT INTO messages (sender_id, receiver_id, body) VALUES (?, ?, ?)', [
    req.session.user.id,
    companionId,
    body
  ]);

  return res.redirect(`/chat/${companionId}`);
});

module.exports = router;
