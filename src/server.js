const path = require('path');
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const { port, sessionSecret } = require('./config');
const { initDb } = require('./db');

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax'
    }
  })
);
app.use(flash());

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.errors = req.flash('error');
  res.locals.success = req.flash('success');
  next();
});

app.use(authRoutes);
app.use(chatRoutes);

app.use((req, res) => {
  res.status(404).render('404', { title: 'Страница не найдена' });
});

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Чат запущен: http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Не удалось запустить приложение:', error.message);
    process.exit(1);
  });
