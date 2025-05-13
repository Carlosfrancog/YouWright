const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, 'mensagens.json');
const USERS_FILE = path.join(__dirname, 'usuarios.json');

app.use(express.json());
app.use(express.static('public'));

function carregarJSON(caminho) {
  try {
    return JSON.parse(fs.readFileSync(caminho, 'utf8'));
  } catch {
    return [];
  }
}

function salvarJSON(caminho, dados) {
  fs.writeFileSync(caminho, JSON.stringify(dados, null, 2));
}

// Registro de usuário comum
app.post('/registro', (req, res) => {
  const { username, senha } = req.body;
  if (!username || !senha) return res.status(400).send({ erro: 'Usuário e senha são obrigatórios.' });

  const usuarios = carregarJSON(USERS_FILE);
  if (usuarios.find(u => u.username === username))
    return res.status(409).send({ erro: 'Usuário já existe.' });

  const id = Date.now();
  usuarios.push({ id, username, senha, role: 'user' });
  salvarJSON(USERS_FILE, usuarios);

  res.status(201).send({ id, username });
});

// Login
app.post('/login', (req, res) => {
  const { username, senha } = req.body;
  const usuarios = carregarJSON(USERS_FILE);
  const user = usuarios.find(u => u.username === username && u.senha === senha);
  if (!user) return res.status(401).send({ erro: 'Credenciais inválidas.' });

  res.send({ id: user.id, username: user.username, role: user.role });
});

// Postagem de mensagem
app.post('/mensagem', (req, res) => {
  const { texto, userId } = req.body;
  if (!texto || texto.trim() === '') return res.status(400).send({ erro: 'Mensagem vazia.' });

  const mensagens = carregarJSON(DATA_FILE);
  const nova = {
    id: Date.now(),
    texto: texto.slice(0, 280),
    data: new Date().toISOString(),
    userId: userId || null
  };
  mensagens.push(nova);
  salvarJSON(DATA_FILE, mensagens);

  res.status(201).send(nova);
});

// Listar todas mensagens
app.get('/mensagens', (req, res) => {
  const mensagens = carregarJSON(DATA_FILE);
  res.send(mensagens);
});

// Listar mensagens de um usuário específico
app.get('/mensagens/:userId', (req, res) => {
  const mensagens = carregarJSON(DATA_FILE);
  const filtradas = mensagens.filter(m => m.userId == req.params.userId);
  res.send(filtradas);
});

// Listar usuários (apenas dev)
app.get('/usuarios', (req, res) => {
  const { id, role } = req.query;
  const usuarios = carregarJSON(USERS_FILE);
  const solicitante = usuarios.find(u => u.id == id && u.role === 'dev');
  if (!solicitante) return res.status(403).send({ erro: 'Acesso negado' });
  res.send(usuarios);
});

// Criar novo usuário (apenas dev)
app.post('/criar-usuario', (req, res) => {
  const { masterId, username, senha, role } = req.body;
  const usuarios = carregarJSON(USERS_FILE);
  const master = usuarios.find(u => u.id === masterId && u.role === 'dev');
  if (!master) return res.status(403).send({ erro: 'Apenas devs podem criar usuários.' });

  if (usuarios.find(u => u.username === username)) {
    return res.status(409).send({ erro: 'Usuário já existe.' });
  }

  const novo = { id: Date.now(), username, senha, role: role || 'user' };
  usuarios.push(novo);
  salvarJSON(USERS_FILE, usuarios);
  res.status(201).send(novo);
});

// Editar usuário (apenas dev)
app.put('/editar-usuario', (req, res) => {
  const { masterId, id, username, role } = req.body;
  let usuarios = carregarJSON(USERS_FILE);
  const master = usuarios.find(u => u.id == masterId && u.role === 'dev');
  if (!master) return res.status(403).send({ erro: 'Apenas devs podem editar usuários.' });

  usuarios = usuarios.map(u => {
    if (u.id == id) {
      return { ...u, username, role };
    }
    return u;
  });

  salvarJSON(USERS_FILE, usuarios);
  res.send({ status: 'Usuário atualizado' });
});

// Deletar usuário (apenas dev)
app.delete('/usuario/:id', (req, res) => {
  const { masterId } = req.query;
  const usuarios = carregarJSON(USERS_FILE);
  const master = usuarios.find(u => u.id == masterId && u.role === 'dev');
  if (!master) return res.status(403).send({ erro: 'Apenas devs podem apagar usuários.' });

  const novos = usuarios.filter(u => u.id != req.params.id);
  salvarJSON(USERS_FILE, novos);
  res.send({ status: 'Usuário removido' });
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});
