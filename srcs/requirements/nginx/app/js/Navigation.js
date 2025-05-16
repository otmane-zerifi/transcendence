import { navigate } from "./router.js";
import { loadRoot } from "./router.js";
import { routes } from "./router.js";
import { loadPage } from "./router.js";
import { loadAuthJs } from "./auth.js";
import { checkAuthentication, storeRequestedPath, getRequestedPath, clearRequestedPath, getAccessToken } from "./backEnd.js";
import { refreshToken } from "./userProfile.js";
import { logoutJS } from "./logout.js"; // Correct import path

let currentPath = null;

export var isAuth = false;

// Make WebSocket variables globally accessible
window.notificationWs = null;
window.notificationWsRetryCount = 0;
const NOTIFICATION_WS_MAX_RETRY = 5;

window.userStatusWs = null;
window.userStatusWsRetryCount = 0;
const USER_STATUS_WS_MAX_RETRY = 5;

async function checkAndRedirect(url) {
    // Check if the path is an auth path
    const isAuthPath = ['/oauth', '/signin', '/signup'].includes(url);
    
    // Check authentication status
    isAuth = await checkAuthentication();
    
    if (!isAuth && !isAuthPath) {
        // Store the requested path for later redirect
        // make header invisible
        const Element = document.querySelector('.header');
        if (Element) {
            Element.style.display = "none";
            const mainElement = document.querySelector('.main');
            if (mainElement) {
                mainElement.style.height = "100%";
            }
        }
        storeRequestedPath(url);
        navigate('/oauth');
        return false;
    } else if (isAuth && isAuthPath) {
        // If authenticated and trying to access auth pages, redirect to home
        navigate('/home');
        return false;
    }
    
    // Update header visibility
    const headerElement = document.querySelector('.header');
    if (headerElement) {
        headerElement.style.display = isAuth ? "flex" : "none";
    }
    
    // Update main element height for auth pages
    const mainElement = document.querySelector('.main');
    if (mainElement && isAuthPath) {
        mainElement.style.height = "100%";
    }
    
    return true;
}

async function loadPageContent(url, isAuthPath = false) {
    await loadPage(url);
    if (isAuthPath) {
        // Wait a short moment for the DOM to be updated
        setTimeout(() => {
            loadAuthJs();
        }, 100);
    }
}

function createUserStatusSocket() {
    let token = getAccessToken();
    // Use the same host as the current page since nginx is proxying the requests
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/user_status/?token=${token}`;
    
    try {
        window.userStatusWs = new WebSocket(wsUrl);
        
        window.userStatusWs.onopen = () => {
            console.log('User Status WebSocket connected');
            window.userStatusWsRetryCount = 0;
            // Send authentication token
            window.userStatusWs.send(JSON.stringify({
                type: 'authentication',
                token: token
            }));
        };
        
        window.userStatusWs.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleUserStatus(data);
            } catch (error) {
                console.error('Error parsing user status:', error);
            }
        };
        
        window.userStatusWs.onerror = (error) => {
            console.error('User Status WebSocket error:', error);
        };
        
        window.userStatusWs.onclose = (event) => {
            console.log('User Status WebSocket disconnected', event.code, event.reason);
            if (event.code === 4001) {
                // Authentication failed
                console.error('User Status WebSocket authentication failed');
                handleUnauthorized();
                return;
            }
            if (window.userStatusWsRetryCount < USER_STATUS_WS_MAX_RETRY) {
                window.userStatusWsRetryCount++;
                console.log(`Attempting to reconnect (${window.userStatusWsRetryCount}/${USER_STATUS_WS_MAX_RETRY})`);
                setTimeout(createUserStatusSocket, 3000);
            }
        };
    } catch (error) {
        console.error('Error creating User Status WebSocket:', error);
    }
}

function handleUserStatus(data) {
    console.log('User status update:', data);
    if (data.type === 'status_change') {
        const { user_id, status, username } = data;
        console.log(`Updating status for user ${user_id} to ${status}`);
        
        // Update status for this user in any friend list where they appear
        const allPlayerPics = document.querySelectorAll('.player-pic');
        allPlayerPics.forEach(playerPic => {
            const userId = playerPic.getAttribute('data-user-id');
            
            // Match by either user ID or username
            if (userId && userId === user_id.toString()) {
                const statusDot = playerPic.querySelector('.online-status');
                if (statusDot) {
                    console.log(`Found status dot for user ${username}, updating to ${status}`);
                    statusDot.classList.remove('online', 'offline');
                    if (status === 'online') {
                        statusDot.classList.add('online');
                    } else {
                        statusDot.classList.add('offline');
                    }
                }
            }
        });
    }
}

function createNotificationSocket() {
    let token = getAccessToken();
    if (!token) return;

    // Use the same host as the current page since nginx is proxying the requests
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/notifications/?token=${token}`;
    
    try {
        window.notificationWs = new WebSocket(wsUrl);
        
        window.notificationWs.onopen = () => {
            console.log('Notification WebSocket connected');
            window.notificationWsRetryCount = 0;
            // Send authentication token
            window.notificationWs.send(JSON.stringify({
                type: 'authentication',
                token: token
            }));
        };
        
        window.notificationWs.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleNotification(data);
            } catch (error) {
                console.error('Error parsing notification:', error);
            }
        };
        
        window.notificationWs.onerror = (error) => {
            console.error('Notification WebSocket error:', error);
        };
        
        window.notificationWs.onclose = (event) => {
            console.log('Notification WebSocket disconnected', event.code, event.reason);
            if (event.code === 4001) {
                // Authentication failed
                console.error('Notification WebSocket authentication failed');
                handleUnauthorized();
                return;
            }
            if (window.notificationWsRetryCount < NOTIFICATION_WS_MAX_RETRY) {
                window.notificationWsRetryCount++;
                console.log(`Attempting to reconnect (${window.notificationWsRetryCount}/${NOTIFICATION_WS_MAX_RETRY})`);
                setTimeout(createNotificationSocket, 3000);
            }
        };
    } catch (error) {
        console.error('Error creating WebSocket:', error);
    }
}

