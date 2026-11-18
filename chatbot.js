/**
 * ============================================================================
 * ASSISTENTE DISCRETO COM IA (GITHUB PAGES + CLOUDFLARE WORKER)
 * ============================================================================
 * - Gatilho invisível no canto inferior direito (só aparece ao passar o mouse)
 * - Atalhos rápidos: Alt + Q (abre/fecha) | Esc (esconde na hora)
 * - Aceita colar prints direto com Ctrl+V ou anexar imagem/PDF pelo botão "+"
 * - Otimiza prints grandes automaticamente para responder mais rápido
 * - Envia com segurança para o seu Cloudflare Worker (sem expor chave no site)
 * ============================================================================
 */

(function () {
  const API_URL = 'https://java-ifto.bentoxrxr.workers.dev/';

  if (document.getElementById('poo-chatbot-host')) return;

  function formatarResposta(texto) {
    const escaped = texto
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const blocks = [];
    let html = escaped.replace(/```(?:\w+)?\n?([\s\S]*?)```/g, function (_, code) {
      const idx = blocks.length;
      blocks.push(`<pre><code>${code.trim()}</code></pre>`);
      return `@@CODEBLOCK_${idx}@@`;
    });

    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\n/g, '<br>');

    html = html.replace(/@@CODEBLOCK_(\d+)@@/g, function (_, idx) {
      return blocks[Number(idx)];
    });

    return html;
  }

  // Deixa o texto limpo ao clicar em "Copiar resposta" (sem ```java ou ** extras)
  function limparTextoParaCopia(texto) {
    const t = String(texto || '').trim();
    const matchBlocoUnico = t.match(/^```(?:\w+)?\r?\n([\s\S]*?)\r?\n?```$/);
    if (matchBlocoUnico) {
      return matchBlocoUnico[1].trim();
    }
    return t.replace(/\*\*([^*]+)\*\*/g, '$1');
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result || '';
        const base64 = String(result).split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Reduz prints muito pesados (> 800 KB) mantendo nitidez total para leitura de texto/código
  function processarArquivo(file) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!file.type.startsWith('image/') || file.size <= 800 * 1024) {
          const base64 = await fileToBase64(file);
          return resolve({
            mimeType: file.type || 'application/octet-stream',
            data: base64,
            name: file.name || 'anexo'
          });
        }

        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          const maxDim = 1800;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const scale = Math.min(maxDim / width, maxDim / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          resolve({
            mimeType: 'image/jpeg',
            data: dataUrl.split(',')[1] || '',
            name: file.name || 'print.jpg'
          });
        };
        img.onerror = async () => {
          URL.revokeObjectURL(url);
          const base64 = await fileToBase64(file);
          resolve({
            mimeType: file.type || 'image/png',
            data: base64,
            name: file.name || 'print.png'
          });
        };
        img.src = url;
      } catch (err) {
        reject(err);
      }
    });
  }

  const host = document.createElement('div');
  host.id = 'poo-chatbot-host';
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
    <style>
      :host {
        all: initial;
        font-family: "Open Sans", sans-serif;
        color: #333;
      }
      * {
        box-sizing: border-box;
      }

      /* Gatilho invisível no canto inferior direito (branco igual ao fundo) */
      .trigger {
        position: fixed;
        right: 10px;
        bottom: 10px;
        width: 34px;
        height: 26px;
        z-index: 99999;
        background: #ffffff;
        color: transparent;
        border: 1px solid transparent;
        border-radius: 4px;
        font-size: 11px;
        cursor: default;
        opacity: 0;
        transition: opacity 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
      }
      .trigger:hover {
        opacity: 1;
        background: #fafafa;
        border-color: #e2e2e2;
        color: #b0b0b0;
        cursor: pointer;
      }

      /* Painel minimalista e discreto */
      .panel {
        position: fixed;
        right: 12px;
        bottom: 42px;
        z-index: 99999;
        width: 390px;
        max-width: calc(100vw - 24px);
        max-height: 78vh;
        background: #ffffff;
        border: 1px solid #e6e6e6;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        display: none;
        flex-direction: column;
        padding: 8px;
        gap: 6px;
      }
      .panel.open {
        display: flex;
      }

      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        color: #999;
      }
      .topbar-right {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .link-btn {
        background: none;
        border: none;
        padding: 0 2px;
        font-size: 11px;
        color: #aaa;
        cursor: pointer;
      }
      .link-btn:hover {
        color: #555;
      }

      .attachment-chip {
        display: none;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        background: #f7f7f7;
        border: 1px solid #e5e5e5;
        border-radius: 3px;
        padding: 4px 8px;
        font-size: 11px;
        color: #555;
      }
      .attachment-chip.visible {
        display: flex;
      }
      .attachment-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .prompt-row {
        display: flex;
        gap: 4px;
        align-items: flex-start;
      }
      .prompt-row textarea {
        flex: 1;
        resize: vertical;
        min-height: 44px;
        max-height: 120px;
        border: 1px solid #e5e5e5;
        border-radius: 3px;
        padding: 6px 8px;
        font-family: inherit;
        font-size: 12px;
        color: #333;
        background: #ffffff;
        outline: none;
      }
      .prompt-row textarea:focus {
        border-color: #cccccc;
      }
      .small-btn {
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
        border-radius: 3px;
        padding: 5px 8px;
        font-size: 11px;
        color: #555;
        cursor: pointer;
        height: 28px;
      }
      .small-btn:hover {
        background: #ececec;
      }
      .small-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .output-wrap {
        display: none;
        flex-direction: column;
        gap: 6px;
        border-top: 1px solid #efefef;
        padding-top: 6px;
      }
      .output-wrap.visible {
        display: flex;
      }
      .output {
        overflow-y: auto;
        max-height: 46vh;
        padding: 4px 2px;
        font-size: 12px;
        line-height: 1.5;
        color: #333;
        word-wrap: break-word;
      }
      .output pre {
        background: #f7f7f8;
        color: #222;
        border: 1px solid #eaeaea;
        padding: 8px;
        border-radius: 3px;
        overflow-x: auto;
        font-family: "Droid Sans Mono", monospace;
        font-size: 11.5px;
        margin: 6px 0;
        white-space: pre-wrap;
      }
      .output code {
        font-family: "Droid Sans Mono", monospace;
        background: #f5f5f5;
        padding: 1px 3px;
        border-radius: 2px;
        font-size: 11.5px;
      }
      .output pre code {
        background: transparent;
        padding: 0;
      }
      .output-actions {
        display: flex;
        justify-content: flex-end;
      }
    </style>

    <button class="trigger" id="triggerBtn" aria-label="Abrir">···</button>

    <div class="panel" id="panel">
      <div class="topbar">
        <button class="link-btn" id="attachBtn" title="Anexar imagem ou PDF">+ anexo</button>
        <input type="file" id="fileInput" accept="image/*,application/pdf" style="display:none;" />
        <div class="topbar-right">
          <button class="link-btn" id="clearBtn" title="Limpar">limpar</button>
          <button class="link-btn" id="closeBtn" title="Fechar (Esc)">×</button>
        </div>
      </div>

      <div class="attachment-chip" id="attachmentChip">
        <span class="attachment-name" id="attachmentName"></span>
        <button class="link-btn" id="removeAttachmentBtn" title="Remover anexo">×</button>
      </div>

      <div class="prompt-row">
        <textarea id="promptInput" rows="2" placeholder="Cole a questão ou print (Ctrl+V)..."></textarea>
        <button class="small-btn" id="sendBtn">ir</button>
      </div>

      <div class="output-wrap" id="outputWrap">
        <div class="output" id="output"></div>
        <div class="output-actions">
          <button class="small-btn" id="copyBtn" style="display:none;">Copiar resposta</button>
        </div>
      </div>
    </div>
  `;

  const triggerBtn = shadow.getElementById('triggerBtn');
  const panel = shadow.getElementById('panel');
  const closeBtn = shadow.getElementById('closeBtn');
  const clearBtn = shadow.getElementById('clearBtn');
  const attachBtn = shadow.getElementById('attachBtn');
  const fileInput = shadow.getElementById('fileInput');
  const attachmentChip = shadow.getElementById('attachmentChip');
  const attachmentName = shadow.getElementById('attachmentName');
  const removeAttachmentBtn = shadow.getElementById('removeAttachmentBtn');
  const promptInput = shadow.getElementById('promptInput');
  const sendBtn = shadow.getElementById('sendBtn');
  const outputWrap = shadow.getElementById('outputWrap');
  const output = shadow.getElementById('output');
  const copyBtn = shadow.getElementById('copyBtn');

  let anexoAtual = null;
  let ultimaRespostaTexto = '';
  let carregando = false;

  function definirAnexo(obj) {
    anexoAtual = obj;
    attachmentName.textContent = obj.name;
    attachmentChip.classList.add('visible');
  }

  function limparAnexo() {
    anexoAtual = null;
    fileInput.value = '';
    attachmentName.textContent = '';
    attachmentChip.classList.remove('visible');
  }

  function alternarPainel() {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
      setTimeout(() => promptInput.focus(), 10);
    }
  }

  triggerBtn.addEventListener('click', alternarPainel);

  closeBtn.addEventListener('click', () => {
    panel.classList.remove('open');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('open')) {
      panel.classList.remove('open');
    } else if (e.altKey && (e.key === 'q' || e.key === 'Q')) {
      e.preventDefault();
      alternarPainel();
    }
  });

  attachBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const proc = await processarArquivo(file);
    definirAnexo(proc);
    promptInput.focus();
  });

  removeAttachmentBtn.addEventListener('click', limparAnexo);

  panel.addEventListener('paste', async (e) => {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;

    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
          e.preventDefault();
          const proc = await processarArquivo(file);
          definirAnexo(proc);
          promptInput.focus();
          return;
        }
      }
    }
  });

  clearBtn.addEventListener('click', () => {
    promptInput.value = '';
    ultimaRespostaTexto = '';
    output.innerHTML = '';
    outputWrap.classList.remove('visible');
    copyBtn.style.display = 'none';
    limparAnexo();
    promptInput.focus();
  });

  copyBtn.addEventListener('click', () => {
    if (!ultimaRespostaTexto) return;
    const textoLimpo = limparTextoParaCopia(ultimaRespostaTexto);
    navigator.clipboard.writeText(textoLimpo).then(() => {
      copyBtn.textContent = 'Copiado!';
      setTimeout(() => {
        copyBtn.textContent = 'Copiar resposta';
      }, 1200);
    });
  });

  async function enviarPrompt() {
    const texto = promptInput.value.trim();
    if ((!texto && !anexoAtual) || carregando) return;

    carregando = true;
    sendBtn.disabled = true;
    copyBtn.style.display = 'none';
    output.textContent = '...';
    outputWrap.classList.add('visible');

    try {
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texto: texto,
          anexo: anexoAtual
            ? { mimeType: anexoAtual.mimeType, data: anexoAtual.data }
            : null
        })
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data?.error || `Erro ${resp.status}`);
      }

      const respostaIA = data?.text || 'Sem resposta.';
      ultimaRespostaTexto = respostaIA;
      output.innerHTML = formatarResposta(respostaIA);
      copyBtn.style.display = 'inline-block';
    } catch (err) {
      output.textContent = 'Erro: ' + (err.message || 'falha na requisição.');
    } finally {
      carregando = false;
      sendBtn.disabled = false;
    }
  }

  sendBtn.addEventListener('click', enviarPrompt);
  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarPrompt();
    }
  });
})();
