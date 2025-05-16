import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken } from "./backEnd.js";
import { updatePopupUserProfile } from "./userProfile.js";
import { getUserData } from "./root.js";
import { refreshToken } from "./userProfile.js";
import {checkTokenExpiration} from "./auth.js"

export function getUserProfile() {
    return `
        <div class="profile-container-pop-up">
            <div class="profile-picture-container">
                <div class="profile-picture"></div>
                <p class="username">Username</p>
                <div class="friendship-buttons">
                    <button class="btn btn-primary d-none add-friend-btn">Add Friend</button>
                    <button class="btn btn-danger d-none remove-friend-btn">Remove Friend</button>
                    <div class="pending-buttons d-none">
                        <button class="btn btn-secondary pending-btn" disabled>Pending</button>
                        <button class="btn btn-danger cancel-request-btn">Cancel Request</button>
                    </div>
                    <div class="received-request-buttons d-none">
                        <button class="btn btn-success accept-request-btn">Accept</button>
                        <button class="btn btn-danger decline-request-btn">Decline</button>
                    </div>
                </div>
            </div>
            <div class="user-lvl-container">
                <div class="user-lvl">
                    <p>LVL: 12</p>
                    <p>RANK: 1</p>
                    <p>XP: 1200</p>
                </div>
            </div>
            <div class="user-stats-container">
                <div class="profile-match-history-container">
                    <div class="profile-match-history-title">
                        <p>MATCH HISTORY</p>
                    </div>
                    <div class="profile-match-history">
                        <p>No match history1</p>
                        <p>No match history2</p>
                        <p>No match history3</p>
                        <p>No match history4</p>
                        <p>No match history5</p>
                        <p>No match history6</p>
                        <p>No match history7</p>
                        <p>No match history8</p>
                        <p>No match history9</p>
                    </div>
                </div>
                <div class="user-statistics-container">
                    <div class="user-statistics-title">
                        <p>STATISTICS</p>
                    </div>
                    <div class="user-statistics">
                        <div class="stats-circle"></div>
                        <div class="data-container">
                            <div class="wins">
                                <div class="rec-w"></div>
                                <p>WINS</p>
                            </div>
                            <div class="losses">
                                <div class="rec-l"></div>
                                <p>LOSSES</p>
                            </div>
                            <div class="draws">
                                <div class="rec-d"></div>
                                <p>DRAWS</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function loadFriendsJs() {
    console.log("Friends page loaded");
    let clickHandler = null;

    checkTokenExpiration().then(isValid => {
        if (isValid) {
            const data = {
                access: getAccessToken(),
                refresh: getRefreshToken(),
            }
            
            console.log('Initial token data:', data);
            
            if (!data.access || !data.refresh) {
                console.error('Missing access or refresh token', data);
                return Promise.reject(new Error('Missing authentication tokens'));
            }

            listFriends();
            
            // Remove any existing click handlers first
            if (clickHandler) {
                document.body.removeEventListener('click', clickHandler);
            }

            // Create the click handler
            clickHandler = async function(event) {
                const clickedPlayerPic = event.target.closest('.player-pic');
                const existingProfileContainer = document.querySelector('.profile-container-pop-up');
                
                // Handle clicking outside of popup content
                if (
                    existingProfileContainer &&
                    !event.target.closest('.profile-picture') &&
                    !event.target.closest('.user-lvl') &&
                    !event.target.closest('.username') &&
                    !event.target.closest('.user-stats-container') &&
                    !event.target.closest('.add-friend-btn') &&
                    !event.target.closest('.remove-friend-btn') &&
                    !event.target.closest('.pending-btn') &&
                    !event.target.closest('.cancel-request-btn') &&
                    !event.target.closest('.received-request-buttons') &&
                    !event.target.closest('.accept-request-btn') &&
                    !event.target.closest('.decline-request-btn') &&
                    !clickedPlayerPic
                ) {
                    existingProfileContainer.remove();
                    console.log('Popup closed by outside click');
                    return;
                }

                // Handle player pic click
                if (clickedPlayerPic) {
                    console.log('Player pic clicked!');
                    
                    // Remove existing popup if clicking on a different player
                    if (existingProfileContainer) {
                        existingProfileContainer.remove();
                        console.log('Existing popup removed');
                    }

                    const playerRow = clickedPlayerPic.closest('tr');
                    const username = playerRow.querySelector('td p').textContent;
                    console.log('Username:', username);
                    
                    // Create and add new popup
                    const popupContainer = document.createElement('div');
                    popupContainer.classList.add('profile-container-pop-up');
                    popupContainer.innerHTML = getUserProfile();
                    document.body.appendChild(popupContainer);
                    console.log('Popup container added to body');
                    
                    try {
                        const userData = await getUserData(username);
                        console.log('Fetched user data:', userData);
                        
                        if (userData && userData.user) {
                            updatePopupUserProfile({
                                user: {
                                    username: userData.user.username,
                                    avatar: userData.user.avatar || '/media/avatars/op.webp',
                                    id: userData.user.id,
                                    lvl: userData.user.level || 0,
                                    rank: userData.user.rank || "unranked",
                                    xp: userData.user.xp || 0,
                                    matchHistory: userData.user.matchHistory || "No match history",
                                    statistics: {
                                        wins: userData.user.wins || 0,
                                        losses: userData.user.losses || 0,
                                        draws: userData.user.draws || 0
                                    }
                                }
                            }, popupContainer);
                            console.log('Profile updated successfully');
                        } else {
                            console.error('Invalid user data received:', userData);
                        }
                    } catch (error) {
                        console.error('Error updating profile:', error);
                    }
                }
            };

            // Add the click handler
            document.body.addEventListener('click', clickHandler);
            
            // Store the cleanup function on the window object
            window.cleanupFriendsPage = () => {
                console.log('Cleaning up friends page event listeners');
                if (clickHandler) {
                    document.body.removeEventListener('click', clickHandler);
                    clickHandler = null;
                }
                const existingPopup = document.querySelector('.profile-container-pop-up');
                if (existingPopup) {
                    existingPopup.remove();
                }
            };
        }
    }).catch(error => {
        console.error('Error loading friends page:', error);
    });
}

export async function friendsList() {
    const data = {
        access: getAccessToken(),
        refresh: getRefreshToken()
    };

    try {
        const response = await fetch('/api/friends/friends/', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${data.access}`,
                'refresh': data.refresh
            }
        });

        if (!response.ok) {
            // If the token is expired, refresh it
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const jsonResponse = await response.json();
        console.log('Friends list API response:', jsonResponse);
        return jsonResponse;
    } catch (error) {
        console.error('Error fetching friends list:', error);
        throw error; // Re-throw to be caught by the calling function
    }
}

