const API_URL = 'http://localhost:5500';

const regiForm = document.getElementById('regiForm');
const submitBtn = document.getElementById('submit-btn');
const errorMsg = document.getElementById('errorMsg');
const successMsg = document.getElementById('successMsg');

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
    successMsg.style.display = 'none';
}
function showSuccess(msg) {
    successMsg.textContent = msg;
    successMsg.style.display = 'block';
    errorMsg.style.display = 'none';
}

async function fetchNextId() {
    try {
        const response = await fetch(`${API_URL}/nextId`); // backend endpoint for next ID
        const data = await response.json();
        return data.nextId;
    } catch (err) {
        console.error(err);
        showError('Could not fetch next ID.');
        throw err;
    }
}

async function registerUser(nickname, emailOrPhone, password) {
    try {
        const id = await fetchNextId(); // get incremental ID

        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, nickname, email_or_phone: emailOrPhone, password })
        });

        const data = await response.json();

        if (response.ok) {
            showSuccess('Registration successful! Redirecting to login...');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 200);
        } else {
            showError(data.error || 'Registration failed');
        }
    } catch (err) {
        console.error(err);
        showError('Connection error. Make sure your server is running.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register';
    }
}

regiForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nickname = document.getElementById('nickname').value.trim();
    const emailOrPhone = document.getElementById('emailOrPhone').value.trim();
    const password = document.getElementById('password').value;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailOrPhone)) {
        showError('Please enter a valid email or phone number.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    registerUser(nickname, emailOrPhone, password);
    console.log("Form submitted");
});