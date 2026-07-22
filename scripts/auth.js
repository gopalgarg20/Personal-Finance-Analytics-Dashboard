// ==========================================
// Demo Credentials
// ==========================================

const DEMO_EMAIL = "demo@finova.com";
const DEMO_PASSWORD = localStorage.getItem("finova.demoPassword") || "123456";


// ==========================================
// DOM Elements
// ==========================================

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const rememberUser = document.getElementById("rememberUser");
const togglePassword = document.getElementById("togglePassword");
const loginButton = document.getElementById("loginButton");


// ==========================================
// Remember Me
// ==========================================

window.addEventListener("DOMContentLoaded", () => {
    const savedEmail = localStorage.getItem("rememberEmail");

    if (savedEmail) {
        emailInput.value = savedEmail;
        rememberUser.checked = true;
    }
});


// ==========================================
// Show / Hide Password
// ==========================================

togglePassword.addEventListener("click", () => {

    if (passwordInput.type === "password") {

        passwordInput.type = "text";
        togglePassword.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';

    } else {

        passwordInput.type = "password";
        togglePassword.innerHTML = '<i class="fa-solid fa-eye"></i>';

    }

});

// ==========================================
// Modal Controls
// ==========================================

createAccount.addEventListener("click", (e) => {
    e.preventDefault();
    registerModal.classList.add("active");
});

forgotPassword.addEventListener("click", (e) => {
    e.preventDefault();
    forgotModal.classList.add("active");
});

closeRegister.addEventListener("click", () => {
    registerModal.classList.remove("active");
});

closeForgot.addEventListener("click", () => {
    forgotModal.classList.remove("active");
});

window.addEventListener("click", (e) => {

    if (e.target === registerModal) {
        registerModal.classList.remove("active");
    }

    if (e.target === forgotModal) {
        forgotModal.classList.remove("active");
    }

});
// ==========================================
// User Storage
// ==========================================

function getUsers() {
    return JSON.parse(localStorage.getItem("users")) || [];
}

function saveUsers(users) {
    localStorage.setItem("users", JSON.stringify(users));
}
// ==========================================
// Login
// ==========================================
loginForm.addEventListener("submit", (e) => {

    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    const users = getUsers();

    const user = users.find(
        u => u.email === email && u.password === password
    );

    if (
        (email === DEMO_EMAIL && password === DEMO_PASSWORD) ||
        user
    ) {

        let currentName = "Demo User";

        if (user) {
            currentName = user.name;
        }

        localStorage.setItem("loggedIn", "true");

        const session = {
            name: currentName,
            email: email
        };

        localStorage.setItem(
            "finova.session",
            JSON.stringify(session)
        );

        if (rememberUser.checked) {
            localStorage.setItem("rememberEmail", email);
        } else {
            localStorage.removeItem("rememberEmail");
        }

        window.location.href = "pages/dashboard.html";

    } else {

        alert("Invalid Email or Password!");

    }

});
// ==========================================
// Register New User
// ==========================================

registerForm.addEventListener("submit", (e) => {

    e.preventDefault();

    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("registerConfirmPassword").value;

    if (!name || !email || !password || !confirmPassword) {
        alert("Please fill all fields.");
        return;
    }

    if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }

    const users = getUsers();

    const existingUser = users.find(user => user.email === email);

    if (existingUser) {
        alert("An account with this email already exists.");
        return;
    }

    users.push({
        name,
        email,
        password
    });

    saveUsers(users);

    localStorage.setItem("loggedIn", "true");

    const session = {
        name: name,
        email: email
    };

    localStorage.setItem(
        "finova.session",
        JSON.stringify(session)
    );

    if (rememberUser.checked) {
        localStorage.setItem("rememberEmail", email);
    }

    alert(`Welcome to Finova, ${name}!`);

    registerForm.reset();
    registerModal.classList.remove("active");

    window.location.href = "pages/dashboard.html";

});
// ==========================================
// Forgot Password
// ==========================================

forgotForm.addEventListener("submit", (e) => {

    e.preventDefault();

    const email = document.getElementById("forgotEmail").value.trim();

    if (email === DEMO_EMAIL) {

        alert(
            "Demo Account\n\nEmail: demo@finova.com\nPassword: 123456"
        );

        forgotForm.reset();
        forgotModal.classList.remove("active");
        return;

    }

    const users = getUsers();

    const user = users.find(user => user.email === email);

    if (!user) {

        alert("No account found with this email.");
        return;

    }

    alert(
        `Password Found!\n\nYour password is: ${user.password}`
    );

    forgotForm.reset();
    forgotModal.classList.remove("active");

});

// ==========================================
// Protect Pages
// ==========================================

function protectPage() {

    if (localStorage.getItem("loggedIn") !== "true") {

        window.location.href = "../index.html";

    }

}

// ==========================================
// Current User
// ==========================================

function getCurrentUser() {

    const email = localStorage.getItem("currentUser");

    if (!email) {
        return null;
    }

    if (email === DEMO_EMAIL) {
        return {
            name: "Demo User",
            email: DEMO_EMAIL
        };
    }

    const users = getUsers();

    return users.find(user => user.email === email);

}

// ==========================================
// Logout
// ==========================================

function logout() {

    localStorage.removeItem("loggedIn");
    localStorage.removeItem("finova.session");

    window.location.href = "../index.html";

}
