const path = require('path');
const express = require('express');
const admin = require('firebase-admin');
const app = express();
const PORT = process.env.PORT || 3000;

// Detecta se está rodando localmente ou em produção
const isDev = process.env.NODE_ENV !== 'production';

// Caminho dinâmico da chave Firebase
const keyPath = isDev
  ? path.join(__dirname, 'firebase', 'chave-firebase.json') // local
  : '/etc/secrets/chave-firebase.json'; // produção

const serviceAccount = require(keyPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://youwright-7eb4c-default-rtdb.firebaseio.com/"
});

const db = admin.database();
const rateLimitMap = new Map(); // ✅ Corrigido: declarei a variável

app.use(express.json());
app.use(express.static('public'));

// Registro
app.post('/registro', async (req, res) => {
  const { username, senha } = req.body;
  if (!username || !senha) return res.status(400).send({ erro: 'Usuário e senha são obrigatórios.' });

  const usuariosRef = db.ref('usuarios');
  const snapshot = await usuariosRef.once('value');
  const usuarios = snapshot.val() || {};

  if (Object.values(usuarios).find(u => u.username === username)) {
    return res.status(409).send({ erro: 'Usuário já existe.' });
  }

  const id = Date.now();
  await usuariosRef.child(id).set({ id, username, senha, role: 'user' });
  res.status(201).send({ id, username });
});

// Login
app.post('/login', async (req, res) => {
  const { username, senha } = req.body;
  const usuariosRef = db.ref('usuarios');
  const snapshot = await usuariosRef.once('value');
  const usuarios = snapshot.val() || {};
  const user = Object.values(usuarios).find(u => u.username === username && u.senha === senha);
  if (!user) return res.status(401).send({ erro: 'Credenciais inválidas.' });
  res.send({ id: user.id, username: user.username, role: user.role });
});

// Postagem de mensagem
app.post('/mensagem', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    const agora = Date.now();
    const registro = rateLimitMap.get(ip) || { count: 0, timestamp: agora };

    if (agora - registro.timestamp < 15000) {
      registro.count += 1;
    } else {
      registro.count = 1;
      registro.timestamp = agora;
    }

    rateLimitMap.set(ip, registro);

    if (registro.count > 5) {
      return res.status(429).send({ redirect: '/explode.html' });
    }

    const { texto, userId } = req.body;
    if (!texto || texto.trim() === '') return res.status(400).send({ erro: 'Mensagem vazia.' });

    const mensagensRef = db.ref('mensagens');
    const nova = {
      id: Date.now(),
      texto: texto.slice(0, 280),
      data: new Date().toISOString(),
      userId: userId || null
    };
    await mensagensRef.child(nova.id).set(nova);
    res.status(201).send(nova);
  } catch (err) {
    console.error('🔥 ERRO AO SALVAR MENSAGEM:', err);
    res.status(500).send({ erro: 'Erro interno ao salvar mensagem.' });
  }
});

// Listar mensagens por usuário
app.get('/mensagens/:userId', async (req, res) => {
  const snapshot = await db.ref('mensagens').once('value');
  const mensagens = snapshot.val() || {};
  const filtradas = Object.values(mensagens).filter(m => m.userId == req.params.userId);
  res.send(filtradas);
});

// Listar usuários (apenas dev)
app.get('/usuarios', async (req, res) => {
  const { id, role } = req.query;
  const snapshot = await db.ref('usuarios').once('value');
  const usuarios = snapshot.val() || {};
  const solicitante = Object.values(usuarios).find(u => u.id == id && u.role === 'dev');
  if (!solicitante) return res.status(403).send({ erro: 'Acesso negado' });
  res.send(Object.values(usuarios));
});

// Criar usuário (apenas dev)
app.post('/criar-usuario', async (req, res) => {
  const { masterId, username, senha, role } = req.body;
  const ref = db.ref('usuarios');
  const snapshot = await ref.once('value');
  const usuarios = snapshot.val() || {};
  const master = Object.values(usuarios).find(u => u.id === masterId && u.role === 'dev');
  if (!master) return res.status(403).send({ erro: 'Apenas devs podem criar usuários.' });

  if (Object.values(usuarios).find(u => u.username === username)) {
    return res.status(409).send({ erro: 'Usuário já existe.' });
  }

  const novo = { id: Date.now(), username, senha, role: role || 'user' };
  await ref.child(novo.id).set(novo);
  res.status(201).send(novo);
});

// Editar usuário (apenas dev)
app.put('/editar-usuario', async (req, res) => {
  const { masterId, id, username, role } = req.body;
  const ref = db.ref('usuarios');
  const snapshot = await ref.once('value');
  const usuarios = snapshot.val() || {};
  const master = Object.values(usuarios).find(u => u.id == masterId && u.role === 'dev');
  if (!master) return res.status(403).send({ erro: 'Apenas devs podem editar usuários.' });

  if (!usuarios[id]) return res.status(404).send({ erro: 'Usuário não encontrado.' });
  usuarios[id].username = username;
  usuarios[id].role = role;
  await ref.child(id).set(usuarios[id]);
  res.send({ status: 'Usuário atualizado' });
});

// Remover usuário (apenas dev)
app.delete('/usuario/:id', async (req, res) => {
  const { masterId } = req.query;
  const ref = db.ref('usuarios');
  const snapshot = await ref.once('value');
  const usuarios = snapshot.val() || {};
  const master = Object.values(usuarios).find(u => u.id == masterId && u.role === 'dev');
  if (!master) return res.status(403).send({ erro: 'Apenas devs podem apagar usuários.' });

  await ref.child(req.params.id).remove();
  res.send({ status: 'Usuário removido' });
});

// Apagar mensagem (apenas dev)
app.delete('/mensagem/:id', async (req, res) => {
  const { masterId } = req.query;
  const usuariosRef = db.ref('usuarios');
  const snapshotUsuarios = await usuariosRef.once('value');
  const usuarios = snapshotUsuarios.val() || {};
  const master = Object.values(usuarios).find(u => u.id == masterId && u.role === 'dev');
  if (!master) return res.status(403).send({ erro: 'Apenas devs podem apagar mensagens.' });

  const mensagensRef = db.ref('mensagens');
  await mensagensRef.child(req.params.id).remove();
  res.send({ status: 'Mensagem removida' });
});

// Fallback para páginas HTML inexistentes
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});
