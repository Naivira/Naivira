import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.11/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.6.11/firebase-firestore.js';
import { firebaseConfig } from './firebaseConfig.js';

// Initialise Firebase (still useful if you want Firestore later)
const appFirebase = initializeApp(firebaseConfig);
const db = getFirestore(appFirebase); // Not used yet, but ready when you need it

document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const authContainer = document.getElementById('authContainer');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const authError = document.getElementById('authError');

  const landing = document.getElementById('landing');
  const loveInput = document.getElementById('loveInput');
  const app = document.getElementById('app');
  const infoCard = document.getElementById('infoCard');
  const chatLog = document.getElementById('chatLog');
  const chatInput = document.getElementById('chatInput');

  let currentUser = null;
  let currentTopic = null;
  const conversations = {};

  // Helpers to show/hide UI sections
  function show(el) { el.classList.remove('hidden'); el.classList.add('show'); }
  function hide(el) { el.classList.add('hidden'); el.classList.remove('show'); }

  function showLanding() { hide(authContainer); show(landing); hide(app); }
  function showApp() { hide(landing); show(app); }

  // Sign up using localStorage
  function handleSignup() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const users = JSON.parse(localStorage.getItem('naivira_users') || '{}');
    if (!username || !password) {
      authError.textContent = 'Please enter a username and password';
      return;
    }
    if (users[username]) {
      authError.textContent = 'Username already exists';
      return;
    }
    users[username] = password;
    localStorage.setItem('naivira_users', JSON.stringify(users));
    currentUser = username;
    authError.textContent = '';
    showLanding();
  }

  // Log in using localStorage
  function handleLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const users = JSON.parse(localStorage.getItem('naivira_users') || '{}');
    if (!username || !password) {
      authError.textContent = 'Please enter your username and password';
      return;
    }
    if (!users[username] || users[username] !== password) {
      authError.textContent = 'Invalid username or password';
      return;
    }
    currentUser = username;
    authError.textContent = '';
    showLanding();
  }

  loginBtn.addEventListener('click', handleLogin);
  signupBtn.addEventListener('click', handleSignup);

  // Start a topic when the user submits the “love” input
  loveInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && loveInput.value.trim() !== '') {
      const topic = loveInput.value.trim();
      loveInput.value = '';
      startTopic(topic);
    }
  });

  function startTopic(topic) {
    currentTopic = topic;
    if (!conversations[currentTopic]) conversations[currentTopic] = [];
    showApp();
    chatLog.innerHTML = '';
    updateInfoCard();
    // Load saved conversation from local storage keyed by user/topic
    const key = `${currentUser}_${currentTopic}_conversation`;
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    conversations[currentTopic] = saved;
    saved.forEach((msg) => appendChat(msg.text, msg.role));
    if (saved.length === 0) {
      appendChat(`You love ${topic}.`, 'bot');
      appendChat(`Let's explore ${topic} together! Ask me anything about it.`, 'bot');
    }
  }

  function saveConversation() {
    if (currentUser && currentTopic) {
      const key = `${currentUser}_${currentTopic}_conversation`;
      localStorage.setItem(key, JSON.stringify(conversations[currentTopic]));
    }
  }

  function appendChat(text, role) {
    const div = document.createElement('div');
    div.className = role;
    div.textContent = text;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
    conversations[currentTopic].push({ text, role });
    saveConversation();
  }

  async function getAnswer(messages) {
    try {
      const res = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      return data.reply || "I'm sorry, I couldn't get an answer.";
    } catch (err) {
      console.error(err);
      return "I'm sorry, I couldn't get an answer.";
    }
  }

  function updateInfoCard() {
    const questions = conversations[currentTopic]
      .filter((m) => m.role === 'user')
      .map((m) => m.text);
    if (questions.length === 0) {
      infoCard.textContent = `You love ${currentTopic}. This card will provide information and insights as you explore.`;
    } else {
      let summary = `You love ${currentTopic}. This card will provide information and insights as you explore.\n\nQuestions so far:\n`;
      questions.forEach((q, i) => {
        summary += `${i + 1}. ${q}\n`;
      });
      infoCard.textContent = summary;
    }
  }

  function analyseQuestion(question) {
    const lower = question.toLowerCase();
    if (lower.includes('dog') && currentTopic.toLowerCase() !== 'dogs') return 'Dogs';
    if (lower.includes('cat') && currentTopic.toLowerCase() !== 'cats') return 'Cats';
    return null;
  }

  chatInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && chatInput.value.trim() !== '') {
      const question = chatInput.value.trim();
      chatInput.value = '';
      appendChat(question, 'user');
      updateInfoCard();
      // Prepare conversation for API
      const messagesForApi = conversations[currentTopic].map((m) => ({
        role: m.role === 'bot' ? 'assistant' : m.role,
        content: m.text
      }));
      const answer = await getAnswer(messagesForApi);
      appendChat(answer, 'bot');
      updateInfoCard();
      const newTopic = analyseQuestion(question);
      if (newTopic && newTopic !== currentTopic) {
        startTopic(newTopic);
      }
    }
  });
});
