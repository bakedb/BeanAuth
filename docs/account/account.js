const BASE_URL = "https://beanauth.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  const username = localStorage.getItem("username"); // or grab from cookie/session
  if (!username) window.location.href = "index.html";

  document.getElementById("display-username").textContent = username;
});

async function updatePassword() {
  const password = document.getElementById("new-password").value.trim();
  const message = document.getElementById("update-message");

  message.textContent = "⏳ Updating password...";

  try {
    const response = await fetch(`${BASE_URL}/update-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: localStorage.getItem("username"),
        password
      })
    });

    const result = await response.json();

    if (response.ok) {
      message.textContent = "✅ Password updated!";
    } else {
      message.textContent = `❌ ${result.error || "Update failed"}`;
    }
  } catch (err) {
    console.error("Password update error:", err);
    message.textContent = "🚫 Network issue. Try again shortly.";
  }
}

function logout() {
  localStorage.removeItem("username");
  window.location.href = "index.html";
}
