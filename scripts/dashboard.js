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
    const deleteAllButton = document.getElementById("deleteAllTransactions");

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

    if (deleteAllButton) {
        deleteAllButton.addEventListener("click", () => {
            const count = getTransactions().length;

            if (count === 0) {
                alert("There are no transactions to delete.");
                return;
            }

            const confirmed = confirm(
                `Delete all ${count} transaction${count === 1 ? "" : "s"}? This action cannot be undone.`
            );

            if (!confirmed) return;

            saveUserTransactions([]);
            notifyDashboardDataChanged();
        });
    }
});
