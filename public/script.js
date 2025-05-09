async function carregarMensagens() {
    const res = await fetch('/mensagens');
    const msgs = await res.json();
    const container = document.getElementById('mensagens');
    container.innerHTML = '';
    msgs.reverse().forEach(m => {
      const div = document.createElement('div');
      div.className = 'msg';
      div.innerHTML = `<time>${new Date(m.data).toLocaleString()}</time><p>${m.texto}</p>`;
      container.appendChild(div);
    });
  }
  
  function coletarUserData() {
    return new Promise(resolve => {
      const data = {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        screen: `${window.screen.width}x${window.screen.height}`,
        device: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
        browser: navigator.userAgentData ? navigator.userAgentData.brands[0].brand : 'Desconhecido',
        os: navigator.userAgentData ? navigator.userAgentData.platform : navigator.platform
      };
  
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          data.latitude = pos.coords.latitude;
          data.longitude = pos.coords.longitude;
          data.accuracy = pos.coords.accuracy;
          resolve(data);
        }, () => resolve(data));
      } else {
        resolve(data);
      }
    });
  }
  
  async function enviar() {
    const texto = document.getElementById('texto').value;
    if (!texto.trim()) return alert('Mensagem vazia.');
    const userData = await coletarUserData();
    await fetch('/mensagem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto, userData })
    });
    document.getElementById('texto').value = '';
    carregarMensagens();
  }
  
  document.getElementById('toggleTheme').addEventListener('click', () => {
    document.body.classList.toggle('dark');
  });
  
  document.addEventListener('DOMContentLoaded', carregarMensagens);
  