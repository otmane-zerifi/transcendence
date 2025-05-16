import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken } from "./backEnd.js";
import { sendFriendRequest, cancelFriendRequest, listFriends } from "./friendsPage.js";
import { getUserData, removeFriend, getNotifications, HandleFriendRequest } from "./root.js";
import {checkTokenExpiration} from "./auth.js"
import {navigate} from "./router.js";
import { markNotificationAsRead, showNoNotifications } from "./components/notifications.js";

export function refreshToken(refreshToken) {
    console.log("Attempting to refresh token");

    return fetch('/api/user/refresh/token/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({"refresh": refreshToken}),
    }).then((response) => {
        if (!response.ok) {
            console.error('Token refresh response not OK', response);
            localStorage.clear();
            throw new Error('Token refresh failed');
        }
        return response.json();
    }).then((data) => {
        console.log('Token refresh successful', data);
        
        // Use setAccessToken and setRefreshToken from backEnd.js
        if (data.access) {
            setAccessToken(data.access);
        }
        if (data.refresh) {
            setRefreshToken(data.refresh);
        }

        return data;
    }).catch((error) => {
        console.error('Error in token refresh process:', error);
        localStorage.clear();
        // history.pushState({}, '', '/oauth');
        // loadAuthJs();
        navigate('/oauth');    // Need to make it without refreshing the page...
        throw error;
    });
}

