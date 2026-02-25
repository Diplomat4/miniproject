const form = document.getElementById('authForm');
const toggleBtn = document.getElementById('toggleBtn');
const toggleText = document.getElementById('toggleText');
const formTitle = document.getElementById('formTitle');
const nameGroup = document.getElementById('nameGroup');
const submitBtn = document.getElementById('submitBtn');
const authMessage = document.getElementById('authMessage');

let isLoginMode = true;

// Toggle between Login & Register
toggleBtn.addEventListener('click', () => {
    isLoginMode = !isLoginMode;

    if (!isLoginMode) {
        formTitle.textContent = "Register";
        nameGroup.style.display = "block";
        submitBtn.textContent = "Register Account";
        toggleText.textContent = "Already registered?";
        toggleBtn.textContent = "Login Here";
    } else {
        formTitle.textContent = "Login";
        nameGroup.style.display = "none";
        submitBtn.textContent = "Login to Dashboard";
        toggleText.textContent = "New user?";
        toggleBtn.textContent = "Register Here";
    }

    authMessage.textContent = "";
});

// Handle Form Submission
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (isLoginMode) {
        const storedUser = JSON.parse(localStorage.getItem(email));

        if (storedUser && storedUser.password === password) {
            authMessage.style.color = "green";
            authMessage.textContent = "Access Granted. Redirecting...";
            setTimeout(() => {
                window.location.href = "../Dashboard.html";
            }, 1000);
        } else {
            authMessage.style.color = "red";
            authMessage.textContent = "Invalid credentials.";
        }

    } else {
        if (localStorage.getItem(email)) {
            authMessage.style.color = "red";
            authMessage.textContent = "User already exists.";
            return;
        }

        const newUser = {
            name: fullName,
            email: email,
            password: password
        };

        localStorage.setItem(email, JSON.stringify(newUser));

        authMessage.style.color = "green";
        authMessage.textContent = "Registration successful. Please login.";

        isLoginMode = true;
        toggleBtn.click();
    }
});
