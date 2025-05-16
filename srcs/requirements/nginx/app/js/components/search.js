import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken } from "../backEnd.js";
import { searchUser } from "../utils/searchUtils.js";
import { checkTokenExpiration } from "../auth.js";
import { refreshToken } from "../auth/tokenManager.js";
import { getUserProfile } from "../friendsPage.js";
import { updatePopupUserProfile } from "../userProfile.js";
import { getUserData } from "../api/userApi.js";

export function initializeSearch() {
    const searchBar = document.querySelector(".header .search-bar");
    const searchInput = document.querySelector(".search-text");
    const searchResults = document.querySelector(".search-results");
    const titleElement = document.querySelector(".header .title");
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
            const isValid = await checkTokenExpiration();
            if (!isValid) {
                throw new Error('Token validation failed');
            }

            const data = {
                access: getAccessToken(),
                refresh: getRefreshToken(),
            };
            
            console.log('Initial token data:', data);
            
            // Validate tokens before making the request
            if (!data.access || !data.refresh) {
                console.error('Missing access or refresh token', data);
                throw new Error('Missing authentication tokens');
            }

            let searchData;
            try {
                searchData = await searchUser(value);
                if (searchData.messages && searchData.messages[0].message === 'Token is invalid or expired') {
                    const newTokenData = await refreshToken(getRefreshToken());
                    setAccessToken(newTokenData.access);
                    setRefreshToken(newTokenData.refresh);
                    searchData = await searchUser(value);
                }
            } catch (error) {
                console.error('Error during search:', error);
                throw error;
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
                    const clickHandler = async (event) => {
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
                        try {
                            const userData = await getUserData(username);
                            
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
                        } catch (error) {
                            console.error('Error fetching user data:', error);
                        }
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
        } catch (error) {
            console.error('Search error:', error);
            searchResults.innerHTML = `
                <div style="color: white; text-align: center; padding: 20px;">
                    An error occurred while searching
                </div>
            `;
        }
    };

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
        }
    });
}
