import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js';
import { getFirestore, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.5.2/firebase-firestore.js';
import { firebaseConfig } from './firebaseConfig.js';

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

document.addEventListener('DOMContentLoaded', () => {
  const loveInput = document.getElementById('loveInput');
  const landing = document.getElementById('landing');
  const app = document.getElementById('app');
  const infoCard = document.getElementById('infoCard');

  const chatLog = document.getElementById('chatLog');
  const chatInput = document.getElementById('chatInput');

  // keep conversation for GPT
  let conversation = [];

  async function appendChat(text, sender) {
    const div = document.createElement('div');
    div.className = sender;
    div.textContent = text;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;

    // push to conversation array
    const role = sender === 'user' ? 'user' : 'assistant';
    conversation.push({ role, content: text });

    // store message in Firestore
    try {
      await addDoc(collection(db, 'messages'), {
        text,
        sender,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error writing message to Firestore', error);
    }
  }

  async function callGPT(messages) {
    try {
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });
      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error calling GPT function', error);
      return 'Sorry, an error occurred.';
    }
  }

  loveInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter' && loveInput.value.trim() !== '') {
      const topic = loveInput.value.trim();
      infoCard.textContent = `You love ${topic}. This card will provide information and insights as you explore.`;
      landing.classList.add('hidden');
      app.classList.remove('hidden');
      await appendChat(`You love ${topic}`, 'user');
      await appendChat(`Let's explore ${topic} together! Ask me anything about it.`, 'bot');
      loveInput.value = '';
    }
  });

  chatInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter' && chatInput.value.trim() !== '') {
      const question = chatInput.value.trim();
      await appendChat(question, 'user');
      chatInput.value = '';
      const answer = await callGPT(conversation);
      await appendChat(answer, 'bot');
    }
  });
});
