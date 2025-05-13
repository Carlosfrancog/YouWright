let user = null;

async function carregarMensagens() {
  const res = await fetch('https://youwright.onrender.com/mensagens');
  const msgs = await res.json();
  const container = document.getElementById('mensagens');
  container.innerHTML = '';
  msgs.reverse().forEach(m => {
    const div = document.createElement('div');
    div.className = 'msg';
    div.innerHTML = `
      <time>${new Date(m.data).toLocaleString()}</time>
      <p>${m.texto}</p>
      ${m.userId ? `<small>Usuário #${m.userId}</small>` : ''}
    `;
    container.appendChild(div);
  });
}

async function enviar() {
  const texto = document.getElementById('texto').value;
  if (!texto.trim()) return alert('Mensagem vazia.');
  const body = { texto };
  if (user) body.userId = user.id;

  await fetch('https://youwright.onrender.com/mensagem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  document.getElementById('texto').value = '';
  carregarMensagens();
}

document.getElementById('toggleTheme').addEventListener('click', () => {
  document.body.classList.toggle('dark');
});

document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('user');
  if (saved) {
    user = JSON.parse(saved);
    document.getElementById('loginStatus').innerHTML = `
      <p>Logado como <strong>${user.username}</strong> (#${user.id})</p>
      <button onclick="sair()">Sair</button>
    `;
  } else {
    document.getElementById('loginStatus').innerHTML = `
      <a href="login.html">Login</a> |
      <a href="registro.html">Registrar</a>
    `;
  }
  carregarMensagens();
});

function sair() {
  localStorage.removeItem('user');
  location.reload();
}
