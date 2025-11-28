/* ================================================= */
/* ARQUIVO: js/main.js                               */
/* Controlador Principal (O "Maestro" da aplicação)  */
/* ================================================= */

import { 
    DADOS_LOJA, 
    LISTA_BAIRROS, 
    IS_BLACK_FRIDAY 
} from './config/constants.js';

import { 
    fetchConfiguracaoLoja, 
    fetchProducts 
} from './modules/api.js';

import { 
    addToCart as addToCartModule, 
    setTaxaEntrega, 
    getCart, 
    getCartValues 
} from './modules/cart.js';

import { 
    renderProducts, 
    initBlackFridayPopup, 
    hideSplashScreen, 
    showNotificacao 
} from './modules/ui.js';

import { 
    verificarStatusLoja, 
    copyToClipboard 
} from './modules/utils.js';

// --- ESTADO GLOBAL LOCAL ---
// Precisamos guardar a lista de produtos aqui para o window.addToCart funcionar
let todosProdutos = [];

// =================================================
// 1. INICIALIZAÇÃO DA APLICAÇÃO
// =================================================

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1.1. Interface Básica
    hideSplashScreen();
    initBlackFridayPopup();
    setupBairrosSelect(); // Preenche o select de bairros
    
    // 1.2. Configuração da Loja (API)
    const config = await fetchConfiguracaoLoja();
    let lojaForcadaFechada = false;
    
    if (config) {
        DADOS_LOJA.horarioAbertura = config.horarioAbertura || DADOS_LOJA.horarioAbertura;
        DADOS_LOJA.horarioFechamento = config.horarioFechamento || DADOS_LOJA.horarioFechamento;
        lojaForcadaFechada = config.lojaForcadaFechada;
    }

    // 1.3. Verificação de Status (Aberto/Fechado/Agendamento)
    const lojaAberta = verificarStatusLoja(lojaForcadaFechada);
    let isScheduling = sessionStorage.getItem('isSchedulingOrder') === 'true';

    // Se detectamos a flag de agendamento, removemos para não persistir em F5
    if (isScheduling) {
        sessionStorage.removeItem('isSchedulingOrder');
    }
    // Se a loja abriu, cancela o agendamento automaticamente
    if (lojaAberta && isScheduling) {
        isScheduling = false;
    }

    const canShop = lojaAberta || isScheduling;
    
    // Configura UI de Loja Fechada / Agendamento
    handleStoreStatusUI(lojaAberta, lojaForcadaFechada, isScheduling);

    // 1.4. Carregamento de Produtos
    try {
        todosProdutos = await fetchProducts();
        
        if (todosProdutos.length === 0 && IS_BLACK_FRIDAY) {
             document.getElementById('product-list').innerHTML = 
                `<p style="text-align: center; color: white; padding: 20px;">
                    Nenhum produto em oferta encontrado no momento.
                </p>`;
        } else {
            renderProducts(todosProdutos, canShop);
        }
    } catch (error) {
        document.getElementById('product-list').innerHTML = 
            `<p style="text-align: center; color: red;">Não foi possível carregar o cardápio.</p>`;
    }

    // 1.5. Configurar Event Listeners (Botões e Inputs)
    setupEventListeners(canShop);
});

// =================================================
// 2. EXPOSIÇÃO GLOBAL (Para o HTML acessar)
// =================================================

/**
 * Função chamada pelo onclick do HTML (botão + ou Adicionar)
 */
window.addToCart = (id) => {
    const produto = todosProdutos.find(p => p.id === id);
    if (produto) {
        addToCartModule(produto);
    }
};

// Funções do Modal Pix e Navegação
window.openPixPopup = () => { document.getElementById('pix-popup').style.display = 'flex'; };
window.closePixPopup = () => { document.getElementById('pix-popup').style.display = 'none'; };
window.copyPixKey = async () => {
    const key = document.getElementById('pix-key').innerText;
    const sucesso = await copyToClipboard(key);
    alert(sucesso ? 'Chave Pix copiada!' : 'Não foi possível copiar automaticamente.');
};

