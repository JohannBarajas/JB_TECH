// Add your Supabase project URL and anon key here. Setup instructions are in README.md.
const SUPABASE_URL = "PEGA_AQUI_LA_URL_DE_TU_PROYECTO";
const SUPABASE_ANON_KEY = "PEGA_AQUI_TU_CLAVE_ANON";
const STORAGE_BUCKET = "phones-images";
const MAX_PHOTO_SIZE = 10 * 1024 * 1024;
const STARTER_CATALOG = [
  { id: "static-01", name: "iPhone 16 Plus · 256 GB", price: "600", imageUrl: "catalogo/celular-01.jpeg" },
  { id: "static-02", name: "iPhone 17 · 512 GB", price: "700", imageUrl: "catalogo/celular-02.jpeg" },
  { id: "static-03", name: "Samsung Galaxy S26 Ultra · 256 GB", price: "1,999.99", imageUrl: "catalogo/celular-03.jpeg" },
  { id: "static-04", name: "iPhone · modelo por confirmar", price: null, imageUrl: "catalogo/celular-04.jpeg" },
  { id: "static-05", name: "iPhone 17 Pro · 256 GB", price: "900", imageUrl: "catalogo/celular-05.jpeg" },
  { id: "static-06", name: "Samsung Galaxy S26 Ultra · 256 GB", price: "1,999.99", imageUrl: "catalogo/celular-06.jpeg" },
  { id: "static-07", name: "iPhone 18 Pro Max · 512 GB", price: "1,650", imageUrl: "catalogo/celular-07.jpeg", currencyNote: "USD" },
  { id: "static-08", name: "Varios celulares · modelo por confirmar", price: null, imageUrl: "catalogo/celular-08.jpeg" },
  { id: "static-09", name: "Celular en caja · modelo por confirmar", price: "1,559.99", imageUrl: "catalogo/celular-09.jpeg" },
  { id: "static-10", name: "iPhone · modelo por confirmar", price: "899.99", imageUrl: "catalogo/celular-10.jpeg" }
];

const configured = SUPABASE_URL.startsWith("https://")
  && !SUPABASE_URL.includes("PEGA_AQUI")
  && SUPABASE_ANON_KEY.length > 20
  && !SUPABASE_ANON_KEY.includes("PEGA_AQUI");
const client = configured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const el = {
  setup: document.querySelector("#setup-message"),
  auth: document.querySelector("#auth-screen"),
  gallery: document.querySelector("#gallery-screen"),
  authForm: document.querySelector("#auth-form"),
  authTitle: document.querySelector("#auth-title"),
  authSubmit: document.querySelector("#auth-submit"),
  authFeedback: document.querySelector("#auth-feedback"),
  toggleAuth: document.querySelector("#toggle-auth-mode"),
  userEmail: document.querySelector("#user-email"),
  signOut: document.querySelector("#sign-out"),
  addPhone: document.querySelector("#add-phone"),
  grid: document.querySelector("#phone-grid"),
  empty: document.querySelector("#empty-state"),
  count: document.querySelector("#phone-count"),
  search: document.querySelector("#search-input"),
  galleryFeedback: document.querySelector("#gallery-feedback"),
  dialog: document.querySelector("#phone-dialog"),
  phoneForm: document.querySelector("#phone-form"),
  dialogTitle: document.querySelector("#dialog-title"),
  name: document.querySelector("#phone-name"),
  price: document.querySelector("#phone-price"),
  photo: document.querySelector("#phone-photo"),
  photoOptional: document.querySelector("#photo-optional"),
  photoPreview: document.querySelector("#photo-preview"),
  uploadPrompt: document.querySelector("#upload-prompt"),
  formFeedback: document.querySelector("#form-feedback"),
  savePhone: document.querySelector("#save-phone"),
  cancelDialog: document.querySelector("#cancel-dialog"),
  closeDialog: document.querySelector("#close-dialog"),
  toast: document.querySelector("#toast")
};

let currentSession = null;
let phones = [];
let editingPhone = null;
let selectedPhoto = null;
let authMode = "login";
let toastTimer;

