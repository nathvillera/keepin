/* =========================================================
   KEEPIN
   ---------------------------------------------------------
   Penyimpanan:
   1. localStorage:
      - akun user sederhana
      - status login

   2. IndexedDB:
      - data arsip
      - file dokumen
      - file gambar

   Catatan:
   Ini cocok untuk belajar dan penggunaan lokal.
   Belum cocok untuk sistem login sungguhan di production.
========================================================= */

/* ================= KONSTANTA ================= */

const USER_STORAGE_KEY = "KeepinUser";
const LOGIN_STATUS_KEY = "KeepinLoggedIn";

const DB_NAME = "KeepinDatabase";
const DB_VERSION = 1;
const STORE_NAME = "archives";

/* ================= ELEMENT LOGIN ================= */

const loginPage = document.getElementById("loginPage");
const appPage = document.getElementById("appPage");

const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const registerButton = document.getElementById("registerButton");
const loginMessage = document.getElementById("loginMessage");
const logoutButton = document.getElementById("logoutButton");

/* ================= ELEMENT APP ================= */

const archiveList = document.getElementById("archiveList");
const emptyState = document.getElementById("emptyState");

const totalArchives = document.getElementById("totalArchives");
const totalDocuments = document.getElementById("totalDocuments");
const totalImages = document.getElementById("totalImages");

const searchInput = document.getElementById("searchInput");
const filterType = document.getElementById("filterType");

const openArchiveFormButton = document.getElementById("openArchiveFormButton");

/* ================= ELEMENT MODAL FORM ================= */

const archiveModal = document.getElementById("archiveModal");
const archiveForm = document.getElementById("archiveForm");
const cancelArchiveButton = document.getElementById("cancelArchiveButton");
const saveArchiveButton = document.getElementById("saveArchiveButton");

const archiveTitle = document.getElementById("archiveTitle");
const archiveNotes = document.getElementById("archiveNotes");
const archiveTags = document.getElementById("archiveTags");

const documentUploadGroup = document.getElementById("documentUploadGroup");
const imageUploadGroup = document.getElementById("imageUploadGroup");

const documentFile = document.getElementById("documentFile");
const imageFile = document.getElementById("imageFile");

const archiveMessage = document.getElementById("archiveMessage");

/* ================= ELEMENT DELETE MODAL ================= */

const deleteModal = document.getElementById("deleteModal");
const cancelDeleteButton = document.getElementById("cancelDeleteButton");
const confirmDeleteButton = document.getElementById("confirmDeleteButton");

let archiveIdToDelete = null;
let db = null;

/* =========================================================
   DATABASE INDEXEDDB
========================================================= */

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject("Gagal membuka database browser.");
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, {
          keyPath: "id"
        });

        store.createIndex("createdAt", "createdAt", {
          unique: false
        });

        store.createIndex("type", "type", {
          unique: false
        });
      }
    };
  });
}

function addArchiveToDatabase(archive) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.add(archive);

    request.onsuccess = () => {
      resolve(true);
    };

    request.onerror = () => {
      reject("Gagal menyimpan arsip.");
    };
  });
}

function getAllArchivesFromDatabase() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.getAll();

    request.onsuccess = () => {
      const archives = request.result || [];

      archives.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      resolve(archives);
    };

    request.onerror = () => {
      reject("Gagal mengambil daftar arsip.");
    };
  });
}

function deleteArchiveFromDatabase(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.delete(id);

    request.onsuccess = () => {
      resolve(true);
    };

    request.onerror = () => {
      reject("Gagal menghapus arsip.");
    };
  });
}

/* =========================================================
   LOGIN SEDERHANA
========================================================= */

function getSavedUser() {
  const savedUser = localStorage.getItem(USER_STORAGE_KEY);

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser);
  } catch (error) {
    return null;
  }
}