export function listFriends() {
    return friendsList().then((response) => {
        console.log('Friends list response:', response);
        
        // Get the friends list container
        const friendsListContainer = document.querySelector('.friends-list');
        if (!friendsListContainer) {
            console.error('Friends list container not found');
            return;
        }

        // Clear existing content
        friendsListContainer.innerHTML = '';

        // Create table structure
        const table = document.createElement('table');
        table.classList.add('friends-table');

        // Add table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>PIC</th>
                <th>PLAYER</th>
                <th>RANK</th>
                <th>WINS</th>
                <th>LOSSES</th>
                <th>DRAWS</th>
            </tr>
        `;
        table.appendChild(thead);

        // Add table body
        const tbody = document.createElement('tbody');
        
        // Check if response is valid and has friends data
        const friendsList = response && response.friends ? response.friends : 
                          Array.isArray(response) ? response : [];
        
        // Add each friend to the table
        const promises = friendsList.map(friend => {
            const { friend_details } = friend;
            if (!friend_details) return null; // Skip if no friend details

            console.log('Creating friend element with details:', friend_details);
            
            const tr = document.createElement('tr');
            
            // Return the promise for each friend
            return getUserData(friend_details.user_name)
                .then((response) => {
                    console.log('Received user data:', response);
                    friend_details.avatar = response.user.avatar;


                    //print in bold white the friend_details
                    console.log('%cFriend details:', 'color: white; font-weight: bold;');
                    console.log(friend_details);
                    
                    tr.innerHTML = `
                        <td>
                            <div class="player-pic" data-user-id="${friend_details.id}" data-username="${friend_details.user_name}" style="background-image: url('${friend_details.avatar}'); background-size: cover; background-position: center;">
                                <div class="online-status ${friend_details.is_online ? 'online' : ''}"></div>
                            </div>
                        </td>
                        <td><p>${friend_details.user_name}</p></td>
                        <td><p>${friend_details.rank || "unranked"}</p></td>
                        <td><p>${friend_details.wins || 0}</p></td>
                        <td><p>${friend_details.losses || 0}</p></td>
                        <td><p>${friend_details.draws || 0}</p></td>
                    `;

                    // Add click event to the player-pic div
                    const playerPic = tr.querySelector('.player-pic');
                    playerPic.addEventListener('click', async (event) => {
                        event.stopPropagation();
                        const username = playerPic.dataset.username;
                        console.log('Player pic clicked:', username);
                        
                        // Remove existing popup if any
                        const existingProfileContainer = document.querySelector('.profile-container-pop-up');
                        if (existingProfileContainer) {
                            existingProfileContainer.remove();
                        }

                        // Create and add new popup
                        const popupContainer = document.createElement('div');
                        popupContainer.classList.add('profile-container-pop-up');
                        popupContainer.innerHTML = getUserProfile();
                        document.body.appendChild(popupContainer);
                        
                        try {
                            const userData = await getUserData(username);
                            if (userData && userData.user) {
                                updatePopupUserProfile({
                                    user: {
                                        username: userData.user.username,
                                        avatar: userData.user.avatar || '/media/avatars/op.webp',
                                        id: userData.user.id,
                                        lvl: userData.user.level || 0,
                                        rank: userData.user.rank || "unranked",
                                        xp: userData.user.xp || 0,
                                        matchHistory: userData.user.matchHistory || "No match history",
                                        statistics: {
                                            wins: userData.user.wins || 0,
                                            losses: userData.user.losses || 0,
                                            draws: userData.user.draws || 0
                                        }
                                    }
                                }, popupContainer);
                            }
                        } catch (error) {
                            console.error('Error updating profile:', error);
                        }
                    });

                    return tr;
                })
                .catch(error => {
                    console.error('Error fetching user data:', error);
                    return tr;
                });
        });

        // Wait for all promises to resolve and append rows to tbody
        Promise.all(promises.filter(p => p)) // Filter out null promises
            .then(rows => {
                rows.forEach(row => tbody.appendChild(row));
            });

        table.appendChild(tbody);
        friendsListContainer.appendChild(table);

        return response;
    }).catch(error => {
        console.error('Error in listFriends:', error);
        const friendsListContainer = document.querySelector('.friends-list');
        if (friendsListContainer) {
            friendsListContainer.innerHTML = `
                <div style="color: white; text-align: center; padding: 20px;">
                    Error loading friends list. Please try again later.
                </div>
            `;
        }
    });
}

export async function checkSentFriendRequests() {
    const data = {
        access: getAccessToken(),
        refresh: getRefreshToken()
    };

    try {
        const response = await fetch('/api/friends/friend-requests/sent/', {
            headers: {
                'Authorization': `Bearer ${data.access}`,
                'refresh': data.refresh
            }
        });
        return await response.json();
    } catch (error) {
        console.error('Error checking sent friend requests:', error);
        return [];
    }
}

export async function sendFriendRequest(id) {
    const data = {
        access: getAccessToken(),
        refresh: getRefreshToken()
    };

    try {
        const response = await fetch('/api/friends/friend-requests/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${data.access}`,
                'refresh': data.refresh
            },
            body: JSON.stringify({ receiver: id })
        });
        
        const jsonResponse = await response.json();
        
        if (!response.ok) {
            throw new Error(jsonResponse.detail || 'Failed to send friend request');
        }
        
        return jsonResponse;
    } catch (error) {
        // Re-throw the error to be handled by the caller
        throw error;
    }
}

export function acceptFriendRequest(id) {
    return fetch('/api/friends/friend-request/accept/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({"user_id": id}),
    }).then((response) => {
        if (!response.ok) {
            throw new Error('Failed to accept friend request');
        }
        return response.json();
    });
}

export function cancelFriendRequest(username) {
    return fetch(`/api/friends/friend-request/cancel/${username}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'refresh': localStorage.getItem('refresh_token'),
        }
    }).then((response) => {
        if (!response.ok) {
            throw new Error('Failed to cancel friend request');
        }
        return response.json();
    });
}
