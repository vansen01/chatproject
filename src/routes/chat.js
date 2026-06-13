const express = require('express');
const { getPool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

async function findCompanion(pool, currentUserId, companionId) {
  if (!Number.isInteger(companionId) || companionId === currentUserId) {
    return null;
  }

  const [companions] = await pool.query(
    'SELECT id, first_name, last_name, login FROM users WHERE id = ? LIMIT 1',
    [companionId]
  );

  return companions[0] || null;
}

async function getDialogMessages(pool, currentUserId, companionId) {
  const [messages] = await pool.query(
    `SELECT id, sender_id, receiver_id, body, created_at
     FROM messages
     WHERE (sender_id = ? AND receiver_id = ?)
        OR (sender_id = ? AND receiver_id = ?)
     ORDER BY created_at ASC, id ASC`,
    [currentUserId, companionId, companionId, currentUserId]
  );

  return messages;
}

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
  const pool = getPool();
  const companion = await findCompanion(pool, req.session.user.id, companionId);

  if (!companion) {
    req.flash('error', 'Собеседник не найден.');
    return res.redirect('/users');
  }

  const messages = await getDialogMessages(pool, req.session.user.id, companionId);

  return res.render('chat/show', {
    title: `Чат с ${companion.first_name}`,
    companion,
    messages
  });
});

router.post('/chat/:userId/messages', requireAuth, async (req, res) => {
  const companionId = Number(req.params.userId);
  const body = String(req.body.body || '').trim();
  const wantsJson = req.is('application/json') || req.accepts(['html', 'json']) === 'json';

  const pool = getPool();
  const companion = await findCompanion(pool, req.session.user.id, companionId);

  if (!companion) {
    if (wantsJson) {
      return res.status(404).json({ error: 'Собеседник не найден.' });
    }

    req.flash('error', 'Собеседник не найден.');
    return res.redirect('/users');
  }

  if (!body) {
    if (wantsJson) {
      return res.status(422).json({ error: 'Сообщение не может быть пустым.' });
    }

    req.flash('error', 'Сообщение не может быть пустым.');
    return res.redirect(`/chat/${companionId}`);
  }

  await pool.query('INSERT INTO messages (sender_id, receiver_id, body) VALUES (?, ?, ?)', [
    req.session.user.id,
    companionId,
    body
  ]);

  if (wantsJson) {
    const messages = await getDialogMessages(pool, req.session.user.id, companionId);
    return res.status(201).json({ messages });
  }

  return res.redirect(`/chat/${companionId}`);
});

router.get('/api/chat/:userId/messages', requireAuth, async (req, res) => {
  const companionId = Number(req.params.userId);
  const pool = getPool();
  const companion = await findCompanion(pool, req.session.user.id, companionId);

  if (!companion) {
    return res.status(404).json({ error: 'Собеседник не найден.' });
  }

  const messages = await getDialogMessages(pool, req.session.user.id, companionId);
  return res.json({ messages });
});

module.exports = router;
