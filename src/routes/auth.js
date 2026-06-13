const express = require('express');
const bcrypt = require('bcrypt');
const { getPool } = require('../db');
const { redirectIfAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  res.redirect(req.session.user ? '/users' : '/login');
});

router.get('/register', redirectIfAuth, (req, res) => {
  res.render('auth/register', { title: 'Регистрация', form: {} });
});

router.post('/register', redirectIfAuth, async (req, res) => {
  const firstName = String(req.body.firstName || '').trim();
  const lastName = String(req.body.lastName || '').trim();
  const login = String(req.body.login || '').trim();
  const password = String(req.body.password || '');

  if (!firstName || !lastName || !login || !password) {
    req.flash('error', 'Заполните все поля.');
    return res.status(422).render('auth/register', {
      title: 'Регистрация',
      form: { firstName, lastName, login }
    });
  }

  if (password.length < 6) {
    req.flash('error', 'Пароль должен содержать минимум 6 символов.');
    return res.status(422).render('auth/register', {
      title: 'Регистрация',
      form: { firstName, lastName, login }
    });
  }

  try {
    const pool = getPool();
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (first_name, last_name, login, password_hash) VALUES (?, ?, ?, ?)',
      [firstName, lastName, login, passwordHash]
    );

    req.flash('success', 'Аккаунт создан. Теперь можно войти.');
    return res.redirect('/login');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      req.flash('error', 'Пользователь с таким логином уже существует.');
      return res.status(409).render('auth/register', {
        title: 'Регистрация',
        form: { firstName, lastName, login }
      });
    }

    console.error(error);
    req.flash('error', 'Не удалось создать аккаунт.');
    return res.status(500).render('auth/register', {
      title: 'Регистрация',
      form: { firstName, lastName, login }
    });
  }
});

router.get('/login', redirectIfAuth, (req, res) => {
  res.render('auth/login', { title: 'Вход', form: {} });
});

router.post('/login', redirectIfAuth, async (req, res) => {
  const login = String(req.body.login || '').trim();
  const password = String(req.body.password || '');

  if (!login || !password) {
    req.flash('error', 'Введите логин и пароль.');
    return res.status(422).render('auth/login', { title: 'Вход', form: { login } });
  }

  const pool = getPool();
  const [users] = await pool.query('SELECT * FROM users WHERE login = ? LIMIT 1', [login]);
  const user = users[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    req.flash('error', 'Неверный логин или пароль.');
    return res.status(401).render('auth/login', { title: 'Вход', form: { login } });
  }

  req.session.user = {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    login: user.login
  };

  return res.redirect('/users');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
