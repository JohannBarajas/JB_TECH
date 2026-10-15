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
const client = configured && window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const el = {
  auth: document.querySelector("#auth-screen"),
  authForm: document.querySelector("#auth-form"),
  authSubmit: document.querySelector("#auth-submit"),
  authFeedback: document.querySelector("#auth-feedback"),
  closeAuth: document.querySelector("#close-auth"),
  adminLogin: document.querySelector("#admin-login"),
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
let previousSessionUserId = null;
let sessionStateReady = false;
let adminAuthorized = false;
let phones = [];
let editingPhone = null;
let selectedPhoto = null;
let toastTimer;
let previewUrl = null;

function showMessage(element, message, isError = true) {
  element.textContent = message;
  element.classList.toggle("success-message", !isError && Boolean(message));
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.toast.classList.remove("visible"), 3500);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function formatPrice(value, currency = null) {
  if (value === null || value === undefined || value === "") return "Precio pendiente";
  const amount = Number(String(value).replaceAll(",", ""));
  const formatted = amount.toLocaleString("es-MX", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  });
  return `$${formatted}${currency ? ` ${currency}` : ""}`;
}

async function restoreSession() {
  const { data, error } = await client.auth.getSession();
  if (error) {
    showMessage(el.galleryFeedback, `No se pudo comprobar la sesión de administrador: ${error.message}`);
    return;
  }
  await updateSession(data.session);
}

async function updateSession(session) {
  const userId = session?.user.id || null;
  if (sessionStateReady && userId === previousSessionUserId) return;
  sessionStateReady = true;
  previousSessionUserId = userId;
  currentSession = session;
  adminAuthorized = false;
  updateAdminControls();

  if (!session) {
    await loadPhones();
    return;
  }

  const { data: admin, error } = await client
    .from("catalog_admins")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (error) {
    showMessage(el.galleryFeedback, `No se pudo comprobar el acceso de administrador: ${error.message}`);
    await client.auth.signOut();
    return;
  }
  if (!admin) {
    el.auth.close();
    await client.auth.signOut();
    showToast("Esta cuenta no tiene permisos de administrador.");
    return;
  }

  adminAuthorized = true;
  el.userEmail.textContent = session.user.email || "Administrador";
  updateAdminControls();
  el.auth.close();
  try {
    await initializeCatalogIfNeeded();
    await loadPhones();
  } catch (error) {
    showMessage(el.galleryFeedback, error.message);
  }
}

function updateAdminControls() {
  el.adminLogin.hidden = adminAuthorized;
  el.userEmail.hidden = !adminAuthorized;
  el.signOut.hidden = !adminAuthorized;
  el.addPhone.hidden = !adminAuthorized;
  el.empty.querySelector("[data-open-form]").hidden = !adminAuthorized;
}

async function loadPhones() {
  showMessage(el.galleryFeedback, "");
  el.grid.innerHTML = '<p class="loading-message">Cargando tu galería...</p>';
  el.empty.hidden = true;

  if (!client) {
    phones = STARTER_CATALOG;
    renderPhones();
    return;
  }

  const [{ data, error }, { data: settings, error: settingsError }] = await Promise.all([
    client.from("catalog_phones")
      .select("id, name, price, currency, image_path, created_at")
      .order("created_at", { ascending: false }),
    client.from("catalog_settings")
      .select("initialized")
      .eq("singleton", true)
      .single()
  ]);
  if (error) {
    phones = [];
    el.grid.replaceChildren();
    showMessage(el.galleryFeedback, `No se pudo cargar el catálogo: ${error.message}`);
    return;
  }
  if (settingsError) {
    phones = [];
    el.grid.replaceChildren();
    showMessage(el.galleryFeedback, `No se pudo comprobar la configuración del catálogo: ${settingsError.message}`);
    return;
  }

  phones = data.length === 0 && !settings.initialized
    ? STARTER_CATALOG
    : data.map(phone => ({
      ...phone,
      imageUrl: client.storage.from(STORAGE_BUCKET).getPublicUrl(phone.image_path).data.publicUrl
    }));
  renderPhones();
}

