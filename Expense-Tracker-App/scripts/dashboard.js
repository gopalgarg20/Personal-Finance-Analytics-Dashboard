"use strict";

/* ==========================================================
   FINOVA - Dashboard Page Helpers
========================================================== */

// Kept in a separate file so future dashboard-only behaviour stays modular.
// app.js dispatches this event whenever a transaction is added or deleted.
function notifyDashboardDataChanged() {
    document.dispatchEvent(
        new CustomEvent("finova:transactions-updated")
    );
}

function refreshDashboardData() {
    if (typeof renderDashboard === "function") {
        renderDashboard();
        filterDashboardTransactions();
    }
}

function filterDashboardTransactions() {
    const searchInput = document.getElementById("dashboardSearch");
    const tableRows = document.querySelectorAll(
        "#recentTransactionsBody tr"
    );
    const searchTerm = searchInput?.value.trim().toLowerCase() || "";

    tableRows.forEach((row) => {
        const rowText = row.textContent.toLowerCase();
        row.hidden = !rowText.includes(searchTerm);
    });
}

document.addEventListener(
    "finova:transactions-updated",
    refreshDashboardData
);

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("dashboardSearch");

    if (searchInput) {
        searchInput.addEventListener("input", filterDashboardTransactions);

        searchInput.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") return;

            const searchTerm = searchInput.value.trim();

            if (searchTerm) {
                window.location.href =
                    `transactions.html?search=${encodeURIComponent(searchTerm)}`;
            }
        });
    }
});
