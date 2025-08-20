const pantryId = "e77cb6d8-dc29-4095-a2ad-3a5cb996daea";
const baseUrl = `https://getpantry.cloud/apiv1/pantry/${pantryId}/basket/appdata`;

let data = { members: [], payments: [], expenses: [] };
let editType = null,
  editId = null;

// ----------------- UI HELPERS -----------------
function showLoading(show) {
  document.getElementById("loadingOverlay").classList.toggle("hidden", !show);
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `px-4 py-2 rounded-lg shadow text-white animate-slide-in-right 
    ${type === "error" ? "bg-red-600" : "bg-green-600"}`;
  toast.innerHTML = `<i class="fa-solid ${
    type === "error" ? "fa-circle-xmark" : "fa-circle-check"
  } mr-2"></i>${message}`;
  document.getElementById("toastContainer").appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ----------------- NAVIGATION -----------------
function showTab(tab) {
  // Hide all sections and show the selected one
  document
    .querySelectorAll("section")
    .forEach((s) => s.classList.add("hidden"));
  document.getElementById(tab).classList.remove("hidden");
  if (tab === "dashboard") updateDashboard();

  // Update active tab styling for both desktop and mobile buttons
  document.querySelectorAll("nav button").forEach((btn) => {
    btn.classList.remove("active-tab");
    if (
      btn.getAttribute("onclick") === `showTab('${tab}')` ||
      btn.getAttribute("onclick") === `selectMobileItem('${tab}')`
    ) {
      btn.classList.add("active-tab");
    }
  });

  // Store active tab in localStorage
  localStorage.setItem("activeTab", tab);
}

// Update selectMobileItem to also set active tab
function selectMobileItem(tab) {
  showTab(tab);
  mobileMenu.classList.add("hidden");
}

// Load active tab on page refresh
document.addEventListener("DOMContentLoaded", () => {
  const activeTab = localStorage.getItem("activeTab") || "dashboard";
  showTab(activeTab);
});

// ----------------- FETCH -----------------
async function fetchData() {
  showLoading(true);
  try {
    const res = await fetch(baseUrl);
    if (res.ok) {
      data = await res.json();
    }
  } catch (err) {
    showToast("Failed to fetch data", "error");
  } finally {
    showLoading(false);
    renderAll();
  }
}
fetchData();

async function saveData() {
  showLoading(true);
  try {
    await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    showToast("Saved successfully");
  } catch {
    showToast("Error saving data", "error");
  } finally {
    showLoading(false);
    renderAll();
  }
}

// ----------------- RENDER -----------------
function renderAll() {
  renderMembers();
  renderPayments();
  renderExpenses();
  updateDashboard();
}

function updateDashboard() {
  document.getElementById("totalMembers").innerText = data.members.length;
  const totalPayments = data.payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalExpenses = data.expenses.reduce((s, e) => s + Number(e.amount), 0);

  document.getElementById("totalPayments").innerText =
    formatAmount(totalPayments);
  document.getElementById("totalExpenses").innerText =
    formatAmount(totalExpenses);
  document.getElementById("totalBalance").innerText = formatAmount(
    totalPayments - totalExpenses
  );
}

// ----------------- MEMBERS -----------------
function renderMembers() {
  const tbody = document.getElementById("membersTable");
  tbody.innerHTML = "";
  data.members.forEach((m, i) => {
    tbody.innerHTML += `
      <tr class="hover:bg-gray-50 transition">
        <td class="py-3">${i + 1}</td>
        <td>${m.name}</td>
        <td>
          <button onclick="editMember(${i})" class="text-blue-600 hover:text-blue-800"><i class="fa fa-edit"></i></button>
          <button onclick="deleteMember(${i})" class="text-red-600 hover:text-red-800 ml-2"><i class="fa fa-trash"></i></button>
        </td>
      </tr>`;
  });
}

function openMemberModal() {
  editType = "member";
  editId = null;
  document.getElementById("modalContainer").innerHTML = modalHTML(
    "Add Member",
    `
    <input id="memberName" class="border rounded-lg p-2 w-full mb-4" placeholder="Member Name">
  `,
    "saveMember()"
  );
}

function saveMember() {
  const name = document.getElementById("memberName").value.trim();
  if (!name) return showToast("Name required", "error");
  if (editId !== null) data.members[editId].name = name;
  else data.members.push({ name });
  saveData();
  closeModal();
}

function editMember(i) {
  editId = i;
  editType = "member";
  document.getElementById("modalContainer").innerHTML = modalHTML(
    "Edit Member",
    `
    <input id="memberName" value="${data.members[i].name}" class="border rounded-lg p-2 w-full mb-4">
  `,
    "saveMember()"
  );
}

function deleteMember(i) {
  if (confirm("Are you sure you want to delete this member?")) {
    data.members.splice(i, 1);
    saveData();
    showToast("Member deleted");
  }
}

// ----------------- PAYMENTS -----------------
function renderPayments() {
  const tbody = document.getElementById("paymentsTable");
  tbody.innerHTML = "";
  data.payments.forEach((p, i) => {
    const member = data.members[p.member_id]?.name || "Unknown";
    const createdAt = p.created_at ? new Date(p.created_at).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    }) : "N/A";
    tbody.innerHTML += `
      <tr class="hover:bg-gray-50 transition">
        <td class="py-3">${i + 1}</td>
        <td>${member}</td>
        <td>${p.amount}</td>
        <td>${createdAt}</td>
        <td>
          <button onclick="editPayment(${i})" class="text-blue-600 hover:text-blue-800"><i class="fa fa-edit"></i></button>
          <button onclick="deletePayment(${i})" class="text-red-600 hover:text-red-800 ml-2"><i class="fa fa-trash"></i></button>
        </td>
      </tr>`;
  });
}

