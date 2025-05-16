import { sendtoBackend, getRequestedPath, clearRequestedPath } from "./backEnd.js?v=1";
import { navigate } from "./router.js?v=1";
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken } from "./backEnd.js";
import { refreshToken } from "./userProfile.js";

var response = null;

export function loadAuthJs(callback = null) {

    console.log("the callback is", callback);
    document.querySelector('.register')?.addEventListener('click', function () {
        const registerData = {
            "user_name": document.querySelector('#user_name').value.trim(),
            "email": document.querySelector('#email').value.trim(),
            "password": document.querySelector('#password').value.trim()
        };
        const confirmPassword = document.querySelector('#confirm-password').value.trim();
        const confirmPasswordField = document.querySelector('#confirm-password');
        const confirmPasswordError = confirmPasswordField.nextElementSibling;

        if (registerData.password !== confirmPassword) {
            confirmPasswordError.classList.remove('d-none');
            confirmPasswordField.classList.add('error-border');
            return;
        } else {
            confirmPasswordError.classList.add('d-none');
            confirmPasswordField.classList.remove('error-border');
        }

        let allValid = true;

        for (const key in registerData) {
            const inputElement = document.querySelector('#' + key);
            const value = registerData[key];

            if (value === '') {
                inputElement.classList.add('error-border');
                allValid = false;
            } else {
                inputElement.classList.remove('error-border');
            }
        }

        if (!allValid)
            return;

        sendtoBackend('register', registerData).then((registerResponse) => {
            // console.log("the register response.user is", registerResponse.user);
            if (registerResponse && registerResponse.user.access && registerResponse.user.refresh) {
                const successMessage = document.querySelector('.login-success');
                if (successMessage) {
                    successMessage.classList.remove('d-none');
                    setTimeout(() => {
                        navigate('/signin');
                    }, 1500);
                }
            }
        }).catch((error) => {
            console.error('Registration failed:', error);
        });
    });

    const loginButton = document.querySelector('.login');
    
    loginButton?.addEventListener('click', function () {
        const loginData = {
            "email": document.querySelector('#email').value.trim(),
            "password": document.querySelector('#password').value.trim()
        };

        let allValid = true;
        for (const key in loginData) {
            const inputElement = document.querySelector('#' + key);
            const value = loginData[key];
            if (value === '') {
                inputElement.classList.add('error-border');
                allValid = false;
            } else {
                inputElement.classList.remove('error-border');
            }
        }

        if (!allValid) return;
        sendtoBackend('login', loginData).then((loginResponse) => { // /api/user/login/
            console.log('Login response:', loginResponse);
            
            // Check if login was successful and tokens are present
            if (loginResponse?.user?.access && loginResponse?.user?.refresh) {
                console.log("2FA status:", loginResponse.user.is_2fa_active);

                // If 2FA is NOT active, proceed with direct login and redirection
                if (loginResponse.user.is_2fa_active === false) {
                    // Remove existing tokens
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    
                    // Set new tokens
                    localStorage.setItem('access_token', loginResponse.user.access);
                    localStorage.setItem('refresh_token', loginResponse.user.refresh);

                    // Show success message
                    const successMessage = document.querySelector('h6.text-success');
                    if (successMessage) {
                        successMessage.classList.remove('d-none');
                        
                        // Redirect after showing success message
                        setTimeout(() => {
                            const requestedPath = getRequestedPath();
                            if (requestedPath) {
                                clearRequestedPath();
                                window.location.href = requestedPath;
                            } else {
                                window.location.href = '/home';
                            }
                        }, 1000);
                    }
                } 
                // If 2FA is active, show OTP verification section
                else {
                    const otpSection = document.querySelector('.otp');
                    const otpVerifyButton = document.querySelector('.otp-verify');
                    
                    if (otpSection && otpVerifyButton) {
                        otpSection.classList.remove('d-none');
                        otpVerifyButton.classList.remove('d-none');
                        loginButton.classList.add('d-none');

                        response = loginResponse;

                        otpVerifyButton.addEventListener('click', function() {
                            const otpValue = document.querySelector('#otp-fa').value.trim();
                            
                            if (!otpValue) {
                                console.error('OTP value is empty');
                                return;
                            }

                            const otpData = {
                                otp: otpValue,
                                refresh: response.user.refresh,
                                access: response.user.access
                            };

                            sendtoBackend('otp-verification', otpData).then((otpResponse) => {
                                console.log("OTP verification response:", otpResponse);
                                
                                if (otpResponse?.user?.access && otpResponse?.user?.refresh) {
                                    // Remove existing tokens
                                    localStorage.removeItem('access_token');
                                    localStorage.removeItem('refresh_token');
                                    
                                    // Set new tokens
                                    localStorage.setItem('access_token', otpResponse.user.access);
                                    localStorage.setItem('refresh_token', otpResponse.user.refresh);
                                    
                                    otpSection.classList.add('d-none');
                                    otpVerifyButton.classList.add('d-none');
                                    
                                    const successMessage = document.querySelector('h6.text-success');
                                    if (successMessage) {
                                        successMessage.classList.remove('d-none');
                                        setTimeout(() => {
                                            const requestedPath = getRequestedPath();
                                            if (requestedPath) {
                                                clearRequestedPath();
                                                window.location.href = requestedPath;
                                            } else {
                                                window.location.href = '/home';
                                            }
                                        }, 1000);
                                    }
                                } else {
                                    console.error('Invalid OTP verification response:', otpResponse);
                                }
                            }).catch((error) => {
                                console.error('OTP verification failed:', error);
                                const otpError = document.getElementById('otp-error');
                                const otpExpired = document.getElementById('otp-expired');
                                
                                if (error.message.includes('Invalid OTP')) {
                                    if (otpError) {
                                        otpError.classList.remove('d-none');
                                        setTimeout(() => {
                                            otpError.classList.add('d-none');
                                        }, 3000);
                                    }
                                } else if (error.message.includes('OTP expired')) {
                                    if (otpExpired) {
                                        otpExpired.classList.remove('d-none');
                                        setTimeout(() => {
                                            otpExpired.classList.add('d-none');
                                        }, 3000);
                                    }
                                }
                            });
                        });
                    } else {
                        console.error('OTP elements not found');
                    }
                }
            } else {
                console.error('Invalid login response structure:', loginResponse);
                if (loginResponse?.error == "User not found") {
                    const userNotFound = document.querySelector('#user-not-found');
                    if (userNotFound) {
                        userNotFound.classList.remove('d-none');
                        setTimeout(() => {
                            userNotFound.classList.add('d-none');
                        }, 3000);
                    }
                }
            }
        }).catch((error) => {
            console.error('Login failed:', error);
            const invalidCredentials = document.querySelector('h6.text-danger:not(#email-error):not(#otp-error):not(#otp-expired):not(#user-not-found)');
            if (invalidCredentials) {
                invalidCredentials.textContent = 'Invalid credentials!';
                invalidCredentials.classList.remove('d-none');
                setTimeout(() => {
                    invalidCredentials.classList.add('d-none');
                }, 3000);
            }
        });
    });

    const intranetButton = document.querySelector('.auth-btn');
    console.log('intranetButton:', intranetButton);
    
    intranetButton?.addEventListener('click', function () {
        sendtoBackend('42intra', {})
    });

    if (callback) {
        const urlParams = new URLSearchParams(new URL(callback).search);
        const code = urlParams.get('code');
        console.log('Extracted code:', code);

        if (code) {
            sendtoBackend('callback', { code: code }).then((response) => {
                console.log('Callback response:', response);

                if (response && response.user.access && response.user.refresh) {
                    localStorage.setItem('access_token', response.user.access);
                    localStorage.setItem('refresh_token', response.user.refresh);
                    
                    const requestedPath = getRequestedPath();
                    if (requestedPath) {
                        clearRequestedPath();
                        window.location.href = requestedPath;
                    } else {
                        window.location.href = '/home';
                    }
                }
            }).catch((error) => {
                console.error('Callback error:', error);
            });
        }
    }
}




export async function checkTokenExpiration() {
    const data = {
        access: getAccessToken(),
        refresh: getRefreshToken(),
    }

    // Validate tokens before making the request
    if (!data.access || !data.refresh) {
        return false;
    }

    console.log('about the check if token is expired');
    try {
        const response = await fetch("/api/user/check/token", {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${data.access}`,
                'refresh': data.refresh,
            }
        })

        console.log('about the check if token is expired', response);

        if (!response.ok) {
            console.log("1");
            throw new Error(`Unable to check token expiration date: ${response.status}`);
        }
        else {
            console.log("2");
            const data = await response.json();
            if (data.is_token_expired) {
                console.log("3");
                console.log('%cToken is expired', 'color: yellow');
                await refreshToken(getRefreshToken());
                return true;
            }
            else if (!data.is_token_expired) {
                console.log("4");
                console.log('%cRefresh token is VALID', 'color: green');
                return true;
            }
        }
    }
    catch (error) {
        console.error('Error checking token:', error);
        return false;
    }
}