// import {getTournamentMode} from "./gamePage.js";
// import {getOfflineTournamentPrompt} from "./gamePage.js";
// import {getOnlineTournamentPrompt} from "./gamePage.js";
// import {replaceElement} from "./gamePage.js";
// import {appendToMain} from "./gamePage.js";
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken } from "./backEnd.js";
import { getUserProfile } from "./friendsPage.js";
import { refreshToken, updatePopupUserProfile } from "./userProfile.js";
import {checkTokenExpiration} from "./auth.js"

function searchUser(value) {
    const data = { 
        refresh: getRefreshToken(),
        access: getAccessToken(),
    }

    return fetch('/api/user/search/', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${data.access}`,
            'refresh': data.refresh,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({"search": value}),
    }).then((response) => {
        if (!response.ok) {

        }
        return response.json();
    });
}

// Debounce function to limit API calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export async function loadJS() {


    // Disable dragging
    function noDrag(event) {
        event.preventDefault();
    }
    document.addEventListener('dragstart',noDrag,true);

    //animate sidebar button
    const openBtn = document.querySelector(".open-btn");
    openBtn.addEventListener("click", function() {
        document.querySelector("sidebar").style.display = "block";
        openBtn.style.transform = "translateX(-40px)";
    })

    const closeBtn = document.querySelector(".close-btn");
    closeBtn.addEventListener("click", function() {
        document.querySelector("sidebar").style.display = "none";
        document.querySelector("sidebar").removeAttribute("style");
        openBtn.style.display = "flex";

        openBtn.style.transform = "translateX(0px)";
    })


    // animate sidebar
    const sidebar = document.querySelector("sidebar");
    openBtn.addEventListener("click", function() {
        sidebar.classList.add("sidebar-active");
    });
    closeBtn.addEventListener("click", function() {
        sidebar.classList.remove("sidebar-active");
    });
    document.addEventListener("click", function(event) {
        if (!sidebar.contains(event.target) && !openBtn.contains(event.target)) {
            sidebar.style.transform = "translateX(-250px)";
            openBtn.style.display = "flex";
            sidebar.classList.remove("sidebar-active");
            openBtn.style.transform = "translateX(0px)";
            return ;
        }
        sidebar.removeAttribute("style");
    });

    // Get the required elements
    const searchBar = document.querySelector(".header .search-bar");
    const searchInput = document.querySelector(".search-text");
    const searchResults = document.querySelector(".search-results");
    const titleElement = document.querySelector(".header .title");
    const userAvatar = document.querySelector(".header .user-avatar");
    const circles = document.querySelector(".header .circles");

    // Handle clicks outside search results
    document.addEventListener('click', (event) => {
        const isClickInsideSearch = searchBar.contains(event.target) || searchResults.contains(event.target);
        if (!isClickInsideSearch && searchResults.classList.contains('active')) {
            searchResults.classList.remove("active");
            searchBar.classList.remove("search-bar-expand");
            titleElement.classList.remove("p-hide");
            circles.classList.remove("circles-hide");
            document.querySelector(".search-text").classList.remove("input-expand");
            searchInput.value = ''; // Clear the search input
        }
    });

    // When the search bar is clicked, expand it and hide other elements
    searchBar.addEventListener("click", function (event) {
        event.stopPropagation(); // Prevent document click from immediately closing it
        searchBar.classList.add("search-bar-expand");
        titleElement.classList.add("p-hide");
        circles.classList.add("circles-hide");
        document.querySelector(".search-text").classList.add("input-expand");
    });

    // Prevent search results clicks from bubbling to document
    searchResults.addEventListener('click', (event) => {
        event.stopPropagation();
    });

    // Handle search input and results
    const performSearch = async (value) => {
        try {
            // If search input is empty, hide results and return
            if (!value.trim()) {
                searchResults.classList.remove("active");
                return;
            }

            // Show loading state
            searchResults.classList.add("active");
            searchResults.innerHTML = `
                <div class="search-loading">
                    Searching
                </div>
            `;

            // Get search results using searchUser function
            checkTokenExpiration().then(async isValid => {
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
        
                    try {
                        var searchData = await searchUser(value);
                        if (searchData.messages && searchData.messages[0].message === 'Token is invalid or expired') {
                            const newTokenData = await refreshToken(getRefreshToken());
                            setAccessToken(newTokenData.access);
                            setRefreshToken(newTokenData.refresh);
                            searchData = await searchUser(value);
                        }
                    } catch (error) {
                        console.error('Error during search:', error);
                    }

                    // Create results HTML
                    if (searchData && searchData.users && searchData.users.length > 0) {
                        const resultsHTML = searchData.users.map(user => `
                            <div class="search-result-item" data-username="${user.username}">
                                <div class="profile-picture" style="background-image: url('${user.avatar}'); background-size: cover; background-position: center;"></div>
                                <p class="username">${user.username}</p>
                            </div>
                        `).join('');
                        
                        searchResults.innerHTML = `<div>${resultsHTML}</div>`;
                        
                        // Add click handlers for search results
                        const resultItems = searchResults.querySelectorAll('.search-result-item');
                        resultItems.forEach(item => {
                            const clickHandler = (event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                
                                // Close search results
                                searchResults.classList.remove("active");
                                searchBar.classList.remove("search-bar-expand");
                                titleElement.classList.remove("p-hide");
                                circles.classList.remove("circles-hide");
                                document.querySelector(".search-text").classList.remove("input-expand");
                                searchInput.value = ''; // Clear the search input
                        
                                // Get the clicked user's data
                                const username = item.dataset.username;
                                getUserData(username).then(userData => {
                                    // Remove any existing profile popup
                                    const existingPopup = document.querySelector('.profile-container-pop-up');
                                    if (existingPopup) {
                                        existingPopup.remove();
                                    }

                                    // Create and add the profile popup
                                    const popupContent = getUserProfile();
                                    const tempContainer = document.createElement('div');
                                    tempContainer.innerHTML = popupContent;
                                    document.body.appendChild(tempContainer.firstElementChild);

                                    // Update the popup with user data
                                    const popupContainer = document.querySelector('.profile-container-pop-up');
                                    if (popupContainer) {
                                        updatePopupUserProfile(userData, popupContainer);
                                    }
                                }).catch(error => {
                                    console.error('Error fetching user data:', error);
                                });
                            };

                            // Add both click and touch events
                            item.addEventListener('click', clickHandler);
                            item.addEventListener('touchend', clickHandler);
                        });
                    } else {
                        searchResults.innerHTML = `
                    <div style="color: white; text-align: center; padding: 20px;">
                    No users found
                    </div>
                    `;
                }
            }}).catch(error => {
                console.error('Error loading friends page:', error);
            });
        } catch (error) {
        console.error('Search error:', error);
        searchResults.innerHTML = `
            <div style="color: white; text-align: center; padding: 20px;">
                An error occurred while searching
            </div>
        `;
        }
    };

    // Debounced search function
    const debouncedSearch = debounce((value) => {
        if (value.trim()) {
            performSearch(value.trim());
        }
    }, 300);

    // Handle input changes
    searchInput.addEventListener("input", (event) => {
        const value = event.target.value;
        if (value.trim()) {
            debouncedSearch(value);
        } else {
            searchResults.classList.remove("active");
        }
    });

    // Handle Enter key
    searchInput.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            
            // Check if search input is empty
            if (!searchInput.value.trim()) {
                // Show error state
                searchBar.classList.add("error");
                
                // Remove error state after 2 seconds
                setTimeout(() => {
                    searchBar.classList.remove("error");
                }, 2000);
                
                return;
            }
            
            performSearch(searchInput.value.trim());
            event.stopPropagation();
        }
    });

    // Close the search bar and results when clicking outside
    document.addEventListener("click", function (event) {
        if (!searchBar.contains(event.target)) {
            searchBar.classList.remove("search-bar-expand");
            titleElement.classList.remove("p-hide");
            circles.classList.remove("circles-hide");
            document.querySelector(".search-text").classList.remove("input-expand");
            searchResults.classList.remove("active");
        };
    });

    // notification dot
    // const redDot = document.querySelector('.notification-dot');
    // if (redDot) {
    //     openNotifSocket();
    // }
    
    //notification pop up

    // Check for notifications on page load
    const initialNotifications = await getNotifications();
    const unreadInitialNotifications = initialNotifications.filter(notification => !notification.is_read);
    if (unreadInitialNotifications && unreadInitialNotifications.length > 0) {
        document.querySelector('.notification-dot').style.display = 'block';
    } else {
        document.querySelector('.notification-dot').style.display = 'none';
    }

    document.querySelector('.notification').addEventListener('click', async function (event) {
        try {
            const isValid = await checkTokenExpiration();
            if (!isValid) {
                document.querySelector('.notif-pop-up').innerHTML = `
                    <div class="friend-request" style="text-align: center; padding: 20px;">
                        <span style="color: white;">No notifications</span>
                    </div>
                `;
                return;
            }

            const tokenData = {
                access: getAccessToken(),
                refresh: getRefreshToken(),
            };
            
            console.log('Initial token data:', tokenData);
            
            // Validate tokens before making the request
            if (!tokenData.access || !tokenData.refresh) {
                console.error('Missing access or refresh token', tokenData);
                throw new Error('Missing authentication tokens');
            }

            const notifications = await getNotifications();
            console.log("the data is", notifications);
            const notifPopUp = document.querySelector('.notif-pop-up');
            notifPopUp.innerHTML = ''; // Clear existing notifications
            
            // Filter out read notifications
            const unreadNotifications = notifications.filter(notification => !notification.is_read);
            
            if (unreadNotifications && unreadNotifications.length > 0) {
            // Process each notification
            for (const notification of unreadNotifications) {
                try {
                    if (notification.notification_type === "FRIEND_REQUEST") {
                        // Fetch sender's details using the provided endpoint and wait for the result
                        const senderDetails = await getUserData(notification.data.sender_name);
                        console.log('Sender details:', senderDetails);
                        
                        const friendRequestDiv = document.createElement('div');
                        friendRequestDiv.className = 'friend-request';
                        friendRequestDiv.innerHTML = `
                            <div class="player-pic" style="background-image: url('${senderDetails.user?.avatar}')">
                            </div>
                            <div class="user-info">${senderDetails.user?.user_name || notification.data.sender_name} sent you a friend request</div>
                            <div class="accept-btn">
                            <button class="accept">Accept</button>
                            <button class="decline">Decline</button>
                            </div>
                            `;
                        notifPopUp.appendChild(friendRequestDiv);

                        friendRequestDiv.querySelector('.accept').addEventListener('click', async function () {
                            console.log('Accepting friend request...');
                            try {
                                await HandleFriendRequest(notification.data.sender_id, "accept");
                                // Mark notification as read
                                const response = await fetch('/api/friends/notifications/mark-read/', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${getAccessToken()}`,
                                        'refresh': getRefreshToken()
                                    },
                                    body: JSON.stringify({ notification_id: notification.id })
                                });

                                if (!response.ok) {
                                    throw new Error(`HTTP error! status: ${response.status}`);
                                }
                                const result = await response.json();
                                console.log('Marked notification as read:', result);
                                
                                friendRequestDiv.remove();
                                if (notifPopUp.children.length === 0) {
                                    document.querySelector('.notification-dot').style.display = 'none';
                                    notifPopUp.innerHTML = `
                                    <div class="friend-request" style="text-align: center; padding: 20px;">
                                    <span style="color: white;">No notifications</span>
                                    </div>
                                    `;
                                }
                            } catch (error) {
                                console.error('Error handling friend request:', error);
                            }
                        });
                        
                        friendRequestDiv.querySelector('.decline').addEventListener('click', async function () {
                            console.log('Declining friend request...');
                            try {
                                await HandleFriendRequest(notification.data.sender_id, "reject");
                                // Mark notification as read
                                const response = await fetch('/api/friends/notifications/mark-read/', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${getAccessToken()}`,
                                        'refresh': getRefreshToken()
                                    },
                                    body: JSON.stringify({ notification_id: notification.id })
                                });

                                if (!response.ok) {
                                    throw new Error(`HTTP error! status: ${response.status}`);
                                }
                                const result = await response.json();
                                console.log('Marked notification as read:', result);
                                
                                friendRequestDiv.remove();
                                if (notifPopUp.children.length === 0) {
                                    document.querySelector('.notification-dot').style.display = 'none';
                                    notifPopUp.innerHTML = `
                                    <div class="friend-request" style="text-align: center; padding: 20px;">
                                            <span style="color: white;">No notifications</span>
                                        </div>
                                        `;
                                }
                            } catch (error) {
                                console.error('Error handling friend request:', error);
                            }
                        });
                    } else if (notification.notification_type === "REQUEST_REJECTED") {
                        const rejecterDetails = await getUserData(notification.data.rejecter_name);
                        const rejectionDiv = document.createElement('div');
                        rejectionDiv.className = 'friend-request';
                        rejectionDiv.innerHTML = `
                            <div class="player-pic" style="background-image: url('${rejecterDetails.user?.avatar}')"></div>
                            <div class="user-info">${notification.data.rejecter_name} rejected your friend request</div>
                            <div class="accept-btn">
                            <button class="decline">Dismiss</button>
                            </div>
                            `;
                        notifPopUp.appendChild(rejectionDiv);
                        
                        rejectionDiv.querySelector('.decline').addEventListener('click', async function () {
                            // Mark notification as read
                            try {
                                const response = await fetch('/api/friends/notifications/mark-read/', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${getAccessToken()}`,
                                        'refresh': getRefreshToken()
                                    },
                                    body: JSON.stringify({ notification_id: notification.id })
                                });

                                if (!response.ok) {
                                    throw new Error(`HTTP error! status: ${response.status}`);
                                }
                                const result = await response.json();
                                console.log('Marked notification as read:', result);
                                rejectionDiv.remove();
                                if (notifPopUp.children.length === 0) {
                                    document.querySelector('.notification-dot').style.display = 'none';
                                    notifPopUp.innerHTML = `
                                    <div class="friend-request" style="text-align: center; padding: 20px;">
                                            <span style="color: white;">No notifications</span>
                                        </div>
                                        `;
                                }
                            } catch (error) {
                                console.error('Error marking notification as read:', error);
                            }
                        });
                    } else if (notification.notification_type === "REQUEST_ACCEPTED") {
                        const accepterDetails = await getUserData(notification.data.accepter_name);
                        const acceptanceDiv = document.createElement('div');
                        acceptanceDiv.className = 'friend-request';
                        acceptanceDiv.innerHTML = `
                            <div class="player-pic" style="background-image: url('${accepterDetails.user?.avatar}')"></div>
                            <div class="user-info">${notification.data.accepter_name} accepted your friend request</div>
                            <div class="accept-btn">
                            <button class="decline">Dismiss</button>
                            </div>
                            `;
                        notifPopUp.appendChild(acceptanceDiv);
                        
                        acceptanceDiv.querySelector('.decline').addEventListener('click', async function () {
                            try {
                                const response = await fetch('/api/friends/notifications/mark-read/', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${getAccessToken()}`,
                                        'refresh': getRefreshToken()
                                    },
                                    body: JSON.stringify({ notification_id: notification.id })
                                });

                                if (!response.ok) {
                                    throw new Error(`HTTP error! status: ${response.status}`);
                                }
                                const result = await response.json();
                                console.log('Marked notification as read:', result);
                                acceptanceDiv.remove();
                                if (notifPopUp.children.length === 0) {
                                    document.querySelector('.notification-dot').style.display = 'none';
                                    notifPopUp.innerHTML = `
                                        <div class="friend-request" style="text-align: center; padding: 20px;">
                                            <span style="color: white;">No notifications</span>
                                            </div>
                                            `;
                                }
                            } catch (error) {
                                console.error('Error marking notification as read:', error);
                            }
                        });
                    }
                } catch (error) {
                    console.error('Error processing notification:', error);
                }
            }
        } else {
            notifPopUp.innerHTML = `
                <div class="friend-request" style="text-align: center; padding: 20px;">
                    <span style="color: white;">No notifications</span>
                </div>
                `;
        }
        
        document.querySelector('.notif-pop-up').style.display = 'block';
        document.querySelector('.notif-pop-up').classList.add('active');
        document.querySelector('.notif-arrow').classList.add('active');
        
        document.querySelector('.notif-arrow').style.display = 'block';
        event.stopPropagation();
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
});

    // Add click event listener to handle outside clicks
    document.addEventListener('click', function closePopup(event) {
        const notifPopup = document.querySelector('.notif-pop-up');
        const notification = document.querySelector('.notification');
        const notifArrow = document.querySelector('.notif-arrow');

        // Check if click is outside both the notification icon and popup
        if (notifPopup && notification && 
            !notifPopup.contains(event.target) && 
            !notification.contains(event.target)) {
            
            notifPopup.classList.remove('active');
            notifArrow.classList.remove('active');
            notifPopup.style.display = 'none';
            notifArrow.style.display = 'none';
        }
    });

}
export async function getNotifications() {
    const data = {
        access: getAccessToken(),
        refresh: getRefreshToken(),
    }

    try {
        const response = await fetch('/api/friends/notifications/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${data.access}`,
                'refresh': data.refresh,
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        console.log('Received notifications:', result);
        return result;
    } catch (error) {
        console.error('Error checking pending friend requests:', error);
        return [];
    }
}


export async function getUserData(username) {
    const data = {
        access: getAccessToken(),
        refresh: getRefreshToken(),
    }

    try {
        const response = await fetch(`/api/user/profile/${username}`, {
            headers: {
                'Authorization': `Bearer ${data.access}`,
                'refresh': data.refresh,
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        console.log('Received user data:', result);
        return result;
    } catch (error) {
        console.error('Error fetching user data:', error);
        return {};
    }
}

export async function HandleFriendRequest(id, type) {
    const data = {
        access: getAccessToken(),
        refresh: getRefreshToken(),
    }

    try {
        const response = await fetch(`/api/friends/friend-requests/${type}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${data.access}`,
                'refresh': data.refresh,
            },
            body: JSON.stringify({"user_id": id}),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        console.log('Accepted friend request:', result);
        return result;
    } catch (error) {
        console.error('Error accepting friend request:', error);
        return {};
    }
}

export async function removeFriend(id) {
    const data = {
        access: getAccessToken(),
        refresh: getRefreshToken()
    }

    try {
        const response = await fetch(`/api/friends/unfriend/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${data.access}`,
                // 'refresh': data.refresh,
            },
            body: JSON.stringify({"user_id": id}),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        console.log('Removed friend:', result);
        return result;
    } catch (error) {
        console.error('Error removing friend:', error);
        return {};
    }
}

// Add click event listener to handle outside clicks
document.addEventListener('click', function closePopup(event) {
    const popupContainer = document.querySelector('.profile-container-pop-up');
    if (
        popupContainer &&
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
        !event.target.closest('.search-result-item')
    ) {
        popupContainer.remove();
        document.removeEventListener('click', closePopup);
        console.log('Popup closed by outside click');
    }
});

