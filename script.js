const STORAGE_KEY = "valentine-photos";

const initialPhotos = [
  {
    image: "",
    caption: "",
  },
];

const slidesEl = document.querySelector("#slides");
const dotsEl = document.querySelector("#dots");
const prevButton = document.querySelector("#prevSlide");
const nextButton = document.querySelector("#nextSlide");
const form = document.querySelector("#photoForm");
const photoInput = document.querySelector("#photoInput");
const captionInput = document.querySelector("#captionInput");
const saveModal = document.querySelector("#saveModal");
const confirmSavePhotoButton = document.querySelector("#confirmSavePhoto");
const cancelSavePhotoButton = document.querySelector("#cancelSavePhoto");

let photos = loadPhotos();
let currentIndex = 0;
let modalResolver = null;

function loadPhotos() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return initialPhotos;
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length ? parsed : initialPhotos;
  } catch {
    return initialPhotos;
  }
}

function savePhotos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
    return true;
  } catch {
    return false;
  }
}

function renderCarousel() {
  slidesEl.innerHTML = "";
  dotsEl.innerHTML = "";

  photos.forEach((photo, index) => {
    const slide = document.createElement("article");
    slide.className = "slide";

    if (photo.image) {
      const image = document.createElement("img");
      image.src = photo.image;
      image.alt = photo.caption || `Foto ${index + 1}`;
      slide.appendChild(image);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "placeholder-slide";
      slide.appendChild(placeholder);
    }

    const caption = document.createElement("div");
    caption.className = "slide-caption";
    caption.textContent = photo.caption;
    slide.appendChild(caption);

    slidesEl.appendChild(slide);

    const dot = document.createElement("button");
    dot.className = "dot";
    dot.type = "button";
    dot.setAttribute("aria-label", `Ir para foto ${index + 1}`);
    dot.setAttribute("aria-current", index === currentIndex ? "true" : "false");
    dot.addEventListener("click", () => goToSlide(index));
    dotsEl.appendChild(dot);
  });

  updateCarousel();
}

function updateCarousel() {
  currentIndex = Math.max(0, Math.min(currentIndex, photos.length - 1));
  slidesEl.style.transform = `translateX(-${currentIndex * 100}%)`;

  [...dotsEl.children].forEach((dot, index) => {
    dot.setAttribute("aria-current", index === currentIndex ? "true" : "false");
  });
}

function goToSlide(index) {
  currentIndex = index;
  updateCarousel();
}

function goToNextSlide() {
  currentIndex = (currentIndex + 1) % photos.length;
  updateCarousel();
}

function goToPreviousSlide() {
  currentIndex = (currentIndex - 1 + photos.length) % photos.length;
  updateCarousel();
}

function readPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resizePhoto(imageSource) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const maxSize = 1400;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);

      const context = canvas.getContext("2d");

      if (!context) {
        resolve(imageSource);
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => resolve(imageSource);
    image.src = imageSource;
  });
}

function askToSavePhoto() {
  if (!saveModal || !confirmSavePhotoButton) {
    return Promise.resolve(window.confirm("Deseja salvar esta foto na pagina?"));
  }

  saveModal.hidden = false;
  confirmSavePhotoButton.focus();

  return new Promise((resolve) => {
    modalResolver = resolve;
  });
}

function closeSaveModal(shouldSave) {
  if (!saveModal) {
    return;
  }

  saveModal.hidden = true;

  if (modalResolver) {
    modalResolver(shouldSave);
    modalResolver = null;
  }
}

async function saveSelectedPhoto() {
  const file = photoInput.files[0];
  const caption = captionInput.value.trim();

  if (!file) {
    return;
  }

  const shouldSave = await askToSavePhoto();

  if (!shouldSave) {
    photoInput.value = "";
    return;
  }

  const image = await resizePhoto(await readPhoto(file));
  const isOnlyPlaceholder = photos.length === 1 && !photos[0].image;

  if (isOnlyPlaceholder) {
    photos = [{ image, caption }];
    currentIndex = 0;
  } else {
    photos.push({ image, caption });
    currentIndex = photos.length - 1;
  }

  if (!savePhotos()) {
    window.alert(
      "A foto apareceu na pagina, mas nao foi possivel salvar porque o armazenamento local esta cheio."
    );
    renderCarousel();
    form.reset();
    return;
  }

  window.location.reload();
}

prevButton.addEventListener("click", goToPreviousSlide);
nextButton.addEventListener("click", goToNextSlide);
photoInput.addEventListener("change", saveSelectedPhoto);

if (confirmSavePhotoButton && cancelSavePhotoButton && saveModal) {
  confirmSavePhotoButton.addEventListener("click", () => closeSaveModal(true));
  cancelSavePhotoButton.addEventListener("click", () => closeSaveModal(false));
  saveModal.addEventListener("click", (event) => {
    if (event.target === saveModal) {
      closeSaveModal(false);
    }
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
});

document.addEventListener("keydown", (event) => {
  if (saveModal && !saveModal.hidden && event.key === "Escape") {
    closeSaveModal(false);
  }

  if (event.key === "ArrowRight") {
    goToNextSlide();
  }

  if (event.key === "ArrowLeft") {
    goToPreviousSlide();
  }
});

renderCarousel();