function saveUser(username, password) {
  const user = {
    username: username,
    password: password
  };

  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

function setLoginStatus(isLoggedIn) {
  localStorage.setItem(LOGIN_STATUS_KEY, isLoggedIn ? "yes" : "no");
}

function isUserLoggedIn() {
  return localStorage.getItem(LOGIN_STATUS_KEY) === "yes";
}

function showLoginMessage(text, isSuccess = false) {
  loginMessage.textContent = text;

  if (isSuccess) {
    loginMessage.classList.add("success");
  } else {
    loginMessage.classList.remove("success");
  }
}

function showAppPage() {
  loginPage.classList.add("hidden");
  appPage.classList.remove("hidden");
  renderArchives();
}

function showLoginPage() {
  appPage.classList.add("hidden");
  loginPage.classList.remove("hidden");
}

registerButton.addEventListener("click", () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    showLoginMessage("Username dan password wajib diisi.");
    return;
  }

  if (password.length < 4) {
    showLoginMessage("Password minimal 4 karakter.");
    return;
  }

  saveUser(username, password);
  showLoginMessage("Akun berhasil dibuat. Sekarang klik Masuk.", true);
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  const savedUser = getSavedUser();

  if (!savedUser) {
    showLoginMessage("Belum ada akun. Klik tombol Buat akun dulu.");
    return;
  }

  if (username === savedUser.username && password === savedUser.password) {
    setLoginStatus(true);
    showLoginMessage("");
    showAppPage();
  } else {
    showLoginMessage("Username atau password salah.");
  }
});

logoutButton.addEventListener("click", () => {
  setLoginStatus(false);
  showLoginPage();
});

/* =========================================================
   MODAL ARSIP
========================================================= */

function openArchiveModal() {
  resetArchiveForm();
  archiveModal.classList.remove("hidden");
}

function closeArchiveModal() {
  archiveModal.classList.add("hidden");
}

function resetArchiveForm() {
  archiveForm.reset();

  document.querySelector('input[name="archiveType"][value="document"]').checked = true;

  updateSelectedTypeCard();
  updateUploadFields();

  archiveMessage.textContent = "";
  archiveMessage.classList.remove("success");
}

openArchiveFormButton.addEventListener("click", openArchiveModal);

cancelArchiveButton.addEventListener("click", () => {
  closeArchiveModal();
});

archiveModal.addEventListener("click", (event) => {
  if (event.target === archiveModal) {
    closeArchiveModal();
  }
});

/* =========================================================
   PILIH TIPE ARSIP
========================================================= */

function getSelectedArchiveType() {
  const selected = document.querySelector('input[name="archiveType"]:checked');
  return selected ? selected.value : "document";
}

function updateSelectedTypeCard() {
  const selectedType = getSelectedArchiveType();
  const cards = document.querySelectorAll("[data-type-card]");

  cards.forEach((card) => {
    const cardType = card.getAttribute("data-type-card");

    if (cardType === selectedType) {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });
}

function updateUploadFields() {
  const type = getSelectedArchiveType();

  if (type === "document") {
    documentUploadGroup.classList.remove("hidden");
    imageUploadGroup.classList.add("hidden");

    documentFile.required = true;
    imageFile.required = false;
    imageFile.value = "";
  }

  if (type === "image") {
    documentUploadGroup.classList.add("hidden");
    imageUploadGroup.classList.remove("hidden");

    documentFile.required = false;
    imageFile.required = true;
    documentFile.value = "";
  }

  if (type === "both") {
    documentUploadGroup.classList.remove("hidden");
    imageUploadGroup.classList.remove("hidden");

    documentFile.required = true;
    imageFile.required = true;
  }
}

document.querySelectorAll('input[name="archiveType"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    updateSelectedTypeCard();
    updateUploadFields();
  });
});

/* =========================================================
   FILE HELPER
========================================================= */

function createFileObject(file) {
  if (!file) {
    return null;
  }

  return {
    name: file.name,
    type: file.type,
    size: file.size,
    blob: file
  };
}

function formatFileSize(bytes) {
  if (!bytes) {
    return "0 KB";
  }

  const kilobytes = bytes / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }

  const megabytes = kilobytes / 1024;
  return `${megabytes.toFixed(1)} MB`;
}

