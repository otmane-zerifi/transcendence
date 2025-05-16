
function GetSignIn () {
    return `
            <div class="auth-container">
                <form>
                    <div class="form-group d-flex flex-column mb-3">
                        <label for="email" class="form-label text-white">Email:</label>
                        <input type="email" class="form-control bg-secondary border-0" id="email" name="email" required>
                    </div>
                    <div class="form-group d-flex flex-column mb-3">
                        <label for="password" class="form-label text-white">Password:</label>
                        <input type="password" class="form-control bg-secondary border-0" id="password" name="password" required>
                    </div>  
                    <div class="text-center">
                        <button type="button" class="btn btn-primary mt-2">Sign In</button>
                    </div>
                </form>
                <a class="signup link-secondary mt-3 text-center">first time here? sign up</a>
                <a class="42auth link-secondary mt-1 text-center">are you a 42 student? authenticate with 42 intra</a>
            </div>
    `
}


function GetSignUp () {
    return `
            <div class="auth-container">
                <form action="" method="post">
                    <div class="form-group d-flex flex-column mb-3">
                        <label for="username" class="form-label text-white">Username</label>
                        <input type="text" class="form-control bg-secondary border-0" id="username" name="username" required>
                    </div>
                    <div class="form-group d-flex flex-column mb-3">
                        <label for="email" class="form-label text-white">Email</label>
                        <input type="email" class="form-control bg-secondary border-0" id="email" name="email" required>
                    </div>
                    <div class="form-group d-flex flex-column mb-3">
                        <label for="password" class="form-label text-white">Password</label>
                        <input type="password" class="form-control bg-secondary border-0" id="password" name="password" required>
                    </div>
                    <div class="form-group d-flex flex-column mb-3">
                        <label for="confirm-password" class="form-label text-white">Confirm Password</label>
                        <input type="password" class="form-control bg-secondary border-0" id="confirm-password" name="confirm-password" required>
                    </div>
                    <div class="text-center">
                        <button type="button" class="btn btn-primary mt-2">Sign Up</button>
                    </div>
                </form>
                <a class="signin link-secondary mt-3 text-center">already have an account? sign in</a>
                <a class="42auth link-secondary mt-1 text-center">are you a 42 student? authenticate with 42 intra</a>
            </div>
    `
}

function authfourtytwo () {
    
    return `
            <div class="auth-container">
                <div class="auth-wrapper">
                    <div class="auth-left_wall"></div>
                    <div class="auth-ball"></div>
                    <div class="auth-right_wall"></div>
                </div>
                <div class="auth-btn">
                    <img class="auth-logo" src="https://auth.42.fr/auth/resources/yyzrk/login/students/img/42_logo.svg" alt="logo">
                    <h1>Sign in</h1>
                </div>
                <a class="signin link-secondary mt-3" >not a 42 user? sign in with email and password</a>
            </div>
    `

}


document.addEventListener("DOMContentLoaded", function () {
    const authContainer = document.querySelector('.auth-container');
    const authBtn = document.querySelector('.auth-btn');
    if (authBtn) {
        authBtn.addEventListener('click', function () {
            authContainer.style.display = "none";
        });
    }

    document.body.addEventListener('click', function (event) {
        if (event.target.classList.contains('signin')) {
            authContainer.innerHTML = GetSignIn();
        }

        if (event.target.classList.contains('signup')) {
            authContainer.innerHTML = GetSignUp();
        }

        if (event.target.classList.contains('42auth')) {
            authContainer.innerHTML = authfourtytwo();

            const authBtn = document.querySelector('.auth-btn');
            if (authBtn) {
                authBtn.addEventListener('click', function () {
                    authContainer.style.display = "none";
                });
            }
        }
    });
});


// star animation
function randomRange(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

const starCount = 20;
const starsContainer = document.createElement('div');
starsContainer.classList.add('stars');

// Soft, calming star colors reminiscent of a night sky
const starColors = [
    '#87CEEB',    // Sky Blue
    '#4682B4',    // Steel Blue
    '#191970',    // Midnight Blue
    '#483D8B',    // Dark Slate Blue
    '#000080',    // Navy Blue
    '#4169E1',    // Royal Blue
    '#1E90FF',    // Dodger Blue
    '#6495ED'     // Cornflower Blue
];

for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    star.classList.add('star');

    const starTailLength = `${randomRange(500, 750) / 100}em`;
    const topOffset = `${randomRange(0, 10000) / 100}vh`;
    const fallDuration = `${randomRange(6000, 12000) / 1000}s`;
    const fallDelay = `${randomRange(0, 10000) / 1000}s`;
    const starColor = starColors[randomRange(0, starColors.length - 1)];

    star.style.setProperty('--star-tail-length', starTailLength);
    star.style.setProperty('--top-offset', topOffset);
    star.style.setProperty('--fall-duration', fallDuration);
    star.style.setProperty('--fall-delay', fallDelay);
    star.style.setProperty('--star-color', starColor);

    starsContainer.appendChild(star);
}

document.body.appendChild(starsContainer);
  