function openPaymentModal() {
  editType = "payment";
  editId = null;
  let options = data.members
    .map((m, i) => `<option value="${i}">${m.name}</option>`)
    .join("");
  document.getElementById("modalContainer").innerHTML = modalHTML(
    "Add Payment",
    `
    <select id="paymentMember" class="border rounded-lg p-2 w-full mb-4">${options}</select>
    <input id="paymentAmount" type="number" class="border rounded-lg p-2 w-full mb-4" placeholder="Amount">
  `,
    "savePayment()"
  );
}

function savePayment() {
  const member_id = document.getElementById("paymentMember").value;
  const amount = +document.getElementById("paymentAmount").value;
  if (!amount) return showToast("Amount required", "error");
  const paymentData = { member_id, amount, created_at: new Date().toISOString() };
  if (editId !== null) {
    data.payments[editId] = paymentData;
  } else {
    data.payments.push(paymentData);
  }
  saveData();
  closeModal();
}

function editPayment(i) {
  editId = i;
  editType = "payment";
  let options = data.members
    .map(
      (m, idx) =>
        `<option value="${idx}" ${
          idx == data.payments[i].member_id ? "selected" : ""
        }>${m.name}</option>`
    )
    .join("");
  document.getElementById("modalContainer").innerHTML = modalHTML(
    "Edit Payment",
    `
    <select id="paymentMember" class="border rounded-lg p-2 w-full mb-4">${options}</select>
    <input id="paymentAmount" type="number" value="${data.payments[i].amount}" class="border rounded-lg p-2 w-full mb-4">
  `,
    "savePayment()"
  );
}

function deletePayment(i) {
  if (confirm("Are you sure you want to delete this payment?")) {
    data.payments.splice(i, 1);
    saveData();
    showToast("Payment deleted");
  }
}

// ----------------- EXPENSES -----------------
function renderExpenses() {
  const tbody = document.getElementById("expensesTable");
  tbody.innerHTML = "";
  data.expenses.forEach((e, i) => {
    const createdAt = e.created_at ? new Date(e.created_at).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    }) : "N/A";
    tbody.innerHTML += `
      <tr class="hover:bg-gray-50 transition">
        <td class="py-3">${i + 1}</td>
        <td>${e.summary}</td>
        <td>${e.amount}</td>
        <td>${createdAt}</td>
        <td>
          <button onclick="editExpense(${i})" class="text-blue-600 hover:text-blue-800"><i class="fa fa-edit"></i></button>
          <button onclick="deleteExpense(${i})" class="text-red-600 hover:text-red-800 ml-2"><i class="fa fa-trash"></i></button>
        </td>
      </tr>`;
  });
}

function openExpenseModal() {
  editType = "expense";
  editId = null;
  document.getElementById("modalContainer").innerHTML = modalHTML(
    "Add Expense",
    `
    <input id="expenseSummary" class="border rounded-lg p-2 w-full mb-4" placeholder="Summary">
    <input id="expenseAmount" type="number" class="border rounded-lg p-2 w-full mb-4" placeholder="Amount">
  `,
    "saveExpense()"
  );
}

function saveExpense() {
  const summary = document.getElementById("expenseSummary").value.trim();
  const amount = +document.getElementById("expenseAmount").value;
  if (!summary || !amount) return showToast("All fields required", "error");
  const expenseData = { summary, amount, created_at: new Date().toISOString() };
  if (editId !== null) {
    data.expenses[editId] = expenseData;
  } else {
    data.expenses.push(expenseData);
  }
  saveData();
  closeModal();
}

function editExpense(i) {
  editId = i;
  editType = "expense";
  document.getElementById("modalContainer").innerHTML = modalHTML(
    "Edit Expense",
    `
    <input id="expenseSummary" value="${data.expenses[i].summary}" class="border rounded-lg p-2 w-full mb-4">
    <input id="expenseAmount" type="number" value="${data.expenses[i].amount}" class="border rounded-lg p-2 w-full mb-4">
  `,
    "saveExpense()"
  );
}

function deleteExpense(i) {
  if (confirm("Are you sure you want to delete this expense?")) {
    data.expenses.splice(i, 1);
    saveData();
    showToast("Expense deleted");
  }
}

// ----------------- MODALS -----------------
function modalHTML(title, body, saveAction) {
  return `
  <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
    <div class="bg-white p-6 rounded-xl shadow-xl w-96 animate-fade-in">
      <h2 class="text-lg font-bold mb-4">${title}</h2>
      ${body}
      <div class="text-right space-x-2">
        <button onclick="closeModal()" class="px-4 py-2 rounded-lg border">Cancel</button>
        <button onclick="${saveAction}" class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Save</button>
      </div>
    </div>
  </div>`;
}

function closeModal() {
  document.getElementById("modalContainer").innerHTML = "";
}

const menuToggle = document.getElementById("menu-toggle");
const mobileMenu = document.getElementById("mobile-menu");

// toggle mobile menu
menuToggle.addEventListener("click", () => {
  mobileMenu.classList.toggle("hidden");
});

// hide mobile menu after selecting item
function selectMobileItem(tab) {
  showTab(tab);
  mobileMenu.classList.add("hidden");
}

function formatAmount(amount) {
  return Number(amount).toLocaleString("en-US"); // e.g., 30000 -> "30,000"
}
