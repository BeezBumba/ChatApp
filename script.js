async function setupDatabase() {
  await createUsersTable();
  await createFriendsTable();
  await createMessagesTable();
  await createFriendRequestsTable();
  await createBansTable();
}

async function createUsersTable() {
  let query = `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT, is_admin BOOLEAN DEFAULT 0)`;
  await executeSql(query);
}

async function createFriendsTable() {
  let query = `CREATE TABLE IF NOT EXISTS friends (id INTEGER PRIMARY KEY, user_id INTEGER, friend_id INTEGER, UNIQUE(user_id, friend_id))`;
  await executeSql(query);
}

async function createMessagesTable() {
  let query = `CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, sender_id INTEGER, receiver_id INTEGER, content TEXT, type TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`;
  await executeSql(query);
}

async function createFriendRequestsTable() {
  let query = `CREATE TABLE IF NOT EXISTS friend_requests (id INTEGER PRIMARY KEY, sender_id INTEGER, receiver_id INTEGER, status TEXT, UNIQUE(sender_id, receiver_id))`;
  await executeSql(query);
}

async function createBansTable() {
  let query = `CREATE TABLE IF NOT EXISTS bans (id INTEGER PRIMARY KEY, user_id INTEGER, banned_until DATETIME)`;
  await executeSql(query);
}

async function insertUser(username, password) {
  let query = `INSERT INTO users (username, password, is_admin) VALUES ('${username}', '${password}', ${username === 'Soyboss' ? 1 : 0})`;
  try {
    await executeSql(query);
    return true;
  } catch (error) {
    console.error('Error inserting user:', error);
    return false;
  }
}

async function checkUser(username, password) {
  let query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
  let result = await executeSql(query);
  return result.length > 0 ? result[0] : null;
}

async function sendFriendRequest(senderId, receiverUsername) {
  let query = `INSERT INTO friend_requests (sender_id, receiver_id, status) 
               SELECT ${senderId}, id, 'pending' 
               FROM users WHERE username = '${receiverUsername}'`;
  try {
    await executeSql(query);
    return true;
  } catch (error) {
    console.error('Error sending friend request:', error);
    return false;
  }
}

async function getFriendRequests(userId) {
  let query = `SELECT fr.id, fr.sender_id, u.username as sender_username 
               FROM friend_requests fr 
               JOIN users u ON fr.sender_id = u.id 
               WHERE fr.receiver_id = ${userId} AND fr.status = 'pending'`;
  return await executeSql(query);
}

async function updateFriendRequestStatus(requestId, status) {
  let query = `UPDATE friend_requests SET status = '${status}' WHERE id = ${requestId}`;
  await executeSql(query);
}

async function addFriend(userId, friendId) {
  let query = `INSERT INTO friends (user_id, friend_id) VALUES (${userId}, ${friendId}), (${friendId}, ${userId})`;
  await executeSql(query);
}

async function getFriends(userId) {
  let query = `SELECT u.id, u.username 
               FROM friends f 
               JOIN users u ON f.friend_id = u.id 
               WHERE f.user_id = ${userId}`;
  return await executeSql(query);
}

async function sendMessage(senderId, receiverId, content, type) {
  let query = `INSERT INTO messages (sender_id, receiver_id, content, type) VALUES (${senderId}, ${receiverId}, '${content}', '${type}')`;
  await executeSql(query);
}

async function getMessages(userId, friendId) {
  let oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  let query = `SELECT * FROM messages 
               WHERE ((sender_id = ${userId} AND receiver_id = ${friendId}) 
               OR (sender_id = ${friendId} AND receiver_id = ${userId}))
               AND timestamp > '${oneMonthAgo.toISOString()}'
               ORDER BY timestamp`;
  return await executeSql(query);
}

async function getAllUsers() {
  let query = `SELECT id, username FROM users WHERE username != 'Soyboss'`;
  return await executeSql(query);
}

async function banUser(userId, duration) {
  let bannedUntil = new Date();
  bannedUntil.setHours(bannedUntil.getHours() + duration);
  let query = `INSERT OR REPLACE INTO bans (user_id, banned_until) VALUES (${userId}, '${bannedUntil.toISOString()}')`;
  await executeSql(query);
}

