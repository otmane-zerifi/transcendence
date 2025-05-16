// Token management functions
import { navigate } from "../router.js";

export function getAccessToken() {
    return localStorage.getItem('access_token');
}

export function getRefreshToken() {
    return localStorage.getItem('refresh_token');
}

export function setAccessToken(token) {
    localStorage.setItem('access_token', token);
}

export function setRefreshToken(token) {
    localStorage.setItem('refresh_token', token);
}

export function refreshToken() {
    console.log("Attempting to refresh token");
    const currentRefreshToken = getRefreshToken();

    if (!currentRefreshToken) {
        console.error('No refresh token in storage');
        localStorage.clear();
        navigate('/oauth');
        throw new Error('No refresh token available');
    }

    return fetch('/api/user/refresh/token/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({"refresh": currentRefreshToken}),
    })
    .then(async (response) => {
        if (!response.ok) {
            console.error('Token refresh response not OK', response.status);
            localStorage.clear();
            navigate('/oauth');
            throw new Error('Token refresh failed');
        }
        const data = await response.json();
        if (data.access) {
            setAccessToken(data.access);
            return data.access;
        }
        throw new Error('No access token in refresh response');
    })
    .catch((error) => {
        console.error('Error refreshing token:', error);
        localStorage.clear();
        navigate('/oauth');
        throw error;
    });
}
