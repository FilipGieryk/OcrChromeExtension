let isSelecting = false;

function createOverlay() {
  overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.backgroundColor = "rgba(128, 128, 128, 0.2)";
  overlay.style.zIndex = "999999";
  document.body.appendChild(overlay);
}

function startSelection(e) {
  isSelecting = true;
  startX = e.pageX;
  startY = e.pageY;

  selectionRect = document.createElement("div");
  selectionRect.style.position = "absolute";
  selectionRect.style.border = "2px dashed black";
  selectionRect.style.backgroundColor = "rgba(255, 255, 255, 0)";
  selectionRect.style.zIndex = "999999999";
  document.body.appendChild(selectionRect);
}

function updateSelection(e) {
  if (!isSelecting) return;

  const width = e.pageX - startX;
  const height = e.pageY - startY;

  selectionRect.style.left = Math.min(e.pageX, startX) + "px";
  selectionRect.style.top = Math.min(e.pageY, startY) + "px";
  selectionRect.style.width = Math.abs(width) + "px";
  selectionRect.style.height = Math.abs(height) + "px";
  updateOverlayExclusion();
}

function updateOverlayExclusion() {
  const rect = selectionRect.getBoundingClientRect();

  overlay.style.maskImage = `
    linear-gradient(to right, rgba(0, 0, 0, 1) ${rect.left}px, transparent ${rect.left}px, transparent ${rect.right}px, rgba(0, 0, 0, 1) ${rect.right}px),
    linear-gradient(to bottom, rgba(0, 0, 0, 1) ${rect.top}px, transparent ${rect.top}px, transparent ${rect.bottom}px, rgba(0, 0, 0, 1) ${rect.bottom}px)
  `;
}

function endSelection() {
  isSelecting = false;

  captureScreenshot();

  if (selectionRect) {
    document.body.removeChild(selectionRect);
    selectionRect = null;
  }
  if (overlay) {
    document.body.removeChild(overlay);
    overlay = null;
  }

  document.body.removeEventListener("mousedown", startSelection);
  document.body.removeEventListener("mousemove", updateSelection);
  document.body.removeEventListener("mouseup", endSelection);
}

function captureScreenshot() {
  const rect = selectionRect.getBoundingClientRect();

  const pixelRatio = window.devicePixelRatio || 1;

  chrome.runtime.sendMessage({ action: "captureVisibleTab" }, (dataUrl) => {
    if (dataUrl) {
      const image = new Image();
      image.src = dataUrl;
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = rect.width;
        canvas.height = rect.height;
        const ctx = canvas.getContext("2d");

        ctx.drawImage(
          image,
          rect.left * pixelRatio,
          rect.top * pixelRatio,
          rect.width * pixelRatio,
          rect.height * pixelRatio,
          0,
          0,
          rect.width * pixelRatio,
          rect.height * pixelRatio
        );

        const croppedImageDataUrl = canvas.toDataURL("image/png");

        new Promise((resolve, reject) => {
          const frame = document.createElement("iframe");
          const id = "worker-" + Math.random();
          frame.src = chrome.runtime.getURL("/ocr.html?id=" + id);
          frame.style.display = "none";
          frame.onload = () =>
            frame.contentWindow.postMessage(croppedImageDataUrl, "*");
          document.documentElement.append(frame);
          console.log();
          // signal.addEventListener("abort", () => frame.remove());
        });
      };
    }
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "ocrResult") {
    textToClipboard(message.data);
    const popup = document.createElement("popup");
    popup.style.position = "fixed";
    popup.style.top = 0;
    popup.style.right = 0;
    popup.style.backgroundColor = "rgba(200, 200, 200, 1)";
    popup.style.borderRadius = "20px";
    popup.style.width = "200px";
    popup.style.height = "100px";
    popup.style.zIndex = "9999999";
    popup.textContent = "copied text to clipboard";
    popup.style.display = "flex";
    popup.style.justifyContent = "center";
    popup.style.alignItems = "center";
    popup.style.fontSize = "18px";
    document.body.appendChild(popup);
    setTimeout(() => {
      popup.remove();
    }, 1000);
  }
  return true;
});

function textToClipboard(data) {
  navigator.clipboard
    .writeText(data)
    .then(() => {
      console.log("Text copied to clipboard successfully!");
    })
    .catch((err) => {
      console.error("Failed to copy text: ", err);
    });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "changeBackground") {
    createOverlay();
    document.body.style.cursor =
      "url('chrome-extension://" +
      chrome.runtime.id +
      "/x-cursor.png') 8 8, auto";

    document.body.addEventListener("mousedown", startSelection);
    document.body.addEventListener("mousemove", updateSelection);
    document.body.addEventListener("mouseup", endSelection);
  }
});