async function removeUser(userId) {
  let queries = [
    `DELETE FROM users WHERE id = ${userId}`,
    `DELETE FROM friends WHERE user_id = ${userId} OR friend_id = ${userId}`,
    `DELETE FROM messages WHERE sender_id = ${userId} OR receiver_id = ${userId}`,
    `DELETE FROM friend_requests WHERE sender_id = ${userId} OR receiver_id = ${userId}`,
    `DELETE FROM bans WHERE user_id = ${userId}`
  ];
  
  for (let query of queries) {
    await executeSql(query);
  }
}

async function checkUserBan(userId) {
  let query = `SELECT * FROM bans WHERE user_id = ${userId} AND banned_until > datetime('now')`;
  let result = await executeSql(query);
  return result.length > 0 ? result[0] : null;
}

async function executeSql(query) {
  try {
    let response = await fetch('/api/v1/sql/?' + new URLSearchParams({sql: query}));
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    let data = await response.json();
    return data;
  } catch (error) {
    console.error('Error executing SQL query:', error);
    throw error;
  }
}

let currentUser = null;
let currentFriend = null;

function showLoginForm() {
  document.getElementById('loginContainer').style.display = 'flex';
  document.getElementById('chatContainer').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'none';
}

function showChatInterface() {
  document.getElementById('loginContainer').style.display = 'none';
  document.getElementById('chatContainer').style.display = 'flex';
  document.getElementById('currentUsername').textContent = currentUser.username;
  if (currentUser.username === 'Soyboss') {
    document.getElementById('adminPanelBtn').style.display = 'inline-block';
  } else {
    document.getElementById('adminPanelBtn').style.display = 'none';
  }
}

function updateFriendList(friends) {
  const friendList = document.getElementById('friendList');
  friendList.innerHTML = '';
  friends.forEach(friend => {
    const friendItem = document.createElement('div');
    friendItem.className = 'friend-item';
    friendItem.textContent = friend.username;
    friendItem.onclick = () => selectFriend(friend);
    friendList.appendChild(friendItem);
  });
}

function selectFriend(friend) {
  if (!friend) return;
  currentFriend = friend;
  document.getElementById('currentFriend').textContent = friend.username;
  const noChatSelectedElement = document.querySelector('.no-chat-selected');
  if (noChatSelectedElement) {
    noChatSelectedElement.style.display = 'none';
  }
  const chatMessagesElement = document.getElementById('chatMessages');
  if (chatMessagesElement) {
    chatMessagesElement.style.display = 'flex';
  }
  const chatInputElement = document.querySelector('.chat-input');
  if (chatInputElement) {
    chatInputElement.style.display = 'flex';
  }
  loadMessages();
}

