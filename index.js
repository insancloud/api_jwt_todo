const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');

const app = express();
app.use(express.json());

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'api_kelasonline',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const query = promisify(pool.query).bind(pool);

// Secret key for JWT
const JWT_SECRET = 'insanganteng';

// Middleware to verify token
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};



// Welcome to The API

app.get('/', (req, res) => {
  res.send('Welcome to The API');
});


app.post('/register', async (req, res) => {
    const { fullname, username, password } = req.body;
  
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
  
      await query(
        'INSERT INTO users (fullname, username, password) VALUES (?, ?, ?)',
        [fullname, username, hashedPassword]
      );
  
      res.status(201).send('User registered successfully');
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        // Duplicate entry error (username already exists)
        res.status(400).send('Username is already taken');
      } else {
        // Other errors
        res.status(500).send('Internal Server Error');
      }
    }
  });

// Login and get a JWT token
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await query('SELECT * FROM users WHERE username = ?', [username]);

  if (user.length === 0) {
    return res.status(400).send('Invalid username or password');
  }

  const validPassword = await bcrypt.compare(password, user[0].password);

  if (!validPassword) {
    return res.status(400).send('Invalid username or password');
  }

  const token = jwt.sign({ id: user[0].id, username: user[0].username }, JWT_SECRET);
  res.json({ token });
});

// Check user isLogin? 
app.get('/check-login', authenticateToken, (req, res) => {
    res.json({ status: 'User is logged in', user: req.user });
 });

// Logout (optional)
app.post('/logout', authenticateToken, (req, res) => {
  // You can add logic here to invalidate tokens if needed
  res.sendStatus(200);
});


// API Todo

app.post('/todos', authenticateToken, async (req, res) => {
    const { todo_title, todo_description, date_deadline, isdone, image_attach } = req.body;
  
    try {
      const result = await query(
        'INSERT INTO todo (id_user, todo_title, todo_description, date_deadline, isdone, image_attach) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.id, todo_title, todo_description, date_deadline, isdone, image_attach]
      );
  
      res.status(201).send('Todo created successfully');
    } catch (error) {
      console.error('Error creating todo:', error);
      res.status(500).send('Internal Server Error');
    }
  });
  
  // New endpoint to get all todos for a user
  app.get('/todos', authenticateToken, async (req, res) => {
    try {
      const todos = await query('SELECT * FROM todo WHERE id_user = ?', [req.user.id]);
      res.json(todos);
    } catch (error) {
      console.error('Error fetching todos:', error);
      res.status(500).send('Internal Server Error');
    }
  });
  
  // New endpoint to update a todo
  app.put('/todos/:id_todo', authenticateToken, async (req, res) => {
    const { todo_title, todo_description, date_deadline, isdone, image_attach } = req.body;
    const { id_todo } = req.params;
  
    try {
      await query(
        'UPDATE todo SET todo_title = ?, todo_description = ?, date_deadline = ?, isdone = ?, image_attach = ? WHERE id_todo = ? AND id_user = ?',
        [todo_title, todo_description, date_deadline, isdone, image_attach, id_todo, req.user.id]
      );
  
      res.send('Todo updated successfully');
    } catch (error) {
      console.error('Error updating todo:', error);
      res.status(500).send('Internal Server Error');
    }
  });
  
  // New endpoint to delete a todo
  app.delete('/todos/:id_todo', authenticateToken, async (req, res) => {
    const { id_todo } = req.params;
  
    try {
      await query('DELETE FROM todo WHERE id_todo = ? AND id_user = ?', [id_todo, req.user.id]);
      res.send('Todo deleted successfully');
    } catch (error) {
      console.error('Error deleting todo:', error);
      res.status(500).send('Internal Server Error');
    }
  });
  

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
