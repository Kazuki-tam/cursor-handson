/*
  ブラウザ版・領収書OCRアプリ（OpenAIベース）
  - 入力: ファイル選択 / D&D
  - 前処理: 縮小, グレースケール, 二値化, 回転
  - OCR: OpenAI（Responses API, gpt-4o-mini）へ data URL を送信
  - 出力: テキスト表示, コピー, .txt 保存
*/

(() => {
  'use strict';

  // UI Elements
  const fileInput = document.getElementById('fileInput');
  const browseBtn = document.getElementById('browseBtn');
  const dropzone = document.getElementById('dropzone');
  const previewCanvas = document.getElementById('previewCanvas');
  const langSelect = document.getElementById('lang');
  const startBtn = document.getElementById('startBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const outputTextarea = document.getElementById('output');
  const copyBtn = document.getElementById('copyBtn');
  const saveBtn = document.getElementById('saveBtn');
  const openaiKeyWrap = document.getElementById('openaiKeyWrap');
  const openaiKeyInput = document.getElementById('openaiKey');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');

  // State
  let originalImageBitmap = null;
  let isRunning = false;
  let currentRequestController = null;

  // Helpers
  function setProgress(percent, text) {
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    progressBar.style.width = `${clamped}%`;
    progressText.textContent = text ?? `${clamped}%`;
  }

  function setRunning(running) {
    isRunning = running;
    startBtn.disabled = running || !originalImageBitmap;
    cancelBtn.disabled = !running;
    browseBtn.disabled = running;
    fileInput.disabled = running;
    copyBtn.disabled = running || outputTextarea.value.length === 0;
    saveBtn.disabled = running || outputTextarea.value.length === 0;
    langSelect.disabled = running;
  }

  function enableOutputButtonsIfAny() {
    const hasText = outputTextarea.value.length > 0;
    copyBtn.disabled = !hasText || isRunning;
    saveBtn.disabled = !hasText || isRunning;
  }

  function resetProgress() {
    setProgress(0, '待機中');
  }

  function isImageFile(file) {
    return file && /image\/(png|jpeg)/.test(file.type);
  }

  function showToast(message, type = 'success') {
    toastMessage.textContent = message;

    // Set toast color based on type
    if (type === 'success') {
      toast.className = toast.className.replace(/bg-\w+-500/, 'bg-green-500');
    } else if (type === 'error') {
      toast.className = toast.className.replace(/bg-\w+-500/, 'bg-red-500');
    }

    // Show toast
    toast.classList.remove('translate-x-full');
    toast.classList.add('translate-x-0');

    // Hide toast after 3 seconds
    setTimeout(() => {
      toast.classList.remove('translate-x-0');
      toast.classList.add('translate-x-full');
    }, 3000);
  }

  async function fileToImageBitmap(file) {
    if ('createImageBitmap' in window) {
      // 直接 Blob を渡すことで余計な fetch を避ける
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    }
    const blobUrl = URL.createObjectURL(file);
    try {
      return await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = blobUrl;
      });
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }

  function drawImageToCanvas(imageBitmap) {
    const maxSide = 2000; // 固定値として設定

    // 元画像の寸法
    const sourceWidth = imageBitmap.width;
    const sourceHeight = imageBitmap.height;

    // 縮小比率
    const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

    // キャンバスに描画
    const canvas = previewCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // シンプルな描画
    ctx.drawImage(
      imageBitmap,
      0,
      0,
      sourceWidth,
      sourceHeight,
      0,
      0,
      targetWidth,
      targetHeight
    );
  }

  async function runOCR() {
    if (!originalImageBitmap) return;
    const lang = langSelect.value || 'ja';

    setRunning(true);
    setProgress(1, '初期化中');
    outputTextarea.value = '';
    enableOutputButtonsIfAny();
    try {
      const apiKey = (openaiKeyInput?.value || '').trim();
      if (!apiKey) {
        alert('OpenAI API Key を入力してください。');
        setRunning(false);
        return;
      }
      setProgress(5, '画像をエンコード中');
      const dataUrl = previewCanvas.toDataURL('image/png');
      const model = 'gpt-4o-mini';
      const prompt = lang === 'ja'
        ? '画像は領収書です。読み取れたテキストをできるだけ正確に抽出してください。もし元の文字が他の言語の場合は、日本語に翻訳してください。'
        : lang === 'en'
          ? 'This is a receipt image. Extract the text content accurately. If the original text is in other languages, translate it to English.'
          : '이 이미지는 영수증입니다. 텍스트 내용을 정확하게 추출해주세요. 원본 텍스트가 다른 언어인 경우 한국어로 번역해주세요.';

      const responseSchema = {
        type: "object",
        properties: {
          extracted_text: {
            type: "string",
            description: lang === 'ja'
              ? "領収書から抽出されたテキスト内容（日本語）"
              : lang === 'en'
                ? "The extracted text content from the receipt (in English)"
                : "영수증에서 추출된 텍스트 내용 (한국어)"
          }
        },
        required: ["extracted_text"],
        additionalProperties: false
      };

      const body = {
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUrl } }
            ]
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "receipt_ocr_result",
            strict: true,
            schema: responseSchema
          }
        }
      };

      setProgress(10, 'OpenAIへ送信中');
      currentRequestController = new AbortController();
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body),
        signal: currentRequestController.signal
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI API error: ${res.status} ${errText}`);
      }
      const json = await res.json();
      const messageContent = json?.choices?.[0]?.message?.content || '';
      let extractedText = '';

      try {
        const parsedContent = JSON.parse(messageContent);
        extractedText = parsedContent?.extracted_text || '';
      } catch (e) {
        // JSONパースに失敗した場合は、そのままのテキストを使用
        extractedText = messageContent;
      }

      outputTextarea.value = extractedText;
      setProgress(100, '完了');
      enableOutputButtonsIfAny();
    } catch (err) {
      if (err?.name === 'AbortError') {
        setProgress(0, 'キャンセルしました');
      } else {
        console.error(err);
        alert(`OpenAI OCRでエラーが発生しました: ${err?.message || err}`);
        resetProgress();
      }
    } finally {
      currentRequestController = null;
      setRunning(false);
    }
  }

  function cancelOCR() {
    if (currentRequestController) {
      try { currentRequestController.abort(); } catch (_) { }
    }
  }

  // Events: 入力/D&D
  browseBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!isImageFile(file)) {
      alert('PNG または JPEG の画像を選択してください。');
      return;
    }
    originalImageBitmap = await fileToImageBitmap(file);
    drawImageToCanvas(originalImageBitmap);
    startBtn.disabled = !originalImageBitmap;
  });

  ;['dragenter', 'dragover'].forEach(type => {
    dropzone.addEventListener(type, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('ring-2', 'ring-blue-400');
    });
  });
  ;['dragleave', 'drop'].forEach(type => {
    dropzone.addEventListener(type, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('ring-2', 'ring-blue-400');
    });
  });
  dropzone.addEventListener('drop', async (e) => {
    const dt = e.dataTransfer;
    const file = dt && dt.files && dt.files[0];
    if (!isImageFile(file)) {
      alert('PNG または JPEG の画像をドロップしてください。');
      return;
    }
    originalImageBitmap = await fileToImageBitmap(file);
    drawImageToCanvas(originalImageBitmap);
    startBtn.disabled = !originalImageBitmap;
  });



  // OpenAIキー欄は常時表示（index.html側で表示済み）

  // OCR実行/キャンセル
  startBtn.addEventListener('click', () => {
    if (!originalImageBitmap) {
      alert('先に画像を選択してください。');
      return;
    }
    runOCR();
  });
  cancelBtn.addEventListener('click', cancelOCR);

  // 出力: コピー/保存
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(outputTextarea.value);
      showToast('クリップボードにコピーしました', 'success');
    } catch (err) {
      showToast('クリップボードへコピーできませんでした', 'error');
    }
  });

  saveBtn.addEventListener('click', () => {
    const blob = new Blob([outputTextarea.value || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const lang = langSelect.value || 'ja';
    a.download = `ocr-result-${lang}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  // 初期状態
  resetProgress();
  setRunning(false);
})();


