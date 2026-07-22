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
    function loadScript(source) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${source}"]`);
            if (existing) return existing.dataset.loaded === "true" ? resolve() : existing.addEventListener("load", resolve, { once: true });
            const script = document.createElement("script");
            script.src = source; script.onload = () => { script.dataset.loaded = "true"; resolve(); }; script.onerror = reject;
            document.head.append(script);
        });
    }
    async function exportData() {
        try {
            if (!window.jspdf?.jsPDF) await loadScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js");
            if (!window.jspdf?.jsPDF?.API?.autoTable) await loadScript("https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js");
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ unit: "pt", format: "a4" });
            const margin = 42, pageWidth = doc.internal.pageSize.getWidth();
            const transactions = getTransactions().slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
            const budgets = getUserFinanceData(K.budgets, []);
            const goals = getUserFinanceData(K.goals, []);
            const recurring = load(userKey(K.recurring), load(K.recurring, []));
            const categoryName = (id) => CATEGORIES.find((category) => category.id === id)?.name || id || "Uncategorised";
            const income = transactions.filter((item) => item.type === "income").reduce((total, item) => total + num(item.amount), 0);
            const expense = transactions.filter((item) => item.type === "expense").reduce((total, item) => total + num(item.amount), 0);
            const categories = transactions.filter((item) => item.type === "expense").reduce((all, item) => { all[item.category] = (all[item.category] || 0) + num(item.amount); return all; }, {});
            const heading = (title) => { let y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 28 : 166; if (y > doc.internal.pageSize.getHeight() - 54) { doc.addPage(); y = 48; } doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(15, 23, 42); doc.text(title, margin, y); return y; };
            doc.setFillColor(37, 99, 235); doc.rect(0, 0, pageWidth, 92, "F");
            doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(24); doc.text("Finova Financial Report", margin, 45);
            doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text(`Prepared ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, margin, 65);
            doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text(settings.name || "Finova user", margin, 122);
            doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(71, 85, 105); doc.text(`${transactions.length} transactions included`, margin, 140);
            doc.autoTable({ startY: 158, head: [["Total income", "Total expenses", "Net balance", "Transactions"]], body: [[fmt(income), fmt(expense), fmt(income - expense), String(transactions.length)]], theme: "grid", margin: { left: margin, right: margin }, styles: { fontSize: 9, halign: "center" }, headStyles: { fillColor: [37, 99, 235] } });
            doc.autoTable({ startY: heading("Expense by category") + 10, head: [["Category", "Amount"]], body: Object.entries(categories).sort((a, b) => b[1] - a[1]).map(([id, amount]) => [categoryName(id), fmt(amount)]), theme: "striped", margin: { left: margin, right: margin }, styles: { fontSize: 9 }, headStyles: { fillColor: [15, 23, 42] } });
            doc.autoTable({ startY: heading("Transactions") + 10, head: [["Date", "Title", "Category", "Type", "Amount", "Method", "Status"]], body: transactions.map((item) => [fmtDate(item.date), item.title || "Untitled", categoryName(item.category), item.type || "Expense", fmt(item.amount), item.method || "Manual", item.status || "Completed"]), theme: "striped", margin: { left: margin, right: margin }, styles: { fontSize: 7.5, cellPadding: 4 }, headStyles: { fillColor: [37, 99, 235] } });
            doc.autoTable({ startY: heading("Budgets and goals") + 10, head: [["Budget category", "Limit", "Goal", "Saved / Target"]], body: Array.from({ length: Math.max(budgets.length, goals.length) }, (_, index) => { const budget = budgets[index], goal = goals[index]; return [budget ? categoryName(budget.category) : "-", budget ? fmt(budget.limit) : "-", goal?.title || "-", goal ? `${fmt(goal.saved)} / ${fmt(goal.target)}` : "-"]; }), theme: "striped", margin: { left: margin, right: margin }, styles: { fontSize: 8 }, headStyles: { fillColor: [15, 23, 42] } });
            if (recurring.length) { doc.autoTable({ startY: heading("Recurring payments") + 10, head: [["Name", "Amount", "Next date"]], body: recurring.map((item) => [item.title || "Payment", fmt(item.amount), item.nextDate ? fmtDate(item.nextDate) : "Not set"]), theme: "striped", margin: { left: margin, right: margin }, styles: { fontSize: 8 }, headStyles: { fillColor: [37, 99, 235] } }); }
            const pages = doc.internal.getNumberOfPages();
            for (let page = 1; page <= pages; page++) { doc.setPage(page); doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text(`Finova - Financial report - Page ${page} of ${pages}`, margin, doc.internal.pageSize.getHeight() - 22); }
            doc.save(`finova-financial-report-${new Date().toISOString().slice(0, 10)}.pdf`);
            showMessage("Your financial report PDF has been downloaded.");
        } catch (error) { console.error(error); showMessage("Unable to create the PDF. Please check your internet connection and try again.", "error"); }
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
    byId("exportDataButton").querySelector("span").innerHTML = '<i class="fa-solid fa-file-pdf"></i>Export PDF Report';
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