// Funções de Carrinho (Input e Remoção chamados pelo UI do cart)
// Nota: O cart.js renderiza inputs que chamam updateQuantity e removeFromCart.
// Se você manteve o HTML string no cart.js, precisará expor essas também, 
// ou (melhor) adicionar os eventos no próprio cart.js como fiz no exemplo anterior.
// Se precisar expor:
// window.removeFromCart = (id) => removeFromCartModule(id);
// window.updateQuantity = (id, qtd) => updateQuantityModule(id, qtd);

// =================================================
// 3. LÓGICA DE INTERFACE E EVENTOS
// =================================================

function setupBairrosSelect() {
    const bairroSelect = document.getElementById('bairro-select');
    const deliveryFields = document.getElementById('delivery-fields'); // Pega o container para adicionar aviso
    
    if (!bairroSelect) return;

    // Limpa o select para garantir que não duplique
    bairroSelect.innerHTML = '';

    LISTA_BAIRROS.forEach(bairro => {
        const option = document.createElement('option');
        option.value = bairro.nome;
        option.dataset.taxa = bairro.taxa; // Guarda a taxa no dataset

        // --- LÓGICA DO TEXTO DA OPÇÃO ---
        let textoExibicao = bairro.nome;

        // Se for o item "Selecione...", não faz nada especial
        if (bairro.taxa > 0) {
            textoExibicao += ` - R$ ${bairro.taxa.toFixed(2).replace('.', ',')}`;

            // AQUI ESTÁ A MÁGICA:
            // Se for Black Friday E a taxa for elegível (<= 7.00), mostra o aviso
            if (IS_BLACK_FRIDAY && bairro.taxa <= 7.00) {
                textoExibicao += ` ⭐ (Grátis acima de R$60)`;
            }
        }

        option.textContent = textoExibicao;
        bairroSelect.appendChild(option);
    });

    // Opcional: Adiciona uma legenda pequena abaixo do select apenas na Black Friday
    // Verifica se a legenda já existe para não criar várias vezes
    const idLegenda = 'legenda-frete-bf';
    const legendaExistente = document.getElementById(idLegenda);

    if (IS_BLACK_FRIDAY && !legendaExistente && deliveryFields) {
        const legenda = document.createElement('p');
        legenda.id = idLegenda;
        legenda.style.fontSize = '0.8em';
        legenda.style.color = '#FFD700'; // Amarelo Ouro
        legenda.style.marginTop = '5px';
        legenda.style.marginBottom = '0';
        legenda.innerHTML = '⭐ Bairros marcados têm <strong>Entrega Grátis</strong> em compras acima de R$ 60,00.';
        
        // Insere a legenda logo após o select
        bairroSelect.parentNode.insertBefore(legenda, bairroSelect.nextSibling);
    }
}

function handleStoreStatusUI(lojaAberta, lojaForcadaFechada, isScheduling) {
    const checkoutButton = document.getElementById('checkout-button');
    const avisoContainer = document.getElementById('aviso-loja-fechada');
    
    // Bloqueia botão se não puder comprar
    if (!lojaAberta && !isScheduling) {
        if (checkoutButton) {
            checkoutButton.disabled = true;
            checkoutButton.textContent = 'Estamos Fechados :(';
        }

        document.body.classList.add('loja-fechada-filter');
        
        let avisoMsg = `<p><strong>Desculpe, estamos fechados no momento!</strong></p>`;
        if (!lojaForcadaFechada) {
            const abertura = `${Math.floor(DADOS_LOJA.horarioAbertura)}:${(DADOS_LOJA.horarioAbertura % 1 * 60).toString().padStart(2, '0')}`;
            const fechamento = `${Math.floor(DADOS_LOJA.horarioFechamento)}:${(DADOS_LOJA.horarioFechamento % 1 * 60).toString().padStart(2, '0')}`;
            avisoMsg += `<p>Nosso horário de funcionamento é das ${abertura} às ${fechamento}.</p>`;
        }
        avisoMsg += `<p>Deseja agendar um pedido para o dia seguinte?</p>`;
        avisoMsg += `<button id="schedule-order-btn" class="schedule-order-button">Sim, Agendar Pedido</button>`;
        
        if (avisoContainer) {
            avisoContainer.innerHTML = avisoMsg;
            avisoContainer.style.display = 'block';
            
            // Evento do botão "Agendar"
            document.getElementById('schedule-order-btn').addEventListener('click', () => {
                sessionStorage.setItem('isSchedulingOrder', 'true');
                window.location.reload();
            });
        }
    }

    // UI Específica de Agendamento (Lógica da Data corrigida)
    if (isScheduling) {
        setupSchedulingUI();
    }
}

