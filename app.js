// Add your Supabase project URL and anon key here. Setup instructions are in README.md.
const SUPABASE_URL = "https://zrvzvoejrluygcwuopux.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Qrc5b8inuUjcnv-vElXCFA_mo2X3B1K";
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
  cost: document.querySelector("#phone-cost"),
  distributor: document.querySelector("#phone-distributor"),
  photo: document.querySelector("#phone-photo"),
  photoOptional: document.querySelector("#photo-optional"),
  photoPreview: document.querySelector("#photo-preview"),
  uploadPrompt: document.querySelector("#upload-prompt"),
  formFeedback: document.querySelector("#form-feedback"),
  savePhone: document.querySelector("#save-phone"),
  cancelDialog: document.querySelector("#cancel-dialog"),
  closeDialog: document.querySelector("#close-dialog"),
  cropCurrentPhoto: document.querySelector("#crop-current-photo"),
  editPhotoText: document.querySelector("#edit-photo-text"),
  textDialog: document.querySelector("#text-dialog"),
  closeText: document.querySelector("#close-text"),
  textStage: document.querySelector("#text-stage"),
  textImage: document.querySelector("#text-image"),
  textPreview: document.querySelector("#text-preview"),
  overlayCopy: document.querySelector("#overlay-copy"),
  overlaySize: document.querySelector("#overlay-size"),
  overlaySizeValue: document.querySelector("#overlay-size-value"),
  overlayColor: document.querySelector("#overlay-color"),
  removePhotoText: document.querySelector("#remove-photo-text"),
  applyPhotoText: document.querySelector("#apply-photo-text"),
  cropDialog: document.querySelector("#crop-dialog"),
  cropCanvas: document.querySelector("#crop-canvas"),
  cropZoom: document.querySelector("#crop-zoom"),
  closeCrop: document.querySelector("#close-crop"),
  cropStage: document.querySelector("#crop-stage"),
  cropSelection: document.querySelector("#crop-selection"),
  rotateLeft: document.querySelector("#rotate-left"),
  rotateRight: document.querySelector("#rotate-right"),
  applyCrop: document.querySelector("#apply-crop"),
  toast: document.querySelector("#toast")
};

let currentSession = null;
let previousSessionUserId = null;
let sessionStateReady = false;
let adminAuthorized = false;
let phones = [];
let editingPhone = null;
let selectedPhoto = null;
let photoText = null;
let textDraft = null;
let textEditorPosition = { x: 50, y: 50 };
let textDrag = null;
let textSourceUrl = null;
let toastTimer;
let previewUrl = null;
let cropSourceUrl = null;
let cropSourceFile = null;
let cropImage = null;
let cropTargetPhone = null;
let cropRotation = 0;
let cropZoom = 1;
let cropPanX = 0;
let cropPanY = 0;
let cropDrag = null;
let cropRect = { x: 40, y: 50, width: 320, height: 400 };

function showMessage(element, message, isError = true) {
  element.textContent = message;
  element.classList.toggle("success-message", !isError && Boolean(message));
}

