const BOOKS_KEY = "libraryBooks";
const TRANSACTIONS_KEY = "libraryTransactions";

let books = [];
let transactions = [];
let toastTimer;

const elements = {
  booksTableBody: document.getElementById("books-table-body"),
  loansTableBody: document.getElementById("loans-table-body"),
  booksEmpty: document.getElementById("books-empty"),
  loansEmpty: document.getElementById("loans-empty"),
  search: document.getElementById("book-search"),
  categoryFilter: document.getElementById("category-filter"),
  bookDialog: document.getElementById("book-dialog"),
  bookForm: document.getElementById("book-form"),
  issueDialog: document.getElementById("issue-dialog"),
  issueForm: document.getElementById("issue-form"),
  toastRegion: document.getElementById("toast-region"),
  backendStatus: document.getElementById("backend-status")
};

// Read LocalStorage defensively so missing or damaged data never prevents startup.
function readRecords(key, isValidRecord) {
  try {
    const storedValue = localStorage.getItem(key);
    if (storedValue === null) return [];
    const records = JSON.parse(storedValue);
    if (Array.isArray(records) && records.every(isValidRecord)) return records;
  } catch (error) {
    console.error(`Could not read ${key} from LocalStorage:`, error);
  }

  showToast(`Saved ${key === BOOKS_KEY ? "book" : "loan"} data was invalid. Starting with an empty list.`, true);
  return [];
}

function isValidBook(book) {
  return book && typeof book.id === "string" && typeof book.title === "string" &&
    typeof book.author === "string" && typeof book.category === "string" &&
    Number.isSafeInteger(book.quantity) && book.quantity > 0;
}

function isValidTransaction(transaction) {
  return transaction && typeof transaction.id === "string" &&
    typeof transaction.bookId === "string" && typeof transaction.studentName === "string" &&
    typeof transaction.studentId === "string" && typeof transaction.issueDate === "string" &&
    (transaction.returnDate === null || typeof transaction.returnDate === "string");
}

books = readRecords(BOOKS_KEY, isValidBook);
transactions = readRecords(TRANSACTIONS_KEY, isValidTransaction);

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[character]);
}

function showToast(message, isError = false) {
  const toast = document.createElement("div");
  toast.className = `toast${isError ? " error" : ""}`;
  toast.textContent = message;
  elements.toastRegion.append(toast);
  window.setTimeout(() => toast.remove(), 3600);
}

