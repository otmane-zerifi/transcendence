import { getAccessToken, getRefreshToken } from "../backEnd.js";
import { checkTokenExpiration } from "../auth.js";
import { getUserData, HandleFriendRequest, getNotifications } from "../api/userApi.js";


export async function markNotificationAsRead(notificationId) {
    const response = await fetch('/api/friends/notifications/mark-read/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAccessToken()}`,
            'refresh': getRefreshToken()
        },
        body: JSON.stringify({ notification_id: notificationId })
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}
export function showNoNotifications(notifPopUp) {
    notifPopUp.innerHTML = `
        <div class="friend-request" style="text-align: center; padding: 20px;">
            <span style="color: white;">No notifications</span>
        </div>
    `;
}

export async function initializeNotifications() {
    // Check for notifications on page load
    const initialNotifications = await getNotifications();
    const unreadInitialNotifications = initialNotifications.filter(notification => !notification.is_read);
    const notificationDot = document.querySelector('.notification-dot');
    
    if (unreadInitialNotifications && unreadInitialNotifications.length > 0) {
        notificationDot.style.display = 'block';
    } else {
        notificationDot.style.display = 'none';
    }

    document.querySelector('.notification').addEventListener('click', async function (event) {
        try {
            const isValid = await checkTokenExpiration();
            if (!isValid) {
                showNoNotifications(document.querySelector('.notif-pop-up'));
                return;
            }

            const tokenData = {
                access: getAccessToken(),
                refresh: getRefreshToken(),
            };
            
            console.log('Initial token data:', tokenData);
            
            if (!tokenData.access || !tokenData.refresh) {
                console.error('Missing access or refresh token', tokenData);
                throw new Error('Missing authentication tokens');
            }

            const notifications = await getNotifications();
            console.log("the data is", notifications);
            const notifPopUp = document.querySelector('.notif-pop-up');
            notifPopUp.innerHTML = ''; // Clear existing notifications
            
            const unreadNotifications = notifications.filter(notification => !notification.is_read);
            
            if (unreadNotifications && unreadNotifications.length > 0) {
                for (const notification of unreadNotifications) {
                    try {
                        if (notification.notification_type === "FRIEND_REQUEST") {
                            const senderDetails = await getUserData(notification.data.sender_name);
                            console.log('Sender details:', senderDetails);
                            
                            const friendRequestDiv = document.createElement('div');
                            friendRequestDiv.className = 'friend-request';
                            friendRequestDiv.innerHTML = `
                                <div class="player-pic" style="background-image: url('${senderDetails.user?.avatar}')"></div>
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
                                    await markNotificationAsRead(notification.id);
                                    friendRequestDiv.remove();
                                    if (notifPopUp.children.length === 0) {
                                        notificationDot.style.display = 'none';
                                        showNoNotifications(notifPopUp);
                                    }
                                } catch (error) {
                                    console.error('Error handling friend request:', error);
                                }
                            });
                            
                            friendRequestDiv.querySelector('.decline').addEventListener('click', async function () {
                                console.log('Declining friend request...');
                                try {
                                    await HandleFriendRequest(notification.data.sender_id, "reject");
                                    await markNotificationAsRead(notification.id);
                                    friendRequestDiv.remove();
                                    if (notifPopUp.children.length === 0) {
                                        notificationDot.style.display = 'none';
                                        showNoNotifications(notifPopUp);
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
                                try {
                                    await markNotificationAsRead(notification.id);
                                    rejectionDiv.remove();
                                    if (notifPopUp.children.length === 0) {
                                        notificationDot.style.display = 'none';
                                        showNoNotifications(notifPopUp);
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
                                    await markNotificationAsRead(notification.id);
                                    acceptanceDiv.remove();
                                    if (notifPopUp.children.length === 0) {
                                        notificationDot.style.display = 'none';
                                        showNoNotifications(notifPopUp);
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
                showNoNotifications(notifPopUp);
            }

            // Show notification popup and arrow
            notifPopUp.style.display = 'block';
            notifPopUp.classList.add('active');
            document.querySelector('.notif-arrow').classList.add('active');
            document.querySelector('.notif-arrow').style.display = 'block';
            event.stopPropagation();
        } catch (error) {
            console.error('Error loading notifications:', error);
            showNoNotifications(document.querySelector('.notif-pop-up'));
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
