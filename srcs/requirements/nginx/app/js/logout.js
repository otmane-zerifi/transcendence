import { checkAuthentication } from "./backEnd.js";

// Function to close WebSocket if it exists and is open
function closeWebSocketIfExists(ws) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'User logged out');
    }
}

export async function logoutJS() {
    // Clear tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    // Hide the header and adjust main element
    const header = document.querySelector('.header');
    if (header) {
        header.style.display = 'none';
        const mainElement = document.querySelector('.main');
        if (mainElement) {
            mainElement.style.height = "100%";
        }
    }

    // Close all WebSocket connections
    // These are defined in Navigation.js as global variables
    closeWebSocketIfExists(window.notificationWs);
    closeWebSocketIfExists(window.userStatusWs);
    // closeWebSocketIfExists(window.chatWs); // If you have a chat WebSocket
    
    // Update authentication state
    await checkAuthentication();
}