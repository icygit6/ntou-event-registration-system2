const API_URL = 'http://localhost:5500';

document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const signInModal = document.getElementById('signInModal');
    const registerModal = document.getElementById('registerModal');

    // OPEN MODALS
    if (loginBtn) {
        loginBtn.onclick = () => {
            signInModal.style.display = "block";
            hideMsg('signInErrorMsg');
            hideMsg('signInSuccessMsg');
        };
    }

    if (registerBtn) {
        registerBtn.onclick = () => {
            registerModal.style.display = "block";
            hideMsg('registerErrorMsg');
            hideMsg('registerSuccessMsg');
        };
    }

    // CLOSE MODALS (X buttons)
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.onclick = () => {
            signInModal.style.display = "none";
            registerModal.style.display = "none";
        };
    });

    // CLOSE WHEN CLICKING OUTSIDE
    window.onclick = (event) => {
        if (event.target === signInModal) signInModal.style.display = "none";
        if (event.target === registerModal) registerModal.style.display = "none";
    };

    // SWITCH SIGNIN → REGISTER
    const showRegisterLink = document.getElementById('showRegisterLink');
    if (showRegisterLink) {
        showRegisterLink.onclick = (e) => {
            e.preventDefault();
            signInModal.style.display = "none";
            registerModal.style.display = "block";
        };
    }

    // FORMS
    setupSignInForm();
    setupRegisterForm();
});

function hideMsg(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
}

function showMsg(id, msg, isError = true) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.style.color = isError ? "#ef4444" : "#10b981";
    el.style.display = "block";
}

// SIGN IN FORM
function setupSignInForm() {
    const form = document.getElementById('signInForm');
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();

        const email = document.getElementById('signInEmail').value.trim();
        const pass = document.getElementById('signInPassword').value;
        const btn = form.querySelector(".submit-btn");

        if (!email || !pass) {
            showMsg('signInErrorMsg', "Please fill in all fields");
            return;
        }

        btn.disabled = true;
        btn.textContent = "Signing In...";

        hideMsg('signInErrorMsg');
        hideMsg('signInSuccessMsg');

        try {
            const res = await fetch(`${API_URL}/signin`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email_or_phone: email, password: pass })
            });

            const data = await res.json();

            if (res.ok && data.token) {
                localStorage.setItem("authToken", data.token);
                showMsg('signInSuccessMsg', "Login successful!", false);

                setTimeout(() => location.reload(), 800);
            } else {
                showMsg('signInErrorMsg', data.error || "Login failed");
            }
        } catch (err) {
            showMsg('signInErrorMsg', "Server connection failed");
        }

        btn.disabled = false;
        btn.textContent = "Sign In";
    };
}

// REGISTER FORM
function setupRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();

        const nickname = document.getElementById('registerNickname').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const pass = document.getElementById('registerPassword').value;
        const btn = form.querySelector(".submit-btn");

        if (!nickname || !email || !pass) {
            showMsg('registerErrorMsg', "Please fill in all fields");
            return;
        }

        btn.disabled = true;
        btn.textContent = "Registering...";

        hideMsg('registerErrorMsg');
        hideMsg('registerSuccessMsg');

        try {
            const res = await fetch(`${API_URL}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nickname,
                    email_or_phone: email,
                    password: pass
                })
            });

            const data = await res.json();

            if (res.ok) {
                showMsg('registerSuccessMsg', "Registration successful!", false);

                setTimeout(() => {
                    document.getElementById('registerModal').style.display = "none";
                    document.getElementById('signInModal').style.display = "block";
                }, 800);

            } else {
                showMsg('registerErrorMsg', data.error || "Registration failed");
            }

        } catch (err) {
            showMsg('registerErrorMsg', "Server connection error");
        }

        btn.disabled = false;
        btn.textContent = "Register";
    };
}