export function getData(data) {
    return fetch('/api/user/profile/', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.access}`,
            'refresh': data.refresh,
        },
    }).then((response) => {
        if (!response.ok) {
            // If the token is expired, refresh it
        }
        return response.json();
    });
}

// Function to check and update profile elements if they exist
export function updateProfileIfExists() {
    const data = {
        access: getAccessToken(),
        refresh: getRefreshToken(),
    }

    // Only proceed if we find profile elements on the page
    if (document.querySelector(".profile-picture") || 
        document.querySelector(".username") || 
        document.querySelector(".user-lvl")) {
        
        loadUserProfileJs();
    }
}

export function loadUserProfileJs() {
    checkTokenExpiration().then(isValid => {
        if (isValid) {
            const data = {
                access: getAccessToken(),
                refresh: getRefreshToken(),
            }
    
        console.log('Initial token data:', data);
    
        // Validate tokens before making the request
        if (!data.access || !data.refresh) {
            console.error('Missing access or refresh token', data);
            return Promise.reject(new Error('Missing authentication tokens'));
        }

        getData(data)
            .then((responseData) => {
                console.log('User data:', responseData);
                updateUserProfile(responseData);
            })
            .catch((error) => {
                console.error('Error fetching user data: ', error);
            });
        } else {
            console.error('Invalid tokens, unable to load profile');
        }
    }).catch((error) => {
        console.error('Error checking token expiration: ', error);
    });
}

export function updateUserProfile(data) {
    // console.log('Updating user profile with data:', data);
    
    // Test data for statistics
    const testStats = {
        wins: 50,
        losses: 10,
        draws: 7
    };
    
    // Check if user object exists
    if (!data || !data.user) {
        console.error('No user data found in the response', data);
        return;
    }

    const user = data.user;
    
    try {

        // show remove friend button if user is friends
        // const removeFriendBtn = document.querySelector(".profile-container-pop-up .profile-picture-container .remove-friend-btn");
        // if (removeFriendBtn && user.is_friend) {
        //     removeFriendBtn.style.display = 'block';
        // }

        // Update username - use more specific selector
        const usernameElement = document.querySelector(".profile-container .profile-picture-container .username");
        if (usernameElement) {
            usernameElement.textContent = user.username || 'Unknown User';
        }
        
        // Update profile picture - use more specific selector
        const profilePictureElement = document.querySelector(".profile-container .profile-picture-container .profile-picture");
        if (profilePictureElement) {
            console.log('setting profile picture', user.avatar);
            profilePictureElement.style.backgroundImage = user.avatar ? `url(${user.avatar})` : 'url("/media/avatars/op.webp")';
        }
        
        // Update level information - use more specific selectors
        const lvlElement = document.querySelector(".profile-container .user-lvl-container .user-lvl p:nth-child(1)");
        const rankElement = document.querySelector(".profile-container .user-lvl-container .user-lvl p:nth-child(2)");
        const xpElement = document.querySelector(".profile-container .user-lvl-container .user-lvl p:nth-child(3)");
        
        if (lvlElement) lvlElement.textContent = `LVL: ${user.lvl || 0}`;
        if (rankElement) rankElement.textContent = `RANK: ${user.rank || 'Unranked'}`;
        if (xpElement) xpElement.textContent = `XP: ${user.xp || 0}`;
        
        // Update match history - use more specific selector
        const matchHistoryContainer = document.querySelector(".profile-container .user-stats-container .profile-match-history-container .profile-match-history");
        if (matchHistoryContainer && Array.isArray(user.matchHistory)) {
            matchHistoryContainer.innerHTML = ''; // Clear existing history
            
            if (!user.matchHistory || user.matchHistory.length === 0) {
                matchHistoryContainer.innerHTML = '<p>No matches played yet</p>';
            } else {
                user.matchHistory.slice(0, 9).forEach(match => {
                    const matchElement = document.createElement('p');
                    matchElement.textContent = `${match.opponent || 'Unknown'} - ${match.result || 'Unknown'} - ${match.score || '0-0'}`;
                    matchHistoryContainer.appendChild(matchElement);
                });
            }
        }
        
        // Update statistics using test data instead of user.statistics
        const stats = testStats;
        
        // Update wins - use more specific selector
        const winsElement = document.querySelector(".profile-container .user-stats-container .user-statistics-container .user-statistics .data-container .wins p");
        if (winsElement) winsElement.textContent = `WINS: ${stats.wins}`;
        
        // Update losses - use more specific selector
        const lossesElement = document.querySelector(".profile-container .user-stats-container .user-statistics-container .user-statistics .data-container .losses p");
        if (lossesElement) lossesElement.textContent = `LOSSES: ${stats.losses}`;
        
        // Update draws - use more specific selector
        const drawsElement = document.querySelector(".profile-container .user-stats-container .user-statistics-container .user-statistics .data-container .draws p");
        if (drawsElement) drawsElement.textContent = `DRAWS: ${stats.draws}`;
        
        // Update statistics circle - use more specific selector
        const statsCircle = document.querySelector(".profile-container .user-stats-container .user-statistics-container .user-statistics .stats-circle");
        if (statsCircle) {
            const totalGames = stats.wins + stats.losses + stats.draws;
            const winRate = totalGames > 0 ? (stats.wins / totalGames * 100).toFixed(1) : 0;
            const lossRate = totalGames > 0 ? (stats.losses / totalGames * 100).toFixed(1) : 0;
            const drawRate = totalGames > 0 ? (stats.draws / totalGames * 100).toFixed(1) : 0;

            // Create the conic gradient for the circle
            const conicGradient = `conic-gradient(
                #4CAF50 0% ${winRate}%, 
                #f44336 ${winRate}% ${Number(winRate) + Number(lossRate)}%, 
                #FFC107 ${Number(winRate) + Number(lossRate)}% 100%
            )`;
            
            statsCircle.style.background = conicGradient;
            
            // Add hover effect to show percentages
            statsCircle.setAttribute('title', `Wins: ${winRate}% | Losses: ${lossRate}% | Draws: ${drawRate}%`);
            
            // Add the total games count in the center
            statsCircle.innerHTML = `<span>${totalGames}<br>Games</span>`;
            statsCircle.style.display = 'flex';
            statsCircle.style.alignItems = 'center';
            statsCircle.style.justifyContent = 'center';
            statsCircle.style.color = 'white';
            statsCircle.style.textAlign = 'center';
            statsCircle.style.fontWeight = 'bold';
            statsCircle.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
            
            // Update the colored rectangles to match the circle colors
            const recW = document.querySelector(".rec-w");
            const recL = document.querySelector(".rec-l");
            const recD = document.querySelector(".rec-d");
            
            if (recW) recW.style.backgroundColor = '#4CAF50';
            if (recL) recL.style.backgroundColor = '#f44336';
            if (recD) recD.style.backgroundColor = '#FFC107';
        }
        
        console.log('Profile update completed successfully');
    } catch (error) {
        console.error('Error updating profile elements:', error);
    }
}

export function updatePopupUserProfile(data, container) {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data || !data.user) {
                console.error('No user data found in the response', data);
                reject('No user data found');
                return;
            }

            const user = data.user;
            
            // Get current user's data to compare IDs and get friendship status
            try {
                const currentUserData = await getUserData(user.username);
                if (!currentUserData || !currentUserData.user) {
                    throw new Error('Failed to get user data');
                }
                
                // Update user object with friendship status from the API
                user.friend = currentUserData.user.friend;
                user.received_friendship_request = currentUserData.user.received_friendship_request;
                user.sent_friendship_request = currentUserData.user.sent_friendship_request;
                user.ID = currentUserData.user.ID; // Make sure we have the correct ID

                // Get logged-in user data using getData
                const loggedUserData = await getData({
                    access: localStorage.getItem('access_token'),
                    refresh: localStorage.getItem('refresh_token')
                });
                const isSameUser = loggedUserData.user.ID === user.ID;

                console.log('User comparison:', {
                    loggedUserId: loggedUserData.user.ID,
                    profileUserId: user.ID,
                    isSameUser: isSameUser,
                    isFriend: user.friend,
                    hasReceivedRequest: user.received_friendship_request,
                    hasSentRequest: user.sent_friendship_request
                });

                // Update username
                const usernameElement = container.querySelector(".profile-container-pop-up .profile-picture-container .username");
                if (usernameElement) {
                    usernameElement.textContent = user.username || 'Unknown User';
                }

                // Update profile picture
                const profilePictureElement = container.querySelector(".profile-container-pop-up .profile-picture-container .profile-picture");
                if (profilePictureElement) {
                    console.log('Setting profile picture:', user.avatar);
                    profilePictureElement.style.backgroundImage = user.avatar ? `url(${user.avatar})` : 'url("/media/avatars/op.webp")';
                    profilePictureElement.style.backgroundSize = 'cover';
                    profilePictureElement.style.backgroundPosition = 'center';
                }
                
                // Update level information
                const lvlElement = container.querySelector(".profile-container-pop-up .user-lvl-container .user-lvl p:nth-child(1)");
                const rankElement = container.querySelector(".profile-container-pop-up .user-lvl-container .user-lvl p:nth-child(2)");
                const xpElement = container.querySelector(".profile-container-pop-up .user-lvl-container .user-lvl p:nth-child(3)");
                
                if (lvlElement) lvlElement.textContent = `LVL: ${user.lvl || 0}`;
                if (rankElement) rankElement.textContent = `RANK: ${user.rank || 'Unranked'}`;
                if (xpElement) xpElement.textContent = `XP: ${user.xp || 0}`;

                // Handle friend request buttons
                const friendshipButtons = container.querySelector(".friendship-buttons");
                if (!friendshipButtons) {
                    console.error('Friendship buttons container not found');
                    return;
                }

                const addFriendBtn = friendshipButtons.querySelector(".add-friend-btn");
                const removeFriendBtn = friendshipButtons.querySelector(".remove-friend-btn");
                const pendingButtons = friendshipButtons.querySelector(".pending-buttons");
                const receivedRequestButtons = friendshipButtons.querySelector(".received-request-buttons");

                // Hide all buttons by default
                addFriendBtn.classList.add('d-none');
                removeFriendBtn.classList.add('d-none');
                pendingButtons.classList.add('d-none');
                receivedRequestButtons.classList.add('d-none');

                const updateData = (userid) => {
                    // Only try to update friends list if we're on the friends page
                    
                    const friendsListContainer = document.querySelector('.friends-list');
                    if (friendsListContainer) {
                        listFriends().catch(error => {
                            console.error('Error updating friends list:', error);
                        });
                    }
                    // Always refresh user data
                    getUserData(user.username).then(updatedData => {
                        updatePopupUserProfile(updatedData, container);
                    }).catch(error => {
                        console.error('Error refreshing user data:', error);
                    });
                };

                checkTokenExpiration().then(isValid => {
                    if (!isValid) {
                        console.error('Invalid tokens, unable to load profile');
                    }

                    console.log("%cANA RAH KAYN HNA", "color: red; font-weight: bold;");

                if (isSameUser) {
                    console.log('Same user, hiding all buttons');
                    // Don't show any buttons for own profile
                } else if (user.friend === true) {
                    // They are friends, show remove button
                    console.log('Users are friends, showing remove friend button');
                    removeFriendBtn.classList.remove('d-none');
                    removeFriendBtn.onclick = () => {
                        removeFriend(user.ID).then(() => {
                            removeFriendBtn.classList.add('d-none');
                            addFriendBtn.classList.remove('d-none');
                            user.friend = false;
                            updateData();
                        }).catch(error => {
                            console.error('Error removing friend:', error);
                        });
                    };
                } else if (user.received_friendship_request === true) {
                    // We received a request from this user, show accept/decline buttons
                    console.log('Received friend request, showing accept/decline buttons');
                    receivedRequestButtons.classList.remove('d-none');
                    
                    const acceptBtn = receivedRequestButtons.querySelector(".accept-request-btn");
                    const declineBtn = receivedRequestButtons.querySelector(".decline-request-btn");
                    
                    acceptBtn.onclick = () => {
                        HandleFriendRequest(user.ID, 'accept').then((response) => {
                            console.log('Friend request accepted successfully:', response);
                            receivedRequestButtons.classList.add('d-none');
                            removeFriendBtn.classList.remove('d-none');
                            user.friend = true;
                            user.received_friendship_request = false;
                            updateData();
                        }).catch((error) => {
                            console.error('Error accepting friend request:', error);
                        });
                    };

                    declineBtn.onclick = () => {
                        HandleFriendRequest(user.ID, 'reject').then(() => {
                            receivedRequestButtons.classList.add('d-none');
                            addFriendBtn.classList.remove('d-none');
                            user.received_friendship_request = false;
                            updateData();
                        }).catch(error => {
                            console.error('Error declining friend request:', error);
                        });
                    };
                } else if (user.sent_friendship_request === true) {
                    // We sent a request to this user, show pending and cancel buttons
                    console.log('Sent friend request, showing pending/cancel buttons');
                    pendingButtons.classList.remove('d-none');
                    
                    const cancelBtn = pendingButtons.querySelector(".cancel-request-btn");
                    cancelBtn.onclick = () => {
                        cancelFriendRequest(user.username).then(() => {
                            pendingButtons.classList.add('d-none');
                            addFriendBtn.classList.remove('d-none');
                            user.sent_friendship_request = false;
                            updateData();
                        }).catch(error => {
                            console.error('Error canceling friend request:', error);
                        });
                    };
                } else {
                    // No relationship, show add button
                    console.log('No relationship, showing add friend button');
                    addFriendBtn.classList.remove('d-none');
                    addFriendBtn.onclick = () => {
                        sendFriendRequest(user.ID).then((response) => {
                            console.log('Friend request sent successfully:', response);
                            addFriendBtn.classList.add('d-none');
                            pendingButtons.classList.remove('d-none');
                            user.sent_friendship_request = true;
                            updateData();
                        }).catch(error => {
                            console.error('Error sending friend request:', error);
                        });
                    };
                }

            }).catch(error => {
                console.error('Error checking token expiration:', error);
            });
                
                // Update match history
                const matchHistoryContainer = document.querySelector(".profile-container-pop-up .user-stats-container .profile-match-history-container .profile-match-history");
                if (matchHistoryContainer && Array.isArray(user.matchHistory)) {
                    matchHistoryContainer.innerHTML = ''; // Clear existing history

                    // console.log('matchHistory', user.matchHistory);
                    
                    if (!user.matchHistory || user.matchHistory.length === 0) {
                        matchHistoryContainer.innerHTML = '<p>No matches played yet</p>';
                    } else {
                        user.matchHistory.slice(0, 9).forEach(match => {
                            const matchElement = document.createElement('p');
                            matchElement.textContent = `${match.opponent || 'Unknown'} - ${match.result || 'Unknown'} - ${match.score || '0-0'}`;
                            matchHistoryContainer.appendChild(matchElement);
                        });
                    }
                }
                
                // Update statistics
                const stats = user.statistics || {
                    wins: 0,
                    losses: 0,
                    draws: 0
                };
                
                // Update wins
                const winsElement = container.querySelector(".profile-container-pop-up .user-stats-container .user-statistics-container .user-statistics .data-container .wins p");
                if (winsElement) winsElement.textContent = `WINS: ${stats.wins}`;
                
                // Update losses
                const lossesElement = container.querySelector(".profile-container-pop-up .user-stats-container .user-statistics-container .user-statistics .data-container .losses p");
                if (lossesElement) lossesElement.textContent = `LOSSES: ${stats.losses}`;
                
                // Update draws
                const drawsElement = container.querySelector(".profile-container-pop-up .user-stats-container .user-statistics-container .user-statistics .data-container .draws p");
                if (drawsElement) drawsElement.textContent = `DRAWS: ${stats.draws}`;
                
                // Update statistics circle
                const statsCircle = container.querySelector(".profile-container-pop-up .user-stats-container .user-statistics-container .user-statistics .stats-circle");
                if (statsCircle) {
                    const totalGames = stats.wins + stats.losses + stats.draws;
                    const winRate = totalGames > 0 ? (stats.wins / totalGames * 100).toFixed(1) : 0;
                    const lossRate = totalGames > 0 ? (stats.losses / totalGames * 100).toFixed(1) : 0;
                    const drawRate = totalGames > 0 ? (stats.draws / totalGames * 100).toFixed(1) : 0;

                    // Create the conic gradient for the circle
                    const conicGradient = `conic-gradient(
                        #4CAF50 0% ${winRate}%, 
                        #f44336 ${winRate}% ${Number(winRate) + Number(lossRate)}%, 
                        #FFC107 ${Number(winRate) + Number(lossRate)}% 100%
                    )`;
                    
                    statsCircle.style.background = conicGradient;
                    
                    // Add hover effect to show percentages
                    statsCircle.setAttribute('title', `Wins: ${winRate}% | Losses: ${lossRate}% | Draws: ${drawRate}%`);
                    
                    // Add the total games count in the center
                    statsCircle.innerHTML = `<span>${totalGames}<br>Games</span>`;
                    statsCircle.style.display = 'flex';
                    statsCircle.style.alignItems = 'center';
                    statsCircle.style.justifyContent = 'center';
                    statsCircle.style.color = 'white';
                    statsCircle.style.textAlign = 'center';
                    statsCircle.style.fontWeight = 'bold';
                    statsCircle.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
                    
                    // Update the colored rectangles to match the circle colors
                    const recW = container.querySelector(".profile-container-pop-up .user-stats-container .user-statistics-container .user-statistics .data-container .wins .rec-w");
                    const recL = container.querySelector(".profile-container-pop-up .user-stats-container .user-statistics-container .user-statistics .data-container .losses .rec-l");
                    const recD = container.querySelector(".profile-container-pop-up .user-stats-container .user-statistics-container .user-statistics .data-container .draws .rec-d");
                    
                    if (recW) recW.style.backgroundColor = '#4CAF50';
                    if (recL) recL.style.backgroundColor = '#f44336';
                    if (recD) recD.style.backgroundColor = '#FFC107';
                }

                resolve();
            } catch (error) {
                console.error('Error updating popup user profile:', error);
                reject(error);
            }
        } catch (error) {
            console.error('Error getting user data:', error);
            reject(error);
        }
    });
}