function showMessage(element, message, isError = true) {
  element.textContent = message;
  element.classList.toggle("success-message", !isError && Boolean(message));
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.toast.classList.remove("visible"), 3000);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function formatPrice(value) {
  return Number(value).toLocaleString("es-MX", {
    minimumFractionDigits: Number(value) % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  });
}

function showScreen(screen) {
  el.setup.hidden = screen !== "setup";
  el.auth.hidden = screen !== "auth";
  el.gallery.hidden = screen !== "gallery";
}

function setAuthMode(mode) {
  authMode = mode;
  const creating = mode === "signup";
  el.authTitle.textContent = creating ? "Crea tu cuenta" : "Entra a tu vitrina";
  el.authSubmit.textContent = creating ? "Crear cuenta" : "Iniciar sesión";
  el.toggleAuth.textContent = creating
    ? "¿Ya tienes cuenta? Inicia sesión"
    : "¿Es tu primera vez? Crea tu cuenta";
  el.authForm.querySelector("#auth-password").autocomplete = creating ? "new-password" : "current-password";
  showMessage(el.authFeedback, "");
}

async function restoreSession() {
  const { data, error } = await client.auth.getSession();
  if (error) {
    showScreen("auth");
    showMessage(el.authFeedback, `No se pudo comprobar la sesión: ${error.message}`);
    return;
  }
  await updateSession(data.session);
}

async function updateSession(session) {
  currentSession = session;
  if (!session) {
    phones = [];
    showScreen("auth");
    return;
  }
  el.userEmail.textContent = session.user.email || "";
  showScreen("gallery");
  await loadPhones();
}

async function loadPhones() {
  showMessage(el.galleryFeedback, "");
  el.grid.innerHTML = '<p class="loading-message">Cargando tu galería...</p>';
  el.empty.hidden = true;
  const { data, error } = await client
    .from("phones")
    .select("id, name, price, image_path, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    el.grid.replaceChildren();
    showMessage(el.galleryFeedback, `No se pudieron cargar tus celulares: ${error.message}`);
    return;
  }

  try {
    const signedPhones = await Promise.all(data.map(async phone => {
      const { data: signed, error: imageError } = await client.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(phone.image_path, 60 * 60);
      if (imageError) {
        throw new Error(`No se pudo abrir la foto de "${phone.name}": ${imageError.message}`);
      }
      return { ...phone, imageUrl: signed.signedUrl };
    }));

    phones = signedPhones;
    renderPhones();
  } catch (error) {
    phones = [];
    el.grid.replaceChildren();
    showMessage(el.galleryFeedback, error.message);
  }
}

function renderPhones() {
  const query = el.search.value.trim().toLocaleLowerCase("es");
  const filtered = phones.filter(phone => phone.name.toLocaleLowerCase("es").includes(query));
  el.count.textContent = `${phones.length} ${phones.length === 1 ? "celular" : "celulares"}`;
  el.empty.hidden = phones.length > 0;

  if (phones.length === 0) {
    el.grid.replaceChildren();
    return;
  }
  if (filtered.length === 0) {
    el.grid.innerHTML = '<p class="loading-message">No encontramos celulares con ese nombre.</p>';
    return;
  }

  el.grid.innerHTML = filtered.map(phone => `
    <article class="phone-card">
      <div class="phone-image-wrap">
        <img class="phone-image" src="${escapeHtml(phone.imageUrl)}" alt="${escapeHtml(phone.name)}" loading="lazy">
        <div class="card-actions">
          <button class="icon-button" type="button" data-edit="${escapeHtml(phone.id)}" aria-label="Editar ${escapeHtml(phone.name)}">✎</button>
          <button class="icon-button delete" type="button" data-delete="${escapeHtml(phone.id)}" aria-label="Eliminar ${escapeHtml(phone.name)}">×</button>
        </div>
      </div>
      <div class="phone-details">
        <h2 class="phone-name" title="${escapeHtml(phone.name)}">${escapeHtml(phone.name)}</h2>
        <p class="phone-price">${formatPrice(phone.price)}</p>
      </div>
    </article>
  `).join("");
}

function renderStarterCatalog() {
  phones = STARTER_CATALOG;
  el.userEmail.hidden = true;
  el.signOut.hidden = true;
  el.addPhone.hidden = true;
  el.empty.hidden = true;
  el.count.textContent = `${phones.length} fotos`;
  renderStaticPhones();
}

