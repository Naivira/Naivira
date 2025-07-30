document.addEventListener('DOMContentLoaded', () => {
  const loveInput = document.getElementById('loveInput');
  const landing = document.getElementById('landing');
  const app = document.getElementById('app');
  const infoCard = document.getElementById('infoCard');
  const chatLog = document.getElementById('chatLog');
  const chatInput = document.getElementById('chatInput');

  function appendChat(text, sender) {
    const div = document.createElement('div');
    div.className = sender;
    div.textContent = text;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  loveInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && loveInput.value.trim() !== '') {
      const topic = loveInput.value.trim();
      infoCard.textContent = `You love ${topic}. This card will provide information and insights as you explore.`;
      landing.classList.add('hidden');
      app.classList.remove('hidden');
      appendChat(`You love ${topic}`, 'user');
      appendChat(`Let\'s explore ${topic} together! Ask me anything about it.`, 'bot');
    }
  });

  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && chatInput.value.trim() !== '') {
      const question = chatInput.value.trim();
      appendChat(question, 'user');
      // Placeholder response; this will later be replaced with GPT-4 integration.
      appendChat(`I\'ll think about "${question}" and update the info card when there\'s a new perspective.`, 'bot');
      chatInput.value = '';
    }
  });
});
