const API_URL = 'http://localhost:5500';
    
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const modal = document.getElementById('authModal');
const closeModal = document.getElementById('closeModal');
const modalTitle = document.getElementById('modalTitle');
const submitBtn = document.getElementById('submitBtn');
const nicknameField = document.getElementById('nicknameField');
const errorMsg = document.getElementById('errorMsg');
const successMsg = document.getElementById('successMsg');
const authForm = document.getElementById('authForm');

let isRegisterMode = false;

function showError(message) {
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
    successMsg.style.display = 'none';
}

function showSuccess(message) {
    successMsg.textContent = message;
    successMsg.style.display = 'block';
    errorMsg.style.display = 'none';
}

function hideMessages() {
    errorMsg.style.display = 'none';
    successMsg.style.display = 'none';
}