function normalizePhotoText(value) {
  if (!value || typeof value !== "object" || typeof value.text !== "string" || !value.text.trim()) return null;
  const color = typeof value.color === "string" && /^#[0-9a-f]{6}$/i.test(value.color) ? value.color : "#ffffff";
  const boundedNumber = (number, min, max, fallback) => {
    const parsed = Number(number);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  };
  return {
    text: value.text.slice(0, 100),
    x: boundedNumber(value.x, 0, 100, 50),
    y: boundedNumber(value.y, 0, 100, 50),
    size: boundedNumber(value.size, 16, 72, 32),
    color
  };
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
    phones = STARTER_CATALOG.map(phone => ({ ...phone, cost: null }));
    renderPhones();
    return;
  }

  const [{ data, error }, { data: settings, error: settingsError }] = await Promise.all([
    client.from("catalog_phones")
      .select("id, name, price, currency, image_path, image_text, created_at")
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

  let costs = new Map();
  if (adminAuthorized) {
    const { data: costRows, error: costError } = await client
      .from("catalog_phone_costs")
      .select("phone_id, cost, distributor");
    if (costError) {
      showMessage(el.galleryFeedback, `No se pudieron cargar los costos privados. Ejecuta la actualización SQL del archivo supabase-setup.sql: ${costError.message}`);
    } else {
      costs = new Map(costRows.map(row => [row.phone_id, row]));
    }
  }

  phones = data.length === 0 && !settings.initialized
    ? STARTER_CATALOG.map(phone => ({ ...phone, cost: null }))
    : data.map(phone => ({
      ...phone,
      cost: costs.get(phone.id)?.cost ?? null,
      distributor: costs.get(phone.id)?.distributor ?? null,
      imageText: normalizePhotoText(phone.image_text),
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
        ${phone.imageText ? `<span class="phone-image-text" style="left:${phone.imageText.x}%;top:${phone.imageText.y}%;--overlay-size:${phone.imageText.size / 4};--overlay-color:${phone.imageText.color}">${escapeHtml(phone.imageText.text)}</span>` : ""}
        <span class="photo-price-tag${phone.price === null || phone.price === undefined ? " price-pending" : ""}">${escapeHtml(formatPrice(phone.price, phone.currency || phone.currencyNote))}</span>
        ${adminAuthorized ? `<div class="card-actions">
          <button class="icon-button" type="button" data-crop="${escapeHtml(phone.id)}" aria-label="Recortar foto de ${escapeHtml(phone.name)}">✂</button>
          <button class="icon-button" type="button" data-edit="${escapeHtml(phone.id)}" aria-label="Editar ${escapeHtml(phone.name)}">✎</button>
          <button class="icon-button delete" type="button" data-delete="${escapeHtml(phone.id)}" aria-label="Eliminar ${escapeHtml(phone.name)}">×</button>
        </div>` : ""}
      </div>
      <div class="phone-details">
        <h2 class="phone-name" title="${escapeHtml(phone.name)}">${escapeHtml(phone.name)}</h2>
        ${adminAuthorized ? `<p class="admin-cost">Costo: <strong>${escapeHtml(formatPrice(phone.cost))}</strong></p>` : ""}
        ${adminAuthorized && phone.distributor ? `<p class="admin-distributor">Tienda / distribuidor: <strong>${escapeHtml(phone.distributor)}</strong></p>` : ""}
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
  el.cropCurrentPhoto.hidden = !phone;
  el.name.value = phone ? phone.name : "";
  el.price.value = phone?.price ?? "";
  el.cost.value = phone?.cost ?? "";
  el.distributor.value = phone?.distributor ?? "";
  photoText = phone?.imageText ? { ...phone.imageText } : null;
  el.editPhotoText.textContent = photoText ? "Editar texto sobre la foto" : "Escribir sobre la foto";
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
    const costValue = el.cost.value.trim();
    const cost = costValue === "" ? null : Number(costValue);
    const distributorValue = el.distributor.value.trim();
    const distributor = distributorValue === "" ? null : distributorValue;
    const imageText = normalizePhotoText(photoText);
    if (!name) throw new Error("Escribe la marca y el modelo del celular.");
    if (price !== null && (!Number.isFinite(price) || price < 0)) throw new Error("Escribe un precio válido.");
    if (cost !== null && (!Number.isFinite(cost) || cost < 0)) throw new Error("Escribe un costo válido.");
    if (distributor && distributor.length > 100) throw new Error("El nombre de la tienda o distribuidor debe tener como máximo 100 caracteres.");
    if (!wasEditing && !selectedPhoto) throw new Error("Selecciona una foto del celular.");

    if (selectedPhoto) newPath = await uploadPhoto(selectedPhoto);
    const values = {
      name,
      price,
      image_path: newPath || editingPhone.image_path,
      image_text: imageText
    };
    const result = wasEditing
      ? await client.from("catalog_phones").update(values).eq("id", editingPhone.id).select("id").single()
      : await client.from("catalog_phones").insert(values).select("id").single();
    if (result.error) throw new Error(`No se pudo guardar el celular: ${result.error.message}`);
    if (!result.data) throw new Error("No se pudo confirmar que el celular quedó guardado.");

    const phoneId = wasEditing ? editingPhone.id : result.data.id;
    const costResult = cost === null && !distributor
      ? await client.from("catalog_phone_costs").delete().eq("phone_id", phoneId)
      : await client.from("catalog_phone_costs").upsert(
        { phone_id: phoneId, cost, distributor, updated_at: new Date().toISOString() },
        { onConflict: "phone_id" }
      );
    if (costResult.error) {
      const costError = new Error(`El celular se guardó, pero no se pudieron guardar sus datos privados. Ejecuta la actualización SQL de supabase-setup.sql: ${costResult.error.message}`);
      costError.phoneWasSaved = true;
      throw costError;
    }

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
    if (error.phoneWasSaved) {
      closePhoneDialog();
      await loadPhones();
      showMessage(el.galleryFeedback, error.message);
    } else {
      if (newPath) await removeUploadedPhotos([newPath]);
      showMessage(el.formFeedback, error.message);
    }
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
el.cropCurrentPhoto.addEventListener("click", async () => {
  if (!adminAuthorized || !editingPhone) return;
  el.cropCurrentPhoto.disabled = true;
  const originalLabel = el.cropCurrentPhoto.textContent;
  el.cropCurrentPhoto.textContent = "Abriendo foto...";
  try {
    let file = selectedPhoto;
    if (!file) {
      const response = await fetch(editingPhone.imageUrl);
      if (!response.ok) throw new Error(`No se pudo cargar la foto actual (${response.status}).`);
      const blob = await response.blob();
      const extension = photoExtension(blob);
      if (!extension) throw new Error("La foto actual no está en formato JPG, PNG o WEBP.");
      if (blob.size > MAX_PHOTO_SIZE) throw new Error("La foto actual pesa más de 10 MB y no se puede recortar aquí.");
      file = new File([blob], `${editingPhone.name}-recortada.${extension}`, { type: blob.type });
    }
    await openCropEditor(file);
  } catch (error) {
    showMessage(el.formFeedback, error.message);
  } finally {
    el.cropCurrentPhoto.disabled = false;
    el.cropCurrentPhoto.textContent = originalLabel;
  }
});
el.editPhotoText.addEventListener("click", () => {
  openPhotoTextEditor().catch(error => showMessage(el.formFeedback, error.message));
});
el.phoneForm.addEventListener("submit", savePhone);
el.search.addEventListener("input", renderPhones);

async function openPhotoTextEditor() {
  if (!adminAuthorized) return;
  const source = selectedPhoto || editingPhone?.imageUrl;
  if (!source) {
    showMessage(el.formFeedback, "Primero selecciona una foto para agregarle texto.");
    return;
  }
  if (textSourceUrl) URL.revokeObjectURL(textSourceUrl);
  textSourceUrl = source instanceof Blob ? URL.createObjectURL(source) : source;
  el.textImage.src = textSourceUrl;
  await el.textImage.decode();
  textDraft = photoText ? { ...photoText } : null;
  textEditorPosition = textDraft ? { x: textDraft.x, y: textDraft.y } : { x: 50, y: 50 };
  el.overlayCopy.value = textDraft?.text ?? "";
  el.overlaySize.value = String(textDraft?.size ?? 32);
  el.overlayColor.value = textDraft?.color ?? "#ffffff";
  renderTextDraft();
  el.textDialog.showModal();
}

function renderTextDraft() {
  const text = el.overlayCopy.value.trim();
  el.overlaySizeValue.textContent = `${el.overlaySize.value}px`;
  el.textPreview.textContent = text;
  el.textPreview.hidden = !text;
  el.textPreview.style.left = `${textEditorPosition.x}%`;
  el.textPreview.style.top = `${textEditorPosition.y}%`;
  el.textPreview.style.setProperty("--overlay-size", String(Number(el.overlaySize.value) / 4));
  el.textPreview.style.setProperty("--overlay-color", el.overlayColor.value);
}

function closePhotoTextEditor() {
  el.textDialog.close();
}

el.overlayCopy.addEventListener("input", renderTextDraft);
el.overlaySize.addEventListener("input", renderTextDraft);
el.overlayColor.addEventListener("input", renderTextDraft);
el.applyPhotoText.addEventListener("click", () => {
  const text = el.overlayCopy.value.trim();
  photoText = text ? normalizePhotoText({
    text,
    ...textEditorPosition,
    size: Number(el.overlaySize.value),
    color: el.overlayColor.value
  }) : null;
  el.editPhotoText.textContent = photoText ? "Editar texto sobre la foto" : "Escribir sobre la foto";
  closePhotoTextEditor();
});
el.removePhotoText.addEventListener("click", () => {
  photoText = null;
  el.editPhotoText.textContent = "Escribir sobre la foto";
  closePhotoTextEditor();
});
el.closeText.addEventListener("click", closePhotoTextEditor);
el.textDialog.addEventListener("click", event => {
  if (event.target === el.textDialog) closePhotoTextEditor();
});
el.textDialog.addEventListener("close", () => {
  if (textSourceUrl?.startsWith("blob:")) URL.revokeObjectURL(textSourceUrl);
  textSourceUrl = null;
  el.textImage.removeAttribute("src");
  textDraft = null;
});
el.textPreview.addEventListener("pointerdown", event => {
  const bounds = el.textStage.getBoundingClientRect();
  textDrag = { pointerId: event.pointerId, bounds };
  el.textPreview.setPointerCapture(event.pointerId);
});
el.textPreview.addEventListener("pointermove", event => {
  if (!textDrag || textDrag.pointerId !== event.pointerId) return;
  textEditorPosition = {
    x: Math.min(98, Math.max(2, (event.clientX - textDrag.bounds.left) / textDrag.bounds.width * 100)),
    y: Math.min(98, Math.max(2, (event.clientY - textDrag.bounds.top) / textDrag.bounds.height * 100))
  };
  renderTextDraft();
});
el.textPreview.addEventListener("pointerup", event => {
  if (textDrag?.pointerId === event.pointerId) textDrag = null;
});
el.textPreview.addEventListener("pointercancel", () => { textDrag = null; });

el.photo.addEventListener("change", () => {
  const file = el.photo.files?.[0];
  if (!file) return;
  el.photo.value = "";
  const extension = photoExtension(file);
  if (!extension || file.size > MAX_PHOTO_SIZE) {
    showMessage(el.formFeedback, !extension
      ? "La foto debe estar en formato JPG, PNG o WEBP."
      : "La foto debe pesar menos de 10 MB.");
    return;
  }
  showMessage(el.formFeedback, "");
  openCropEditor(file).catch(error => {
    showMessage(el.formFeedback, error.message);
  });
});

function getCropGeometry() {
  const width = cropImage.naturalWidth;
  const height = cropImage.naturalHeight;
  const radians = cropRotation * Math.PI / 180;
  const absoluteCos = Math.abs(Math.cos(radians));
  const absoluteSin = Math.abs(Math.sin(radians));
  const rotatedWidth = width * absoluteCos + height * absoluteSin;
  const rotatedHeight = width * absoluteSin + height * absoluteCos;
  const canvas = el.cropCanvas;
  const fitScale = Math.max(canvas.width / rotatedWidth, canvas.height / rotatedHeight);
  const minimumZoom = Math.max(
    cropRect.width / (rotatedWidth * fitScale),
    cropRect.height / (rotatedHeight * fitScale)
  );
  const maxZoom = Math.max(4, minimumZoom);
  el.cropZoom.min = String(minimumZoom);
  el.cropZoom.max = String(maxZoom);
  cropZoom = Math.min(maxZoom, Math.max(minimumZoom, cropZoom));
  el.cropZoom.value = String(cropZoom);
  const scale = fitScale * cropZoom;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const minPanX = cropRect.x + cropRect.width - centerX - rotatedWidth * scale / 2;
  const maxPanX = cropRect.x - centerX + rotatedWidth * scale / 2;
  const minPanY = cropRect.y + cropRect.height - centerY - rotatedHeight * scale / 2;
  const maxPanY = cropRect.y - centerY + rotatedHeight * scale / 2;
  cropPanX = Math.min(maxPanX, Math.max(minPanX, cropPanX));
  cropPanY = Math.min(maxPanY, Math.max(minPanY, cropPanY));
  return { scale, canvas };
}

function drawCropPreview() {
  if (!cropImage) return;
  const { scale, canvas } = getCropGeometry();
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#242722";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(canvas.width / 2 + cropPanX, canvas.height / 2 + cropPanY);
  context.rotate(cropRotation * Math.PI / 180);
  context.scale(scale, scale);
  context.drawImage(cropImage, -cropImage.naturalWidth / 2, -cropImage.naturalHeight / 2);
  context.restore();
  el.cropSelection.style.left = `${cropRect.x / canvas.width * 100}%`;
  el.cropSelection.style.top = `${cropRect.y / canvas.height * 100}%`;
  el.cropSelection.style.width = `${cropRect.width / canvas.width * 100}%`;
  el.cropSelection.style.height = `${cropRect.height / canvas.height * 100}%`;
}

async function openCropEditor(file, phone = null) {
  cropSourceFile = file;
  cropTargetPhone = phone;
  cropRotation = 0;
  cropZoom = 1;
  cropPanX = 0;
  cropPanY = 0;
  cropRect = { x: 40, y: 50, width: 320, height: 400 };
  el.cropZoom.value = "1";
  if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl);
  cropSourceUrl = URL.createObjectURL(file);
  cropImage = new Image();
  cropImage.src = cropSourceUrl;
  await cropImage.decode();
  const imageScale = Math.min(400 / cropImage.naturalWidth, 500 / cropImage.naturalHeight);
  el.cropCanvas.width = Math.max(1, Math.round(cropImage.naturalWidth * imageScale));
  el.cropCanvas.height = Math.max(1, Math.round(cropImage.naturalHeight * imageScale));
  el.cropStage.style.aspectRatio = `${el.cropCanvas.width} / ${el.cropCanvas.height}`;
  cropRect = { x: 0, y: 0, width: el.cropCanvas.width, height: el.cropCanvas.height };
  drawCropPreview();
  el.cropDialog.showModal();
}

function closeCropEditor() {
  el.cropDialog.close();
}

el.cropDialog.addEventListener("close", () => {
  if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl);
  cropSourceUrl = null;
  cropSourceFile = null;
  cropImage = null;
  cropTargetPhone = null;
  cropDrag = null;
});

function rotateCrop(degrees) {
  cropRotation = (cropRotation + degrees + 360) % 360;
  cropPanX = 0;
  cropPanY = 0;
  drawCropPreview();
}

function applyCrop() {
  if (!cropImage || !cropSourceFile) return;
  const targetPhone = cropTargetPhone;
  const sourceFileName = cropSourceFile.name;
  const { scale } = getCropGeometry();
  const output = document.createElement("canvas");
  output.width = Math.max(1, Math.round(cropRect.width / scale));
  output.height = Math.max(1, Math.round(cropRect.height / scale));
  const context = output.getContext("2d");
  context.setTransform(1 / scale, 0, 0, 1 / scale, -cropRect.x / scale, -cropRect.y / scale);
  context.translate(el.cropCanvas.width / 2 + cropPanX, el.cropCanvas.height / 2 + cropPanY);
  context.rotate(cropRotation * Math.PI / 180);
  context.scale(scale, scale);
  context.drawImage(cropImage, -cropImage.naturalWidth / 2, -cropImage.naturalHeight / 2);
  output.toBlob(blob => {
    if (!blob) {
      showMessage(targetPhone ? el.galleryFeedback : el.formFeedback, "No se pudo procesar el recorte de la foto.");
      return;
    }
    if (blob.size > MAX_PHOTO_SIZE) {
      showMessage(targetPhone ? el.galleryFeedback : el.formFeedback, "La foto recortada pesa más de 10 MB.");
      return;
    }
    const croppedFile = new File([blob], `${sourceFileName.replace(/\.[^.]+$/, "")}-recortada.jpg`, { type: "image/jpeg" });
    if (targetPhone) {
      saveDirectCrop(croppedFile, targetPhone).catch(error => {
        showMessage(el.galleryFeedback, error.message);
        el.applyCrop.disabled = false;
        el.applyCrop.textContent = "Usar esta foto";
      });
      return;
    }
    selectedPhoto = croppedFile;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(blob);
    el.photoPreview.src = previewUrl;
    el.photoPreview.hidden = false;
    el.uploadPrompt.hidden = true;
    closeCropEditor();
    showMessage(el.formFeedback, "");
  }, "image/jpeg", 0.92);
}

async function saveDirectCrop(file, phone) {
  el.applyCrop.disabled = true;
  el.applyCrop.textContent = "Guardando foto...";
  const newPath = await uploadPhoto(file);
  const { error } = await client.from("catalog_phones")
    .update({ image_path: newPath })
    .eq("id", phone.id);
  if (error) {
    await removeUploadedPhotos([newPath]);
    throw new Error(`No se pudo guardar el recorte: ${error.message}`);
  }
  closeCropEditor();
  await loadPhones();
  const { error: removeError } = await client.storage.from(STORAGE_BUCKET).remove([phone.image_path]);
  if (removeError) showToast(`Recorte guardado; no se pudo borrar la foto anterior: ${removeError.message}`);
  else showToast("Foto recortada y guardada.");
}

async function cropCatalogPhone(phone) {
  if (!adminAuthorized || !phone) return;
  try {
    const response = await fetch(phone.imageUrl);
    if (!response.ok) throw new Error(`No se pudo cargar la foto (${response.status}).`);
    const blob = await response.blob();
    const extension = photoExtension(blob);
    if (!extension) throw new Error("La foto actual no está en formato JPG, PNG o WEBP.");
    if (blob.size > MAX_PHOTO_SIZE) throw new Error("La foto actual pesa más de 10 MB y no se puede recortar aquí.");
    await openCropEditor(new File([blob], `${phone.name}.${extension}`, { type: blob.type }), phone);
  } catch (error) {
    showMessage(el.galleryFeedback, error.message);
  }
}

el.cropZoom.addEventListener("input", () => {
  cropZoom = Number(el.cropZoom.value);
  drawCropPreview();
});
el.rotateLeft.addEventListener("click", () => rotateCrop(-90));
el.rotateRight.addEventListener("click", () => rotateCrop(90));
el.applyCrop.addEventListener("click", applyCrop);
el.closeCrop.addEventListener("click", closeCropEditor);
el.cropDialog.addEventListener("click", event => {
  if (event.target === el.cropDialog) closeCropEditor();
});
el.cropCanvas.addEventListener("pointerdown", event => {
  if (!cropImage) return;
  const bounds = el.cropCanvas.getBoundingClientRect();
  cropDrag = {
    mode: "image",
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    scaleX: el.cropCanvas.width / bounds.width,
    scaleY: el.cropCanvas.height / bounds.height
  };
  el.cropCanvas.setPointerCapture(event.pointerId);
});
el.cropCanvas.addEventListener("pointermove", event => {
  if (!cropDrag || cropDrag.pointerId !== event.pointerId || cropDrag.mode !== "image") return;
  cropPanX += (event.clientX - cropDrag.x) * cropDrag.scaleX;
  cropPanY += (event.clientY - cropDrag.y) * cropDrag.scaleY;
  cropDrag.x = event.clientX;
  cropDrag.y = event.clientY;
  drawCropPreview();
});
el.cropCanvas.addEventListener("pointerup", event => {
  if (cropDrag?.pointerId === event.pointerId) cropDrag = null;
});
el.cropCanvas.addEventListener("pointercancel", () => { cropDrag = null; });
el.cropSelection.addEventListener("pointerdown", event => {
  if (!cropImage) return;
  event.preventDefault();
  const bounds = el.cropCanvas.getBoundingClientRect();
  const scaleX = el.cropCanvas.width / bounds.width;
  const scaleY = el.cropCanvas.height / bounds.height;
  const localX = (event.clientX - bounds.left) * scaleX - cropRect.x;
  const localY = (event.clientY - bounds.top) * scaleY - cropRect.y;
  const edge = 24;
  const handle = event.target.closest("[data-crop-handle]")?.dataset.cropHandle;
  const nearWest = localX < edge;
  const nearEast = cropRect.width - localX < edge;
  const nearNorth = localY < edge;
  const nearSouth = cropRect.height - localY < edge;
  const edgeHandle = `${nearNorth ? "n" : nearSouth ? "s" : ""}${nearWest ? "w" : nearEast ? "e" : ""}`;
  cropDrag = {
    mode: handle || edgeHandle ? "resize-selection" : localX < edge * 2 || localY < edge * 2 || cropRect.width - localX < edge * 2 || cropRect.height - localY < edge * 2 ? "move-selection" : "image",
    handle: handle || edgeHandle,
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    scaleX,
    scaleY,
    startRect: { ...cropRect }
  };
  el.cropSelection.setPointerCapture(event.pointerId);
});
el.cropSelection.addEventListener("pointermove", event => {
  if (!cropDrag || cropDrag.pointerId !== event.pointerId) return;
  if (cropDrag.mode === "image") {
    cropPanX += (event.clientX - cropDrag.x) * cropDrag.scaleX;
    cropPanY += (event.clientY - cropDrag.y) * cropDrag.scaleY;
    cropDrag.x = event.clientX;
    cropDrag.y = event.clientY;
    drawCropPreview();
    return;
  }
  const dx = (event.clientX - cropDrag.x) * cropDrag.scaleX;
  const dy = (event.clientY - cropDrag.y) * cropDrag.scaleY;
  const start = cropDrag.startRect;
  const minSize = 30;
  if (cropDrag.mode === "move-selection") {
    cropRect = {
      ...start,
      x: Math.min(el.cropCanvas.width - start.width, Math.max(0, start.x + dx)),
      y: Math.min(el.cropCanvas.height - start.height, Math.max(0, start.y + dy))
    };
  } else {
    const handle = cropDrag.handle;
    let left = start.x;
    let right = start.x + start.width;
    let top = start.y;
    let bottom = start.y + start.height;
    if (handle.includes("w")) left = Math.max(0, Math.min(right - minSize, start.x + dx));
    if (handle.includes("e")) right = Math.min(el.cropCanvas.width, Math.max(left + minSize, start.x + start.width + dx));
    if (handle.includes("n")) top = Math.max(0, Math.min(bottom - minSize, start.y + dy));
    if (handle.includes("s")) bottom = Math.min(el.cropCanvas.height, Math.max(top + minSize, start.y + start.height + dy));
    cropRect = { x: left, y: top, width: right - left, height: bottom - top };
  }
  drawCropPreview();
});
el.cropSelection.addEventListener("pointerup", event => {
  if (cropDrag?.pointerId === event.pointerId) cropDrag = null;
});
el.cropSelection.addEventListener("pointercancel", () => { cropDrag = null; });

el.grid.addEventListener("click", event => {
  const cropButton = event.target.closest("[data-crop]");
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");
  if (cropButton && adminAuthorized) {
    const phone = phones.find(item => item.id === cropButton.dataset.crop);
    if (phone) cropCatalogPhone(phone);
  }
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
