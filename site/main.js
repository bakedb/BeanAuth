const BASE_URL = "https://beanauth.onrender.com/";

async function createAccount() {
  const username = document.getElementById("signup-username").value;
  const password = document.getElementById("signup-password").value;
  const message = document.getElementById("signup-message");

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
      message.textContent = `⚠️ ${result.error}`;
    }
  } catch (err) {
    message.textContent = "🚫 Something went wrong.";
  }
}

async function login() {
  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;
  const message = document.getElementById("login-message");

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
      message.textContent = `⚠️ ${result.error}`;
    }
  } catch (err) {
    message.textContent = "🚫 Something went wrong.";
  }
}
