import { getAccessToken, getRefreshToken } from "../backEnd.js";

export function searchUser(value) {
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
export function debounce(func, wait) {
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