async function initializeCatalogIfNeeded() {
  const { data: settings, error: settingsError } = await client
    .from("catalog_settings")
    .select("initialized")
    .eq("singleton", true)
    .single();
  if (settingsError) throw new Error(`No se pudo comprobar la configuración inicial: ${settingsError.message}`);
  if (settings.initialized) return;

  const { data: existing, error: catalogError } = await client
    .from("catalog_phones")
    .select("id")
    .limit(1);
  if (catalogError) throw new Error(`No se pudo comprobar el catálogo: ${catalogError.message}`);
  if (existing.length > 0) {
    await markCatalogInitialized();
    return;
  }

  const uploadedPaths = [];
  const seedRecords = [];
  try {
    for (const [index, phone] of STARTER_CATALOG.entries()) {
      const response = await fetch(phone.imageUrl);
      if (!response.ok) throw new Error(`No se pudo abrir la foto ${index + 1} para importarla.`);
      const image = await response.blob();
      const imagePath = `catalog/${crypto.randomUUID()}.jpg`;
      const { error } = await client.storage.from(STORAGE_BUCKET).upload(imagePath, image, {
        cacheControl: "3600",
        contentType: "image/jpeg",
        upsert: false
      });
      if (error) throw new Error(`No se pudo guardar una foto del catálogo inicial: ${error.message}`);
      uploadedPaths.push(imagePath);
      seedRecords.push({
        name: phone.name,
        price: phone.price === null ? null : Number(String(phone.price).replaceAll(",", "")),
        currency: phone.currencyNote || null,
        image_path: imagePath
      });
    }
  } catch (error) {
    await removeUploadedPhotos(uploadedPaths);
    throw error;
  }

  const { error: insertError } = await client.from("catalog_phones").insert(seedRecords);
  if (insertError) {
    await removeUploadedPhotos(uploadedPaths);
    throw new Error(`No se pudo importar el catálogo inicial: ${insertError.message}`);
  }
  await markCatalogInitialized();
  showToast("Catálogo inicial importado. Ya puedes editar cada celular.");
}

async function markCatalogInitialized() {
  const { error } = await client
    .from("catalog_settings")
    .update({ initialized: true })
    .eq("singleton", true);
  if (error) throw new Error(`No se pudo finalizar la configuración del catálogo: ${error.message}`);
}

