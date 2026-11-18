/**
 * ============================================================================
 * MODO CAMUFLADO NO TEXTO DA APOSTILA (OTIMIZADO PARA GOOGLE FORMS / LINUX)
 * ============================================================================
 * 1. JEITO AUTOMÁTICO (1 único Ctrl+C -> Ctrl+V):
 *    Selecione a questão inteira no Google Forms (texto + imagem no meio +
 *    alternativas), aperte Ctrl+C e dê Ctrl+V direto na apostila.
 *    O script extrai automaticamente tanto o texto quanto o <img> embutido no
 *    HTML copiado do Google Forms!
 *
 * 2. JEITO EM ETAPAS (Alt + Q -> vários Ctrl+V -> Enter):
 *    Ideal quando quiser copiar separado (ex: copiar texto + botão direito na
 *    imagem "Copiar imagem") sem abrir ferramenta de print:
 *    - Aperte Alt + Q: aparece um discreto "(0)" no fim do parágrafo.
 *    - Dê Ctrl + V do texto -> vira "(1)" (sem mostrar o texto na tela!).
 *    - Clique direito na imagem -> "Copiar imagem" -> dê Ctrl + V -> vira "(2)".
 *    - Aperte Enter -> envia tudo junto de uma vez e mostra a resposta exata!
 *
 * 3. CLIQUE EM CIMA DA RESPOSTA: copia limpo (Ctrl+C) e já apaga da tela!
 * 4. CLIQUE FORA OU ESC: apaga tudo instantaneamente (0ms)!
 * ============================================================================
 */

