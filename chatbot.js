/**
 * ============================================================================
 * MODO CAMUFLADO V6 - MULTI-QUESTÕES, PONTO FIXO PRECISO E ANTI-FALHA TOTAL
 * ============================================================================
 * - Ponto Fixo ("·"): clique simples em qualquer parágrafo move o discreto "·"
 *   para o fim dele. É SEMPRE ali que a resposta vai aparecer!
 * - Nunca some sozinho: clicar na página, trocar de aba ou copiar respostas
 *   NUNCA apaga as respostas por acidente.
 * - Para esconder na hora (0ms): aperte ESC ou dê DUPLO CLIQUE no fundo branco.
 * - Várias questões de uma vez: pode dar Ctrl+A -> Ctrl+C no formulário inteiro
 *   e Ctrl+V aqui — ele resolve todas na ordem (incluindo imagens no meio!).
 * - Modo Juntar Partes (Alt + Q): vários Ctrl+V silenciosos + Enter.
 * - Clique em qualquer resposta/item da lista: copia limpo (Ctrl+C) e marca "✓".
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

  const API_URL = 'https://java-ifto.kiraquin.workers.dev/';

  if (window.__pooCamoInit) return;
  window.__pooCamoInit = true;

  const styleEl = document.createElement('style');
  styleEl.textContent = `
    [data-ai-pin] { opacity: 0.35; user-select: none; font-weight: normal; }
    [data-ai-camo="ans-item"]:hover { opacity: 0.85; }
  `;
  document.head.appendChild(styleEl);

  let paragrafoFixo = null;
  let marcadorPin = null;
  let elementosResposta = []; // Pode guardar o span/bloco criado
  let editorInline = null;
  let requisicaoId = 0;

  // Estado do Modo Juntar Partes (Alt + Q)
  let modoAcumular = false;
  let filaTextos = [];
  let filaImagensOrdenadas = [];

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*,application/pdf';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  function todosParagrafosReais() {
    return Array.from(document.querySelectorAll('#content p')).filter(
      (p) => !p.closest('[data-ai-camo]')
    );
  }

  // Define exatamente em qual parágrafo o "·" fica fixado
  function definirParagrafoFixo(p) {
    if (!p || p.closest('[data-ai-camo]')) return;
    paragrafoFixo = p;
    if (!marcadorPin) {
      marcadorPin = document.createElement('span');
      marcadorPin.setAttribute('data-ai-pin', '1');
      marcadorPin.textContent = ' ·';
    }
    if (marcadorPin.parentNode !== p) {
      p.appendChild(marcadorPin);
    }
  }

  function obterParagrafoAlvo() {
    if (paragrafoFixo && document.body.contains(paragrafoFixo)) {
      return paragrafoFixo;
    }
    const lista = todosParagrafosReais();
    const primeiro = lista[0] || document.body;
    if (lista[0]) definirParagrafoFixo(lista[0]);
    return primeiro;
  }

  // Inicializa o Ponto Fixo no 1º parágrafo logo ao abrir a página
  const inicial = todosParagrafosReais()[0];
  if (inicial) {
    definirParagrafoFixo(inicial);
  }

  function obterBlocoPaiParaInsercao(p) {
    return p.closest('.paragraph, .olist, .ulist, .listingblock, .openblock') || p;
  }

  let tutorialAtivoEl = null;
  let tutorialAtivoBtn = null;

  function removerElementosResposta() {
    for (const el of elementosResposta) {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }
    elementosResposta = [];
    if (tutorialAtivoEl && tutorialAtivoEl.parentNode) {
      tutorialAtivoEl.parentNode.removeChild(tutorialAtivoEl);
    }
    tutorialAtivoEl = null;
    tutorialAtivoBtn = null;
  }

  function alternarTutorialCamuflado(pDestino, passos, btn) {
    if (!passos || !pDestino) return;
    const mesmo = tutorialAtivoBtn === btn;
    if (tutorialAtivoEl && tutorialAtivoEl.parentNode) {
      tutorialAtivoEl.parentNode.removeChild(tutorialAtivoEl);
    }
    tutorialAtivoEl = null;
    tutorialAtivoBtn = null;
    if (mesmo) return;

    const span = document.createElement('span');
    span.setAttribute('data-ai-camo', 'tutorial');
    span.textContent = ` ${passos}`;
    pDestino.appendChild(span);
    tutorialAtivoEl = span;
    tutorialAtivoBtn = btn;
  }

  function limparTudo() {
    requisicaoId++;
    modoAcumular = false;
    filaTextos = [];
    filaImagensOrdenadas = [];
    removerElementosResposta();

    if (editorInline && editorInline.parentNode) {
      editorInline.parentNode.removeChild(editorInline);
    }
    editorInline = null;
  }

  function copiarTextoFallbackDom(str) {
    const ta = document.createElement('textarea');
    ta.value = str;
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch {}
    document.body.removeChild(ta);
  }

  function copiarTextoSeguro(str) {
    if (!str) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(str).catch(() => copiarTextoFallbackDom(str));
    } else {
      copiarTextoFallbackDom(str);
    }
  }

  // Clique em uma resposta copia para o Ctrl+C e mostra um "✓" discreto por 1s SEM apagar a resposta!
  function tornarClicavelParaCopiar(el, textoCopia) {
    if (!textoCopia) return;
    el.setAttribute('data-ai-camo', 'ans-item');
    el.style.cursor = 'pointer';
    el.title = 'Clique para copiar';
    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      copiarTextoSeguro(textoCopia);

      let check = el.querySelector('[data-ai-ok]');
      if (!check) {
        check = document.createElement('span');
        check.setAttribute('data-ai-ok', '1');
        check.textContent = ' ✓';
        check.style.opacity = '0.55';
        check.style.fontSize = '0.85em';
        el.appendChild(check);
        setTimeout(() => {
          if (check && check.parentNode) check.parentNode.removeChild(check);
        }, 1100);
      }
    });
  }

  function mostrarStatusInline(pAlvo, textoCurto) {
    removerElementosResposta();
    const span = document.createElement('span');
    span.setAttribute('data-ai-camo', 'status');
    span.textContent = ` ${textoCurto}`;
    span.style.opacity = '0.45';
    span.style.userSelect = 'none';
    pAlvo.appendChild(span);
    elementosResposta.push(span);
  }

  function posicoesParaLetras(posicoes) {
    if (!Array.isArray(posicoes) || posicoes.length === 0) return '?';
    return posicoes
      .map((n) => (n >= 1 && n <= 26 ? String.fromCharCode(96 + n) : String(n)))
      .join('');
  }

  function renderizarQuestoesCamufladas(pAlvo, questoes) {
    removerElementosResposta();
    if (!Array.isArray(questoes) || questoes.length === 0) return;

    const partesMultipla = [];
    const praticas = [];
    const abertas = [];

    questoes.forEach((q, idx) => {
      const num = q.numero || idx + 1;
      const tipo = q.tipo || 'DISCURSIVA';
      const pos = Array.isArray(q.posicoes) ? q.posicoes : [];
      const copy = String(q.copy || '').trim();

      if (Array.isArray(q.classes) && q.classes.length > 0) {
        q.classes.forEach((c) => {
          const nomeRaw = String(c.nome || c.classe || 'Classe').trim().replace(/\.java$/i, '');
          const codigo = String(c.codigo || c.copy || '').trim();
          const passos = String(c.passos || '').trim();
          if (codigo) {
            praticas.push({ rotulo: `${num}. ${nomeRaw}`, copy: codigo, passos });
          }
        });
      } else if (tipo === 'CODIGO_JAVA' && copy) {
        praticas.push({ rotulo: `${num}. Codigo`, copy, passos: '' });
      } else if (tipo === 'MULTIPLA_ESCOLHA' || tipo === 'MULTIPLA_SELECAO' || pos.length > 0) {
        partesMultipla.push({
          rotulo: `${num}${posicoesParaLetras(pos)}`,
          copy
        });
      } else {
        abertas.push({ num, tipo, copy });
      }
    });

    // Filtra parágrafos reais com texto suficiente para camuflar no final das frases
    const todosP = todosParagrafosReais();
    const paragrafosBons = todosP.filter((p) => (p.textContent || '').trim().length >= 20);
    const baseP = paragrafosBons.length >= 3 ? paragrafosBons : todosP;

    // 0. Modo prático: espalha as classes pelos parágrafos (e itens de lista se houver pouco texto)
    if (praticas.length > 0) {
      let basePraticas = baseP;
      if (basePraticas.length < praticas.length) {
        const extras = Array.from(document.querySelectorAll('#content li')).filter(
          (li) => !li.closest('[data-ai-camo]') && !li.querySelector('p') && (li.textContent || '').trim().length >= 15
        );
        if (extras.length > 0) {
          basePraticas = Array.from(new Set([...basePraticas, ...extras]));
        }
      }

      let idxInicio = basePraticas.indexOf(pAlvo);
      if (idxInicio === -1) idxInicio = 0;
      let destinos = basePraticas.slice(idxInicio);
      if (praticas.length > destinos.length && basePraticas.length > destinos.length) {
        destinos = basePraticas;
      }
      if (destinos.length === 0) destinos = [pAlvo];

      const porParagrafo = Math.max(1, Math.ceil(praticas.length / destinos.length));
      for (let i = 0, pIdx = 0; i < praticas.length; i += porParagrafo, pIdx++) {
        const fatia = praticas.slice(i, i + porParagrafo);
        const pDestino = destinos[Math.min(pIdx, destinos.length - 1)];
        fatia.forEach((item) => {
          const span = document.createElement('span');
          span.textContent = ` (${item.rotulo})`;
          tornarClicavelParaCopiar(span, item.copy);
          pDestino.appendChild(span);
          elementosResposta.push(span);

          if (item.passos) {
            const btnPasso = document.createElement('span');
            btnPasso.setAttribute('data-ai-camo', 'ans-item');
            btnPasso.textContent = ' ·';
            btnPasso.style.cursor = 'pointer';
            btnPasso.style.opacity = '0.45';
            btnPasso.title = 'Passo a passo';
            btnPasso.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              alternarTutorialCamuflado(pDestino, item.passos, btnPasso);
            });
            pDestino.appendChild(btnPasso);
            elementosResposta.push(btnPasso);
          }
        });
      }
    }

    // 1. Espalha as respostas pelos parágrafos da página de cima para baixo: "(p. 1a, 2b)"
    if (partesMultipla.length > 0) {
      if (partesMultipla.length === 1) {
        const span = document.createElement('span');
        span.textContent = ` (p. ${partesMultipla[0].rotulo})`;
        tornarClicavelParaCopiar(span, partesMultipla[0].copy || partesMultipla[0].rotulo);
        pAlvo.appendChild(span);
        elementosResposta.push(span);
      } else {
        let idxInicio = baseP.indexOf(pAlvo);
        if (idxInicio === -1) idxInicio = 0;
        let destinos = baseP.slice(idxInicio);

        // Se o ponto fixo estiver muito embaixo e houver muitas questões, distribui na página toda
        if (partesMultipla.length > destinos.length * 3 && baseP.length > destinos.length) {
          destinos = baseP;
        }
        if (destinos.length === 0) destinos = [pAlvo];

        const porParagrafo = Math.max(1, Math.ceil(partesMultipla.length / destinos.length));
        const gabaritoCompleto = partesMultipla.map((p) => p.rotulo).join(', ');

        for (let i = 0, pIdx = 0; i < partesMultipla.length; i += porParagrafo, pIdx++) {
          const fatia = partesMultipla.slice(i, i + porParagrafo);
          const pDestino = destinos[Math.min(pIdx, destinos.length - 1)];
          const span = document.createElement('span');
          span.textContent = ` (p. ${fatia.map((f) => f.rotulo).join(', ')})`;
          tornarClicavelParaCopiar(span, gabaritoCompleto);
          pDestino.appendChild(span);
          elementosResposta.push(span);
        }
      }
    }

    // 2. Se houver questões abertas/código, espalha também entre os blocos da página
    if (abertas.length > 0) {
      let idxInicio = baseP.indexOf(pAlvo);
      if (idxInicio === -1) idxInicio = 0;
      const destinosAbertas = baseP.slice(idxInicio).length > 0 ? baseP.slice(idxInicio) : [pAlvo];
      const ultimoInseridoPorBloco = new Map();

      abertas.forEach((item, idx) => {
        const pRef = destinosAbertas[Math.min(idx, destinosAbertas.length - 1)];
        const blocoBase = obterBlocoPaiParaInsercao(pRef);
        const ancora = ultimoInseridoPorBloco.get(blocoBase) || blocoBase;
        const prefixo = questoes.length > 1 ? `${item.num}. ` : '';

        if (item.tipo === 'CODIGO_JAVA') {
          const wrapper = document.createElement('div');
          wrapper.className = 'listingblock';
          wrapper.setAttribute('data-ai-camo', 'ans');
          const content = document.createElement('div');
          content.className = 'content';
          const pre = document.createElement('pre');
          pre.className = 'highlight';
          const code = document.createElement('code');
          code.textContent = (prefixo ? `// ${prefixo}\n` : '') + item.copy;
          pre.appendChild(code);
          content.appendChild(pre);
          wrapper.appendChild(content);
          tornarClicavelParaCopiar(wrapper, item.copy);
          ancora.insertAdjacentElement('afterend', wrapper);
          ultimoInseridoPorBloco.set(blocoBase, wrapper);
          elementosResposta.push(wrapper);
        } else {
          const divP = document.createElement('div');
          divP.className = 'paragraph';
          divP.setAttribute('data-ai-camo', 'ans');
          const pNovo = document.createElement('p');
          pNovo.textContent = `${prefixo}${item.copy}`;
          divP.appendChild(pNovo);
          tornarClicavelParaCopiar(divP, item.copy);
          ancora.insertAdjacentElement('afterend', divP);
          ultimoInseridoPorBloco.set(blocoBase, divP);
          elementosResposta.push(divP);
        }
      });
    }
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
        if (!file.type.startsWith('image/') || file.size <= 600 * 1024) {
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
          const maxDim = 1500;
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
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
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

  // Extrai texto + imagens preservando a EXATA posição de cada imagem ([IMAGEM_1], [IMAGEM_2]...)
  function extrairConteudoOrdenadoDoHtml(html, plainFallback, indiceInicial) {
    const imagens = [];
    if (!html) {
      return { textoComMarcadores: plainFallback || '', imagens };
    }

    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      doc.querySelectorAll('script, style, noscript, svg').forEach((n) => n.remove());

      const imgs = Array.from(doc.querySelectorAll('img'));
      let contador = indiceInicial || 0;

      for (const img of imgs) {
        const src = (img.getAttribute('src') || '').trim();
        if (!src) continue;
        const w = Number(img.getAttribute('width') || 0);
        const h = Number(img.getAttribute('height') || 0);
        if ((w > 0 && w < 24) || (h > 0 && h < 24)) continue;

        if (src.startsWith('data:image/')) {
          const partes = src.split(',');
          const mimeMatch = partes[0].match(/^data:(image\/[^;]+);base64$/i);
          if (mimeMatch && partes[1]) {
            contador++;
            imagens.push({ mimeType: mimeMatch[1], data: partes[1] });
            img.replaceWith(doc.createTextNode(`\n[IMAGEM_${contador}]\n`));
          }
        } else if (/^https?:\/\//i.test(src)) {
          contador++;
          imagens.push({ url: src });
          img.replaceWith(doc.createTextNode(`\n[IMAGEM_${contador}]\n`));
        }
      }

      if (imagens.length === 0) {
        return { textoComMarcadores: plainFallback || '', imagens: [] };
      }

      // Garante quebras de linha limpas entre blocos HTML do Google Forms
      doc
        .querySelectorAll('div, p, li, br, h1, h2, h3, h4, tr, section, article')
        .forEach((el) => {
          if (el.tagName === 'BR') {
            el.replaceWith(doc.createTextNode('\n'));
          } else {
            el.appendChild(doc.createTextNode('\n'));
          }
        });

      const extraido = (doc.body.textContent || '')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      return {
        textoComMarcadores: extraido || plainFallback || '',
        imagens: imagens.slice(0, 40)
      };
    } catch {
      return { textoComMarcadores: plainFallback || '', imagens: [] };
    }
  }

  // Tenta resolver imagens remotas no navegador; se bloquear por CORS, o Worker baixa!
  async function prepararImagensOrdenadas(listaBruta) {
    return await Promise.all(
      listaBruta.slice(0, 40).map(async (item) => {
        if (item.data && item.mimeType) return item;
        if (item.url) {
          try {
            const r = await fetch(item.url, { mode: 'cors', credentials: 'omit' });
            if (!r.ok) throw new Error('status');
            const blob = await r.blob();
            if (!blob.type.startsWith('image/') || blob.size < 80) throw new Error('tipo');
            return await processarArquivo(blob);
          } catch {
            return { url: item.url };
          }
        }
        return null;
      })
    );
  }

  // Fetch com 3 tentativas automáticas para nunca falhar por oscilação de rede
  async function fetchComRetry(payload, tentativas = 3) {
    let ultimoErro = null;
    for (let i = 0; i < tentativas; i++) {
      try {
        const resp = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout ? AbortSignal.timeout(65000) : undefined,
          body: JSON.stringify(payload)
        });
        const data = await resp.json();
        if (resp.ok && data && Array.isArray(data.questoes) && data.questoes.length > 0) {
          return data;
        }
        ultimoErro = new Error(data?.error || `HTTP ${resp.status}`);
      } catch (err) {
        ultimoErro = err;
      }
      if (i < tentativas - 1) {
        await new Promise((r) => setTimeout(r, 900 * (i + 1)));
      }
    }
    throw ultimoErro || new Error('Falha de conexão');
  }

  async function enviarPacoteParaIA({ textos, imagensBrutas, pAlvo }) {
    const alvo = pAlvo || obterParagrafoAlvo();
    requisicaoId++;
    const meuId = requisicaoId;

    modoAcumular = false;
    filaTextos = [];
    filaImagensOrdenadas = [];

    mostrarStatusInline(alvo, '...');

    try {
      const imagensOrdenadas = (await prepararImagensOrdenadas(imagensBrutas || [])).filter(Boolean);
      if (meuId !== requisicaoId) return;

      const textoFinal = (textos || []).filter(Boolean).join('\n\n').trim();

      const data = await fetchComRetry({
        texto: textoFinal,
        imagensOrdenadas
      });

      if (meuId !== requisicaoId) return;
      renderizarQuestoesCamufladas(alvo, data.questoes);
    } catch {
      if (meuId !== requisicaoId) return;
      mostrarStatusInline(alvo, '(tente novamente)');
    }
  }

  function ativarModoAcumular(pAlvo) {
    limparTudo();
    modoAcumular = true;
    const alvo = pAlvo || obterParagrafoAlvo();
    mostrarStatusInline(alvo, '(0)');
  }

  function atualizarContadorAcumular() {
    if (!modoAcumular) return;
    const total = filaTextos.length + filaImagensOrdenadas.length;
    mostrarStatusInline(obterParagrafoAlvo(), `(${total})`);
  }

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
          enviarPacoteParaIA({ textos: [txt], imagensBrutas: [], pAlvo: alvo });
        } else {
          limparTudo();
        }
      }
    });
  }

  // 1) Clique simples em qualquer parágrafo fixa o "·" nele (NUNCA apaga respostas abertas!)
  document.addEventListener('click', (e) => {
    if (e.altKey) return;
    if (e.target && e.target.closest && e.target.closest('a, [data-ai-camo]')) return;
    const p = e.target && e.target.closest ? e.target.closest('#content p') : null;
    if (p) {
      definirParagrafoFixo(p);
    }
  });

  // 2) Alt + Clique abre cursor manual caso precise digitar algo do zero
  document.addEventListener(
    'mousedown',
    (e) => {
      if (e.altKey) {
        const p = e.target && e.target.closest ? e.target.closest('#content p') : null;
        if (p) {
          e.preventDefault();
          e.stopPropagation();
          definirParagrafoFixo(p);
          abrirEditorManual(p);
        }
      }
    },
    true
  );

  // 3) Duplo clique em qualquer área vazia fora de respostas esconde tudo em 0ms
  document.addEventListener('dblclick', (e) => {
    if (e.target && e.target.closest && e.target.closest('[data-ai-camo]')) return;
    const sel = window.getSelection ? String(window.getSelection()) : '';
    if (!sel.trim() && (elementosResposta.length > 0 || editorInline || modoAcumular)) {
      limparTudo();
    }
  });

  // 4) Ctrl + V (1 questão, formulário inteiro com várias questões + imagens, ou Modo Juntar Partes)
  document.addEventListener('paste', async (e) => {
    const cd = e.clipboardData;
    if (!cd) return;

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
          filaImagensOrdenadas.push(proc);
          filaTextos.push(`[IMAGEM_${filaImagensOrdenadas.length}]`);
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
        enviarPacoteParaIA({ textos: [], imagensBrutas: processados, pAlvo: alvo });
      }
      return;
    }

    if (editorInline && document.activeElement === editorInline) {
      return;
    }

    const textoPlano = (cd.getData('text/plain') || '').trim();
    const htmlColado = cd.getData('text/html') || '';
    const { textoComMarcadores, imagens } = extrairConteudoOrdenadoDoHtml(
      htmlColado,
      textoPlano,
      modoAcumular ? filaImagensOrdenadas.length : 0
    );

    if (!textoComMarcadores && imagens.length === 0) return;

    e.preventDefault();

    if (modoAcumular) {
      if (textoComMarcadores) filaTextos.push(textoComMarcadores);
      if (imagens.length) filaImagensOrdenadas.push(...imagens);
      atualizarContadorAcumular();
      return;
    }

    enviarPacoteParaIA({
      textos: textoComMarcadores ? [textoComMarcadores] : [],
      imagensBrutas: imagens,
      pAlvo: obterParagrafoAlvo()
    });
  });

  // 5) Atalhos de teclado: Esc (esconde 0ms), Alt+Q (juntar partes), Enter (envia partes), Alt+A (PDF)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      limparTudo();
    } else if (e.altKey && (e.key === 'q' || e.key === 'Q')) {
      e.preventDefault();
      if (modoAcumular) {
        limparTudo();
      } else {
        ativarModoAcumular(obterParagrafoAlvo());
      }
    } else if (e.key === 'Enter' && modoAcumular && !editorInline) {
      e.preventDefault();
      if (filaTextos.length > 0 || filaImagensOrdenadas.length > 0) {
        enviarPacoteParaIA({
          textos: [...filaTextos],
          imagensBrutas: [...filaImagensOrdenadas],
          pAlvo: obterParagrafoAlvo()
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
    enviarPacoteParaIA({ textos: [], imagensBrutas: [proc], pAlvo: alvo });
  });
})();
