/**
 * ============================================================================
 * MODO CAMUFLADO NO TEXTO DA APOSTILA (ZERO INTERFACE VISÍVEL)
 * ============================================================================
 * Como funciona:
 * 1. Ctrl + V direto na página (sem abrir nada): envia texto ou print copiado
 *    sem mostrar a pergunta na tela.
 * 2. Alt + Clique em qualquer parágrafo (ou Alt + Q): abre cursor invisível no
 *    fim daquele parágrafo para digitar algo manual + Enter para enviar.
 * 3. Alt + A: abre seletor para enviar um PDF ou imagem salva.
 * 4. Como a resposta aparece:
 *    - Múltipla escolha: surge no fim do parágrafo disfarçada de citação,
 *      ex: "(p. 3)" ou "(p. 3c)".
 *    - Questão escrita: surge como um parágrafo normal da apostila.
 *    - Código Java: surge como um bloco de código cinza igual aos da aula.
 * 5. Clique EM CIMA da resposta: copia o conteúdo limpo (Ctrl+C) e já apaga!
 * 6. Clique FORA da resposta (ou tecla Esc): apaga instantaneamente (0ms)!
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

  // Input oculto apenas para o atalho Alt + A (envio de PDF/imagem do PC)
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*,application/pdf';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  // Rastreia o último parágrafo sob o mouse para inserir a resposta onde você está olhando
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
    return (
      p.closest('.paragraph, .olist, .ulist, .listingblock, .openblock') || p
    );
  }

  function limparTudo() {
    requisicaoId++; // Cancela visualmente respostas pendentes se o usuário limpou
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

  function mostrarCarregando(pAlvo) {
    limparTudo();
    const span = document.createElement('span');
    span.setAttribute('data-ai-camo', 'loading');
    span.textContent = ' ...';
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

    // 1. Múltipla escolha -> citação bibliográfica discreta no fim do próprio parágrafo: "(p. 3)"
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

    // 2. Código Java -> bloco de código idêntico aos exemplos da apostila Asciidoctor
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

    // 3. Questão discursiva -> parágrafo idêntico aos parágrafos originais da apostila
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

  async function enviarArquivoParaIA(file, pAlvo) {
    const alvo = pAlvo || obterParagrafoAlvo();
    mostrarCarregando(alvo);
    const idInicial = requisicaoId;
    try {
      const proc = await processarArquivo(file);
      if (idInicial !== requisicaoId) return; // Cancelado durante processamento
      await enviarParaIA('', proc, alvo, true);
    } catch {
      if (idInicial === requisicaoId) limparTudo();
    }
  }

  async function enviarParaIA(texto, anexo, pAlvo, jaMostrouLoading) {
    const alvo = pAlvo || obterParagrafoAlvo();
    if (!jaMostrouLoading) {
      mostrarCarregando(alvo);
    }
    const meuId = requisicaoId;

    try {
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texto: texto || '',
          anexo: anexo || null
        })
      });

      const data = await resp.json();
      if (meuId !== requisicaoId) return; // Já foi cancelado/limpo

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

  // Abre cursor de edição camuflado no fim de um parágrafo (Alt + Clique ou Alt + Q)
  function abrirEditorCamuflado(pAlvo) {
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
          enviarParaIA(txt, null, alvo);
        } else {
          limparTudo();
        }
      }
    });
  }

  // 1) Ctrl + V invisível em qualquer lugar da página (texto ou print!)
  document.addEventListener('paste', async (e) => {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;

    // Verifica primeiro se há print/imagem ou PDF na área de transferência
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
          e.preventDefault();
          enviarArquivoParaIA(file, obterParagrafoAlvo());
          return;
        }
      }
    }

    // Se o editor manual estiver aberto, deixa colar texto dentro dele normalmente
    if (editorInline && document.activeElement === editorInline) {
      return;
    }

    // Caso contrário, envia o texto colado direto e invisivelmente (sem mostrar a pergunta!)
    const textoColado = e.clipboardData.getData('text/plain');
    if (textoColado && textoColado.trim()) {
      e.preventDefault();
      enviarParaIA(textoColado.trim(), null, obterParagrafoAlvo());
    }
  });

  // 2) Alt + Clique em qualquer parágrafo abre o cursor invisível ali mesmo
  document.addEventListener(
    'mousedown',
    (e) => {
      if (e.altKey) {
        const p = e.target && e.target.closest ? e.target.closest('#content p') : null;
        if (p) {
          e.preventDefault();
          e.stopPropagation();
          abrirEditorCamuflado(p);
          return;
        }
      }
    },
    true
  );

  // 3) Clique em qualquer lugar FORA da resposta/editor limpa tudo instantaneamente (0ms)
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (e.altKey) return;
      const clicouDentroAtivo = elementoAtivo && elementoAtivo.contains(e.target);
      const clicouDentroEditor = editorInline && editorInline.contains(e.target);
      if (!clicouDentroAtivo && !clicouDentroEditor) {
        if (elementoAtivo || editorInline) {
          limparTudo();
        }
      }
    },
    true
  );

  // 4) Atalhos de teclado: Esc (limpa), Alt + Q (cursor manual), Alt + A (anexar PDF/imagem)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (elementoAtivo || editorInline) {
        limparTudo();
      }
    } else if (e.altKey && (e.key === 'q' || e.key === 'Q')) {
      e.preventDefault();
      if (editorInline) {
        limparTudo();
      } else {
        abrirEditorCamuflado(obterParagrafoAlvo());
      }
    } else if (e.altKey && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    enviarArquivoParaIA(file, obterParagrafoAlvo());
  });
})();
