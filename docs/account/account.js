const BASE_URL = "https://beanauth.onrender.com";

document.addEventListener("DOMContentLoaded", async () => {
  const username = localStorage.getItem("username");
  if (!username) return window.location.href = "index.html";

  document.getElementById("display-username").textContent = username;

  // 🔍 Load used services
  try {
    const res = await fetch(`${BASE_URL}/used-services?username=${username}`);
    const { services } = await res.json();
    const list = document.getElementById("service-list");
    list.innerHTML = "";

    if (!services || services.length === 0) {
      list.innerHTML = "<li>No services used yet.</li>";
    } else {
      services.forEach(service => {
        const li = document.createElement("li");
        li.textContent = service;
        list.appendChild(li);
      });
    }
  } catch (err) {
    console.error("Service list error:", err);
    document.getElementById("service-list").innerHTML = "<li>⚠️ Failed to load services</li>";
  }
});

// 🔄 Password update flow
async function updatePassword() {
  const password = document.getElementById("new-password").value.trim();
  const message = document.getElementById("update-message");

  if (!password) {
    message.textContent = "⚠️ Please enter a new password.";
    return;
  }

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

// 🗑️ Account deletion flow
function confirmDeletion() {
  const confirmed = confirm("Are you sure? This will delete your account permanently.");
  if (!confirmed) return;

  const message = document.getElementById("delete-message");
  message.textContent = "⏳ Deleting account...";

  fetch(`${BASE_URL}/delete-account`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: localStorage.getItem("username") })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        message.textContent = "✅ Account deleted.";
        localStorage.removeItem("username");
        setTimeout(() => window.location.href = "index.html", 2000);
      } else {
        message.textContent = `❌ ${data.error || "Deletion failed."}`;
      }
    })
    .catch(err => {
      console.error("Deletion error:", err);
      message.textContent = "🚫 Network error. Try again shortly.";
    });
}

// 🚪 Logout
function logout() {
  localStorage.removeItem("username");
  window.location.href = "index.html";
}

// 🔴 Danger detection glow
document.addEventListener("mousemove", e => {
  const deleteBtn = document.querySelector("#account-delete button");
  if (!deleteBtn) return;

  const rect = deleteBtn.getBoundingClientRect();
  const dist = Math.hypot(
    e.clientX - (rect.left + rect.width / 2),
    e.clientY - (rect.top + rect.height / 2)
  );

  if (dist < 150) {
    document.body.classList.add("alert-danger");
  } else {
    document.body.classList.remove("alert-danger");
  }
});
