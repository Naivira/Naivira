import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.11/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.11/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.6.11/firebase-firestore.js';
import { firebaseConfig } from './firebaseConfig.js';

// Initialise Firebase
const appFirebase = initializeApp(firebaseConfig);
const auth = getAuth(appFirebase);
const db = getFirestore(appFirebase);

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
  let conversations = {};

  function show(element) {
    element.classList.remove('hidden');
    element.classList.add('show');
  }
  function hide(element) {
    element.classList.add('hidden');
    element.classList.remove('show');
  }

  function showLanding() {
    hide(authContainer);
    show(landing);
    hide(app);
  }
  function showApp() {
    hide(landing);
    show(app);
  }

  // Load saved user
  function loadUser() {
    const users = JSON.parse(localStorage.getItem('naivira_users') || '{}');
    const remembered = localStorage.getItem('naivira_currentUser');
    if (remembered && users[remembered]) {
      currentUser = remembered;
      showLanding();
    } else {
      show(authContainer);
      hide(landing);
      hide(app);
    }
  }

  function saveUsers(users) {
    localStorage.setItem('naivira_users', JSON.stringify(users));
  }

  // Sign up
  function handleSignup() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (!username || !password) {
      authError.textContent = 'Please enter a username and password';
      return;
    }
    const users = JSON.parse(localStorage.getItem('naivira_users') || '{}');
    if (users[username]) {
      authError.textContent = 'Username already exists';
      return;
    }
    users[username] = password;
    saveUsers(users);
    localStorage.setItem('naivira_currentUser', username);
    currentUser = username;
    authError.textContent = '';
    showLanding();
  }

  // Log in
  function handleLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const users = JSON.parse(localStorage.getItem('naivira_users') || '{}');
    if (!users[username] || users[username] !== password) {
      authError.textContent = 'Invalid username or password';
      return;
    }
    localStorage.setItem('naivira_currentUser', username);
    currentUser = username;
    authError.textContent = '';
    showLanding();
  }

  loginBtn.addEventListener('click', handleLogin);
  signupBtn.addEventListener('click', handleSignup);

  // Persist current user
  window.addEventListener('beforeunload', () => {
    if (currentUser) {
      localStorage.setItem('naivira_currentUser', currentUser);
    }
  });

  loadUser();

  // Start a topic when the user answers “what do you love”
  loveInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && loveInput.value.trim() !== '') {
      const topic = loveInput.value.trim();
      loveInput.value = '';
      startTopic(topic);
    }
  });

  // Start or switch a topic
  function startTopic(topic) {
    currentTopic = topic;
    if (!conversations[currentTopic]) {
      conversations[currentTopic] = [];
    }
    showApp();
    chatLog.innerHTML = '';
    updateInfoCard();
    // Load saved conversation
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

  function appendChat(text, sender) {
    const div = document.createElement('div');
    div.className = sender;
    div.textContent = text;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
    conversations[currentTopic].push({ text, role: sender });
    saveConversation();
  }

  // Fetch a GPT answer using the existing Netlify function
  async function getAnswer(messages) {
    try {
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      return data.reply || "I'm sorry, I couldn't get an answer.";
    } catch (e) {
      console.error(e);
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
      let summary =
        `You love ${currentTopic}. This card will provide information and insights as you explore.\n\n` +
        'Questions so far:\n';
      questions.forEach((q, idx) => {
        summary += `${idx + 1}. ${q}\n`;
      });
      infoCard.textContent = summary;
    }
  }

  // Simple heuristic for spawning new topics
  function analyseQuestion(question) {
    const lower = question.toLowerCase();
    if (lower.includes('dog') && currentTopic.toLowerCase() !== 'dogs') {
      return 'Dogs';
    }
    if (lower.includes('cat') && currentTopic.toLowerCase() !== 'cats') {
      return 'Cats';
    }
    return null;
  }

  // Chat input handler
  chatInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && chatInput.value.trim() !== '') {
      const question = chatInput.value.trim();
      chatInput.value = '';
      appendChat(question, 'user');
      updateInfoCard();
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
