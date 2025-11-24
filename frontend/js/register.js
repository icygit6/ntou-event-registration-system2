// js/modal-auth.js - FULL WORKING VERSION
const API_URL = 'http://localhost:5500';

console.log('Modal auth script loaded');

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, setting up modals...');
    
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const signInModal = document.getElementById('signInModal');
    const registerModal = document.getElementById('registerModal');
    
    console.log('Found elements:', {
        loginBtn: !!loginBtn,
        registerBtn: !!registerBtn,
        signInModal: !!signInModal,
        registerModal: !!registerModal
    });

    // Check if user is logged in
    if (localStorage.getItem('authToken')) {
        console.log('User is logged in, hiding auth buttons');
        return;
    }

    // Simple click handlers
    if (loginBtn && signInModal) {
        loginBtn.onclick = function(e) {
            e.preventDefault();
            console.log('Opening sign in modal');
            signInModal.style.display = 'block';
            // Clear previous messages
            hideMessage('signInErrorMsg');
            hideMessage('signInSuccessMsg');
        };
    }

    if (registerBtn && registerModal) {
        registerBtn.onclick = function(e) {
            e.preventDefault();
            console.log('Opening register modal');
            registerModal.style.display = 'block';
            // Clear previous messages
            hideMessage('registerErrorMsg');
            hideMessage('registerSuccessMsg');
        };
    }

    // Close modals when clicking X
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.onclick = function() {
            signInModal.style.display = 'none';
            registerModal.style.display = 'none';
        };
    });

    // Close modals when clicking outside
    window.onclick = function(e) {
        if (e.target === signInModal) {
            signInModal.style.display = 'none';
        }
        if (e.target === registerModal) {
            registerModal.style.display = 'none';
        }
    };

    // Close with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            signInModal.style.display = 'none';
            registerModal.style.display = 'none';
        }
    });

    // Switch between modals
    const showRegisterLink = document.getElementById('showRegisterLink');
    if (showRegisterLink) {
        showRegisterLink.onclick = function(e) {
            e.preventDefault();
            signInModal.style.display = 'none';
            registerModal.style.display = 'block';
            hideMessage('registerErrorMsg');
            hideMessage('registerSuccessMsg');
        };
    }

    // Setup form submissions
    setupSignInForm();
    setupRegisterForm();
});

function hideMessage(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'none';
    }
}

function showMessage(elementId, message, isError = true) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        element.style.color = isError ? '#ef4444' : '#10b981';
    }
}

function setupSignInForm() {
    const signInForm = document.getElementById('signInForm');
    if (!signInForm) return;

    signInForm.onsubmit = async function(e) {
        e.preventDefault();
        console.log('Sign in form submitted');

        const email = document.getElementById('signInEmail').value.trim();
        const password = document.getElementById('signInPassword').value;
        const submitBtn = document.querySelector('#signInForm .submit-btn');
        const errorMsg = document.getElementById('signInErrorMsg');
        const successMsg = document.getElementById('signInSuccessMsg');

        // Basic validation
        if (!email || !password) {
            showMessage('signInErrorMsg', 'Please fill in all fields');
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing In...';
        hideMessage('signInErrorMsg');
        hideMessage('signInSuccessMsg');

        try {
            console.log('Sending sign in request...');
            const response = await fetch(`${API_URL}/signin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email_or_phone: email,
                    password: password
                })
            });

            const data = await response.json();
            console.log('Sign in response:', data);

            if (response.ok && data.token) {
                // Success
                localStorage.setItem('authToken', data.token);
                showMessage('signInSuccessMsg', 'Sign in successful! Redirecting...', false);
                
                // Close modal and refresh page after delay
                setTimeout(() => {
                    document.getElementById('signInModal').style.display = 'none';
                    window.location.reload();
                }, 1500);
            } else {
                // Error
                showMessage('signInErrorMsg', data.error || 'Sign in failed');
            }
        } catch (error) {
            console.error('Sign in error:', error);
            showMessage('signInErrorMsg', 'Connection error. Please check if server is running.');
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
        }
    };
}

function setupRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    registerForm.onsubmit = async function(e) {
        e.preventDefault();
        console.log('Register form submitted');

        const nickname = document.getElementById('registerNickname').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const submitBtn = document.querySelector('#registerForm .submit-btn');

        // Basic validation
        if (!nickname || !email || !password) {
            showMessage('registerErrorMsg', 'Please fill in all fields');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showMessage('registerErrorMsg', 'Please enter a valid email address');
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registering...';
        hideMessage('registerErrorMsg');
        hideMessage('registerSuccessMsg');

        try {
            console.log('Getting next user ID...');
            // First, get the next user ID
            const idResponse = await fetch(`${API_URL}/nextId`);
            if (!idResponse.ok) {
                throw new Error('Failed to get user ID');
            }
            
            const idData = await idResponse.json();
            const nextId = idData.nextId;
            console.log('Next user ID:', nextId);

            // Then register the user
            console.log('Sending register request...');
            const registerResponse = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: nextId,
                    nickname: nickname,
                    email_or_phone: email,
                    password: password
                })
            });

            const registerData = await registerResponse.json();
            console.log('Register response:', registerData);

            if (registerResponse.ok) {
                // Success
                showMessage('registerSuccessMsg', 'Registration successful! Please sign in.', false);
                
                // Switch to sign in modal after delay
                setTimeout(() => {
                    document.getElementById('registerModal').style.display = 'none';
                    document.getElementById('signInModal').style.display = 'block';
                    registerForm.reset();
                    hideMessage('registerSuccessMsg');
                }, 2000);
            } else {
                // Error
                showMessage('registerErrorMsg', registerData.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Register error:', error);
            showMessage('registerErrorMsg', 'Connection error. Please check if server is running.');
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.textContent = 'Register';
        }
    };
}