async function loadMessages() {
  if (!currentUser || !currentFriend) return;
  const messages = await getMessages(currentUser.id, currentFriend.id);
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;
  chatMessages.innerHTML = '';
  messages.forEach(message => {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.sender_id === currentUser.id ? 'sent' : 'received'}`;
    
    if (message.type === 'text') {
      messageElement.textContent = message.content;
    } else if (message.type === 'youtube') {
      const iframe = document.createElement('iframe');
      iframe.width = '280';
      iframe.height = '157';
      iframe.src = message.content.replace('watch?v=', 'embed/');
      iframe.frameBorder = '0';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      messageElement.appendChild(iframe);
    } else if (message.type === 'image') {
      const img = document.createElement('img');
      img.src = message.content;
      img.alt = 'Sent image';
      img.style.maxWidth = '100%';
      messageElement.appendChild(img);
    }
    
    chatMessages.appendChild(messageElement);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

document.getElementById('authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const isLogin = document.getElementById('submitBtn').textContent === 'Log In';

  if (isLogin) {
    currentUser = await checkUser(username, password);
    if (currentUser) {
      const banInfo = await checkUserBan(currentUser.id);
      if (banInfo) {
        const banEndTime = new Date(banInfo.banned_until);
        alert(`You are banned until ${banEndTime.toLocaleString()}. Please try again later.`);
        return;
      }
      showChatInterface();
      const friends = await getFriends(currentUser.id);
      updateFriendList(friends);
    } else {
      document.getElementById('message').textContent = 'Invalid username or password.';
    }
  } else {
    const success = await insertUser(username, password);
    if (success) {
      document.getElementById('message').textContent = 'User registered successfully!';
      document.getElementById('submitBtn').textContent = 'Log In';
      document.getElementById('toggleAuth').textContent = 'Sign Up';
    } else {
      document.getElementById('message').textContent = 'Username already exists or an error occurred.';
    }
  }
});

document.getElementById('toggleAuth').addEventListener('click', (e) => {
  e.preventDefault();
  const isLogin = document.getElementById('submitBtn').textContent === 'Log In';
  document.getElementById('submitBtn').textContent = isLogin ? 'Sign Up' : 'Log In';
  document.getElementById('toggleAuth').textContent = isLogin ? 'Log In' : 'Sign Up';
  document.getElementById('message').textContent = '';
});

document.getElementById('addFriendBtn').onclick = () => {
  document.getElementById('addFriendModal').style.display = 'block';
};

document.getElementById('sendFriendRequestBtn').onclick = async () => {
  const friendUsername = document.getElementById('friendUsername').value;
  const success = await sendFriendRequest(currentUser.id, friendUsername);
  if (success) {
    alert('Friend request sent!');
    document.getElementById('addFriendModal').style.display = 'none';
  } else {
    alert('Failed to send friend request. User might not exist or already be your friend.');
  }
};

async function sendMessageHandler() {
  const messageInput = document.getElementById('messageInput');
  const content = messageInput.value.trim();
  if (content && currentFriend) {
    if (content.startsWith('https://www.youtube.com/') || content.startsWith('https://youtu.be/')) {
      await sendMessage(currentUser.id, currentFriend.id, content, 'youtube');
    } else {
      await sendMessage(currentUser.id, currentFriend.id, content, 'text');
    }
    messageInput.value = '';
    const chatMessages = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message sent new';
    if (content.startsWith('https://www.youtube.com/') || content.startsWith('https://youtu.be/')) {
      const iframe = document.createElement('iframe');
      iframe.width = '280';
      iframe.height = '157';
      iframe.src = content.replace('watch?v=', 'embed/');
      iframe.frameBorder = '0';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      messageElement.appendChild(iframe);
    } else {
      messageElement.textContent = content;
    }
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

document.getElementById('sendBtn').onclick = sendMessageHandler;

document.getElementById('messageInput').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendMessageHandler();
  }
});

document.getElementById('logoutBtn').onclick = () => {
  currentUser = null;
  currentFriend = null;
  showLoginForm();
};

document.querySelectorAll('.close').forEach(closeBtn => {
  closeBtn.onclick = function() {
    this.closest('.modal').style.display = 'none';
  }
});

window.onclick = function(event) {
  if (event.target.className === 'modal') {
    event.target.style.display = 'none';
  }
}

async function checkForNewMessages() {
  if (currentUser && currentFriend) {
    const messages = await getMessages(currentUser.id, currentFriend.id);
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    if (messages.length > chatMessages.children.length) {
      const newMessages = messages.slice(chatMessages.children.length);
      newMessages.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.sender_id === currentUser.id ? 'sent' : 'received'} new`;
        
        if (message.type === 'text') {
          messageElement.textContent = message.content;
        } else if (message.type === 'youtube') {
          const iframe = document.createElement('iframe');
          iframe.width = '280';
          iframe.height = '157';
          iframe.src = message.content.replace('watch?v=', 'embed/');
          iframe.frameBorder = '0';
          iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
          iframe.allowFullscreen = true;
          messageElement.appendChild(iframe);
        } else if (message.type === 'image') {
          const img = document.createElement('img');
          img.src = message.content;
          img.alt = 'Sent image';
          img.style.maxWidth = '100%';
          messageElement.appendChild(img);
        }
        
        chatMessages.appendChild(messageElement);
      });
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }
}

