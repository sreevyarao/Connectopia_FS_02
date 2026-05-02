require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const connectDB = require('./config/db');

const app = express();
connectDB();

app.use(cors());
app.use(express.json());

// ── AUTH ─────────────────────────────────────────────────────────────────
// Hash the admin password once at startup (synchronous, fine for single user)
const ADMIN_HASH = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);

app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });

  const validUser = username === process.env.ADMIN_USERNAME;
  const validPass = await bcrypt.compare(password, ADMIN_HASH);

  if (!validUser || !validPass)
    return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { username },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
  res.json({ token, username });
});

// ── LEADS API ─────────────────────────────────────────────────────────────
app.use('/leads', require('./routes/leads'));

// ── 404 ───────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Connectopia API running on port ${PORT}`));
