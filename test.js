const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const root = __dirname;
const book = {
  id: "B-001",
  title: "The Hobbit",
  author: "J.R.R. Tolkien",
  category: "Fantasy",
  quantity: 2
};

function createElement(id = "") {
  const listeners = {};
  const element = {
    id,
    value: "",
    textContent: "",
    innerHTML: "",
    hidden: false,
    readOnly: false,
    min: "",
    dataset: {},
    children: [],
    addEventListener(eventName, callback) {
      listeners[eventName] = callback;
    },
    trigger(eventName, event = {}) {
      if (listeners[eventName]) listeners[eventName]({ preventDefault() {}, ...event });
    },
    reset() {},
    showModal() {},
    close() {},
    append(child) {
      this.children.push(child);
    },
    remove() {},
    closest() {
      return createElement(`${id}-table`);
    },
    querySelector(selector) {
      if (!this.queriedElements) this.queriedElements = {};
      if (!this.queriedElements[selector]) {
        this.queriedElements[selector] = createElement(`${id}-${selector}`);
      }
      return this.queriedElements[selector];
    }
  };
  return element;
}

function createApp(initialRecords = {}) {
  const elements = new Map();
  const storage = new Map(Object.entries(initialRecords));
  const getElement = (id) => {
    if (!elements.has(id)) elements.set(id, createElement(id));
    return elements.get(id);
  };
  const document = {
    getElementById: getElement,
    querySelectorAll: () => [],
    createElement: () => createElement("toast")
  };
  const localStorage = {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
    removeItem(key) {
      storage.delete(key);
    }
  };
  const context = vm.createContext({
    console,
    document,
    localStorage,
    Date,
    Intl,
    Math,
    Number,
    String,
    JSON,
    Set,
    fetch: () => new Promise(() => {}),
    window: {
      crypto: { randomUUID: () => "issue-001" },
      confirm: () => true,
      setTimeout: () => 0,
      setInterval: () => 0
    }
  });
  const script = fs.readFileSync(path.join(root, "public", "script.js"), "utf8");
  vm.runInContext(script, context, { filename: "public/script.js" });

  return { elements, storage, getElement };
}

function addBook(app, values = {}) {
  const fields = {
    "book-original-id": "",
    "book-id": book.id,
    "book-title": book.title,
    "book-author": book.author,
    "book-category": book.category,
    "book-quantity": String(book.quantity),
    ...values
  };
  for (const [id, value] of Object.entries(fields)) {
    app.getElement(id).value = value;
  }
  app.getElement("book-form").trigger("submit");
}

function records(app, key) {
  return JSON.parse(app.storage.get(key) || "[]");
}

test("required project files exist", () => {
  for (const file of [
    "server.js",
    "package.json",
    "package-lock.json",
    "Dockerfile",
    "Jenkinsfile",
    "docker-compose.yml",
    "public"
  ]) {
    assert.ok(fs.existsSync(path.join(root, file)), `${file} should exist`);
  }
});

test("frontend provides book and loan forms", () => {
  const html = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
  assert.match(html, /id="book-form"/);
  assert.match(html, /id="issue-form"/);
  assert.match(html, /id="books-table-body"/);
  assert.match(html, /id="loans-table-body"/);
});

test("empty library starts with zero counts", () => {
  const app = createApp();
  assert.equal(app.getElement("total-titles").textContent, 0);
  assert.equal(app.getElement("total-copies").textContent, 0);
  assert.equal(app.getElement("available-copies").textContent, 0);
  assert.equal(app.getElement("issued-copies").textContent, 0);
  assert.equal(app.getElement("books-empty").hidden, false);
});

test("adding a valid book saves and renders the record", () => {
  const app = createApp();
  addBook(app);
  assert.deepEqual(records(app, "libraryBooks"), [book]);
  assert.equal(app.getElement("total-titles").textContent, 1);
  assert.equal(app.getElement("total-copies").textContent, 2);
  assert.match(app.getElement("books-table-body").innerHTML, /The Hobbit/);
});

test("book with missing details is not saved", () => {
  const app = createApp();
  addBook(app, { "book-title": "" });
  assert.equal(app.storage.has("libraryBooks"), false);
  assert.equal(app.getElement("toast-region").children[0].className, "toast error");
});

test("book with a non-positive or fractional quantity is rejected", () => {
  const app = createApp();
  addBook(app, { "book-quantity": "1.5" });
  assert.equal(app.storage.has("libraryBooks"), false);
  assert.equal(app.getElement("toast-region").children[0].className, "toast error");
});

test("duplicate book IDs are rejected without case sensitivity", () => {
  const app = createApp({ libraryBooks: JSON.stringify([book]) });
  addBook(app, { "book-id": "b-001" });
  assert.deepEqual(records(app, "libraryBooks"), [book]);
  assert.equal(app.getElement("toast-region").children[0].className, "toast error");
});

test("editing a book updates its details without changing its ID", () => {
  const app = createApp({ libraryBooks: JSON.stringify([book]) });
  addBook(app, {
    "book-original-id": book.id,
    "book-title": "The Hobbit: Revised",
    "book-quantity": "3"
  });
  assert.deepEqual(records(app, "libraryBooks"), [{
    ...book,
    title: "The Hobbit: Revised",
    quantity: 3
  }]);
});

test("issuing an available book records a loan and updates availability", () => {
  const app = createApp({ libraryBooks: JSON.stringify([book]) });
  app.getElement("issue-book-id").value = book.id;
  app.getElement("student-name").value = "Alex Reader";
  app.getElement("student-id").value = "S-100";
  app.getElement("issue-date").value = "2026-10-22";
  app.getElement("issue-form").trigger("submit");

  assert.deepEqual(records(app, "libraryTransactions"), [{
    id: "issue-001",
    bookId: book.id,
    studentName: "Alex Reader",
    studentId: "S-100",
    issueDate: "2026-10-22",
    returnDate: null
  }]);
  assert.equal(app.getElement("available-copies").textContent, 1);
  assert.equal(app.getElement("issued-copies").textContent, 1);
});

test("returning a loan records its return date and restores availability", () => {
  const transaction = {
    id: "issue-001",
    bookId: book.id,
    studentName: "Alex Reader",
    studentId: "S-100",
    issueDate: "2026-10-21",
    returnDate: null
  };
  const app = createApp({
    libraryBooks: JSON.stringify([book]),
    libraryTransactions: JSON.stringify([transaction])
  });
  const returnButton = {
    dataset: { transactionId: transaction.id }
  };
  app.getElement("loans-table-body").trigger("click", {
    target: { closest: () => returnButton }
  });

  const savedTransactions = records(app, "libraryTransactions");
  assert.equal(savedTransactions[0].returnDate, new Date().toISOString().slice(0, 10));
  assert.equal(app.getElement("available-copies").textContent, 2);
  assert.equal(app.getElement("issued-copies").textContent, 0);
});
