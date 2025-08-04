const BASE_URL = "https://beanauth.onrender.com"; // no trailing slash

function validateInputs(username, password, message) {
  if (!username || !password) {
    message.textContent = "⚠️ Please fill in both fields.";
    return false;
  }
  return true;
}

function showDelayWarning(messageElement) {
  setTimeout(() => {
    if (messageElement.textContent.includes("⏳")) {
      messageElement.textContent += "\n🕒 Just a heads-up: the server may take up to 60 seconds to respond during low activity.";
    }
  }, 5000);
}

function resetFeedback(message, spinner) {
  message.textContent = "";
  spinner.style.display = "none";
}

async function createAccount() {
  const username = document.getElementById("signup-username").value.trim();
  const password = document.getElementById("signup-password").value.trim();
  const message = document.getElementById("signup-message");
  const spinner = document.getElementById("signup-spinner");

  resetFeedback(message, spinner);
  if (!validateInputs(username, password, message)) return;

  message.textContent = "⏳ Creating account...";
  spinner.style.display = "block";
  showDelayWarning(message);

  try {
    const response = await fetch(`${BASE_URL}/create-account`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const result = await response.json();
    spinner.style.display = "none";

    if (response.ok) {
      message.textContent = "🎉 Account created successfully! Please log in below.";
      document.getElementById("login-username").value = username;
    } else {
      switch (response.status) {
        case 400:
          message.textContent = `⚠️ ${result.error || "Invalid input"}`;
          break;
        case 409:
          message.textContent = "⚠️ Username already exists. Try something else.";
          break;
        default:
          message.textContent = `❌ Server error: ${result.error || "Unknown issue"}`;
      }
    }
  } catch (err) {
    console.error("Account creation error:", err);
    spinner.style.display = "none";
    message.textContent = "🚫 Network error. Please try again later.";
  }
}

async function login() {
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value.trim();
  const message = document.getElementById("login-message");
  const spinner = document.getElementById("login-spinner");

  resetFeedback(message, spinner);
  if (!validateInputs(username, password, message)) return;

  message.textContent = "⏳ Signing in...";
  spinner.style.display = "block";
  showDelayWarning(message);

  try {
    const response = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const result = await response.json();
    spinner.style.display = "none";

    if (response.ok) {
      message.textContent = `✅ Welcome, ${username}! Redirecting to dashboard...`;
      localStorage.setItem("username", username);
      setTimeout(() => {
        window.location.href = `${location.origin}/BeanAuth/account/account.html`;
      }, 1200);
    } else {
      switch (response.status) {
        case 403:
          message.textContent = "🔐 Incorrect password. Try again.";
          break;
        case 404:
          message.textContent = "👤 Account not found. Did you sign up yet?";
          break;
        default:
          message.textContent = `❌ Login failed: ${result.error || "Unexpected error"}`;
      }
    }
  } catch (err) {
    console.error("Login error:", err);
    spinner.style.display = "none";
    message.textContent = "🚫 Network error. Is the server awake?";
  }
}
