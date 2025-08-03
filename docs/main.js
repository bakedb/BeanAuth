const BASE_URL = "https://beanauth.onrender.com/";

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
          message.textContent = `❌ Error creating account: ${result.error || "Unknown error"}`;
      }
    }
  } catch (err) {
    message.textContent = "🚫 Network error while creating account.";
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
      message.textContent = `✅ Login successful. Welcome, ${username}!`;
    } else {
      switch (response.status) {
        case 403:
          message.textContent = "🔐 Incorrect password. Please try again.";
          break;
        case 404:
          message.textContent = "👤 Account not found. Did you sign up first?";
          break;
        default:
          message.textContent = `❌ Login failed: ${result.error || "Unexpected error"}`;
      }
    }
  } catch (err) {
    message.textContent = "🚫 Network error while attempting login.";
  }
}