function handleNotification(data) {
    console.log(data);
    // Show the notification dot when receiving a new notification
    const notificationDot = document.querySelector('.notification-dot');
    console.log("||||||||||||||||||||||||| the notification dot is : ", data);
    if (notificationDot && data.type !== 'REQUEST_ACCEPTED') {
        notificationDot.style.display = 'block';
    }
}

function handleUnauthorized() {
    // Implement unauthorized handling logic here
    console.error('Unauthorized');
}

// Initialize app state and handle initial routing
async function initializeApp() {
    await loadRoot();
    
    createNotificationSocket();
    createUserStatusSocket();
    
    const path = normalizeInitialPath();
    await handleInitialNavigation(path);
}

// Normalize the initial path based on special cases
function normalizeInitialPath() {
    let path = window.location.pathname;
    
    if (path === "/callback") {
        loadAuthJs(window.location.href);
        return '/home';
    }
    
    if (path === "/index.html") {
        const newPath = '/home';
        window.history.replaceState({}, newPath, window.location.origin + newPath);
        return newPath;
    }
    
    return path;
}

// Handle the initial navigation when app loads
async function handleInitialNavigation(path) {
    currentPath = path;
    const shouldContinue = await checkAndRedirect(path);
    
    if (shouldContinue) {
        updateHeaderTitle(path);
        const isAuthPath = isAuthenticationPath(path);
        await loadPageContent(routes[path]?.url || routes['/'].url, isAuthPath);
    }
}

// Check if the given path is an authentication path
function isAuthenticationPath(path) {
    return ['/oauth', '/signin', '/signup'].includes(path);
}

// Update the header title based on the current route
function updateHeaderTitle(path, title = null) {
    const headerTitle = document.querySelector('.header p');
    if (headerTitle) {
        headerTitle.textContent = title || routes[path]?.title;
    }
}

// Handle link navigation
async function handleLinkNavigation(e) {
    const link = e.target.closest('a[data-link]');
    if (!link) return;
    
    e.preventDefault();
    const path = link.getAttribute('href');
    
    // Special handling for logout
    if (path === '/logout') {
        await logoutJS();
        window.history.replaceState({}, '', '/oauth');
        const isAuthPath = true;
        await loadPageContent(routes['/oauth'].url, isAuthPath);
        return;
    }
    
    const title = link.getAttribute("data-title");
    const shouldNavigate = await checkAndRedirect(path);
    if (shouldNavigate) {
        updateHeaderTitle(path, title);
        const isAuthPath = isAuthenticationPath(path);
        await loadPageContent(routes[path]?.url || routes['/'].url, isAuthPath);
        window.history.pushState({}, '', path);
    }
}

// Handle browser back/forward navigation
async function handlePopState(event) {
    const path = event.state?.path || '/home';
    const shouldContinue = await checkAndRedirect(path);
    
    if (shouldContinue) {
        updateHeaderTitle(path);
        const isAuthPath = isAuthenticationPath(path);
        await loadPageContent(routes[path]?.url || routes['/'].url, isAuthPath);
    }
}

// Handle notification interactions
function setupNotificationHandlers() {
    const notificationBell = document.querySelector('.notification');
    const notificationDot = document.querySelector('.notification-dot');
    
    if (notificationBell && notificationDot) {
        notificationBell.addEventListener('click', () => {
            notificationDot.style.display = 'none';
        });
    }
}

// Handle notification popup clicks
function handleNotificationPopupClick(event) {
    const popup = document.querySelector('.notif-pop-up');
    const notificationContainer = document.querySelector('.notification-container');
    
    if (popup && notificationContainer && 
        !notificationContainer.contains(event.target) && 
        popup.style.display === 'block') {
        popup.style.display = 'none';
        popup.style.transform = 'translateY(-10px)';
    }
}

// Setup all event listeners
function setupEventListeners() {
    document.body.addEventListener('click', handleLinkNavigation);
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('click', handleNotificationPopupClick);
    setupNotificationHandlers();
}

// Main initialization
document.addEventListener("DOMContentLoaded", async () => {
    await initializeApp();
    setupEventListeners();
});