async function checkForFriendUpdates() {
  if (currentUser) {
    const friends = await getFriends(currentUser.id);
    updateFriendList(friends);
  }
}

setInterval(async () => {
  if (currentUser) {
    const requests = await getFriendRequests(currentUser.id);
    if (requests.length > 0) {
      const request = requests[0];
      document.getElementById('friendRequestMessage').textContent = `${request.sender_username} wants to add you as a friend.`;
      document.getElementById('friendRequestModal').style.display = 'block';
      
      document.getElementById('acceptFriendRequestBtn').onclick = async () => {
        await updateFriendRequestStatus(request.id, 'accepted');
        await addFriend(currentUser.id, request.sender_id);
        const friends = await getFriends(currentUser.id);
        updateFriendList(friends);
        document.getElementById('friendRequestModal').style.display = 'none';
        
        const newFriend = friends.find(friend => friend.id === request.sender_id);
        if (newFriend) {
          selectFriend(newFriend);
        }
      };
      
      document.getElementById('declineFriendRequestBtn').onclick = async () => {
        await updateFriendRequestStatus(request.id, 'declined');
        document.getElementById('friendRequestModal').style.display = 'none';
      };
    }
    
    checkForNewMessages();
    checkForFriendUpdates();
  }
}, 1000);

const emojiPicker = document.createElement('emoji-picker');
document.querySelector('.emoji-picker').appendChild(emojiPicker);

document.querySelector('.emoji-toggle').addEventListener('click', () => {
  const picker = document.querySelector('.emoji-picker');
  picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
});

emojiPicker.addEventListener('emoji-click', event => {
  const messageInput = document.getElementById('messageInput');
  messageInput.value += event.detail.unicode;
  messageInput.focus();
});

document.getElementById('imageInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
""
  if (file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target.result;
      if (currentFriend) {
        await sendMessage(currentUser.id, currentFriend.id, imageData, 'image');
        const chatMessages = document.getElementById('chatMessages');
        const messageElement = document.createElement('div');
        messageElement.className = 'message sent new';
        const img = document.createElement('img');
        img.src = imageData;
        img.alt = 'Sent image';
        img.style.maxWidth = '100%';
        messageElement.appendChild(img);
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    };
    reader.readAsDataURL(file);
  }
});

document.getElementById('adminPanelBtn').addEventListener('click', async () => {
  if (currentUser.username === 'Soyboss') {
    const adminPanel = document.getElementById('adminPanel');
    adminPanel.style.display = adminPanel.style.display === 'none' ? 'block' : 'none';
    if (adminPanel.style.display === 'block') {
      await updateAdminPanel();
    }
  }
});

async function updateAdminPanel() {
  const users = await getAllUsers();
  const userList = document.getElementById('userList');
  userList.innerHTML = '';
  users.forEach(user => {
    const li = document.createElement('li');
    li.textContent = user.username;
    
    const banButton = document.createElement('button');
    banButton.textContent = 'Ban';
    banButton.onclick = () => banUser(user.id);
    
    const removeButton = document.createElement('button');
    removeButton.textContent = 'Remove';
    removeButton.className = 'remove';
    removeButton.onclick = () => removeUserAccount(user.id);
    
    const banDurationSelect = document.createElement('select');
    banDurationSelect.id = 'banDuration';
    [2, 4, 8, 12, 24, 48].forEach(hours => {
      const option = document.createElement('option');
      option.value = hours;
      option.textContent = `${hours} hours`;
      banDurationSelect.appendChild(option);
    });
    
    li.appendChild(banDurationSelect);
    li.appendChild(banButton);
    li.appendChild(removeButton);
    userList.appendChild(li);
  });
}

async function banUser(userId) {
  const duration = document.getElementById('banDuration').value;
  await banUser(userId, parseInt(duration));
  alert(`User banned for ${duration} hours.`);
  await updateAdminPanel();
}

async function removeUserAccount(userId) {
  if (confirm('Are you sure you want to permanently remove this user account?')) {
    await removeUser(userId);
    alert('User account removed permanently.');
    await updateAdminPanel();
  }
}

window.onload = setupDatabase;
