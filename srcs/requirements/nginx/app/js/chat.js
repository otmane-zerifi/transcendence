import { getAccessToken } from "./backEnd.js";
import { friendsList } from "./friendsPage.js";
import { getUserData } from "./root.js";
import { checkTokenExpiration } from "./auth.js";

var chatsocket;
export function loadChatJs() {

    checkTokenExpiration().then(isValid => {
        if (isValid) {
            let token = getAccessToken();
            // Use the same host as the current page since nginx is proxying the requests
            const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/chatws/chat-server/?token=${token}`;

            chatsocket = new WebSocket(wsUrl);
            console.log('%cGHADI NDKHEL DABA', 'color: red; font-weight: bold;');
            loadFriendsPictures();
            chatsocket.onmessage = function (event) {
                console.log('Message received from WebSocket:', event.data);
                const data = JSON.parse(event.data);
                if (data.type === 'send_message_success') {
                    console.log('Message sent successfully:', data);
                } else if (data.type === 'join_chat_success') {
                    console.log('Successfully joined chat:', data);
                    fetchTargetDiscussion(data.target_user_id, data.target_status);
                } else if (data.type === 'chat_message') {
                    console.log('New chat message received:', data);
                    appendMessage(data);
                } else if (data.type === 'error') {
                    console.error('WebSocket error message:', data);
                }
            };

            chatsocket.onopen = function(e) {
                console.log("%cCHAT WebSocket connection opened", "color: red; font-weight: bold;");
            };

            chatsocket.onclose = function(e) {
                console.log("%cCHAT WebSocket connection closed ", "color: red; font-weight: bold;", e);
            };

            const chatOptions = document.querySelector('.reciever-options');
            if (chatOptions) {
                chatOptions.addEventListener('click', function (event) {
                    const popUp = event.target.closest('.chat-options').querySelector('.chat-opt-pop-up');
                    popUp.classList.toggle('d-none');
                });

                // Add listeners for invite and block buttons
                const inviteButton = document.querySelector('.chat-opt-pop-up .invite');
                const blockButton = document.querySelector('.chat-opt-pop-up .block');

                if (inviteButton) {
                    inviteButton.addEventListener('click', function () {
                        console.log('Invite button clicked');
                    });
                }

                if (blockButton) {
                    blockButton.addEventListener('click', function () {
                        console.log('Block button clicked');
                    });
                }

                // Close popup when clicking outside
                document.addEventListener('click', function (event) {
                    const popUp = document.querySelector('.chat-opt-pop-up');
                    if (popUp && !popUp.closest('.chat-options').contains(event.target)) {
                        popUp.classList.add('d-none');
                    }
                });
            }
        }
    });
}

function appendMessage(data) {
    const messagesContainer = document.querySelector('.chat-body');
    const messageElement = document.createElement('div');
    const messageDirectionClass = data.is_sent ? 'right-message' : 'left-message';
    messageElement.classList.add(messageDirectionClass);

    const timestamp = new Date(data.timestamp);
    const time = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    messageElement.innerHTML = `
        <div class="message-text">
            <p>${data.content}</p>
            <span class="message-time">${time}</span>
        </div>
    `;

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function joinChat(targetUserId) {
    console.log(targetUserId)
    const joinData = {
        type: 'join_chat',
        target_user_id: targetUserId
    };
    if (chatsocket && chatsocket.readyState === WebSocket.OPEN) {
        chatsocket.send(JSON.stringify(joinData));
    } else {
        console.error('WebSocket is not open. Cannot send message.');
    }
}

function loadFriendsPictures() {

    console.log('%cLoading friends for chat', 'color: pink; font-weight: bold;');
    friendsList().then(friends => {

        // PRINT FRIENDS in bold yellow
        console.log('%cFriends:', 'color: yellow; font-weight: bold;', friends);
        const chatFriendsContainer = document.querySelector('.chat-friends');
        
        // Clear existing friends
        chatFriendsContainer.innerHTML = '';
        
        // Iterate through friends and create friend elements
        friends.forEach(friend => {
            getUserData(friend.friend_details.user_name).then(userData => {
                console.log('%cFriend:', 'color: yellow; font-weight: bold;', userData);
                const friendElement = document.createElement('div');
                friendElement.classList.add('chat-player-pic');
                console.log("%cID :", 'color: blue; font-weight: bold;', userData.user.ID)
                friendElement.setAttribute('data-user-id', userData.user.ID);
                friendElement.style.backgroundImage = `url(${userData.user.avatar})`;
                chatFriendsContainer.appendChild(friendElement);
                friendElement.addEventListener('click', () => {
                    console.log('%cFRIEBD CLICKED', 'color: red; font-weight: bold;');
                    const targetUserId = friendElement.getAttribute('data-user-id'); 
                    joinChat(targetUserId);
                })
            })
        });
    })
    .catch(error => {
        console.error('Error fetching friends for chat:', error);
    });

    // const friendsList = document.querySelectorAll('.friend-item');
    // friendsList.forEach(friend => {
    //     friend.addEventListener('click', function() {
    //         const targetUserId = this.getAttribute('data-user-id'); // Assuming each friend item has a data attribute for user ID
    //         joinChat(targetUserId);
    //     });
    // });
}

function fetchTargetDiscussion(targetId, targetStatus) {
    console.log(`[fetchTargetDiscussion] Starting fetch for target user ID: ${targetId}`);
    const access_token = getAccessToken('access_token');
    var dkhaltntchecki = false;

    fetch(`/chatapi/targetuser/${targetId}/discussion/`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${access_token}`
        }
    })
    .then(response => {
        console.log(`[fetchTargetDiscussion] Response received. Status: ${response.status}`);
        let dkhaltntchecki = false;
        if (!response.ok) {
            if (response.status === 401) {
                console.error("[fetchTargetDiscussion] Unauthorized: Token may be expired or invalid.");
                dkhaltntchecki = true;
                logoutUserToken();
                return;
            }
            throw new Error(`[fetchTargetDiscussion] HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (dkhaltntchecki) {
            console.warn("[fetchTargetDiscussion] Aborting due to unauthorized access.");
            return;
        }

        console.log("[fetchTargetDiscussion] Discussion data received:", data);

        const messages = data.messages;
        const targetUsername = data.target_username;
        const header = document.querySelector('.chat-header');
        const messagesContainer = document.querySelector('.chat-body');

        console.log(`[fetchTargetDiscussion] Target username: ${targetUsername}`);
        console.log(`[fetchTargetDiscussion] Number of messages: ${messages.length}`);

        // Update chat header
        document.querySelector('.reciever-username').innerText = targetUsername;
        console.log(`[fetchTargetDiscussion] Updated chat header with target username: ${targetUsername}`);

        // Update target status
        const statusElement = document.querySelector('.reciever-options');
        statusElement.setAttribute('data-user-id', data.user_id);
        statusElement.textContent = targetStatus;
        console.log(`[fetchTargetDiscussion] Updated target status: ${targetStatus}`);

        // Clear messages container
        messagesContainer.innerHTML = '';
        console.log("[fetchTargetDiscussion] Cleared messages container.");

        // Append messages
        messages.forEach(message => {
            console.log(`[fetchTargetDiscussion] Processing message:`, message);
            const messageElement = document.createElement('div');
            messageElement.classList.add(message.is_sent ? 'right-message' : 'left-message');
            const timestamp = new Date(message.timestamp);
            const time = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

            messageElement.innerHTML = `
                <div class="message-text">
                    <p>${message.content}</p>
                    <span class="message-time">${time}</span>
                </div>
            `;

            messagesContainer.appendChild(messageElement);
            console.log(`[fetchTargetDiscussion] Appended message: ${message.content}`);
        });

        // Add message sending functionality
        const sendButton = document.querySelector('.bi-send');
        const messageInput = document.querySelector('.message-input input');

        const sendMessage = () => {
            const messageText = messageInput.value.trim();
            if (messageText) {
                console.log(`[fetchTargetDiscussion] Sending message: ${messageText}`);
                messageInput.value = ''; // Clear the input field

                const currentTime = new Date();
                const timestamp = currentTime.toISOString();
                const messageData = {
                    type: 'send_message',
                    content: messageText,
                    target_user_id: targetId,
                    timestamp: timestamp
                };

                chatsocket.send(JSON.stringify(messageData)); // Assuming `chatsocket` is defined
                console.log(`[fetchTargetDiscussion] Message sent via WebSocket:`, messageData);

                const newMessageDiv = document.createElement('div');
                newMessageDiv.classList.add('right-message');
                newMessageDiv.innerHTML = `
                    <div class="message-text">
                        <p>${messageText}</p>
                        <span class="message-time">${currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                    </div>
                `;
                messagesContainer.appendChild(newMessageDiv);
                console.log(`[fetchTargetDiscussion] Appended new message to UI: ${messageText}`);

                // Use requestAnimationFrame to ensure smooth scrolling to the bottom
                requestAnimationFrame(() => {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    console.log("[fetchTargetDiscussion] Scrolled to the bottom of the chat.");
                });
            } else {
                console.warn("[fetchTargetDiscussion] Attempted to send an empty message.");
            }
        };

        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                sendMessage();
            }
        });

        console.log("[fetchTargetDiscussion] Message sending functionality initialized.");
    })
    .catch(error => {
        console.error('[fetchTargetDiscussion] Error loading user profile:', error);
    });
}


function fetchInviteUsers() {
    const access_token = getCookie('access_token');
    console.log(access_token)

    fetch('/friends/friend-requests/', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${access_token}`
        }
    })
        .then(response => {
            dkhaltntchecki = false;
            if (!response.ok) {
                if (response.status === 401) {
                    dkhaltntchecki = true;
                    logoutUserToken();
                    return;
                }
            }
            return response.json();
        })
        .then(data => {
            if (dkhaltntchecki)
                return;
            const friendsList = document.getElementById('friend-invite-list');
            friendsList.innerHTML = '';

            if (data.friends.length === 0) {
                friendsList.innerHTML = `
                <div class="no-friends-message">
                    <p>You have no friends yet.</p>
                    <button id="add-friends-btn" class="btn btn-primary">Add Friends</button>
                </div>
            `;

                document.getElementById('add-friends-btn').onclick = function () {
                    fetchAndDisplayUsers();
                };
            } else {
                data.friends.forEach(user => {
                    const userRow = document.createElement('div');
                    userRow.className = 'user-row';

                    userRow.innerHTML = `
                    <div class="user-info">
                        <img src="${user.avatar || 'https://via.placeholder.com/150'}" alt="user-image">
                        <span>${user.username}</span>
                    </div>
                    <button class="action-connect invite-btn" data-user-id="${user.id}">invite</button>
                `;

                    userRow.querySelector(".invite-btn").onclick = function () {
                        const hash = "#pingpong_remote";
                        const state = "pingpong_remote";
                        history.pushState({ section: state }, '', hash);
                        loadContentInDiv(hash);
                        invited = true;
                        invitedId = user.id;
                    };

                    friendsList.appendChild(userRow);
                });
            }
        })
        .catch(error => {
			// console.error('Error loading user profile:', error);
		});}