function createDownloadUrl(fileObject) {
  if (!fileObject || !fileObject.blob) {
    return "#";
  }

  return URL.createObjectURL(fileObject.blob);
}

/* =========================================================
   SIMPAN ARSIP
========================================================= */

function showArchiveMessage(text, isSuccess = false) {
  archiveMessage.textContent = text;

  if (isSuccess) {
    archiveMessage.classList.add("success");
  } else {
    archiveMessage.classList.remove("success");
  }
}

function parseTags(tagsText) {
  if (!tagsText.trim()) {
    return [];
  }

  return tagsText
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function validateArchiveForm(type) {
  const title = archiveTitle.value.trim();

  if (!title) {
    return "Judul arsip wajib diisi.";
  }

  if (type === "document" && !documentFile.files[0]) {
    return "File dokumen wajib dipilih.";
  }

  if (type === "image" && !imageFile.files[0]) {
    return "File gambar wajib dipilih.";
  }

  if (type === "both" && (!documentFile.files[0] || !imageFile.files[0])) {
    return "File dokumen dan gambar wajib dipilih.";
  }

  return "";
}

saveArchiveButton.addEventListener("click", async () => {
  const type = getSelectedArchiveType();

  const validationMessage = validateArchiveForm(type);

  if (validationMessage) {
    showArchiveMessage(validationMessage);
    return;
  }

  const newArchive = {
    id: crypto.randomUUID(),
    type: type,
    title: archiveTitle.value.trim(),
    notes: archiveNotes.value.trim(),
    tags: parseTags(archiveTags.value),
    document: createFileObject(documentFile.files[0]),
    image: createFileObject(imageFile.files[0]),
    createdAt: new Date().toISOString()
  };

  try {
    await addArchiveToDatabase(newArchive);

    showArchiveMessage("Arsip berhasil disimpan.", true);

    setTimeout(() => {
      closeArchiveModal();
      renderArchives();
    }, 450);
  } catch (error) {
    showArchiveMessage(String(error));
  }
});

/* =========================================================
   RENDER DAFTAR ARSIP
========================================================= */

function getTypeLabel(type) {
  if (type === "document") {
    return "Document";
  }

  if (type === "image") {
    return "Image";
  }

  if (type === "both") {
    return "Doc + Image";
  }

  return "Other";
}

function getTypeIcon(type) {
  if (type === "document") {
    return "📄";
  }

  if (type === "image") {
    return "🖼️";
  }

  if (type === "both") {
    return "🔗";
  }

  return "📁";
}

function getTypeIconClass(type) {
  if (type === "document") {
    return "document-icon";
  }

  if (type === "image") {
    return "image-icon";
  }

  if (type === "both") {
    return "link-icon";
  }

  return "other-icon";
}

function formatDate(dateText) {
  const date = new Date(dateText);

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function archiveMatchesSearch(archive, keyword) {
  if (!keyword) {
    return true;
  }

  const lowerKeyword = keyword.toLowerCase();

  const searchableText = [
    archive.title,
    archive.notes,
    archive.type,
    ...(archive.tags || [])
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(lowerKeyword);
}

function archiveMatchesFilter(archive, selectedFilter) {
  if (selectedFilter === "all") {
    return true;
  }

  return archive.type === selectedFilter;
}

function updateSummary(archives) {
  totalArchives.textContent = archives.length;

  const documentCount = archives.filter((archive) => {
    return archive.type === "document" || archive.type === "both";
  }).length;

  const imageCount = archives.filter((archive) => {
    return archive.type === "image" || archive.type === "both";
  }).length;

  totalDocuments.textContent = documentCount;
  totalImages.textContent = imageCount;
}

function createFileLink(fileObject, label) {
  if (!fileObject) {
    return "";
  }

  const url = createDownloadUrl(fileObject);
  const fileSize = formatFileSize(fileObject.size);

  return `
    <a class="file-link" href="${url}" download="${escapeHtml(fileObject.name)}">
      <span>${label}: ${escapeHtml(fileObject.name)}</span>
      <small>${fileSize}</small>
    </a>
  `;
}

function createArchiveCard(archive) {
  const tagsHtml = (archive.tags || [])
    .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
    .join("");

  const documentLink = createFileLink(archive.document, "Document");
  const imageLink = createFileLink(archive.image, "Image");

  const notesHtml = archive.notes
    ? `<p class="archive-notes">${escapeHtml(archive.notes)}</p>`
    : `<p class="archive-notes">Tidak ada catatan.</p>`;

  return `
    <article class="archive-card">
      <div class="archive-card-header">
        <div class="archive-type-icon ${getTypeIconClass(archive.type)}">
          ${getTypeIcon(archive.type)}
        </div>

        <div class="archive-title-wrap">
          <h3>${escapeHtml(archive.title)}</h3>
          <div class="archive-date">
            ${getTypeLabel(archive.type)} • ${formatDate(archive.createdAt)}
          </div>
        </div>
      </div>

      ${notesHtml}

      <div class="tag-list">
        ${tagsHtml || '<span class="tag">Tanpa Tag</span>'}
      </div>

      <div class="file-list">
        ${documentLink}
        ${imageLink}
      </div>

      <div class="archive-actions">
        <button class="delete-button" data-delete-id="${archive.id}">
          Hapus
        </button>
      </div>
    </article>
  `;
}

async function renderArchives() {
  try {
    const archives = await getAllArchivesFromDatabase();

    updateSummary(archives);

    const keyword = searchInput.value.trim();
    const selectedFilter = filterType.value;

    const filteredArchives = archives.filter((archive) => {
      return (
        archiveMatchesSearch(archive, keyword) &&
        archiveMatchesFilter(archive, selectedFilter)
      );
    });

    archiveList.innerHTML = filteredArchives
      .map((archive) => createArchiveCard(archive))
      .join("");

    if (filteredArchives.length === 0) {
      emptyState.classList.remove("hidden");
    } else {
      emptyState.classList.add("hidden");
    }

    bindDeleteButtons();
  } catch (error) {
    archiveList.innerHTML = `
      <div class="empty-state">
        <h2>Terjadi kesalahan</h2>
        <p>${escapeHtml(String(error))}</p>
      </div>
    `;
  }
}

searchInput.addEventListener("input", renderArchives);
filterType.addEventListener("change", renderArchives);

/* =========================================================
   HAPUS ARSIP
========================================================= */

function bindDeleteButtons() {
  const deleteButtons = document.querySelectorAll("[data-delete-id]");

  deleteButtons.forEach((button) => {
    button.addEventListener("click", () => {
      archiveIdToDelete = button.getAttribute("data-delete-id");
      deleteModal.classList.remove("hidden");
    });
  });
}

cancelDeleteButton.addEventListener("click", () => {
  archiveIdToDelete = null;
  deleteModal.classList.add("hidden");
});

confirmDeleteButton.addEventListener("click", async () => {
  if (!archiveIdToDelete) {
    return;
  }

  try {
    await deleteArchiveFromDatabase(archiveIdToDelete);
    archiveIdToDelete = null;
    deleteModal.classList.add("hidden");
    renderArchives();
  } catch (error) {
    alert(String(error));
  }
});

deleteModal.addEventListener("click", (event) => {
  if (event.target === deleteModal) {
    archiveIdToDelete = null;
    deleteModal.classList.add("hidden");
  }
});

/* =========================================================
   SECURITY HELPER SEDERHANA
========================================================= */

function escapeHtml(text) {
  if (text === null || text === undefined) {
    return "";
  }

  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================================================
   INIT APP
========================================================= */

async function initApp() {
  try {
    await openDatabase();

    updateSelectedTypeCard();
    updateUploadFields();

    if (isUserLoggedIn()) {
      showAppPage();
    } else {
      showLoginPage();
    }
  } catch (error) {
    alert(String(error));
  }
}

initApp();