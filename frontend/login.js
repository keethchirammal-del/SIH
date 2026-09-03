const form = document.getElementById("loginForm");
const email = document.getElementById("email");
const password = document.getElementById("password");
const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");
const mobile = document.getElementById("mobile");
const mobileError = document.getElementById("mobileError");
const formMessage = document.getElementById("formMessage");
const togglePassword = document.getElementById("togglePassword");
const methodTabs = [...document.querySelectorAll(".method-tab")];
let loginMethod = "email";

methodTabs.forEach((tab) => tab.addEventListener("click", () => {
  loginMethod = tab.dataset.method;
  methodTabs.forEach((item) => item.classList.toggle("active", item === tab));
  document.getElementById("emailLogin").hidden = loginMethod !== "email";
  document.getElementById("mobileLogin").hidden = loginMethod !== "mobile";
  emailError.textContent = "";
  mobileError.textContent = "";
}));

togglePassword.addEventListener("click", () => {
  const showing = password.type === "text";
  password.type = showing ? "password" : "text";
  togglePassword.textContent = showing ? "Show" : "Hide";
  togglePassword.setAttribute("aria-label", showing ? "Show password" : "Hide password");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  emailError.textContent = "";
  mobileError.textContent = "";
  passwordError.textContent = "";
  formMessage.textContent = "";

  let valid = true;
  if (loginMethod === "email" && (!email.value.trim() || !email.validity.valid)) {
    emailError.textContent = "Enter a valid work email address.";
    valid = false;
  }
  if (loginMethod === "mobile" && !/^[6-9]\d{9}$/.test(mobile.value.replace(/\D/g, ""))) {
    mobileError.textContent = "Enter a valid 10-digit mobile number.";
    valid = false;
  }
  if (password.value.length < 6) {
    passwordError.textContent = "Password must contain at least 6 characters.";
    valid = false;
  }
  if (!valid) return;

  sessionStorage.setItem("railsenseSignedIn", "true");
  window.location.href = "index.html";
});

document.getElementById("forgotPassword").addEventListener("click", (event) => {
  event.preventDefault();
  formMessage.textContent = "Password reset instructions will be sent by your administrator.";
});