function renderStaticPhones() {
  const query = el.search.value.trim().toLocaleLowerCase("es");
  const filtered = phones.filter(phone => phone.name.toLocaleLowerCase("es").includes(query));
  el.count.textContent = `${phones.length} ${phones.length === 1 ? "foto" : "fotos"}`;

  if (filtered.length === 0) {
    el.grid.innerHTML = '<p class="loading-message">No encontramos celulares con ese nombre.</p>';
    return;
  }

  el.grid.innerHTML = filtered.map(phone => `
    <article class="phone-card">
      <div class="phone-image-wrap static-image-wrap">
        <img class="phone-image static-photo" src="${escapeHtml(phone.imageUrl)}" alt="${escapeHtml(phone.name)}" loading="lazy">
        <span class="photo-price-tag${phone.price ? "" : " price-pending"}">${phone.price ? `$${escapeHtml(phone.price)}${phone.currencyNote ? ` ${escapeHtml(phone.currencyNote)}` : ""}` : "Precio pendiente"}</span>
      </div>
      <div class="phone-details">
        <h2 class="phone-name" title="${escapeHtml(phone.name)}">${escapeHtml(phone.name)}</h2>
      </div>
    </article>
  `).join("");
}

function resetPhotoPreview() {
  el.photoPreview.removeAttribute("src");
  el.photoPreview.hidden = true;
  el.uploadPrompt.hidden = false;
  el.photo.value = "";
  selectedPhoto = null;
}

function openPhoneDialog(phone = null) {
  editingPhone = phone;
  el.phoneForm.reset();
  resetPhotoPreview();
  showMessage(el.formFeedback, "");
  el.dialogTitle.textContent = phone ? "Editar celular" : "Agregar celular";
  el.savePhone.textContent = phone ? "Guardar cambios" : "Guardar celular";
  el.photoOptional.textContent = phone ? "· opcional si solo cambiarás el precio o nombre" : "";
  el.name.value = phone ? phone.name : "";
  el.price.value = phone ? phone.price : "";
  if (phone) {
    el.photoPreview.src = phone.imageUrl;
    el.photoPreview.hidden = false;
    el.uploadPrompt.hidden = true;
  }
  el.dialog.showModal();
  el.name.focus();
}

function closePhoneDialog() {
  el.dialog.close();
  editingPhone = null;
  resetPhotoPreview();
}

function photoExtension(file) {
  const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  return extensions[file.type] || null;
}

