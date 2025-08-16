const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const MOVIES_DIR = process.env.MOVIES_DIR || path.join(__dirname, 'movies');
const USERS_FILE = path.join(MOVIES_DIR, 'users.json');

// Asegurarse de que el directorio de películas existe
if (!fs.existsSync(MOVIES_DIR)) {
  fs.mkdirSync(MOVIES_DIR, { recursive: true });
}

// Configurar CORS para permitir peticiones desde el frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  exposedHeaders: ['Content-Disposition', 'Content-Length', 'Content-Range', 'Accept-Ranges']
}));

app.use(express.json());

// Middleware para autenticar JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Cargar usuarios desde archivo
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    // Crear usuario admin por defecto si no existe archivo
    const defaultUsers = [{
      username: 'admin',
      password: '$2b$10$zqv8Qz0S3Y9Q0z3y1W5Z0OqH8sQ9Q9Q9Q9Q9Q9Q9Q9Q9Q9Q9Q9',
      approved: true
    }];
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
    return defaultUsers;
  }
  return JSON.parse(fs.readFileSync(USERS_FILE));
}

// Guardar usuarios en archivo
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Login de usuario
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.username === username);
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
  if (!user.approved) return res.status(403).json({ error: 'Usuario pendiente de aprobación' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// Registro de usuario
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Faltan datos' });
  let users = loadUsers();
  if (users.find(u => u.username === username)) {
    return res.status(409).json({ error: 'Usuario ya existe' });
  }
  const hashed = await bcrypt.hash(password, 10);
  users.push({ username, password: hashed, approved: username === 'admin' });
  saveUsers(users);
  res.json({ message: username === 'admin' ? 'Usuario admin creado' : 'Usuario registrado. Espera aprobación del admin.' });
});

// Listar usuarios pendientes (solo admin)
app.get('/api/pending-users', authenticateToken, (req, res) => {
  if (req.user.username !== 'admin') return res.status(403).json({ error: 'Solo admin' });
  const users = loadUsers();
  const pending = users.filter(u => !u.approved && u.username !== 'admin').map(u => ({ username: u.username }));
  res.json(pending);
});

// Aprobar usuario (solo admin)
app.post('/api/approve-user', authenticateToken, (req, res) => {
  if (req.user.username !== 'admin') return res.status(403).json({ error: 'Solo admin' });
  const { username } = req.body;
  let users = loadUsers();
  const user = users.find(u => u.username === username);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  user.approved = true;
  saveUsers(users);
  res.json({ message: 'Usuario aprobado' });
});

// Configuración de almacenamiento para películas
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, MOVIES_DIR);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// Listar películas
app.get('/api/movies', authenticateToken, (req, res) => {
  const files = fs.readdirSync(MOVIES_DIR)
    .filter(f => f.endsWith('.mp4'))
    .map(filename => ({ filename }));
  res.json(files);
});

// Streaming de película
app.get('/api/movies/stream/:filename', authenticateToken, (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(MOVIES_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      console.error(`Archivo no encontrado: ${filePath}`);
      return res.sendStatus(404);
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    
    if (fileSize === 0) {
      console.error(`Archivo vacío: ${filePath}`);
      return res.status(400).json({ error: 'Archivo inválido' });
    }

    const range = req.headers.range;
    
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
        'Cache-Control': 'no-cache'
      });
      
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache'
      });
      
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.error('Error en el streaming:', error);
    if (!res.headersSent) {
      res.status(500).send('Error interno del servidor');
    }
  }
});

// Subir película (solo admin)
app.post('/api/movies/upload', authenticateToken, upload.single('movie'), (req, res) => {
  if (req.user.username !== 'admin') return res.status(403).json({ error: 'Solo el admin puede subir películas' });
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No se subió archivo' });
  res.json({ message: 'Película subida correctamente' });
});

// Estado del servidor
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
