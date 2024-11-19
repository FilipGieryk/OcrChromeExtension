const text = document.getElementById("text");

const id = new URLSearchParams(location.search).get("id");
window.addEventListener("message", (e) => {
  const request = e.data;
  Tesseract.createWorker("eng", 1, {
    workerBlobURL: false,
    workerPath: "tesseract/worker.min.js",
    corePath: "tesseract/tesseract-core-simd-lstm.wasm.js",
    cacheMethod: "none",
    langPath: "https://tessdata.projectnaptha.com/4.0.0",
    errorHandler(e) {
      console.warn(e);
    },
  }).then(async (worker) => {
    try {
      const result = (await worker.recognize(request)).data;
      text.innerHTML = result.text;

      chrome.runtime.sendMessage({
        action: "forwardToContent",
        data: result.text,
      });
    } catch (e) {
      console.error("Error during OCR processing:", e);
    } finally {
      await worker.terminate();
    }
  });
});
