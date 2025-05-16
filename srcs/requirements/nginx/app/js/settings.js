import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken } from "./backEnd.js";
import { getData } from "./userProfile.js";
import { refreshToken } from "./userProfile.js";


export function loadSettingsJs() {
    const data = {
        access: getAccessToken(),
        refresh: getRefreshToken(),
    }

    console.log('Initial token data:', data);

    // Validate tokens before making the request
    if (!data.access || !data.refresh) {
        console.error('Missing access or refresh token', data);
        return Promise.reject(new Error('Missing authentication tokens'));
    }

    getData(data)
        .then((responseData) => {
            console.log('User data:', responseData);
            fillSettings(responseData);
        })
        .catch((error) => {
            console.error('Error fetching user data:', error);
        });

    var twofa;
    document.getElementById('2fa-switch').addEventListener('change', function(event) {
            console.log('2FA is now:', event.target.checked ? 'true' : 'false');
            twofa = event.target.checked;
    });

    document.querySelector('.save-btn').addEventListener('click', function() {
        // Initialize variables
        let twofa = document.getElementById('2fa-switch').checked; // Get 2FA state
        const changePasswordField = document.getElementById('change-password'); // Password field element
        const confirmPasswordField = document.getElementById('confirm-password'); // Confirm password field element
    
        // Array of field elements for validation
        const fields = [changePasswordField, confirmPasswordField];
    
        let hasError = false;
    
        // Validate fields
        fields.forEach(field => {
            if (!field.value.trim()) { // If the field is empty
                field.classList.add('error-border'); // Add error border
                hasError = true;
    
                // Remove the error border after 3 seconds
                setTimeout(() => {
                    field.classList.remove('error-border');
                }, 3000);
            } else {
                field.classList.remove('error-border'); // Ensure no error border if not empty
            }
        });
    
        // If there are errors, stop further processing
        if (hasError) {
            console.log('Please fill in all required fields.');
            return; // Exit the function early
        }
    
        // Create the Data object
        const Data = {
            password: changePasswordField.value,
            confirmPassword: confirmPasswordField.value,
            twoFactorAuth: twofa
        };
    
        // Print the data in cyan color
        console.log('%cData:', 'color: cyan; font-weight: bold;', Data);
    
    });
}

function fillSettings(data) {

    // Use more specific selector for profile picture in settings
    const profilePictureElement = document.querySelector(".settings-container .profile-picture");
    if (profilePictureElement) {
        profilePictureElement.style.backgroundImage = data.user.avatar ? `url(${data.user.avatar})` : 'url("/media/avatars/op.webp")';
    }

    // Use more specific selectors for form inputs
    const username = document.querySelector(".settings-container #username");
    if (username) {
        username.value = data.user.username;
    }

    const email = document.querySelector(".settings-container #email");
    if (email) {
        email.value = data.user.email;
    }

    // Setup avatar upload functionality
    setupAvatarUpload();
}

function setupAvatarUpload() {
    // Create hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    // Add click handler to edit icon
    const editIcon = document.querySelector('.edit-icon');
    if (editIcon) {
        editIcon.addEventListener('click', () => {
            fileInput.click();
        });
    }

    // Handle file selection
    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Show loading state
        if (editIcon) {
            editIcon.style.opacity = '0.5';
            editIcon.style.pointerEvents = 'none';
        }

        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const response = await fetch('/api/user/profile/', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${getAccessToken()}`,
                    'refresh': getRefreshToken()
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (errorData.error) {
                    try {
                        // Parse the error string into an object
                        const errorObj = JSON.parse(errorData.error.replace(/'/g, '"'));
                        if (errorObj.avatar && errorObj.avatar.length > 0) {
                            alert(errorObj.avatar[0].string);
                            return;
                        }
                    } catch (parseError) {
                        console.error('Error parsing error message:', parseError);
                    }
                }
                throw new Error('Failed to upload image');
            }

            // Get updated data from backend
            const data = {
                access: getAccessToken(),
                refresh: getRefreshToken(),
            };

            // Refresh user data from backend
            const updatedData = await getData(data);
            if (updatedData && updatedData.user) {
                // Update profile picture in settings
                const profilePicture = document.querySelector(".settings-container .profile-picture");
                if (profilePicture && updatedData.user.avatar) {
                    profilePicture.style.backgroundImage = `url(${updatedData.user.avatar})`;
                }
            }

        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert('Failed to upload image. Please try again.');
        } finally {
            // Reset loading state
            if (editIcon) {
                editIcon.style.opacity = '';
                editIcon.style.pointerEvents = '';
            }
            // Reset file input
            fileInput.value = '';
        }
    });
}
