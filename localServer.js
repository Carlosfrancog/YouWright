const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

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

app.post('/login', (req, res) => {
  const { username, senha } = req.body;
  const usuarios = carregarJSON(USERS_FILE);
  const user = usuarios.find(u => u.username === username && u.senha === senha);
  if (!user) return res.status(401).send({ erro: 'Credenciais inválidas.' });

  res.send({ id: user.id, username: user.username, role: user.role });
});

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

app.get('/mensagens', (req, res) => {
  const mensagens = carregarJSON(DATA_FILE);
  res.send(mensagens);
});

app.get('/mensagens/:userId', (req, res) => {
  const mensagens = carregarJSON(DATA_FILE);
  const filtradas = mensagens.filter(m => m.userId == req.params.userId);
  res.send(filtradas);
});

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em: http://localhost:${PORT}`);
});
