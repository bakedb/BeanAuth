const BASE_URL = "https://beanauth.onrender.com"; // no trailing slash

async function createAccount() {
  const username = document.getElementById("signup-username").value.trim();
  const password = document.getElementById("signup-password").value.trim();
  const message = document.getElementById("signup-message");

  message.textContent = "⏳ Creating account...";

  try {
    const response = await fetch(`${BASE_URL}/create-account`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const result = await response.json();

    if (response.ok) {
      message.textContent = "🎉 Account created successfully!";
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
    message.textContent = "🚫 Network error. Please try again later.";
  }
}

async function login() {
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value.trim();
  const message = document.getElementById("login-message");

  message.textContent = "⏳ Signing in...";

  try {
    const response = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const result = await response.json();

    if (response.ok) {
      message.textContent = `✅ Welcome, ${username}! Login successful.`;
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
    message.textContent = "🚫 Network error. Is the server awake?";
  }
}