(function () {
  if (
    window.location.protocol !== 'file:' &&
    window.location.pathname.endsWith('/index.html')
  ) {
    const urlLimpa =
      window.location.pathname.slice(0, -'index.html'.length) +
      window.location.search +
      window.location.hash;
    window.history.replaceState(null, '', urlLimpa);
  }

  const API_URL = 'https://java-ifto.bentoxrxr.workers.dev/';

  if (window.__pooCamoInit) return;
  window.__pooCamoInit = true;

  let ultimoParagrafoHover = null;
  let elementoAtivo = null;
  let editorInline = null;
  let textoParaCopiar = '';
  let requisicaoId = 0;

  // Estado do Modo Juntar Partes (Alt + Q)
  let modoAcumular = false;
  let paragrafoAcumular = null;
  let filaTextos = [];
  let filaAnexos = [];
  let filaImageUrls = [];

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*,application/pdf';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  document.addEventListener(
    'mouseover',
    (e) => {
      const p = e.target && e.target.closest ? e.target.closest('#content p') : null;
      if (p && !p.closest('[data-ai-camo]')) {
        ultimoParagrafoHover = p;
      }
    },
    { passive: true }
  );

  function obterParagrafoAlvo() {
    if (ultimoParagrafoHover && document.body.contains(ultimoParagrafoHover)) {
      return ultimoParagrafoHover;
    }
    const paragrafos = Array.from(document.querySelectorAll('#content p')).filter(
      (p) => !p.closest('[data-ai-camo]')
    );
    for (const p of paragrafos) {
      const r = p.getBoundingClientRect();
      if (r.bottom > 30 && r.top < window.innerHeight - 30) {
        return p;
      }
    }
    return paragrafos[0] || document.body;
  }

  function obterBlocoPaiParaInsercao(p) {
    return p.closest('.paragraph, .olist, .ulist, .listingblock, .openblock') || p;
  }

  function limparTudo() {
    requisicaoId++;
    modoAcumular = false;
    paragrafoAcumular = null;
    filaTextos = [];
    filaAnexos = [];
    filaImageUrls = [];

    if (elementoAtivo && elementoAtivo.parentNode) {
      elementoAtivo.parentNode.removeChild(elementoAtivo);
    }
    elementoAtivo = null;

    if (editorInline && editorInline.parentNode) {
      editorInline.parentNode.removeChild(editorInline);
    }
    editorInline = null;
    textoParaCopiar = '';
  }

  function copiarTextoFallback(str) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(str).catch(() => {});
    }
    const ta = document.createElement('textarea');
    ta.value = str;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch {}
    document.body.removeChild(ta);
  }

  function anexarCliqueCopiaESome(el) {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (textoParaCopiar) {
        copiarTextoFallback(textoParaCopiar);
      }
      limparTudo();
    });
  }

  function mostrarStatusInline(pAlvo, textoCurto) {
    if (elementoAtivo && elementoAtivo.parentNode) {
      elementoAtivo.parentNode.removeChild(elementoAtivo);
    }
    const span = document.createElement('span');
    span.setAttribute('data-ai-camo', 'status');
    span.textContent = ` ${textoCurto}`;
    span.style.opacity = '0.45';
    pAlvo.appendChild(span);
    elementoAtivo = span;
  }

  function renderizarRespostaCamuflada(pAlvo, dados) {
    if (elementoAtivo && elementoAtivo.parentNode) {
      elementoAtivo.parentNode.removeChild(elementoAtivo);
    }
    elementoAtivo = null;

    const tipo = dados.tipo || 'DISCURSIVA';
    const exibicao = String(dados.text || '').trim();
    textoParaCopiar = String(dados.copy || exibicao).trim();

    if (!exibicao) return;

    if (tipo === 'MULTIPLA_ESCOLHA' || tipo === 'MULTIPLA_SELECAO' || exibicao.length <= 28) {
      const span = document.createElement('span');
      span.setAttribute('data-ai-camo', 'ans');
      const formatado = exibicao.startsWith('(') ? ` ${exibicao}` : ` (${exibicao})`;
      span.textContent = formatado;
      span.style.cursor = 'text';
      anexarCliqueCopiaESome(span);
      pAlvo.appendChild(span);
      elementoAtivo = span;
      return;
    }

    const blocoRef = obterBlocoPaiParaInsercao(pAlvo);

    if (tipo === 'CODIGO_JAVA') {
      const wrapper = document.createElement('div');
      wrapper.className = 'listingblock';
      wrapper.setAttribute('data-ai-camo', 'ans');
      const content = document.createElement('div');
      content.className = 'content';
      const pre = document.createElement('pre');
      pre.className = 'highlight';
      const code = document.createElement('code');
      code.textContent = exibicao;
      pre.appendChild(code);
      content.appendChild(pre);
      wrapper.appendChild(content);
      wrapper.style.cursor = 'text';
      anexarCliqueCopiaESome(wrapper);
      blocoRef.insertAdjacentElement('afterend', wrapper);
      elementoAtivo = wrapper;
      return;
    }

    const divP = document.createElement('div');
    divP.className = 'paragraph';
    divP.setAttribute('data-ai-camo', 'ans');
    const pNovo = document.createElement('p');
    pNovo.textContent = exibicao;
    divP.appendChild(pNovo);
    divP.style.cursor = 'text';
    anexarCliqueCopiaESome(divP);
    blocoRef.insertAdjacentElement('afterend', divP);
    elementoAtivo = divP;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result || '';
        resolve(String(result).split(',')[1] || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function processarArquivo(file) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!file.type.startsWith('image/') || file.size <= 800 * 1024) {
          const base64 = await fileToBase64(file);
          return resolve({
            mimeType: file.type || 'application/octet-stream',
            data: base64
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
            data: dataUrl.split(',')[1] || ''
          });
        };
        img.onerror = async () => {
          URL.revokeObjectURL(url);
          const base64 = await fileToBase64(file);
          resolve({
            mimeType: file.type || 'image/png',
            data: base64
          });
        };
        img.src = url;
      } catch (err) {
        reject(err);
      }
    });
  }

  // Extrai imagens embutidas no HTML quando você seleciona texto + imagem juntos no Google Forms
  function extrairImagensDoHtmlCopiado(html) {
    const dataAnexos = [];
    const urlsRemotas = [];
    if (!html) return { dataAnexos, urlsRemotas };

    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const imgs = Array.from(doc.querySelectorAll('img'));
      for (const img of imgs) {
        const src = (img.getAttribute('src') || '').trim();
        if (!src) continue;
        if (src.startsWith('data:image/')) {
          const partes = src.split(',');
          const mimeMatch = partes[0].match(/^data:(image\/[^;]+);base64$/i);
          if (mimeMatch && partes[1]) {
            dataAnexos.push({ mimeType: mimeMatch[1], data: partes[1] });
          }
        } else if (/^https?:\/\//i.test(src)) {
          // Ignora ícones minúsculos de interface se tiverem largura/altura declarada < 24px
          const w = Number(img.getAttribute('width') || 0);
          const h = Number(img.getAttribute('height') || 0);
          if ((w > 0 && w < 24) || (h > 0 && h < 24)) continue;
          urlsRemotas.push(src);
        }
      }
    } catch {}

    return {
      dataAnexos: dataAnexos.slice(0, 4),
      urlsRemotas: [...new Set(urlsRemotas)].slice(0, 4)
    };
  }

  // Tenta baixar no navegador se tiver permissão CORS; o que não der vai via Worker
  async function resolverUrlsNoNavegadorOuWorker(urls) {
    const anexosResolvidos = [];
    const urlsParaWorker = [];

    await Promise.all(
      urls.map(async (u) => {
        try {
          const r = await fetch(u, { mode: 'cors', credentials: 'omit' });
          if (!r.ok) throw new Error('status');
          const blob = await r.blob();
          if (!blob.type.startsWith('image/') || blob.size < 100) {
            throw new Error('tipo');
          }
          const proc = await processarArquivo(blob);
          anexosResolvidos.push(proc);
        } catch {
          urlsParaWorker.push(u);
        }
      })
    );

    return { anexosResolvidos, urlsParaWorker };
  }

  async function enviarPacoteParaIA({ textos, anexos, imageUrls, pAlvo }) {
    const alvo = pAlvo || obterParagrafoAlvo();
    requisicaoId++;
    const meuId = requisicaoId;

    modoAcumular = false;
    paragrafoAcumular = null;
    filaTextos = [];
    filaAnexos = [];
    filaImageUrls = [];

    mostrarStatusInline(alvo, '...');

    try {
      let listaAnexos = Array.isArray(anexos) ? [...anexos] : [];
      let listaUrls = [];

      if (Array.isArray(imageUrls) && imageUrls.length > 0) {
        const res = await resolverUrlsNoNavegadorOuWorker(imageUrls);
        if (meuId !== requisicaoId) return;
        listaAnexos.push(...res.anexosResolvidos);
        listaUrls = res.urlsParaWorker;
      }

      const textoFinal = (textos || []).filter(Boolean).join('\n\n').trim();

      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texto: textoFinal,
          anexos: listaAnexos,
          imageUrls: listaUrls
        })
      });

      const data = await resp.json();
      if (meuId !== requisicaoId) return;

      if (!resp.ok) {
        throw new Error(data?.error || 'erro');
      }

      renderizarRespostaCamuflada(alvo, data);
    } catch {
      if (meuId !== requisicaoId) return;
      renderizarRespostaCamuflada(alvo, {
        tipo: 'MULTIPLA_ESCOLHA',
        text: '(—)',
        copy: ''
      });
    }
  }

  function ativarModoAcumular(pAlvo) {
    limparTudo();
    modoAcumular = true;
    paragrafoAcumular = pAlvo || obterParagrafoAlvo();
    mostrarStatusInline(paragrafoAcumular, '(0)');
  }

  function atualizarContadorAcumular() {
    if (!modoAcumular || !paragrafoAcumular) return;
    const total = filaTextos.length + filaAnexos.length + filaImageUrls.length;
    mostrarStatusInline(paragrafoAcumular, `(${total})`);
  }

  // Abre cursor manual caso queira escrever do zero (Alt + Clique no parágrafo)
  function abrirEditorManual(pAlvo) {
    const alvo = pAlvo || obterParagrafoAlvo();
    limparTudo();

    const span = document.createElement('span');
    span.setAttribute('data-ai-camo', 'editor');
    span.contentEditable = 'true';
    span.style.outline = 'none';
    span.style.border = 'none';
    span.style.background = 'transparent';
    span.style.font = 'inherit';
    span.style.color = 'inherit';
    span.style.marginLeft = '4px';
    span.style.minWidth = '8px';
    span.style.display = 'inline-block';
    alvo.appendChild(span);
    editorInline = span;
    span.focus();

    span.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        limparTudo();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const txt = span.innerText.trim();
        if (txt) {
          if (editorInline && editorInline.parentNode) {
            editorInline.parentNode.removeChild(editorInline);
          }
          editorInline = null;
          enviarPacoteParaIA({ textos: [txt], anexos: [], imageUrls: [], pAlvo: alvo });
        } else {
          limparTudo();
        }
      }
    });
  }

  // Captura Ctrl + V (envio direto em 1 passo OU acumulador em etapas se Alt + Q estiver ativo)
  document.addEventListener('paste', async (e) => {
    const cd = e.clipboardData;
    if (!cd) return;

    // 1. Verifica se foi copiada uma imagem/PDF diretamente (ex: botão direito -> "Copiar imagem")
    const arquivosCopiados = [];
    if (cd.items) {
      for (const item of cd.items) {
        if (item.kind === 'file') {
          const f = item.getAsFile();
          if (f && (f.type.startsWith('image/') || f.type === 'application/pdf')) {
            arquivosCopiados.push(f);
          }
        }
      }
    }

    if (arquivosCopiados.length > 0) {
      e.preventDefault();
      if (modoAcumular) {
        const idAtual = requisicaoId;
        for (const f of arquivosCopiados) {
          const proc = await processarArquivo(f);
          if (idAtual !== requisicaoId || !modoAcumular) return;
          filaAnexos.push(proc);
        }
        atualizarContadorAcumular();
      } else {
        const alvo = obterParagrafoAlvo();
        requisicaoId++;
        const idAtual = requisicaoId;
        mostrarStatusInline(alvo, '...');
        const processados = [];
        for (const f of arquivosCopiados) {
          const proc = await processarArquivo(f);
          if (idAtual !== requisicaoId) return;
          processados.push(proc);
        }
        enviarPacoteParaIA({ textos: [], anexos: processados, imageUrls: [], pAlvo: alvo });
      }
      return;
    }

    if (editorInline && document.activeElement === editorInline) {
      return;
    }

    // 2. Seleção de texto (e possíveis imagens HTML embutidas do Google Forms!)
    const textoColado = (cd.getData('text/plain') || '').trim();
    const htmlColado = cd.getData('text/html') || '';
    const { dataAnexos, urlsRemotas } = extrairImagensDoHtmlCopiado(htmlColado);

    if (!textoColado && dataAnexos.length === 0 && urlsRemotas.length === 0) {
      return;
    }

    e.preventDefault();

    if (modoAcumular) {
      if (textoColado) filaTextos.push(textoColado);
      if (dataAnexos.length) filaAnexos.push(...dataAnexos);
      if (urlsRemotas.length) filaImageUrls.push(...urlsRemotas);
      atualizarContadorAcumular();
      return;
    }

    enviarPacoteParaIA({
      textos: textoColado ? [textoColado] : [],
      anexos: dataAnexos,
      imageUrls: urlsRemotas,
      pAlvo: obterParagrafoAlvo()
    });
  });

  // Alt + Clique abre cursor manual caso precise digitar algo
  document.addEventListener(
    'mousedown',
    (e) => {
      if (e.altKey) {
        const p = e.target && e.target.closest ? e.target.closest('#content p') : null;
        if (p) {
          e.preventDefault();
          e.stopPropagation();
          abrirEditorManual(p);
        }
      }
    },
    true
  );

  // Clicar fora apaga tudo na hora (0ms)
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (e.altKey) return;
      const dentroAtivo = elementoAtivo && elementoAtivo.contains(e.target);
      const dentroEditor = editorInline && editorInline.contains(e.target);
      if (!dentroAtivo && !dentroEditor) {
        if (elementoAtivo || editorInline || modoAcumular) {
          limparTudo();
        }
      }
    },
    true
  );

  // Atalhos:
  // - Alt + Q: Modo Juntar Partes (vários Ctrl+V silenciosos + Enter para enviar tudo junto)
  // - Enter (quando no Modo Juntar Partes): envia tudo que foi colado
  // - Alt + A: anexar arquivo PDF/imagem
  // - Esc: limpa tudo na hora
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (elementoAtivo || editorInline || modoAcumular) {
        limparTudo();
      }
    } else if (e.altKey && (e.key === 'q' || e.key === 'Q')) {
      e.preventDefault();
      if (modoAcumular) {
        limparTudo();
      } else {
        ativarModoAcumular(obterParagrafoAlvo());
      }
    } else if (e.key === 'Enter' && modoAcumular && !editorInline) {
      e.preventDefault();
      if (filaTextos.length > 0 || filaAnexos.length > 0 || filaImageUrls.length > 0) {
        enviarPacoteParaIA({
          textos: [...filaTextos],
          anexos: [...filaAnexos],
          imageUrls: [...filaImageUrls],
          pAlvo: paragrafoAcumular
        });
      } else {
        limparTudo();
      }
    } else if (e.altKey && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    const alvo = obterParagrafoAlvo();
    requisicaoId++;
    const idAtual = requisicaoId;
    mostrarStatusInline(alvo, '...');
    const proc = await processarArquivo(file);
    if (idAtual !== requisicaoId) return;
    enviarPacoteParaIA({ textos: [], anexos: [proc], imageUrls: [], pAlvo: alvo });
  });
})();
