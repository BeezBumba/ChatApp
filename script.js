// script.js
const { createApp, ref, onMounted } = Vue

    createApp({
      setup() {
        const loggedIn = ref(false)
        const email = ref('')
        const password = ref('')
        const friends = ref([])
        const friendRequests = ref([])
        const pendingRequests = ref([])
        const showAddFriendModal = ref(false)
        const newFriendEmail = ref('')
        const notification = ref('')
        const currentChat = ref(null)
        const newMessage = ref('')
        const isRecording = ref(false)
        let mediaRecorder = null
        let audioChunks = []
        
       const login = () => {
        if (email.value && password.value) {
          loggedIn.value = true;
          // Simulate receiving friend requests
          setTimeout(() => {
            friendRequests.value = [];
          }, 1000); // You can adjust the delay as needed
        }
      };


        const signup = () => {
          if (email.value && password.value) {
            loggedIn.value = true
            friends.value = []
          }
        }

        const sendFriendRequest = () => {
          if (newFriendEmail.value && !friends.value.some(f => f.email === newFriendEmail.value) && !pendingRequests.value.some(r => r.email === newFriendEmail.value)) {
            pendingRequests.value.push({ email: newFriendEmail.value })
            showAddFriendModal.value = false
            newFriendEmail.value = ''
            notification.value = `Friend request sent to ${newFriendEmail.value}`
            setTimeout(() => {
              notification.value = ''
            }, 3000)
          } else {
            notification.value = 'Invalid email or request already sent'
            setTimeout(() => {
              notification.value = ''
            }, 3000)
          }
        }

        const acceptFriendRequest = (request) => {
          friends.value.push({ email: request.email, messages: [] })
          friendRequests.value = friendRequests.value.filter(r => r.email !== request.email)
          notification.value = `${request.email} added as a friend!`
          setTimeout(() => {
            notification.value = ''
          }, 3000)
        }

        const rejectFriendRequest = (request) => {
          friendRequests.value = friendRequests.value.filter(r => r.email !== request.email)
          notification.value = `Friend request from ${request.email} rejected`
          setTimeout(() => {
            notification.value = ''
          }, 3000)
        }

        const openChat = (friend) => {
          currentChat.value = friend
        }

        const closeChat = () => {
          currentChat.value = null
        }

        const sendMessage = () => {
          if (newMessage.value.trim() && currentChat.value) {
            currentChat.value.messages.push({
              id: Date.now(),
              content: newMessage.value,
              sender: email.value,
              type: 'text'
            })
            newMessage.value = ''
          }
        }

        const sendImage =(event) => {
          const file = event.target.files[0]
          if (file && currentChat.value) {
            const reader = new FileReader()
            reader.onload = (e) => {
              currentChat.value.messages.push({
                id: Date.now(),
                content: e.target.result,
                sender: email.value,
                type: 'image'
              })
            }
            reader.readAsDataURL(file)
          }
        }

        const startRecording = async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            mediaRecorder = new MediaRecorder(stream)
            mediaRecorder.ondataavailable = (event) => {
              audioChunks.push(event.data)
            }
            mediaRecorder.onstop = () => {
              const audioBlob = new Blob(audioChunks, { type: 'audio/mpeg' })
              const audioUrl = URL.createObjectURL(audioBlob)
              currentChat.value.messages.push({
                id: Date.now(),
                content: audioUrl,
                sender: email.value,
                type: 'audio'
              })
              audioChunks = []
            }
            mediaRecorder.start()
            isRecording.value = true
          } catch (error) {
            console.error('Error accessing microphone:', error)
            notification.value = "Error accessing microphone. Please check your permissions."
          }
        }

        const stopRecording = () => {
          if (mediaRecorder && isRecording.value) {
            mediaRecorder.stop()
            isRecording.value = false
          }
        }

        return {
          loggedIn,
          email,
          password,
          login,
          signup,
          friends,
          friendRequests,
          pendingRequests,
          showAddFriendModal,
          newFriendEmail,
          sendFriendRequest,
          acceptFriendRequest,
          rejectFriendRequest,
          notification,
          currentChat,
          newMessage,
          openChat,
          closeChat,
          sendMessage,
          sendImage,
          startRecording,
          stopRecording,
          isRecording
        }
      }
    }).mount('#app')
