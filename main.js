document.addEventListener('DOMContentLoaded', () => {
  // DOM references
  const authContainer = document.getElementById('authContainer');
  const landing = document.getElementById('landing');
  const app = document.getElementById('app');
  const loveInput = document.getElementById('loveInput');
  const chatLog = document.getElementById('chatLog');
  const chatInput = document.getElementById('chatInput');
  const infoCard = document.getElementById('infoCard');

  // Authentication inputs and buttons
  const signupUsernameInput = document.getElementById('signupUsername');
  const signupPasswordInput = document.getElementById('signupPassword');
  const loginUsernameInput = document.getElementById('loginUsername');
  const loginPasswordInput = document.getElementById('loginPassword');
  const signupBtn = document.getElementById('signupBtn');
  const loginBtn = document.getElementById('loginBtn');
  const errorMessage = document.getElementById('errorMessage');

  let currentUser = null;
  let currentTopic = '';
  let conversations = {};

  function show(element) {
    element.classList.remove('hidden');
    element.classList.add('show');
  }
  function hide(element) {
    element.classList.add('hidden');
    element.classList.remove('show');
  }

  function loadUser() {
    currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      hide(authContainer);
      show(landing);
      const stored = localStorage.getItem(currentUser + '_conversations');
      conversations = stored ? JSON.parse(stored) : {};
    } else {
      show(authContainer);
      hide(landing);
      hide(app);
    }
  }

  function saveConversations() {
    if (currentUser) {
      localStorage.setItem(currentUser + '_conversations', JSON.stringify(conversations));
    }
  }

  function handleSignup() {
    const username = signupUsernameInput.value.trim();
    const password = signupPasswordInput.value.trim();
    if (!username || !password) {
      if (errorMessage) errorMessage.textContent = 'Please enter a username and password.';
      return;
    }
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    if (users[username]) {
      if (errorMessage) errorMessage.textContent = 'Username already exists.';
      return;
    }
    users[username] = password;
    localStorage.setItem('users', JSON.stringify(users));
    signupUsernameInput.value = '';
    signupPasswordInput.value = '';
    localStorage.setItem('currentUser', username);
    loadUser();
  }

  function handleLogin() {
    const username = loginUsernameInput.value.trim();
    const password = loginPasswordInput.value.trim();
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    if (users[username] && users[username] === password) {
      localStorage.setItem('currentUser', username);
      loginUsernameInput.value = '';
      loginPasswordInput.value = '';
      loadUser();
    } else {
      if (errorMessage) errorMessage.textContent = 'Invalid username or password.';
    }
  }

  function startTopic(topic) {
    currentTopic = topic;
    hide(landing);
    show(app);
    if (!conversations[currentTopic]) {
      conversations[currentTopic] = [];
    }
    chatLog.innerHTML = '';
    for (const msg of conversations[currentTopic]) {
      appendChat(msg.text, msg.role);
    }
    updateInfoCard();
  }

  function appendChat(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender);
    msgDiv.textContent = text;
    chatLog.appendChild(msgDiv);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function updateInfoCard() {
    if (!currentTopic) {
      infoCard.textContent = '';
      return;
    }
    const conv = conversations[currentTopic] || [];
    const questions = conv.filter(m => m.role === 'user').map(m => m.text);
    let summary = `You love ${currentTopic}. This card will provide information and insights as you explore.\n\n`;
    if (questions.length > 0) {
      summary += 'You have asked:\n';
      questions.forEach((q, idx) => {
        summary += `${idx + 1}. ${q}\n`;
      });
    } else {
      summary += `Let's explore ${currentTopic} together! Ask me anything about ${currentTopic}.`;
    }
    infoCard.textContent = summary;
  }

  async function getAnswer(messages) {
    try {
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      return data.reply ? data.reply.trim() : "I'm sorry, I couldn't get an answer right now.";
    } catch (err) {
      console.error(err);
      return 'This is a stubbed response.';
    }
  }

  async function analyseQuestion(question) {
    const lower = question.toLowerCase();
    if (lower.includes('dog') && currentTopic.toLowerCase() !== 'dogs') {
      return 'Dogs';
    }
    return null;
  }

  async function handleChatEnter() {
    const question = chatInput.value.trim();
    if (!question) return;
    appendChat(question, 'user');
    conversations[currentTopic].push({ role: 'user', text: question });
    chatInput.value = '';
    updateInfoCard();
    const answer = await getAnswer(conversations[currentTopic]);
    appendChat(answer, 'bot');
    conversations[currentTopic].push({ role: 'assistant', text: answer });
    saveConversations();
    const newTopic = await analyseQuestion(question);
    if (newTopic && newTopic !== currentTopic) {
      startTopic(newTopic);
    }
  }

  if (signupBtn) signupBtn.addEventListener('click', handleSignup);
  if (loginBtn) loginBtn.addEventListener('click', handleLogin);

  loveInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && loveInput.value.trim() !== '') {
      startTopic(loveInput.value.trim());
    }
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleChatEnter();
    }
  });

  loadUser();
});
