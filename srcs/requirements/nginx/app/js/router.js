import { loadJS } from "./root.js";
import { loadGamePageJs } from "./gamePage.js";
import { loadPongOptJs } from "./gamePage.js";
import { loadAuthJs } from "./auth.js";
import { loadUserProfileJs, updateProfileIfExists } from "./userProfile.js";
import { loadSettingsJs } from "./settings.js";
import { loadFriendsJs } from "./friendsPage.js";
import { logoutJS } from "./logout.js";
import { loadChatJs } from "./chat.js";


export const routes = {
    '/': {title: "HOME", url: '/pages/homePage.html'},
    '/home': {title: "HOME", url: '/pages/homePage.html'},
    '/games': {title: "GAMES", url: '/pages/gamePage.html'},
    '/friends': {title: "FRIENDS", url: '/pages/friendsPage.html'},
    '/chat': {title: "CHAT", url: '/pages/chatPage.html'},
    '/profile': {title: "PROFILE", url: '/pages/profilePage.html'},
    '/leaderboard': {title: "LEADERBOARD", url: '/pages/leaderboardPage.html'},
    '/settings': {title: "SETTINGS", url: '/pages/settingsPage.html'},
    'root': {title: "HOME", url: '/pages/root.html'},
    '/pong': {title: "GAMES", url: '/pages/gamePage/pong-opt.html'},
    '/oauth': {title: undefined, url: '/pages/42authPage.html'},
    '/signin': {title: undefined, url: '/pages/signInPage.html'},
    '/signup': {title: undefined, url: '/pages/signUpPage.html'},
    '/logout': {title: undefined, url: '/pages/signOutPage.html'},
};

let currentPath = null;

async function fetchHtml(url) {
    try {
        const response = await fetch(url);
        return response.text();
    } catch (error) {
        console.error(`Error fetching HTML from ${url}`, error);
        return '';
    }
}


export async function loadRoot() {
    const root = document.querySelector('.root');
    if (!root) {
        console.error('Root element not found.');
        return;
    }
    root.innerHTML = await fetchHtml(routes['root'].url);
    loadJS();
}


export function navigate(path) {
    if (currentPath === path) return; 
    currentPath = path;
    window.history.pushState({}, path, window.location.origin + path);
    const headerParagraph = document.querySelector('.header p');
    if (headerParagraph)
        headerParagraph.textContent = routes[path]?.title || "";

    loadPage(routes[path]?.url || routes['/'].url);
}



export async function loadPage(url) {
    if (url === '/pages/signOutPage.html') {
        await logoutJS();
        // Instead of returning, continue with loading the oauth page
        url = '/pages/42authPage.html';
        window.history.replaceState({}, '', '/oauth');
    }
    
    const content = document.querySelector('.main');
    if (!content) {
        console.error('Content element not found.');
        return;
    }

    // Cleanup any existing cleanup functions
    if (window.currentPageCleanup) {
        console.log('Running cleanup for previous page');
        window.currentPageCleanup();
        window.currentPageCleanup = null;
    }

    console.log("%cURL `%s`", "color: cyan; font-weight: bold;", url);

    content.innerHTML = await fetchHtml(url);

    // Check if we need to update profile data
    updateProfileIfExists();

    // Store cleanup function if returned by page load
    let cleanup;
    if (url === '/pages/42authPage.html' || url === '/pages/signInPage.html' || url === '/pages/signUpPage.html') {
        cleanup = loadAuthJs();
    }
    else if (url === '/pages/gamePage.html') {
        cleanup = loadGamePageJs();
    }
    else if (url === '/pages/gamePage/pong-opt.html') {
        cleanup = loadPongOptJs();
    }
    else if (url === '/pages/profilePage.html') {
        cleanup = loadUserProfileJs();
    }
    else if (url === '/pages/settingsPage.html') {
        cleanup = loadSettingsJs();
    }
    else if (url === '/pages/friendsPage.html') {
        cleanup = loadFriendsJs();
    }
    else if (url === '/pages/chatPage.html') {
        cleanup = loadChatJs();
    }

    if (cleanup && typeof cleanup === 'function') {
        window.currentPageCleanup = cleanup;
    }
}




window.onpopstate = () => {
    const path = window.location.pathname;
    currentPath = path;
    document.querySelector('.header p').textContent = routes[path]?.title || "";
    loadPage(routes[path]?.url || routes['/'].url);
}