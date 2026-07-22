"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const defaults = { currency: "INR", language: "en", dateFormat: "en-IN", autoSave: true, notifications: true };
    const financeKeys = [K.tx, K.budgets, K.goals, K.notifs, K.achievements, K.streak, K.recurring];
    const byId = (id) => document.getElementById(id);
    const profileModal = byId("profileModal");
    let passwordModal;
    let settings = { ...defaults, ...load(K.settings, {}) };

    function showMessage(message, type = "success") {
        const element = byId("settingsMessage");
        element.textContent = message;
        element.className = `settings-message ${type}`;
        clearTimeout(showMessage.timer);
        showMessage.timer = setTimeout(() => { element.textContent = ""; }, 4000);
    }
    function applyTheme() {
        const dark = localStorage.getItem("theme") === "dark";
        document.body.classList.toggle("dark", dark);
        byId("themeIcon").className = `fa-solid fa-${dark ? "sun" : "moon"}`;
        byId("darkTheme").checked = dark;
        byId("themeStatus").textContent = `${dark ? "Dark" : "Light"} mode is active`;
    }
    function updateProfile() {
        const session = load(K.session, {});
        settings.name = session.name || settings.name || "User";
        settings.email = session.email || settings.email || "user@example.com";
        settings.joinedAt ||= new Date().toISOString();
        save(K.settings, settings);
        byId("settingsProfileName").textContent = settings.name;
        byId("settingsProfileEmail").textContent = settings.email;
        byId("settingsJoinedDate").textContent = new Date(settings.joinedAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    }
    function openModal(modal) { modal.classList.remove("hidden"); }
    function closeModal(modal) { modal.classList.add("hidden"); }
    function createPasswordModal() {
        const wrapper = document.createElement("div");
        wrapper.id = "passwordModal";
        wrapper.className = "modal hidden";
        wrapper.innerHTML = `<div class="modal-content profile-modal-content"><div class="modal-header"><h2>Change Password</h2><button type="button" aria-label="Close"><i class="fa-solid fa-xmark"></i></button></div><form><label class="form-group"><span>Current Password</span><input id="currentPassword" type="password" required></label><label class="form-group"><span>New Password</span><input id="newPassword" type="password" minlength="6" required></label><label class="form-group"><span>Confirm New Password</span><input id="confirmNewPassword" type="password" minlength="6" required></label><div class="modal-actions"><button type="button" class="outline-btn">Cancel</button><button type="submit" class="primary-btn">Update Password</button></div></form></div>`;
        document.body.append(wrapper);
        const [closeButton, cancelButton] = wrapper.querySelectorAll("button[type='button']");
        [closeButton, cancelButton].forEach((button) => button.addEventListener("click", () => closeModal(wrapper)));
        wrapper.addEventListener("click", (event) => { if (event.target === wrapper) closeModal(wrapper); });
        wrapper.querySelector("form").addEventListener("submit", changePassword);
        return wrapper;
    }
    function exportData() {
        const backup = { app: "Finova", version: 1, exportedAt: new Date().toISOString(), settings: load(K.settings, {}), data: Object.fromEntries(financeKeys.map((key) => [key, load(userKey(key), load(key, []))])) };
        const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
        const link = Object.assign(document.createElement("a"), { href: url, download: `finova-backup-${new Date().toISOString().slice(0, 10)}.json` });
        link.click(); URL.revokeObjectURL(url); showMessage("Your Finova backup has been downloaded.");
    }
    function importData(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const backup = JSON.parse(reader.result);
                if (backup.app !== "Finova" || !backup.data || typeof backup.data !== "object") throw new Error("This is not a valid Finova backup.");
                if (!confirm("Importing replaces your current finance data. Continue?")) return;
                financeKeys.forEach((key) => { if (Object.hasOwn(backup.data, key)) save(userKey(key), backup.data[key]); });
                if (backup.settings && typeof backup.settings === "object") { settings = { ...defaults, ...backup.settings, name: settings.name, email: settings.email }; save(K.settings, settings); loadControls(); }
                showMessage("Backup imported successfully.");
            } catch (error) { showMessage(error.message || "Unable to import that file.", "error"); }
            finally { byId("importDataInput").value = ""; }
        };
        reader.readAsText(file);
    }
    function loadControls() {
        ["currency", "language", "dateFormat"].forEach((id) => { byId(id).value = settings[id]; });
        byId("autoSave").checked = Boolean(settings.autoSave);
        byId("notificationsEnabled").checked = Boolean(settings.notifications);
        applyTheme(); updateProfile();
    }
    function changePassword(event) {
        event.preventDefault();
        const session = load(K.session, {}), users = load("users", []), userIndex = users.findIndex((user) => user.email === session.email);
        const oldPassword = userIndex === -1 && session.email === "demo@finova.com" ? (localStorage.getItem("finova.demoPassword") || "123456") : users[userIndex]?.password;
        const next = byId("newPassword").value;
        if (byId("currentPassword").value !== oldPassword) return showMessage("Your current password is incorrect.", "error");
        if (next.length < 6) return showMessage("Your new password must be at least 6 characters.", "error");
        if (next !== byId("confirmNewPassword").value) return showMessage("Your new passwords do not match.", "error");
        if (userIndex === -1 && session.email === "demo@finova.com") localStorage.setItem("finova.demoPassword", next);
        else { users[userIndex].password = next; save("users", users); }
        closeModal(passwordModal); showMessage("Password changed successfully.");
    }

    loadControls();
    byId("themeToggle").addEventListener("click", () => { localStorage.setItem("theme", document.body.classList.contains("dark") ? "light" : "dark"); applyTheme(); });
    byId("darkTheme").addEventListener("change", (event) => { localStorage.setItem("theme", event.target.checked ? "dark" : "light"); applyTheme(); });
    byId("settingsForm").addEventListener("submit", (event) => {
        event.preventDefault();
        settings = { ...settings, currency: byId("currency").value, language: byId("language").value, dateFormat: byId("dateFormat").value, autoSave: byId("autoSave").checked, notifications: byId("notificationsEnabled").checked };
        save(K.settings, settings); localStorage.setItem("theme", byId("darkTheme").checked ? "dark" : "light"); applyTheme(); showMessage("Preferences saved successfully.");
    });
    byId("editProfileButton").addEventListener("click", () => { byId("profileNameInput").value = settings.name; byId("profileEmailInput").value = settings.email; openModal(profileModal); });
    [byId("closeProfileModal"), byId("cancelProfileModal")].forEach((button) => button.addEventListener("click", () => closeModal(profileModal)));
    byId("profileForm").addEventListener("submit", (event) => {
        event.preventDefault();
        const name = byId("profileNameInput").value.trim(), email = byId("profileEmailInput").value.trim().toLowerCase(), session = load(K.session, {}), users = load("users", []);
        if (!name || !email) return;
        if (users.some((user) => user.email === email && user.email !== session.email)) return showMessage("That email address is already in use.", "error");
        const userIndex = users.findIndex((user) => user.email === session.email);
        if (userIndex !== -1) { users[userIndex] = { ...users[userIndex], name, email }; save("users", users); }
        save(K.session, { ...session, name, email }); settings = { ...settings, name, email }; save(K.settings, settings);
        closeModal(profileModal); updateProfile(); showMessage("Profile updated successfully.");
    });
    byId("exportDataButton").addEventListener("click", exportData);
    byId("importDataButton").addEventListener("click", () => byId("importDataInput").click());
    byId("importDataInput").addEventListener("change", (event) => importData(event.target.files[0]));
    byId("resetDataButton").addEventListener("click", () => { if (confirm("Reset all financial data? Your account and profile will be kept.")) { financeKeys.forEach((key) => localStorage.removeItem(userKey(key))); showMessage("Your financial data has been reset."); } });
    passwordModal = createPasswordModal();
    byId("changePasswordButton").addEventListener("click", () => { passwordModal.querySelector("form").reset(); openModal(passwordModal); });
    byId("logoutButton").addEventListener("click", () => { if (confirm("Are you sure you want to log out?")) { localStorage.removeItem("loggedIn"); localStorage.removeItem(K.session); window.location.href = "../index.html"; } });
    profileModal.addEventListener("click", (event) => { if (event.target === profileModal) closeModal(profileModal); });
});
