const BASE_URL = "https://beanauth.onrender.com";

const REPO_ROOT = `${location.origin}/BeanAuth`;

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("sessionToken");
  const username = localStorage.getItem("username");

  console.log("Username:", localStorage.getItem("username"));
  console.log("Token:", localStorage.getItem("sessionToken"));  

  if (!token || !username) return window.location.href = `${location.origin}/BeanAuth/index.html`;
  document.getElementById("display-username").textContent = username;

  // 🔍 Load used services
  try {
    const res = await fetch(`${BASE_URL}/used-services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });

    const result = await res.json();
    const list = document.getElementById("service-list");
    list.innerHTML = "";

    if (!result.services || result.services.length === 0) {
      list.innerHTML = "<li>No services used yet.</li>";
    } else {
      result.services.forEach(service => {
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
  const token = localStorage.getItem("sessionToken");

  if (!password) {
    message.textContent = "⚠️ Please enter a new password.";
    return;
  }

  message.textContent = "⏳ Updating password...";

  try {
    const response = await fetch(`${BASE_URL}/update-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password })
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

  const token = localStorage.getItem("sessionToken");
  const message = document.getElementById("delete-message");
  message.textContent = "⏳ Deleting account...";

  fetch(`${BASE_URL}/delete-account`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        message.textContent = "✅ Account deleted.";
        localStorage.clear();
        setTimeout(() => window.location.href = `${REPO_ROOT}/index.html`, 2000);
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
  document.body.classList.add("fade-out");
  setTimeout(() => {
    localStorage.clear();
    window.location.href = `${REPO_ROOT}/index.html`;
  }, 600);
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