function availableCopies(book) {
  const activeLoans = transactions.filter((transaction) =>
    transaction.bookId === book.id && transaction.returnDate === null
  ).length;
  return Math.max(0, book.quantity - activeLoans);
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(`${dateString}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? escapeHtml(dateString)
    : new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date);
}

function persistRecords(nextBooks, nextTransactions) {
  const previousBooks = localStorage.getItem(BOOKS_KEY);
  const previousTransactions = localStorage.getItem(TRANSACTIONS_KEY);

  try {
    localStorage.setItem(BOOKS_KEY, JSON.stringify(nextBooks));
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(nextTransactions));
  } catch (error) {
    try {
      if (previousBooks === null) localStorage.removeItem(BOOKS_KEY);
      else localStorage.setItem(BOOKS_KEY, previousBooks);
      if (previousTransactions === null) localStorage.removeItem(TRANSACTIONS_KEY);
      else localStorage.setItem(TRANSACTIONS_KEY, previousTransactions);
    } catch (rollbackError) {
      console.error("Could not restore previous LocalStorage values:", rollbackError);
    }
    console.error("Could not save library records to LocalStorage:", error);
    showToast("Could not save changes in this browser. Check available storage and try again.", true);
    return false;
  }

  books = nextBooks;
  transactions = nextTransactions;
  render();
  return true;
}

function render() {
  renderDashboard();
  renderBooks();
  renderTransactions();
}

function renderDashboard() {
  const totalCopies = books.reduce((total, book) => total + book.quantity, 0);
  const issuedCopies = transactions.filter((transaction) => transaction.returnDate === null).length;
  const available = books.reduce((total, book) => total + availableCopies(book), 0);
  document.getElementById("total-titles").textContent = books.length;
  document.getElementById("total-copies").textContent = totalCopies;
  document.getElementById("available-copies").textContent = available;
  document.getElementById("issued-copies").textContent = issuedCopies;
}

function renderBooks() {
  const categories = [...new Set(books.map((book) => book.category))].sort((first, second) => first.localeCompare(second));
  const selectedCategory = elements.categoryFilter.value;
  elements.categoryFilter.innerHTML = `<option value="">All categories</option>${categories.map((category) =>
    `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`
  ).join("")}`;
  if (categories.includes(selectedCategory)) elements.categoryFilter.value = selectedCategory;

  const searchTerm = elements.search.value.trim().toLocaleLowerCase();
  const filteredBooks = books.filter((book) => {
    const matchesSearch = [book.id, book.title, book.author]
      .some((value) => value.toLocaleLowerCase().includes(searchTerm));
    return matchesSearch && (!elements.categoryFilter.value || book.category === elements.categoryFilter.value);
  });

  elements.booksTableBody.innerHTML = filteredBooks.map((book) => {
    const available = availableCopies(book);
    return `<tr>
      <td><span class="book-title">${escapeHtml(book.title)}</span><span class="book-author">${escapeHtml(book.author)}</span></td>
      <td><span class="book-code">${escapeHtml(book.id)}</span></td>
      <td><span class="category-pill">${escapeHtml(book.category)}</span></td>
      <td>${book.quantity}</td>
      <td><span class="availability${available === 0 ? " unavailable" : ""}">${available}</span></td>
      <td><div class="action-group">
        <button class="action-button issue-action" type="button" data-action="issue" data-book-id="${escapeHtml(book.id)}" ${available === 0 ? "disabled" : ""}>Issue</button>
        <button class="action-button" type="button" data-action="edit" data-book-id="${escapeHtml(book.id)}">Edit</button>
        <button class="action-button" type="button" data-action="delete" data-book-id="${escapeHtml(book.id)}">Delete</button>
      </div></td>
    </tr>`;
  }).join("");

  const noBooksAtAll = books.length === 0;
  const noFilteredBooks = !noBooksAtAll && filteredBooks.length === 0;
  elements.booksEmpty.hidden = !noBooksAtAll && !noFilteredBooks;
  elements.booksEmpty.querySelector("h3").textContent = noFilteredBooks ? "No matching books" : "No books found";
  elements.booksEmpty.querySelector("p").textContent = noFilteredBooks
    ? "Try a different search term or category."
    : "Your library collection is empty. Add a book to get started.";
  elements.booksEmpty.querySelector("#empty-add-button").hidden = noFilteredBooks;
  elements.booksTableBody.closest("table").hidden = filteredBooks.length === 0;
  document.getElementById("book-count").textContent = `${books.length} ${books.length === 1 ? "book" : "books"}`;
}

function renderTransactions() {
  const sortedTransactions = [...transactions].sort((first, second) => second.issueDate.localeCompare(first.issueDate));
  elements.loansTableBody.innerHTML = sortedTransactions.map((transaction) => {
    const book = books.find((record) => record.id === transaction.bookId);
    const bookTitle = book ? book.title : `Removed book (${transaction.bookId})`;
    const returned = transaction.returnDate !== null;
    return `<tr>
      <td><span class="book-title">${escapeHtml(transaction.studentName)}</span><span class="book-author">ID: ${escapeHtml(transaction.studentId)}</span></td>
      <td>${escapeHtml(bookTitle)}</td>
      <td><span class="book-code">${escapeHtml(transaction.id)}</span></td>
      <td>${formatDate(transaction.issueDate)}</td>
      <td>${formatDate(transaction.returnDate)}</td>
      <td>${returned
        ? '<span class="loan-status returned">Returned</span>'
        : `<div class="action-group"><span class="loan-status">Issued</span><button class="action-button" type="button" data-action="return" data-transaction-id="${escapeHtml(transaction.id)}">Return</button></div>`
      }</td>
    </tr>`;
  }).join("");
  elements.loansEmpty.hidden = transactions.length !== 0;
  elements.loansTableBody.closest("table").hidden = transactions.length === 0;
  document.getElementById("loan-count").textContent = `${transactions.length} ${transactions.length === 1 ? "record" : "records"}`;
}

function openBookForm(book = null) {
  elements.bookForm.reset();
  document.getElementById("book-dialog-title").textContent = book ? "Edit book" : "Add a book";
  document.getElementById("book-submit-button").textContent = book ? "Save changes" : "Save book";
  document.getElementById("book-original-id").value = book ? book.id : "";
  document.getElementById("book-id").value = book ? book.id : "";
  document.getElementById("book-id").readOnly = Boolean(book);
  document.getElementById("book-category").value = book ? book.category : "";
  document.getElementById("book-title").value = book ? book.title : "";
  document.getElementById("book-author").value = book ? book.author : "";
  document.getElementById("book-quantity").value = book ? book.quantity : "";
  const activeCount = book
    ? transactions.filter((transaction) => transaction.bookId === book.id && transaction.returnDate === null).length
    : 0;
  document.getElementById("book-quantity").min = Math.max(1, activeCount);
  document.getElementById("quantity-help").textContent = activeCount > 0
    ? `At least ${activeCount} copies are required while loans are active.`
    : "Enter a positive whole number.";
  elements.bookDialog.showModal();
}

function createIssueId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
  return `issue-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function setBackendStatus(state, label) {
  elements.backendStatus.dataset.state = state;
  elements.backendStatus.lastChild.textContent = label;
}

async function checkBackendHealth() {
  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    if (!response.ok) throw new Error(`Health endpoint returned ${response.status}`);
    const health = await response.json();
    if (health.status !== "ok") throw new Error("Health endpoint returned an unexpected status");
    setBackendStatus("connected", "Backend connected");
  } catch (error) {
    setBackendStatus("disconnected", "Backend unavailable");
    console.error("Backend health check failed:", error);
  }
}

document.getElementById("add-book-button").addEventListener("click", () => openBookForm());
document.getElementById("empty-add-button").addEventListener("click", () => openBookForm());
elements.search.addEventListener("input", renderBooks);
elements.categoryFilter.addEventListener("change", renderBooks);

document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});

