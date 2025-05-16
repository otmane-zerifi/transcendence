// Token management functions
import { refreshToken } from "./userProfile.js";

export function getAccessToken() {
    return localStorage.getItem('access_token');
}

export function getRefreshToken() {
    return localStorage.getItem('refresh_token');
}

export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export async function sendtoBackend(route, data) {
    let endpoints = {
        'login': '/api/user/login/',
        'register': '/api/user/register/',
        'otp-verification': '/api/user/otp-verification/',
        '42intra': '/api/user/oauth/login',
        'callback': '/api/user/oauth/callback/'
    };

    
    if (route === '42intra') {
        window.location.href = endpoints['42intra'];
        return;
    }

    if (route === 'login' || route === 'register') {
        const emailError = document.getElementById('email-error');
        if (!validateEmail(data.email)) {
            if (emailError) {
                emailError.classList.remove('d-none');
                setTimeout(() => {
                    emailError.classList.add('d-none');
                }, 3000);
            }
            return;
        }
    }
    
    let method = 'POST';
    let fetchOptions = {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (method === 'POST') {
        fetchOptions.body = JSON.stringify(data);
    }
    
    if (route === 'otp-verification') {
        const access_token = data.access;
        const refresh_token = data.refresh;
        fetchOptions.headers['Authorization'] = `Bearer ${access_token}`;
        fetchOptions.headers['refresh'] = refresh_token;
        fetchOptions.body = JSON.stringify({
            'otp': data.otp,
        });
    }

    if (route === 'callback') {
        endpoints['callback'] = '/api/user/oauth/callback/?code=' + data.code;
        fetchOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        console.log("OAuth Callback URL:", endpoints['callback']);
    }

    console.log("Sending request to:", endpoints[route]);
    console.log("Headers:", fetchOptions.headers);
    console.log("Data:", data);
    
    try {
        const response = await fetch(endpoints[route], fetchOptions);
        
        console.log("Response status:", response.status);
        console.log("Response headers:", Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log("Raw response text:", responseText);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, body: ${responseText}`);
        }

        try {
            return JSON.parse(responseText);
        } catch (parseError) {
            console.error("JSON parsing error:", parseError);
            throw new Error(`Failed to parse JSON: ${responseText}`);
        }
    } catch (error) {
        console.error(`Error in ${route}:`, error);
        throw error;
    }
}

export function setAccessToken(token) {
    localStorage.setItem('access_token', token);
}

export function setRefreshToken(token) {
    localStorage.setItem('refresh_token', token);
}

export async function checkAuthentication() {
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    return !!(accessToken && refreshToken);
}

export function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
}

export function storeRequestedPath(path) {
    sessionStorage.setItem('requestedPath', path);
}

export function getRequestedPath() {
    return sessionStorage.getItem('requestedPath');
}

export function clearRequestedPath() {
    sessionStorage.removeItem('requestedPath');
}