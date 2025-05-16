import { getUserProfile } from "./friendsPage.js";
import { updatePopupUserProfile } from "./userProfile.js";

export function createUserProfilePopup(userData) {
    // Remove any existing popup
    const existingPopup = document.querySelector('.profile-container-pop-up');
    if (existingPopup) {
        existingPopup.remove();
    }

    // Create a container for the popup
    const popupContainer = document.createElement('div');
    popupContainer.classList.add('profile-container-pop-up');
    
    // Add profile popup base HTML
    popupContainer.innerHTML = getUserProfile();
    document.body.appendChild(popupContainer);

    // Update profile with user data
    updatePopupUserProfile(userData, popupContainer);

    // Add close functionality
    const closeHandler = (event) => {
        if (existingPopup) {
            existingPopup.remove();
        }
        
        if (event.target.classList.contains('profile-container-pop-up')) {
            document.body.removeChild(popupContainer);
        }
    };

    // Add click handler
    popupContainer.addEventListener('click', closeHandler);

    // Return cleanup function
    return () => {
        popupContainer.removeEventListener('click', closeHandler);
        if (popupContainer.parentNode) {
            popupContainer.parentNode.removeChild(popupContainer);
        }
    };
}
