import { getAccessToken, getRefreshToken, refreshToken } from "../auth/tokenManager.js";

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
            // Return a default user object if the profile is not found
            if (response.status === 404) {
                return {
                    user: {
                        user_name: username,
                        avatar: '/static/default-avatar.png', // Adjust this path to your default avatar
                    }
                };
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (!result || !result.user) {
            return {
                user: {
                    user_name: username,
                    avatar: '/static/default-avatar.png', // Adjust this path to your default avatar
                }
            };
        }
        return result;
    } catch (error) {
        console.error('Error in getUserData:', error);
        // Return a default user object in case of any error
        return {
            user: {
                user_name: username,
                avatar: '/static/default-avatar.png', // Adjust this path to your default avatar
            }
        };
    }
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

        if (response.status === 401) {
            // Token expired, try to refresh
            try {
                const refreshData = await refreshToken(data.refresh);
                // Retry the request with the new token
                const retryResponse = await fetch('/api/friends/notifications/', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${refreshData.access}`,
                        'refresh': refreshData.refresh,
                    },
                });
                
                if (!retryResponse.ok) {
                    throw new Error(`HTTP error after token refresh! status: ${retryResponse.status}`);
                }
                
                const result = await retryResponse.json();
                console.log('Received notifications after token refresh:', result);
                return result;
            } catch (refreshError) {
                console.error('Error refreshing token:', refreshError);
                throw refreshError;
            }
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Received notifications:', result);
        return result;
    } catch (error) {
        console.error('Error checking pending friend requests:', error);
        if (error.message.includes('token refresh failed')) {
            // Token refresh failed, redirect to login
            window.location.href = '/oauth';
        }
        return [];
    }
}

export async function searchUser(value) {
    const data = { 
        refresh: getRefreshToken(),
        access: getAccessToken(),
    }

    try {
        const response = await fetch('/api/user/search/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${data.access}`,
                'refresh': data.refresh,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({"search": value}),
        });

        if (!response.ok) {
            throw new Error('Search request failed');
        }
        return response.json();
    } catch (error) {
        console.error('Error searching users:', error);
        throw error;
    }
}

export async function HandleFriendRequest(id, type) {
    const data = {
        access: getAccessToken(),
        refresh: getRefreshToken(),
    }

    try {
        console.log('Handling friend request:', { id, type });
        let endpoint = '';
        
        // Map the type to the correct endpoint
        switch(type) {
            case 'accept':
                endpoint = '/api/friends/friend-requests/accept/';
                break;
            case 'reject':
                endpoint = '/api/friends/friend-requests/reject/';
                break;
            case 'dismiss':
                endpoint = '/api/friends/friend-requests/cancel/';
                break;
            case 'send':
                endpoint = '/api/friends/friend-requests/';
                break;
            default:
                throw new Error(`Invalid friend request action type: ${type}`);
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${data.access}`,
                'refresh': data.refresh,
            },
            body: JSON.stringify(
                type === 'send' 
                    ? { receiver: id.toString() }
                    : { user_id: id.toString() }
            ),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Server response for ${type} request:`, errorText);
            throw new Error(`Failed to handle friend request: ${response.status}`);
        }

        const result = await response.json();
        console.log(`Friend request ${type} successful:`, result);
        return result;
    } catch (error) {
        console.error('Error in HandleFriendRequest:', error);
        throw error;
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
