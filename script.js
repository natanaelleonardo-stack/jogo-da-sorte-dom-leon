/* ====================== CONFIGURAÇÃO ====================== */
const firebaseConfig = {
  apiKey: "AIzaSyAC62tsDM70ojir5ZGsUZ6K_q13xvxk4dM",
  authDomain: "jogo-da-sorte-dom-leon.firebaseapp.com",
  projectId: "jogo-da-sorte-dom-leon",
  storageBucket: "jogo-da-sorte-dom-leon.firebasestorage.app",
  messagingSenderId: "901921739557",
  appId: "1:901921739557:web:9b229085c85bd832ff00cc",
  measurementId: "G-JXDPPVYWLS"
};
const ADMIN_PIN = "1234"; // troque aqui pelo PIN que preferir
const EMOJI_DEFAULT_FAVORITES = ['🎂','🥖','🍞','🥐','🍰','🧁','☕','💰','🎁','🍫'];
let emojiFavoritos = [...EMOJI_DEFAULT_FAVORITES];

const EMOJI_CATEGORIAS = {
  'Padaria & Doces': ['🎂','🍰','🧁','🥖','🍞','🥐','🥨','🫓','🍩','🍪','🧇','🥧','🍮','🍯','🍫','🍬','🍭','🍡','🍢','🧆','🥮','🍿','🫙','🧈','🍦'],
  'Comida & Bebida': ['☕','🫖','🧃','🥤','🍵','🧋','🥛','🍺','🥂','🍷','🫗','🍱','🥗','🍕','🌮','🥪','🧀','🥚','🍳','🫕','🍖','🍗'],
  'Dinheiro & Valor': ['💰','💵','💴','💶','💷','🪙','💳','💎','🏷️','🎫','🎟️','📦','🛍️','🛒','💹','📈'],
  'Presentes & Festa': ['🎁','🎉','🎊','🎈','🥳','🪅','🎀','🎗️','🏆','🥇','🥈','🥉','🎖️','🪄','🎭','🎪','🎠','✨','🌟','⭐'],
  'Natureza & Sorte': ['🍀','🌈','🌸','🌺','🌻','🌹','🍁','🌿','🍃','🎋','🌙','⭐','🌞','🌊','🦋','🐝','🌴','🍄','🌵','🦄'],
  'Símbolos & Estrelas': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💖','💫','🔥','⚡','🌟','✨','💥','🎯','🔮','🪬','🧿','☯️'],
  'Esportes & Lazer': ['⚽','🏀','🎾','🏐','🎱','🏓','🎮','🎲','🃏','🎴','♟️','🎸','🎵','🎶','🎬','📸'],
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

/* ====================== ESTADO ====================== */
let currentRodada = null;
let currentRodadaId = null;
let prizesDraft = [
  { emoji:'🎂', nome:'Bolo de chocolate' }
];
let selected = new Set();
let currentTicket = null;
let currentTicketRodada = null;
let unsubTicketRodada = null;
let ordemRevelacao = [];
let confRodadaAtual = null;
let unsubConferencia = null;
let unsubTickets = null;
let pendingPinCallback = null;

/* ====================== UTIL ====================== */
function pad(n, len){ return String(n).padStart(len||3,'0'); }
function brl(v){ return 'R$ ' + (v||0).toFixed(2).replace('.',','); }
function showToast(msg, tipo){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (tipo ? (' '+tipo) : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(()=> t.classList.remove('show'), 3200);
}
function shuffleArray(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
}
function makeBall(n){
  const b = document.createElement('div');
  b.className = 'ball'; b.dataset.n = n;
  const disc = document.createElement('div');
  disc.className = 'disc'; disc.textContent = n;
  b.appendChild(disc);
  return b;
}

/* ====================== PIN ====================== */
function comPin(callback){
  pendingPinCallback = callback;
  document.getElementById('pin-input').value = '';
  document.getElementById('pin-overlay').classList.add('show');
  setTimeout(()=> document.getElementById('pin-input').focus(), 50);
}
function fecharPinModal(){
  document.getElementById('pin-overlay').classList.remove('show');
  pendingPinCallback = null;
}
function confirmarPin(){
  const val = document.getElementById('pin-input').value;
  document.getElementById('pin-overlay').classList.remove('show');
  if(val === ADMIN_PIN){ const cb = pendingPinCallback; pendingPinCallback = null; cb && cb(); }
  else { showToast('PIN incorreto', 'erro'); pendingPinCallback = null; }
}
document.getElementById('pin-input').addEventListener('keydown', e=>{ if(e.key==='Enter') confirmarPin(); });

/* ====================== NAVEGAÇÃO ====================== */
document.querySelectorAll('.tab').forEach(tab=>{
  tab.addEventListener('click', ()=>{
    if(tab.dataset.screen === 'abertura' || tab.dataset.screen === 'conferencia'){
      comPin(()=> showScreen(tab.dataset.screen));
    } else {
      showScreen(tab.dataset.screen);
    }
  });
});
function showScreen(name){
  document.querySelectorAll('.screen').forEach(s=> s.classList.toggle('active', s.id===name));
  document.querySelectorAll('.tab').forEach(t=> t.classList.toggle('active', t.dataset.screen===name));
}

/* ====================== EMOJI FAVORITOS ====================== */
const FAVS_DOC = ()=> db.collection('config').doc('emojiFavoritos');

async function carregarFavoritos(){
  try{
    const snap = await FAVS_DOC().get();
    if(snap.exists && snap.data().lista) emojiFavoritos = snap.data().lista;
  }catch(e){ /* usa padrão */ }
}
async function salvarFavoritos(){
  try{ await FAVS_DOC().set({ lista: emojiFavoritos }, { merge:true }); }catch(e){}
}

function abrirEmojiPanel(){
  const content = document.getElementById('emoji-panel-content');
  content.innerHTML = '';
  Object.entries(EMOJI_CATEGORIAS).forEach(([cat, emojis])=>{
    const label = document.createElement('p'); label.className = 'emoji-cat-label'; label.textContent = cat;
    content.appendChild(label);
    const grid = document.createElement('div'); grid.className = 'emoji-cat-grid';
    emojis.forEach(e=>{
      const btn = document.createElement('button'); btn.type='button'; btn.className = 'emoji-cat-opt';
      btn.textContent = e;
      const jaFav = emojiFavoritos.includes(e);
      if(jaFav) btn.classList.add('ja-fav');
      btn.title = jaFav ? 'Já nos favoritos' : 'Adicionar aos favoritos';
      if(!jaFav){
        btn.addEventListener('click', ()=>{
          if(emojiFavoritos.length >= 10){ showToast('Limite de 10 favoritos atingido. Desfavorite um antes de adicionar.', 'erro'); return; }
          emojiFavoritos.push(e);
          salvarFavoritos();
          fecharEmojiPanel();
          renderPrizeEditList();
        });
      }
      grid.appendChild(btn);
    });
    content.appendChild(grid);
  });
  document.getElementById('emoji-panel').classList.add('show');
}
function fecharEmojiPanel(){ document.getElementById('emoji-panel').classList.remove('show'); }

/* ====================== ABERTURA: CADASTRO DE PRÊMIOS ====================== */
const prizeEditList = document.getElementById('prize-edit-list');
let dragSrc = null;

function renderPrizeEditList(){
  prizeEditList.innerHTML = '';
  prizesDraft.forEach((p, idx)=>{
    const card = document.createElement('div'); card.className = 'prize-edit-card';
    const top = document.createElement('div'); top.className = 'prize-edit-top';
    const preview = document.createElement('span'); preview.className = 'emoji-preview'; preview.textContent = p.emoji;
    const nameInput = document.createElement('input'); nameInput.className = 'prize-name-input';
    nameInput.value = p.nome; nameInput.placeholder = 'Nome do prêmio';
    nameInput.addEventListener('input', e=>{ p.nome = e.target.value; });
    const removeBtn = document.createElement('button'); removeBtn.className = 'remove-btn'; removeBtn.textContent = '×';
    removeBtn.addEventListener('click', ()=>{ prizesDraft.splice(idx,1); renderPrizeEditList(); });
    const dupBtn = document.createElement('button'); dupBtn.type='button'; dupBtn.className = 'duplicate-btn';
    dupBtn.textContent = 'Duplicar';
    dupBtn.addEventListener('click', ()=>{ prizesDraft.splice(idx+1, 0, { emoji:p.emoji, nome:p.nome }); renderPrizeEditList(); });
    top.appendChild(preview); top.appendChild(nameInput); top.appendChild(dupBtn); top.appendChild(removeBtn);

    // PICKER DE FAVORITOS com drag-and-drop e desfavoritar
    const picker = document.createElement('div'); picker.className = 'emoji-picker';

    emojiFavoritos.forEach((e, fi)=>{
      const opt = document.createElement('div');
      opt.className = 'emoji-opt' + (e===p.emoji ? ' active' : '');
      opt.textContent = e; opt.draggable = true; opt.dataset.fi = fi;
      opt.title = 'Arraste para reordenar';

      // selecionar
      opt.addEventListener('click', ()=>{ p.emoji = e; renderPrizeEditList(); });

      // desfavoritar
      const desfavBtn = document.createElement('button'); desfavBtn.className = 'desfav-btn'; desfavBtn.textContent = '×';
      desfavBtn.title = 'Remover dos favoritos';
      desfavBtn.addEventListener('click', ev=>{ ev.stopPropagation(); emojiFavoritos.splice(fi,1); salvarFavoritos(); renderPrizeEditList(); });
      opt.appendChild(desfavBtn);

      // drag-and-drop reordenar
      opt.addEventListener('dragstart', ev=>{ dragSrc = fi; opt.classList.add('dragging'); ev.dataTransfer.effectAllowed='move'; });
      opt.addEventListener('dragend', ()=>{ opt.classList.remove('dragging'); });
      opt.addEventListener('dragover', ev=>{ ev.preventDefault(); ev.dataTransfer.dropEffect='move'; });
      opt.addEventListener('drop', ev=>{
        ev.preventDefault();
        if(dragSrc === null || dragSrc === fi) return;
        const moved = emojiFavoritos.splice(dragSrc,1)[0];
        emojiFavoritos.splice(fi, 0, moved);
        dragSrc = null;
        salvarFavoritos();
        renderPrizeEditList();
      });
      picker.appendChild(opt);
    });

    // botão + para abrir painel
    const addBtn = document.createElement('button'); addBtn.type='button';
    addBtn.className = 'emoji-add-btn' + (emojiFavoritos.length >= 10 ? ' disabled' : '');
    addBtn.textContent = '+'; addBtn.title = emojiFavoritos.length >= 10 ? 'Limite de 10 favoritos atingido' : 'Adicionar emoji aos favoritos';
    addBtn.addEventListener('click', ()=>{ if(emojiFavoritos.length < 10) abrirEmojiPanel(); });
    picker.appendChild(addBtn);

    card.appendChild(top); card.appendChild(picker);
    prizeEditList.appendChild(card);
  });
}
function addPrize(){ prizesDraft.push({ emoji: emojiFavoritos[0]||'🎁', nome:'' }); renderPrizeEditList(); }

async function proximoContador(campo){
  const ref = db.collection('config').doc('contadores');
  return db.runTransaction(async tx=>{
    const snap = await tx.get(ref);
    let valorAtual = 1;
    if(snap.exists && snap.data()[campo]) valorAtual = snap.data()[campo];
    tx.set(ref, { [campo]: valorAtual+1 }, { merge:true });
    return valorAtual;
  });
}

async function abrirRodada(){
  const aviso = document.getElementById('abertura-aviso');
  aviso.innerHTML = '';
  const qtd = parseInt(document.getElementById('input-qtd').value, 10);
  const valor = parseFloat(document.getElementById('input-valor').value);

  if(currentRodada){
    showToast('Já existe a rodada #'+pad(currentRodada.numero)+' aberta. Encerre antes de abrir outra.', 'erro');
    return;
  }
  if(!qtd || qtd < 1){ showToast('Informe a quantidade de números', 'erro'); return; }
  if(isNaN(valor) || valor <= 0){ showToast('Informe o valor por número', 'erro'); return; }
  if(prizesDraft.length === 0){ showToast('Cadastre ao menos 1 prêmio', 'erro'); return; }
  if(prizesDraft.some(p=> !p.nome.trim())){ showToast('Preencha o nome de todos os prêmios', 'erro'); return; }
  if(prizesDraft.length > qtd){ showToast('Você tem mais prêmios do que números disponíveis', 'erro'); return; }

  const slots = Array.from({length: qtd}, (_,i)=> i+1);
  shuffleArray(slots);
  const premioPorSlot = {};
  prizesDraft.forEach((p, idx)=>{ premioPorSlot[slots[idx]] = { emoji:p.emoji, nome:p.nome }; });

  const numeros = {};
  for(let n=1; n<=qtd; n++){
    numeros[n] = {
      vendido:false, revelado:false, retirado:false,
      ticketId:null, ticketCodigo:null, comprador:null,
      premio: premioPorSlot[n] || null
    };
  }

  try{
    const numeroRodada = await proximoContador('proximaRodada');
    await db.collection('rodadas').add({
      numero: numeroRodada,
      status: 'aberta',
      qtdNumeros: qtd,
      valorNumero: valor,
      premiosCadastrados: prizesDraft.map(p=>({emoji:p.emoji, nome:p.nome})),
      numeros: numeros,
      totalArrecadado: 0,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
      finalizadaEm: null
    });
    showToast('Rodada #'+pad(numeroRodada)+' aberta!', 'sucesso');
    showScreen('vitrine');
  }catch(err){ showToast('Erro ao abrir rodada: '+err.message, 'erro'); }
}

/* ====================== RODADA ATUAL (listener) ====================== */
function listenCurrentRodada(){
  db.collection('rodadas').where('status','==','aberta').limit(1)
    .onSnapshot(snap=>{
      if(snap.empty){ currentRodada = null; currentRodadaId = null; }
      else { const d = snap.docs[0]; currentRodada = d.data(); currentRodadaId = d.id; }
      renderTopbar();
      renderVitrine();
      renderVenda();
    }, err=> showToast('Erro ao carregar rodada: '+err.message, 'erro'));
}

function renderTopbar(){
  const meta = document.getElementById('topbar-meta');
  if(!currentRodada){
    meta.innerHTML = '<span class="pill">Nenhuma rodada aberta</span>';
    return;
  }
  meta.innerHTML =
    '<span class="pill">Rodada #'+pad(currentRodada.numero)+'</span>'+
    '<span class="pill">'+brl(currentRodada.valorNumero)+' por número</span>'+
    '<span class="pill">'+currentRodada.qtdNumeros+' números em jogo</span>';
}

/* ====================== VITRINE ====================== */
function renderVitrine(){
  const el = document.getElementById('vitrine-content');
  if(!currentRodada){
    el.innerHTML = '<p class="empty-state">Nenhuma rodada aberta no momento. Peça para o admin abrir uma rodada na aba "Abertura".</p>';
    return;
  }
  const prizesHtml = currentRodada.premiosCadastrados.map(p=>
    '<div class="prize-card"><span class="emoji">'+p.emoji+'</span><h3>'+p.nome+'</h3></div>'
  ).join('');
  el.innerHTML =
    '<div class="show-banner">'+
      '<div class="show-bulbs"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>'+
      '<div class="stars-row"><span class="star star-lg">★</span><span class="star star-sm">★</span>'+
        '<h2 class="show-title"><span class="line1">SHOW DE</span><span class="line2">PRÊMIOS</span></h2>'+
        '<span class="star star-sm">★</span><span class="star star-lg">★</span></div>'+
      '<div class="dom-leon-badge">DOM LEON</div>'+
    '</div>'+
    '<h2 class="screen-title">Prêmios desta rodada</h2>'+
    '<div class="prize-grid">'+prizesHtml+'</div>'+
    '<button class="btn btn-gold" onclick="showScreen(\'venda\')">Comprar números →</button>';
}

/* ====================== VENDA ====================== */
function renderVenda(){
  const panel = document.getElementById('venda-panel');
  const content = document.getElementById('venda-content');
  if(!currentRodada){
    panel.innerHTML = '';
    content.innerHTML = '<p class="empty-state">Nenhuma rodada aberta para venda no momento.</p>';
    return;
  }
  selected.clear();
  panel.innerHTML =
    '<div class="venda-stat"><label>Selecionados</label><p class="big" id="venda-count">0</p></div>'+
    '<div class="venda-stat"><label>Total</label><p class="big" id="venda-total">R$ 0,00</p></div>'+
    '<div class="field-group" style="min-width:160px;"><label>Nome do cliente</label><input type="text" id="venda-nome" placeholder="Ex: Carlos Souza"></div>'+
    '<div class="field-group" style="min-width:140px;"><label>Telefone</label><input type="tel" id="venda-telefone" placeholder="(00) 00000-0000"></div>'+
    '<div class="field-group" style="min-width:130px;"><label>Forma de pagamento</label>'+
      '<select id="venda-pagamento"><option>Dinheiro</option><option>Pix</option><option>Cartão</option></select></div>'+
    '<button class="btn btn-gold" id="btn-emitir" onclick="emitirTicket()">🎟️ Emitir ticket</button>';
  content.innerHTML =
    '<div class="ball-grid" id="venda-grid"></div>'+
    '<p class="hint">🔒 = já vendido · toque para selecionar</p>';
  renderVendaGrid();
  updateVendaSummary();
}
function renderVendaGrid(){
  const grid = document.getElementById('venda-grid');
  if(!grid || !currentRodada) return;
  grid.innerHTML = '';
  for(let n=1; n<=currentRodada.qtdNumeros; n++){
    const b = makeBall(n);
    const info = currentRodada.numeros[n];
    if(info.vendido){
      b.classList.add('locked');
    } else {
      b.classList.add('clickable');
      if(selected.has(n)) b.classList.add('selected');
      b.addEventListener('click', ()=>{
        selected.has(n) ? selected.delete(n) : selected.add(n);
        renderVendaGrid(); updateVendaSummary();
      });
    }
    grid.appendChild(b);
  }
}
function updateVendaSummary(){
  const countEl = document.getElementById('venda-count');
  const totalEl = document.getElementById('venda-total');
  if(!countEl || !currentRodada) return;
  countEl.textContent = selected.size;
  totalEl.textContent = brl(selected.size * currentRodada.valorNumero);
}

async function emitirTicket(){
  if(!currentRodadaId){ showToast('Nenhuma rodada aberta', 'erro'); return; }
  if(selected.size === 0){ showToast('Selecione ao menos um número', 'erro'); return; }
  const nomeInput = document.getElementById('venda-nome');
  const nome = nomeInput.value.trim();
  if(!nome){ showToast('Informe o nome do cliente', 'erro'); return; }
  const telefone = document.getElementById('venda-telefone').value.trim();
  const pagamento = document.getElementById('venda-pagamento').value;
  const numerosArr = Array.from(selected);
  const valorNumero = currentRodada.valorNumero;
  const valorTotal = numerosArr.length * valorNumero;

  const rodadaRef = db.collection('rodadas').doc(currentRodadaId);
  const counterRef = db.collection('config').doc('contadores');
  const ticketRef = db.collection('tickets').doc();

  const btn = document.getElementById('btn-emitir');
  if(btn){ btn.disabled = true; }

  try{
    const codigoFmt = await db.runTransaction(async tx=>{
      const rodadaSnap = await tx.get(rodadaRef);
      const counterSnap = await tx.get(counterRef);
      if(!rodadaSnap.exists) throw new Error('Rodada não encontrada');
      const data = rodadaSnap.data();
      for(const n of numerosArr){
        if(data.numeros[n].vendido) throw new Error('O número '+n+' já foi vendido por outro atendimento. Atualize a tela.');
      }
      let proximoTicket = 1;
      if(counterSnap.exists && counterSnap.data().proximoTicket) proximoTicket = counterSnap.data().proximoTicket;
      const codigo = pad(proximoTicket, 5);

      const updates = {};
      numerosArr.forEach(n=>{
        updates['numeros.'+n+'.vendido'] = true;
        updates['numeros.'+n+'.ticketId'] = ticketRef.id;
        updates['numeros.'+n+'.ticketCodigo'] = codigo;
        updates['numeros.'+n+'.comprador'] = nome;
      });
      updates['totalArrecadado'] = firebase.firestore.FieldValue.increment(valorTotal);

      tx.update(rodadaRef, updates);
      tx.set(counterRef, { proximoTicket: proximoTicket+1 }, { merge:true });
      tx.set(ticketRef, {
        rodadaId: currentRodadaId, rodadaNumero: data.numero, codigo: codigo,
        numeros: numerosArr, comprador: nome, telefone: telefone, formaPagamento: pagamento, valorTotal: valorTotal,
        criadoEm: firebase.firestore.FieldValue.serverTimestamp()
      });
      return codigo;
    });

    showToast('Ticket #'+codigoFmt+' emitido!', 'sucesso');
    await carregarTicketPorCodigo(codigoFmt);
    showScreen('revelacao');
  }catch(err){
    showToast(err.message, 'erro');
    renderVendaGrid();
  }finally{
    if(btn){ btn.disabled = false; }
  }
}

/* ====================== REVELAÇÃO ====================== */
function buscarTicketManual(){
  const codigo = document.getElementById('busca-ticket').value.trim();
  if(!codigo){ showToast('Informe o código do ticket', 'erro'); return; }
  carregarTicketPorCodigo(pad(codigo,5));
}

async function carregarTicketPorCodigo(codigo){
  try{
    const snap = await db.collection('tickets').where('codigo','==',codigo).limit(1).get();
    if(snap.empty){ showToast('Ticket não encontrado', 'erro'); return; }
    const doc = snap.docs[0];
    currentTicket = { id: doc.id, ...doc.data() };
    ordemRevelacao = [];
    if(unsubTicketRodada) unsubTicketRodada();
    let primeira = true;
    unsubTicketRodada = db.collection('rodadas').doc(currentTicket.rodadaId).onSnapshot(s=>{
      currentTicketRodada = { id:s.id, ...s.data() };
      if(primeira){
        ordemRevelacao = currentTicket.numeros.filter(n=> currentTicketRodada.numeros[n].revelado).sort((a,b)=>a-b);
        primeira = false;
        renderRevelacao();
      } else {
        currentTicket.numeros.forEach(n=>{
          if(currentTicketRodada.numeros[n].revelado && !ordemRevelacao.includes(n)) ordemRevelacao.push(n);
        });
        renderRevelacaoGrid();
        renderRevelacaoLista();
      }
    });
  }catch(err){ showToast('Erro ao buscar ticket: '+err.message, 'erro'); }
}

function renderRevelacao(){
  const el = document.getElementById('revelacao-content');
  if(!currentTicket || !currentTicketRodada){
    el.innerHTML = '<p class="empty-state">Nenhum ticket carregado. Emita um ticket na aba Venda, ou busque pelo código acima.</p>';
    return;
  }
  el.innerHTML =
    '<div class="meta-row" style="margin-bottom:1rem;">'+
      '<span class="pill" style="background:var(--espresso); border-color:var(--espresso);">Ticket #'+currentTicket.codigo+'</span>'+
      '<span style="font-size:.85rem; color:var(--espresso-soft);">'+currentTicket.numeros.length+' números · toque nas suas bolas para revelar</span>'+
    '</div>'+
    '<div class="ball-grid" id="revelacao-grid"></div>'+
    '<div id="revelacao-lista"></div>';
  renderRevelacaoGrid();
  renderRevelacaoLista();
}

function renderRevelacaoGrid(){
  const grid = document.getElementById('revelacao-grid');
  if(!grid || !currentTicket || !currentTicketRodada) return;
  grid.innerHTML = '';
  currentTicket.numeros.forEach(n=>{
    const b = makeBall(n);
    const info = currentTicketRodada.numeros[n];
    if(info.revelado){
      b.classList.add(info.premio ? 'win' : 'lose');
      b.querySelector('.disc').textContent = info.premio ? '🎉' : '😢';
    } else {
      b.classList.add('clickable','mine');
      b.addEventListener('click', ()=> revelarNumero(n));
    }
    grid.appendChild(b);
  });
}

function renderRevelacaoLista(){
  const el = document.getElementById('revelacao-lista');
  if(!el) return;
  if(ordemRevelacao.length === 0){
    el.innerHTML = '<div class="result-banner">Toque em um dos seus números para revelar o resultado.</div>';
    return;
  }
  el.innerHTML = ordemRevelacao.slice().reverse().map(n=>{
    const info = currentTicketRodada.numeros[n];
    const win = !!info.premio;
    const msg = win
      ? ('🎉 Bola '+n+': você ganhou '+info.premio.nome+'!')
      : ('😢 Bola '+n+': não foi dessa vez! Tente na próxima rodada.');
    return '<div class="result-banner '+(win ? 'win' : 'lose')+'">'+msg+'</div>';
  }).join('');
}

async function revelarNumero(n){
  const rodadaRef = db.collection('rodadas').doc(currentTicket.rodadaId);
  try{
    const info = await db.runTransaction(async tx=>{
      const snap = await tx.get(rodadaRef);
      const data = snap.data();
      const atual = data.numeros[n];
      if(atual.revelado) return atual;
      tx.update(rodadaRef, { ['numeros.'+n+'.revelado']: true });
      atual.revelado = true;
      return atual;
    });
    currentTicketRodada.numeros[n] = info;
    if(!ordemRevelacao.includes(n)) ordemRevelacao.push(n);
    renderRevelacaoGrid();
    renderRevelacaoLista();
    if(info.premio){
      const ball = document.querySelector('#revelacao-grid .ball[data-n="'+n+'"]');
      if(ball) burstConfetti(ball);
    }
  }catch(err){ showToast('Erro ao revelar: '+err.message, 'erro'); }
}

function burstConfetti(el){
  const colors = ['#D4A33D','#8C2F2F','#2F6B4F','#FBF8F1'];
  for(let i=0;i<16;i++){
    const p = document.createElement('div'); p.className = 'confetti-piece';
    const angle = Math.random()*Math.PI*2;
    const dist = 30 + Math.random()*40;
    p.style.setProperty('--dx', Math.cos(angle)*dist + 'px');
    p.style.setProperty('--dy', (Math.sin(angle)*dist + 30) + 'px');
    p.style.setProperty('--rot', (Math.random()*360) + 'deg');
    p.style.background = colors[i % colors.length];
    p.style.transform = 'rotate(' + (Math.random()*360) + 'deg)';
    el.appendChild(p);
    setTimeout(()=> p.remove(), 950);
  }
}

/* ====================== CONFERÊNCIA ====================== */
function popularSeletorRodadas(){
  db.collection('rodadas').orderBy('numero','desc').limit(20).onSnapshot(snap=>{
    const sel = document.getElementById('conf-rodada-select');
    const valorAtual = sel.value;
    sel.innerHTML = snap.docs.map(d=>{
      const data = d.data();
      return '<option value="'+d.id+'">Rodada #'+pad(data.numero)+' '+(data.status==='aberta' ? '(aberta)' : '(finalizada)')+'</option>';
    }).join('');
    let alvo = null;
    if(valorAtual && snap.docs.some(d=> d.id===valorAtual)){
      alvo = valorAtual;
    } else {
      const aberta = snap.docs.find(d=> d.data().status==='aberta');
      alvo = aberta ? aberta.id : (snap.docs[0] ? snap.docs[0].id : null);
    }
    if(alvo){ sel.value = alvo; carregarConferencia(alvo); }
  });
  document.getElementById('conf-rodada-select').addEventListener('change', e=> carregarConferencia(e.target.value));
  document.getElementById('conf-ticket-select').addEventListener('change', renderConferencia);
}

function popularSeletorTickets(rodadaId){
  if(unsubTickets) unsubTickets();
  const sel = document.getElementById('conf-ticket-select');
  if(!rodadaId){
    sel.innerHTML = '<option value="" disabled selected>Escolha um ticket</option><option value="todos">Todos os tickets</option>';
    return;
  }
  unsubTickets = db.collection('tickets').where('rodadaId','==',rodadaId).onSnapshot(snap=>{
    const valorAtual = sel.value;
    let html = '<option value="" disabled selected>Escolha um ticket</option>';
    html += '<option value="todos">Todos os tickets</option>';
    snap.docs.forEach(d=>{
      const t = d.data();
      html += '<option value="'+d.id+'">'+t.comprador+' (#'+t.codigo+')</option>';
    });
    sel.innerHTML = html;
    if(valorAtual && (valorAtual === 'todos' || snap.docs.some(d=> d.id===valorAtual))) sel.value = valorAtual;
    else sel.value = '';
  });
}

function carregarConferencia(rodadaId){
  if(!rodadaId) return;
  if(unsubConferencia) unsubConferencia();
  unsubConferencia = db.collection('rodadas').doc(rodadaId).onSnapshot(s=>{
    confRodadaAtual = { id:s.id, ...s.data() };
    renderConferencia();
  });
  popularSeletorTickets(rodadaId);
}

function statusInfo(info){
  if(!info.vendido) return { label:'Não vendido', cls:'semresultado' };
  if(!info.premio) return { label:'Não premiado', cls:'semresultado' };
  return info.retirado ? { label:'Retirado', cls:'ganhou' } : { label:'Pendente', cls:'pendente' };
}

function renderConferencia(){
  const el = document.getElementById('conferencia-content');
  if(!confRodadaAtual){ el.innerHTML = ''; return; }
  const rodada = confRodadaAtual;
  const ticketFiltro = document.getElementById('conf-ticket-select').value;
  const filtroAtivo = ticketFiltro && ticketFiltro !== 'todos';

  if(rodada.status !== 'finalizada' && !filtroAtivo){
    el.innerHTML =
      '<p class="empty-state">Esta rodada ainda está aberta. A conferência geral fica disponível após o encerramento — mas você pode conferir um ticket específico selecionando-o no filtro acima.</p>'+
      '<div class="btn-row" style="margin-top:1rem;">'+
        '<button class="btn btn-danger" onclick="confirmarEncerrarRodada(\''+rodada.id+'\')">Encerrar rodada e revelar tudo</button>'+
      '</div>';
    return;
  }

  let linhas = '';
  for(let n=1; n<=rodada.qtdNumeros; n++){
    const info = rodada.numeros[n];
    // rodada aberta + filtro de ticket: só números revelados do ticket
    if(rodada.status !== 'finalizada'){
      if(!info.revelado) continue;
      if(info.ticketId !== ticketFiltro) continue;
    } else {
      // rodada encerrada: lista todos, aplica filtro se houver
      if(filtroAtivo && info.ticketId !== ticketFiltro) continue;
    }
    const st = statusInfo(info);
    const premioTxt = info.premio ? (info.premio.emoji+' '+info.premio.nome) : '—';
    const retirarBtn = (st.cls==='pendente')
      ? '<button class="retirar-link" onclick="marcarRetirado(\''+rodada.id+'\','+n+')">marcar retirado</button>'
      : '';
    linhas += '<tr><td>'+pad(n,2)+'</td><td>'+(info.comprador||'—')+'</td><td>'+premioTxt+'</td>'+
      '<td><span class="status-chip '+st.cls+'">'+st.label+'</span>'+retirarBtn+'</td></tr>';
  }
  if(!linhas){ linhas = '<tr><td colspan="4" style="text-align:center; color:var(--espresso-soft);">Nenhum registro encontrado</td></tr>'; }
  el.innerHTML =
    '<table class="ledger"><thead><tr><th>Número</th><th>Comprador</th><th>Prêmio</th><th>Status</th></tr></thead>'+
    '<tbody>'+linhas+'</tbody></table>';
}

function marcarRetirado(rodadaId, n){
  db.collection('rodadas').doc(rodadaId).update({ ['numeros.'+n+'.retirado']: true })
    .catch(err=> showToast('Erro: '+err.message, 'erro'));
}

function confirmarEncerrarRodada(rodadaId){
  comPin(()=>{
    if(!confirm('Encerrar a rodada e revelar todos os números restantes? Essa ação não pode ser desfeita.')) return;
    encerrarRodada(rodadaId);
  });
}

async function encerrarRodada(rodadaId){
  const rodadaRef = db.collection('rodadas').doc(rodadaId);
  try{
    await db.runTransaction(async tx=>{
      const snap = await tx.get(rodadaRef);
      const data = snap.data();
      const updates = { status:'finalizada', finalizadaEm: firebase.firestore.FieldValue.serverTimestamp() };
      for(let n=1; n<=data.qtdNumeros; n++){
        if(!data.numeros[n].revelado) updates['numeros.'+n+'.revelado'] = true;
      }
      tx.update(rodadaRef, updates);
    });
    showToast('Rodada encerrada! Todos os números foram revelados.', 'sucesso');
  }catch(err){ showToast('Erro ao encerrar: '+err.message, 'erro'); }
}

/* ====================== CERTIFICADO ANTIFRAUDE ====================== */
function abrirCertificado(){
  if(!confRodadaAtual){ showToast('Nenhuma rodada selecionada', 'erro'); return; }
  const rodada = confRodadaAtual;
  const criadoEm = rodada.criadoEm ? rodada.criadoEm.toDate() : null;
  const finalizadaEm = rodada.finalizadaEm ? rodada.finalizadaEm.toDate() : null;
  const fmtData = d => d ? d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR') : '—';
  const totalPremiados = Object.values(rodada.numeros).filter(n=> n.premio).length;
  const totalVendidos = Object.values(rodada.numeros).filter(n=> n.vendido).length;
  const hash = gerarHash(rodada);
  const certId = 'CERT-' + pad(rodada.numero) + '-' + (criadoEm ? criadoEm.getFullYear() : '—');

  document.getElementById('cert-modal-content').innerHTML =
    '<div class="cert-header" style="position:relative;">'+
      '<div class="cert-header-bulbs"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>'+
      '<button class="cert-close-btn" onclick="fecharCertificado()">×</button>'+
      '<p class="cert-logo">Dom Leon</p>'+
      '<p class="cert-sub-label">Padaria · Salto de Pirapora/SP</p>'+
      '<div class="cert-badge-row"><span class="cert-badge">🔐 Certificado antifraude</span></div>'+
    '</div>'+
    '<div class="cert-body">'+
      '<div class="cert-title-row">'+
        '<h3>Certificado de integridade do sorteio</h3>'+
        '<p>Os prêmios foram embaralhados pelo sistema antes de qualquer número ser vendido.</p>'+
      '</div>'+
      '<hr class="cert-divider">'+
      '<div class="cert-row"><span class="cert-label">Rodada</span><span class="cert-value">#'+pad(rodada.numero)+'</span></div>'+
      '<div class="cert-row"><span class="cert-label">Total de números</span><span class="cert-value">'+rodada.qtdNumeros+'</span></div>'+
      '<div class="cert-row"><span class="cert-label">Números premiados</span><span class="cert-value">'+totalPremiados+'</span></div>'+
      '<div class="cert-row"><span class="cert-label">Números vendidos</span><span class="cert-value">'+totalVendidos+'</span></div>'+
      '<div class="cert-row"><span class="cert-label">Embaralhado em</span><span class="cert-value">'+fmtData(criadoEm)+'</span></div>'+
      (finalizadaEm ? '<div class="cert-row"><span class="cert-label">Encerrado em</span><span class="cert-value">'+fmtData(finalizadaEm)+'</span></div>' : '')+
      '<div class="cert-row"><span class="cert-label">Status</span><span class="cert-value ok">'+(rodada.status==='finalizada' ? '✓ Finalizada' : '⏳ Em andamento')+'</span></div>'+
      '<hr class="cert-divider">'+
      '<p style="font-size:.75rem; color:var(--espresso-soft); margin:0 0 4px;">Hash de integridade (SHA-256 simulado)</p>'+
      '<div class="cert-hash-box">'+hash+'</div>'+
      '<p style="font-size:.7rem; color:var(--espresso-soft); margin:0;">Gerado a partir dos dados da rodada. Qualquer alteração posterior resulta em hash diferente.</p>'+
    '</div>'+
    '<div class="cert-footer">'+
      '<div class="cert-stamp">🎱</div>'+
      '<div class="cert-footer-text"><strong>Jogo da Sorte Dom Leon</strong><br>Certificado gerado automaticamente em '+fmtData(new Date())+'.<br>ID: '+certId+'</div>'+
    '</div>';
  document.getElementById('cert-overlay').classList.add('show');
}

function fecharCertificado(){
  document.getElementById('cert-overlay').classList.remove('show');
}

function gerarHash(rodada){
  const dados = JSON.stringify({
    numero: rodada.numero,
    numeros: Object.entries(rodada.numeros).map(([n,v])=>({ n, premio: v.premio?.nome||null })),
  });
  let h = 0;
  for(let i=0;i<dados.length;i++){
    h = ((h<<5)-h) + dados.charCodeAt(i);
    h |= 0;
  }
  const base = Math.abs(h).toString(16).padStart(8,'0');
  const ts = (rodada.criadoEm ? rodada.criadoEm.seconds : Date.now()).toString(16);
  const seed = (base + ts).repeat(5).slice(0,64);
  return seed.split('').map((c,i)=> ((parseInt(c,16)||0) ^ (rodada.numero + i)) % 16).map(n=>n.toString(16)).join('');
}
auth.signInAnonymously().then(async ()=>{
  await carregarFavoritos();
  renderPrizeEditList();
  listenCurrentRodada();
  popularSeletorRodadas();
}).catch(err=>{
  showToast('Erro ao conectar: '+err.message, 'erro');
});