function setupSchedulingUI() {
    // 1. Aviso de Topo com Botão Sair
    const schedulingNotice = document.createElement('div');
    schedulingNotice.className = 'scheduling-notice';
    schedulingNotice.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
            <p><strong>Atenção:</strong> Você está no modo de <strong>Agendamento</strong>.</p>
            <button id="cancel-scheduling-btn" style="background: transparent; border: 1px solid #b38200; color: #b38200; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 0.8em;">
                ✕ Sair do Agendamento e Voltar
            </button>
        </div>`;
    document.querySelector('main').prepend(schedulingNotice);

    document.getElementById('cancel-scheduling-btn').addEventListener('click', () => {
        sessionStorage.removeItem('isSchedulingOrder');
        window.location.reload();
    });

    // 2. Cálculo da Data Inteligente (Hoje vs Amanhã)
    const infoBox = document.getElementById('scheduling-info-box');
    const nextDayDateSpan = document.getElementById('next-day-date');

    if (infoBox && nextDayDateSpan) {
        const agora = new Date();
        const horaAtualDecimal = agora.getHours() + (agora.getMinutes() / 60);
        const dataAgendamento = new Date(agora);

        // Se é cedo (antes de abrir), agenda pra hoje. Se tarde, pra amanhã.
        if (horaAtualDecimal >= DADOS_LOJA.horarioAbertura) {
            dataAgendamento.setDate(dataAgendamento.getDate() + 1);
        }

        const dataFormatada = dataAgendamento.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        // Texto HOJE ou AMANHÃ
        const isHoje = (dataAgendamento.getDate() === agora.getDate());
        const textoDia = isHoje ? "HOJE" : "AMANHÃ";

        nextDayDateSpan.textContent = dataFormatada;
        schedulingNotice.querySelector('p').innerHTML = `<strong>Atenção:</strong> Você está agendando um pedido para <strong>${textoDia} (${dataFormatada})</strong>.`;
        infoBox.style.display = 'block';
    }

    // 3. Select de Horários
    const timeBox = document.getElementById('scheduling-time-box');
    const timeSelect = document.getElementById('scheduling-time-select');
    if (timeBox && timeSelect) {
        timeSelect.innerHTML = '<option value="">Selecione um horário...</option>';
        for (let time = DADOS_LOJA.horarioAbertura; time <= DADOS_LOJA.horarioFechamento; time += 0.5) {
            const hour = Math.floor(time);
            const minutes = (time % 1) * 60;
            const formattedTime = `${hour.toString()}:${minutes.toString().padStart(2, '0')}`;
            const option = document.createElement('option');
            option.value = formattedTime;
            option.textContent = formattedTime;
            timeSelect.appendChild(option);
        }
        timeBox.style.display = 'block';
    }

    // 4. Forçar Pix
    const paymentMethodSelect = document.getElementById('payment-method');
    if (paymentMethodSelect) {
        paymentMethodSelect.value = 'Pix';
        Array.from(paymentMethodSelect.options).forEach(opt => {
            if (opt.value !== 'Pix' && opt.value !== '') opt.disabled = true;
        });
    }
}

function setupEventListeners(canShop) {
    const checkoutButton = document.getElementById('checkout-button');
    const bairroSelect = document.getElementById('bairro-select');
    const paymentMethodSelect = document.getElementById('payment-method');
    const carrinhoFlutuante = document.getElementById('carrinho-flutuante');
    
    // Mudança de Bairro -> Atualiza Taxa
    if (bairroSelect) {
        bairroSelect.addEventListener('change', (event) => {
            // Busca a taxa no array original usando o nome (mais seguro)
            const bairroEncontrado = LISTA_BAIRROS.find(b => b.nome === event.target.value);
            const taxa = bairroEncontrado ? bairroEncontrado.taxa : 0;
            setTaxaEntrega(taxa);
        });
    }

    // Mudança de Pagamento -> Mostra campos extras
    if (paymentMethodSelect) {
        paymentMethodSelect.addEventListener('change', (event) => {
            const val = event.target.value;
            const trocoSection = document.getElementById('troco-section');
            const taxaInfoBox = document.getElementById('taxa-info');

            if (val === 'Pix') window.openPixPopup();
            
            if (val === 'Dinheiro') {
                trocoSection.style.display = 'block';
            } else {
                trocoSection.style.display = 'none';
                document.getElementById('troco-para').value = '';
            }

            if (val.includes('Cartão')) {
                taxaInfoBox.innerText = `No ${val.toLowerCase()} cobramos taxa.`;
                taxaInfoBox.style.display = 'block';
            } else {
                taxaInfoBox.style.display = 'none';
            }
            
            // Recalcula totais (por causa da taxa do cartão)
            setTaxaEntrega(parseFloat(document.getElementById('bairro-select').selectedOptions[0]?.dataset?.taxa || 0));
        });
    }

    // Tipo de Entrega (Radio Buttons)
    document.querySelectorAll('input[name="delivery_type"]').forEach(radio => {
        radio.addEventListener('change', (event) => {
            const isPickup = event.target.value === 'pickup';
            document.getElementById('delivery-fields').style.display = isPickup ? 'none' : 'block';
            document.getElementById('pickup-address-info').style.display = isPickup ? 'block' : 'none';
            document.getElementById('delivery-fee-line').style.display = isPickup ? 'none' : 'flex';
            
            if (isPickup) {
                setTaxaEntrega(0);
                if(bairroSelect) bairroSelect.selectedIndex = 0;
            } else {
                // Restaura taxa do bairro selecionado (se houver)
                const bairroNome = bairroSelect.value;
                const bairroData = LISTA_BAIRROS.find(b => b.nome === bairroNome);
                setTaxaEntrega(bairroData ? bairroData.taxa : 0);
            }
        });
    });

    // Scroll Carrinho
    if (carrinhoFlutuante) {
        carrinhoFlutuante.addEventListener('click', () => {
            document.querySelector('.checkout-area').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Finalizar Pedido
    if (checkoutButton && canShop) {
        checkoutButton.addEventListener('click', handleCheckout);
    }
}

// =================================================
// 4. LÓGICA DE CHECKOUT (WhatsApp)
// =================================================

async function handleCheckout() {
    const isScheduling = !!document.querySelector('.scheduling-notice'); // Detecta se está no modo agendamento
    const cart = getCart(); // Pega itens do módulo cart
    const cartValues = getCartValues(); // Pega valores calculados (frete, totais)

    if (cart.length === 0) return alert("Seu carrinho está vazio!");

    // Coleta dados do form
    const name = document.getElementById('customer-name').value;
    const phone = document.getElementById('customer-phone').value;
    const paymentMethod = document.getElementById('payment-method').value;
    const deliveryType = document.querySelector('input[name="delivery_type"]:checked').value;
    
    if (!name || !paymentMethod) return alert("Por favor, preencha seu nome e a forma de pagamento.");

    // Validação Delivery
    const address = document.getElementById('customer-address').value;
    const bairroNome = document.getElementById('bairro-select').value;
    const reference = document.getElementById('customer-reference').value;
    
    if (deliveryType === 'delivery' && (!address || bairroNome === "Selecione o bairro...")) {
        return alert("Para delivery, por favor, preencha o bairro e o endereço.");
    }

    // Validação Agendamento
    let scheduledTime = '';
    if (isScheduling) {
        scheduledTime = document.getElementById('scheduling-time-select').value;
        if (!scheduledTime) return alert("Por favor, selecione um horário para a entrega ou retirada.");
    }

    const btn = document.getElementById('checkout-button');
    btn.disabled = true;
    btn.textContent = 'Processando...';

    try {
        // API Baixa de Estoque
        const response = await fetch('https://oba-brownie-api.vercel.app/api/dar-baixa-estoque', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cart)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao processar estoque.');
        }

        // Montagem da Mensagem
        const displayName = name.trim().split(' ').slice(0, 2).join(' ');
        const numeroWhatsapp = '5599991675891';
        let message = `*🔺🔻🔺🔻🔺🔻🔺🔻🔺🔻🔺🔻*\n\n`;

        if (isScheduling) {
            const dataTexto = document.getElementById('next-day-date').textContent;
            message += `*‼️ PEDIDO AGENDADO ‼️*\n`;
            message += `*PARA: ${dataTexto}*\n`;
            message += `*HORÁRIO: ${scheduledTime}*\n\n`;
        }
        
        message += `*•••  PEDIDO ${displayName}  •••*\n\n`;

        if (deliveryType === 'pickup') {
            message += `*TIPO:* *RETIRADA NO LOCAL*\n`;
        } else {
            message += `*TIPO:* *DELIVERY*\n`;
            message += `*ENDEREÇO:* *${address.trim()}, ${bairroNome}*\n`;
            if (reference) message += `*REF:* *${reference.trim()}*\n`;
            
            // Lógica do Frete na Mensagem (Usa o valor calculado no cart.js)
            if (cartValues.frete === 0 && deliveryType === 'delivery') {
                 message += `\n*VALOR DA ENTREGA:* *GRÁTIS (Promoção)*\n`;
            } else {
                 message += `\n*VALOR DA ENTREGA:* *R$ ${cartValues.frete.toFixed(2).replace('.', ',')}*\n`;
            }
        }

        message += `\n*PAGAMENTO:* *${paymentMethod}*`;
        if (paymentMethod === 'Dinheiro') {
            const troco = document.getElementById('troco-para').value;
            if (troco) message += ` *(Troco para R$ ${troco})*`;
        }
        
        message += `\n`;
        if (phone) message += `\n*TELEFONE:* *${phone}*\n`;
        
        const obs = document.getElementById('customer-observation').value;
        if (obs) message += `\n*OBSERVAÇÃO:* *${obs.trim()}*\n`;
        
        message += `\n--- *ITENS DO PEDIDO* ---\n`;
        cart.forEach(item => {
            message += `*${item.quantity}x ${item.name}* - *R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}*\n`;
        });
        
        message += `\n*Subtotal:* *R$ ${cartValues.subtotal.toFixed(2).replace('.', ',')}*`;
        if (cartValues.taxaCartao > 0) {
            message += `\n*Taxa Maquininha:* *R$ ${cartValues.taxaCartao.toFixed(2).replace('.', ',')}*`;
        }
        
        const totalFinal = cartValues.subtotal + cartValues.frete + cartValues.taxaCartao;
        message += `\n*Total:* *R$ ${totalFinal.toFixed(2).replace('.', ',')}*`;
        message += `\n\n*🔺🔻🔺🔻🔺🔻🔺🔻🔺🔻🔺🔻*`;

        const whatsappUrl = `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(message)}`;
        window.location.href = whatsappUrl;

    } catch (error) {
        alert(error.message);
        btn.disabled = false;
        btn.textContent = 'Finalizar Pedido no WhatsApp';
    }
}