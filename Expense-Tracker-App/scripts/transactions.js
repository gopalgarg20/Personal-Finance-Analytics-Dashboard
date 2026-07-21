"use strict";

/* ==========================================================
   FINOVA - Transactions Page
========================================================== */

function getTransactionSearchFromUrl() {
    const urlParameters = new URLSearchParams(window.location.search);

    return urlParameters.get("search") || "";
}

function getFilteredTransactions() {
    const searchTerm = document
        .getElementById("transactionSearch")
        .value
        .trim()
        .toLowerCase();

    const selectedType = document.getElementById(
        "transactionTypeFilter"
    ).value;

    return getTransactions()
        .slice()
        .sort((first, second) => second.date.localeCompare(first.date))
        .filter((transaction) => {
            const searchableText = [
                transaction.title,
                transaction.category,
                transaction.type,
                transaction.date,
                transaction.amount
            ].join(" ").toLowerCase();

            const matchesSearch = searchableText.includes(searchTerm);
            const matchesType =
                selectedType === "all" ||
                transaction.type === selectedType;

            return matchesSearch && matchesType;
        });
}

function renderTransactions() {
    const tableBody = document.getElementById("transactionsBody");
    const emptyState = document.getElementById("emptyTransactions");
    const countLabel = document.getElementById("transactionCount");
    const transactions = getFilteredTransactions();

    tableBody.innerHTML = "";
    countLabel.textContent = `${transactions.length} transaction${
        transactions.length === 1 ? "" : "s"
    }`;

    transactions.forEach((transaction) => {
        const row = document.createElement("tr");
        const category = catById(transaction.category);
        const amountPrefix = transaction.type === "income" ? "+" : "-";

        row.innerHTML = `
            <td>${fmtDate(transaction.date)}</td>
            <td><strong>${transaction.title}</strong></td>
            <td><span class="transaction-category"><i class="fa-solid fa-${category.icon}"></i>${category.name}</span></td>
            <td class="${transaction.type === "income" ? "income" : "expense"}">${amountPrefix}${fmt(transaction.amount)}</td>
            <td><span class="transaction-type ${transaction.type}">${transaction.type}</span></td>
        `;

        tableBody.appendChild(row);
    });

    emptyState.classList.toggle("hidden", transactions.length > 0);
}

function initTransactionsChrome() {
    const session = load(K.session, null);
    const profileName = document.getElementById("profileName");
    const themeButton = document.getElementById("themeToggle");
    const themeIcon = document.getElementById("themeIcon");

    profileName.textContent = session?.name || "User";

    function applyTheme(theme) {
        document.body.classList.toggle("dark", theme === "dark");
        themeIcon.className = `fa-solid fa-${
            theme === "dark" ? "sun" : "moon"
        }`;
        localStorage.setItem("theme", theme);
    }

    applyTheme(localStorage.getItem("theme") || "light");

    themeButton.addEventListener("click", () => {
        const nextTheme = document.body.classList.contains("dark")
            ? "light"
            : "dark";

        applyTheme(nextTheme);
    });

    const profileButton = document.getElementById("profileBtn");
    const profileMenu = document.getElementById("profileMenu");

    profileButton.addEventListener("click", (event) => {
        event.stopPropagation();
        profileMenu.classList.toggle("hidden");
    });

    document.addEventListener("click", () => {
        profileMenu.classList.add("hidden");
    });

    document.getElementById("logoutOption").addEventListener("click", () => {
        localStorage.removeItem(K.session);
        window.location.href = "../index.html";
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initTransactionsChrome();

    const searchInput = document.getElementById("transactionSearch");
    searchInput.value = getTransactionSearchFromUrl();

    searchInput.addEventListener("input", renderTransactions);
    document.getElementById("transactionTypeFilter")
        .addEventListener("change", renderTransactions);

    renderTransactions();
});