async function removeUploadedPhotos(paths) {
  if (paths.length === 0) return;
  const { error } = await client.storage.from(STORAGE_BUCKET).remove(paths);
  if (error) console.error("No se pudieron borrar fotos subidas durante una operación incompleta:", error);
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
      <div class="phone-image-wrap static-image-wrap">
        <img class="phone-image static-photo" src="${escapeHtml(phone.imageUrl)}" alt="${escapeHtml(phone.name)}" loading="lazy">
        <span class="photo-price-tag${phone.price === null || phone.price === undefined ? " price-pending" : ""}">${escapeHtml(formatPrice(phone.price, phone.currency || phone.currencyNote))}</span>
        ${adminAuthorized ? `<div class="card-actions">
          <button class="icon-button" type="button" data-edit="${escapeHtml(phone.id)}" aria-label="Editar ${escapeHtml(phone.name)}">✎</button>
          <button class="icon-button delete" type="button" data-delete="${escapeHtml(phone.id)}" aria-label="Eliminar ${escapeHtml(phone.name)}">×</button>
        </div>` : ""}
      </div>
      <div class="phone-details">
        <h2 class="phone-name" title="${escapeHtml(phone.name)}">${escapeHtml(phone.name)}</h2>
      </div>
    </article>
  `).join("");
}

function resetPhotoPreview() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  el.photoPreview.removeAttribute("src");
  el.photoPreview.hidden = true;
  el.uploadPrompt.hidden = false;
  el.photo.value = "";
  selectedPhoto = null;
}

function openPhoneDialog(phone = null) {
  if (!adminAuthorized) return;
  editingPhone = phone;
  el.phoneForm.reset();
  resetPhotoPreview();
  showMessage(el.formFeedback, "");
  el.dialogTitle.textContent = phone ? "Editar celular" : "Agregar celular";
  el.savePhone.textContent = phone ? "Guardar cambios" : "Guardar celular";
  el.photoOptional.textContent = phone ? "· opcional si solo cambiarás el precio o nombre" : "";
  el.name.value = phone ? phone.name : "";
  el.price.value = phone?.price ?? "";
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

  const path = `catalog/${crypto.randomUUID()}.${extension}`;
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
  if (!adminAuthorized) return;
  showMessage(el.formFeedback, "");
  el.savePhone.disabled = true;
  el.savePhone.textContent = selectedPhoto ? "Subiendo foto..." : "Guardando...";

  let newPath = null;
  const wasEditing = Boolean(editingPhone);
  try {
    const name = el.name.value.trim();
    const priceValue = el.price.value.trim();
    const price = priceValue === "" ? null : Number(priceValue);
    if (!name) throw new Error("Escribe la marca y el modelo del celular.");
    if (price !== null && (!Number.isFinite(price) || price < 0)) throw new Error("Escribe un precio válido.");
    if (!wasEditing && !selectedPhoto) throw new Error("Selecciona una foto del celular.");

    if (selectedPhoto) newPath = await uploadPhoto(selectedPhoto);
    const values = {
      name,
      price,
      image_path: newPath || editingPhone.image_path
    };
    const result = wasEditing
      ? await client.from("catalog_phones").update(values).eq("id", editingPhone.id).select("id").single()
      : await client.from("catalog_phones").insert(values).select("id").single();
    if (result.error) throw new Error(`No se pudo guardar el celular: ${result.error.message}`);
    if (!result.data) throw new Error("No se pudo confirmar que el celular quedó guardado.");

    const previousPath = wasEditing ? editingPhone.image_path : null;
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
    if (newPath) await removeUploadedPhotos([newPath]);
    showMessage(el.formFeedback, error.message);
  } finally {
    el.savePhone.disabled = false;
    el.savePhone.textContent = wasEditing ? "Guardar cambios" : "Guardar celular";
  }
}

async function deletePhone(id) {
  if (!adminAuthorized) return;
  const phone = phones.find(item => item.id === id);
  if (!phone || !window.confirm(`¿Eliminar ${phone.name} de tu galería?`)) return;

  const { error } = await client.from("catalog_phones").delete().eq("id", phone.id);
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
  showMessage(el.authFeedback, "");
  if (!client) {
    showMessage(el.authFeedback, "Falta conectar Supabase. Sigue la guía de configuración del README.");
    return;
  }

  const formData = new FormData(el.authForm);
  const email = String(formData.get("email")).trim();
  const password = String(formData.get("password"));
  el.authSubmit.disabled = true;

  try {
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  } catch (error) {
    showMessage(el.authFeedback, error.message || "No se pudo iniciar sesión.");
  } finally {
    el.authSubmit.disabled = false;
  }
});

el.adminLogin.addEventListener("click", () => {
  showMessage(el.authFeedback, "");
  el.auth.showModal();
});
el.closeAuth.addEventListener("click", () => el.auth.close());
el.auth.addEventListener("click", event => {
  if (event.target === el.auth) el.auth.close();
});
el.signOut.addEventListener("click", async () => {
  const { error } = await client.auth.signOut();
  if (error) showMessage(el.galleryFeedback, `No se pudo cerrar sesión: ${error.message}`);
});
el.addPhone.addEventListener("click", () => openPhoneDialog());
el.empty.querySelector("[data-open-form]").addEventListener("click", () => openPhoneDialog());
el.cancelDialog.addEventListener("click", closePhoneDialog);
el.closeDialog.addEventListener("click", closePhoneDialog);
el.phoneForm.addEventListener("submit", savePhone);
el.search.addEventListener("input", renderPhones);

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
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  el.photoPreview.src = previewUrl;
  el.photoPreview.hidden = false;
  el.uploadPrompt.hidden = true;
});

el.grid.addEventListener("click", event => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");
  if (editButton && adminAuthorized) {
    const phone = phones.find(item => item.id === editButton.dataset.edit);
    if (phone) openPhoneDialog(phone);
  }
  if (deleteButton && adminAuthorized) deletePhone(deleteButton.dataset.delete);
});

if (client) {
  el.adminLogin.hidden = false;
  client.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => updateSession(session), 0);
  });
  restoreSession();
} else {
  el.adminLogin.hidden = false;
  loadPhones();
}