elements.bookForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const originalId = document.getElementById("book-original-id").value;
  const id = document.getElementById("book-id").value.trim();
  const title = document.getElementById("book-title").value.trim();
  const author = document.getElementById("book-author").value.trim();
  const category = document.getElementById("book-category").value.trim();
  const quantityInput = document.getElementById("book-quantity").value.trim();
  const quantity = Number(quantityInput);

  if (!id || !title || !author || !category || !quantityInput) {
    showToast("Please complete every book field.", true);
    return;
  }
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    showToast("Quantity must be a positive whole number.", true);
    return;
  }
  if (!originalId && books.some((book) => book.id.toLocaleLowerCase() === id.toLocaleLowerCase())) {
    showToast("A book with that ID already exists.", true);
    return;
  }

  const existingBook = books.find((book) => book.id === originalId);
  const activeCount = existingBook
    ? transactions.filter((transaction) => transaction.bookId === originalId && transaction.returnDate === null).length
    : 0;
  if (quantity < activeCount) {
    showToast(`Quantity cannot be less than the ${activeCount} active loan${activeCount === 1 ? "" : "s"}.`, true);
    return;
  }

  const book = { id: originalId || id, title, author, category, quantity };
  const nextBooks = existingBook
    ? books.map((record) => record.id === originalId ? book : record)
    : [...books, book];
  if (persistRecords(nextBooks, transactions)) {
    elements.bookDialog.close();
    showToast(existingBook ? "Book details updated." : "Book added to your collection.");
  }
});

elements.booksTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const book = books.find((record) => record.id === button.dataset.bookId);
  if (!book) return;

  if (button.dataset.action === "edit") {
    openBookForm(book);
  } else if (button.dataset.action === "delete") {
    const activeLoans = transactions.some((transaction) =>
      transaction.bookId === book.id && transaction.returnDate === null
    );
    if (activeLoans) {
      showToast("Return all active loans before deleting this book.", true);
      return;
    }
    if (!window.confirm(`Delete "${book.title}" from the collection?`)) return;
    if (persistRecords(books.filter((record) => record.id !== book.id), transactions)) {
      showToast("Book deleted.");
    }
  } else if (button.dataset.action === "issue") {
    if (availableCopies(book) < 1) {
      showToast("No available copies to issue.", true);
      return;
    }
    document.getElementById("issue-book-id").value = book.id;
    document.getElementById("issue-book-name").textContent = `${book.title} by ${book.author}`;
    document.getElementById("issue-date").value = new Date().toISOString().slice(0, 10);
    elements.issueForm.reset();
    document.getElementById("issue-book-id").value = book.id;
    document.getElementById("issue-date").value = new Date().toISOString().slice(0, 10);
    elements.issueDialog.showModal();
  }
});

elements.issueForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const bookId = document.getElementById("issue-book-id").value;
  const book = books.find((record) => record.id === bookId);
  const studentName = document.getElementById("student-name").value.trim();
  const studentId = document.getElementById("student-id").value.trim();
  const issueDate = document.getElementById("issue-date").value;
  if (!book || !studentName || !studentId || !issueDate) {
    showToast("Please complete all issue details.", true);
    return;
  }
  if (availableCopies(book) < 1) {
    showToast("No available copies to issue.", true);
    elements.issueDialog.close();
    return;
  }

  const transaction = {
    id: createIssueId(),
    bookId: book.id,
    studentName,
    studentId,
    issueDate,
    returnDate: null
  };
  if (persistRecords(books, [...transactions, transaction])) {
    elements.issueDialog.close();
    showToast("Book issued successfully.");
  }
});

elements.loansTableBody.addEventListener("click", (event) => {
  const button = event.target.closest('button[data-action="return"]');
  if (!button) return;
  const transaction = transactions.find((record) => record.id === button.dataset.transactionId);
  if (!transaction || transaction.returnDate !== null) {
    showToast("This loan has already been returned.", true);
    return;
  }
  if (!window.confirm(`Record the return of this book from ${transaction.studentName}?`)) return;

  const updatedTransaction = { ...transaction, returnDate: new Date().toISOString().slice(0, 10) };
  const nextTransactions = transactions.map((record) =>
    record.id === transaction.id ? updatedTransaction : record
  );
  if (persistRecords(books, nextTransactions)) showToast("Book returned successfully.");
});

render();
checkBackendHealth();
window.setInterval(checkBackendHealth, 15000);