async function uploadPhoto(file) {
  const extension = photoExtension(file);
  if (!extension) throw new Error("La foto debe estar en formato JPG, PNG o WEBP.");
  if (file.size > MAX_PHOTO_SIZE) throw new Error("La foto debe pesar menos de 10 MB.");

  const path = `${currentSession.user.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false
  });
  if (error) throw new Error(`No se pudo subir la foto: ${error.message}`);
  return path;
}

async function savePhone(event) {
  event.preventDefault();
  showMessage(el.formFeedback, "");
  el.savePhone.disabled = true;
  el.savePhone.textContent = selectedPhoto ? "Subiendo foto..." : "Guardando...";

  let newPath = null;
  const wasEditing = Boolean(editingPhone);
  try {
    const name = el.name.value.trim();
    const price = Number(el.price.value);
    if (!name) throw new Error("Escribe la marca y el modelo del celular.");
    if (!Number.isFinite(price) || price < 0) throw new Error("Escribe un precio válido.");
    if (!editingPhone && !selectedPhoto) throw new Error("Selecciona una foto del celular.");

    if (selectedPhoto) newPath = await uploadPhoto(selectedPhoto);
    const values = {
      name,
      price,
      image_path: newPath || editingPhone.image_path
    };

    const result = editingPhone
      ? await client.from("phones").update(values).eq("id", editingPhone.id).select("id").single()
      : await client.from("phones").insert(values).select("id").single();
    if (result.error) throw new Error(`No se pudo guardar el celular: ${result.error.message}`);
    if (!result.data) throw new Error("No se pudo confirmar que el celular quedó guardado.");

    const previousPath = editingPhone?.image_path;
    closePhoneDialog();
    await loadPhones();

    if (newPath && previousPath) {
      const { error } = await client.storage.from(STORAGE_BUCKET).remove([previousPath]);
      if (error) showToast(`Se guardó el cambio, pero no se pudo borrar la foto anterior: ${error.message}`);
      else showToast("Cambios guardados.");
    } else {
      showToast(wasEditing ? "Cambios guardados." : "Celular agregado a tu galería.");
    }
  } catch (error) {
    if (newPath) {
      const { error: cleanupError } = await client.storage.from(STORAGE_BUCKET).remove([newPath]);
      if (cleanupError) console.error("No se pudo limpiar la foto subida tras un error:", cleanupError);
    }
    showMessage(el.formFeedback, error.message);
  } finally {
    el.savePhone.disabled = false;
    el.savePhone.textContent = editingPhone ? "Guardar cambios" : "Guardar celular";
  }
}

async function deletePhone(id) {
  const phone = phones.find(item => item.id === id);
  if (!phone || !window.confirm(`¿Eliminar ${phone.name} de tu galería?`)) return;

  const { error } = await client.from("phones").delete().eq("id", phone.id);
  if (error) {
    showMessage(el.galleryFeedback, `No se pudo eliminar el celular: ${error.message}`);
    return;
  }
  phones = phones.filter(item => item.id !== phone.id);
  renderPhones();

  const { error: imageError } = await client.storage.from(STORAGE_BUCKET).remove([phone.image_path]);
  if (imageError) {
    showMessage(el.galleryFeedback, `El celular fue eliminado, pero no se pudo borrar su foto: ${imageError.message}`);
    return;
  }
  showToast("Celular eliminado.");
}

el.authForm.addEventListener("submit", async event => {
  event.preventDefault();
  const formData = new FormData(el.authForm);
  const email = String(formData.get("email")).trim();
  const password = String(formData.get("password"));
  el.authSubmit.disabled = true;
  showMessage(el.authFeedback, "");

  try {
    const result = authMode === "signup"
      ? await client.auth.signUp({ email, password })
      : await client.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    if (authMode === "signup" && !result.data.session) {
      showMessage(el.authFeedback, "Revisa tu correo y confirma la cuenta para poder iniciar sesión.", false);
    }
  } catch (error) {
    showMessage(el.authFeedback, error.message || "No se pudo completar el inicio de sesión.");
  } finally {
    el.authSubmit.disabled = false;
  }
});

el.toggleAuth.addEventListener("click", () => setAuthMode(authMode === "login" ? "signup" : "login"));
el.signOut.addEventListener("click", async () => {
  const { error } = await client.auth.signOut();
  if (error) showMessage(el.galleryFeedback, `No se pudo cerrar sesión: ${error.message}`);
});
el.addPhone.addEventListener("click", () => openPhoneDialog());
el.empty.querySelector("[data-open-form]").addEventListener("click", () => openPhoneDialog());
el.cancelDialog.addEventListener("click", closePhoneDialog);
el.closeDialog.addEventListener("click", closePhoneDialog);
el.phoneForm.addEventListener("submit", savePhone);
el.search.addEventListener("input", () => configured ? renderPhones() : renderStaticPhones());

el.photo.addEventListener("change", () => {
  const file = el.photo.files?.[0];
  if (!file) return;
  const extension = photoExtension(file);
  if (!extension || file.size > MAX_PHOTO_SIZE) {
    el.photo.value = "";
    showMessage(el.formFeedback, !extension
      ? "La foto debe estar en formato JPG, PNG o WEBP."
      : "La foto debe pesar menos de 10 MB.");
    return;
  }
  selectedPhoto = file;
  showMessage(el.formFeedback, "");
  el.photoPreview.src = URL.createObjectURL(file);
  el.photoPreview.hidden = false;
  el.uploadPrompt.hidden = true;
});

el.grid.addEventListener("click", event => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");
  if (editButton) {
    const phone = phones.find(item => item.id === editButton.dataset.edit);
    if (phone) openPhoneDialog(phone);
  }
  if (deleteButton) deletePhone(deleteButton.dataset.delete);
});

if (!configured || !window.supabase) {
  showScreen("gallery");
  renderStarterCatalog();
} else {
  client.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => updateSession(session), 0);
  });
  restoreSession();
}
