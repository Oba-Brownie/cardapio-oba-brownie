/* ================================================= */
/* ARQUIVO: js/modules/cart.js                       */
/* Responsável pela lógica, estado e renderização    */
/* do carrinho de compras.                           */
/* ================================================= */

import { IS_BLACK_FRIDAY } from '../config/constants.js';
import { showNotificacao } from './ui.js'; // Assumindo que você criará este arquivo

// --- ESTADO DO MÓDULO (Variáveis Privadas) ---
let cart = [];
let taxaEntregaAtual = 0;
let taxaCartaoAtual = 0;
let valorFreteFinal = 0; // Armazena o valor real cobrado (pode ser 0 na BF)

// --- FUNÇÕES DE LÓGICA DO CARRINHO ---

/**
 * Adiciona um produto ao carrinho
 * @param {Object} product - O objeto completo do produto vindo da API
 */
export function addToCart(product) {
    if (!product) return;

    // 1. Verificação de Estoque Inicial
    if (product.estoque <= 0) { 
        showNotificacao("Desculpe, este produto está esgotado."); 
        return; 
    }
    
    const cartItem = cart.find(item => item.id === product.id);

    // 2. Verificação de Estoque ao Incrementar
    if (cartItem && cartItem.quantity >= product.estoque) {
        const plural = product.estoque > 1 ? 'disponíveis' : 'disponível';
        showNotificacao(`Temos apenas ${product.estoque} unidades de "${product.name}" ${plural}.`);
        return;
    }

    // 3. Efeito Visual (Flash) - Opcional, depende do elemento existir no DOM
    const productCard = document.querySelector(`[data-product-id="${product.id}"]`);
    if (productCard) {
        productCard.classList.add('flash-success');
        setTimeout(() => { productCard.classList.remove('flash-success'); }, 700);
    }
    
    // 4. Atualiza o Estado
    showNotificacao(`"${product.name}" adicionado!`);
    
    if (cartItem) { 
        cartItem.quantity++; 
    } else { 
        // Adicionamos uma cópia do produto para garantir que temos o estoque salvo no item
        cart.push({ ...product, quantity: 1 }); 
    }

    // 5. Atualiza a Interface
    renderCartItems();
    updateCartTotal();
    updateContadorCarrinho();
}

/**
 * Remove um item do carrinho pelo ID
 */
export function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    renderCartItems();
    updateCartTotal();
    updateContadorCarrinho();
}

/**
 * Atualiza a quantidade de um item (chamado pelo input number)
 */
export function updateQuantity(productId, newQuantity) {
    let quantity = parseInt(newQuantity);
    const cartItem = cart.find(item => item.id === productId);

    if (cartItem) {
        if (quantity > 0) {
            // Verifica estoque novamente
            if (quantity > cartItem.estoque) {
                showNotificacao(`Estoque insuficiente! Apenas ${cartItem.estoque} unidades disponíveis.`);
                quantity = cartItem.estoque; 
                
                // Força o input visual a voltar para o máximo
                const input = document.getElementById(`quantity-${productId}`);
                if (input) input.value = quantity;
            }
            cartItem.quantity = quantity;
        } else {
            removeFromCart(productId);
            return;
        }
    }
    renderCartItems(); // Re-renderiza para atualizar preços parciais
    updateCartTotal();
}

/**
 * Define a taxa de entrega base (chamado quando muda o Bairro no select)
 */
export function setTaxaEntrega(valor) {
    taxaEntregaAtual = parseFloat(valor);
    updateCartTotal();
}

/**
 * Calcula a taxa da maquininha
 */
function calculateCardFee(subtotal, paymentMethod) {
    if (paymentMethod === 'Cartão de Crédito') {
        return subtotal * 0.0498;
    }
    if (paymentMethod === 'Cartão de Débito') {
        return subtotal * 0.0198;
    }
    return 0;
}

// --- FUNÇÕES DE RENDERIZAÇÃO (UI DO CARRINHO) ---

/**
 * Renderiza a lista HTML dos itens no carrinho lateral
 */
function renderCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) return;

    cartItemsContainer.innerHTML = ''; 

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p>Seu carrinho está vazio.</p>';
    } else {
        cart.forEach(item => {
            const cartItemElement = document.createElement('div');
            cartItemElement.className = 'cart-item';
            
            // Note que estamos usando as funções exportadas no onclick via window (setup no main.js)
            // ou adicionando listeners via JS depois. Para simplificar a migração, mantivemos HTML string,
            // mas o ideal seria criar elementos DOM e addEventListener.
            cartItemElement.innerHTML = `
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                </div>
                <div class="item-controls">
                    <label for="quantity-${item.id}" class="quantity-label">Qtd:</label>
                    <input type="number" id="quantity-${item.id}" class="quantity-input" 
                           value="${item.quantity}" min="1" data-id="${item.id}">
                    <button class="remove-button" data-id="${item.id}">×</button>
                </div>`;
            
            cartItemsContainer.appendChild(cartItemElement);
        });

        // Adicionando eventos manualmente para não poluir o HTML global
        document.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('change', (e) => updateQuantity(e.target.dataset.id, e.target.value));
        });
        document.querySelectorAll('.remove-button').forEach(btn => {
            btn.addEventListener('click', (e) => removeFromCart(e.target.dataset.id));
        });
    }
}

/**
 * Calcula totais, aplica regras de Black Friday e atualiza os textos de preço
 */
export function updateCartTotal() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const paymentMethodEl = document.getElementById('payment-method');
    const paymentMethod = paymentMethodEl ? paymentMethodEl.value : '';
    
    // === LÓGICA DO FRETE GRÁTIS BLACK FRIDAY ===
    valorFreteFinal = taxaEntregaAtual;
    let textoFrete = `R$ ${taxaEntregaAtual.toFixed(2).replace('.', ',')}`;
    
    // Regra: Página BF + Subtotal >= 60 + Taxa do Bairro <= 7 + Taxa não pode ser 0 (retirada)
    if (IS_BLACK_FRIDAY && subtotal >= 60.00 && taxaEntregaAtual > 0 && taxaEntregaAtual <= 7.00) {
        valorFreteFinal = 0;
        textoFrete = `<span style="text-decoration: line-through; color: #777; font-size: 0.8em; margin-right: 5px;">R$ ${taxaEntregaAtual.toFixed(2).replace('.', ',')}</span> <span style="color: #FFD700; font-weight: bold;">GRÁTIS</span>`;
    }

    const valorParaTaxa = subtotal + valorFreteFinal;
    taxaCartaoAtual = calculateCardFee(valorParaTaxa, paymentMethod);
    const totalFinal = subtotal + valorFreteFinal + taxaCartaoAtual;

    // Atualiza DOM
    const elSubtotal = document.getElementById('subtotal-cart');
    const elTaxaEntrega = document.getElementById('taxa-entrega-cart');
    const elTotal = document.getElementById('cart-total');
    const cardFeeLine = document.getElementById('card-fee-line');
    const cardFeeCart = document.getElementById('card-fee-cart');

    if (elSubtotal) elSubtotal.innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    if (elTaxaEntrega) elTaxaEntrega.innerHTML = textoFrete;
    if (elTotal) elTotal.innerText = `R$ ${totalFinal.toFixed(2).replace('.', ',')}`;
    
    if (taxaCartaoAtual > 0 && cardFeeLine && cardFeeCart) {
        cardFeeCart.innerText = `R$ ${taxaCartaoAtual.toFixed(2).replace('.', ',')}`;
        cardFeeLine.style.display = 'flex';
    } else if (cardFeeLine) {
        cardFeeLine.style.display = 'none';
    }
}

/**
 * Atualiza a bolinha vermelha com o número de itens
 */
function updateContadorCarrinho() {
    const contador = document.getElementById('contador-carrinho');
    if (!contador) return;
    
    const totalItens = cart.reduce((total, item) => total + item.quantity, 0);
    contador.textContent = totalItens;
    
    if (totalItens > 0) { contador.classList.add('visible'); }
    else { contador.classList.remove('visible'); }
}

// --- GETTERS (Para uso no checkout em main.js) ---

/**
 * Retorna o array atual do carrinho (para enviar ao WhatsApp)
 */
export function getCart() {
    return cart;
}

/**
 * Retorna os valores finais calculados (para o checkout saber o frete exato)
 */
export function getCartValues() {
    return {
        subtotal: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        frete: valorFreteFinal, // Retorna 0 se for promoção, ou o valor normal
        taxaCartao: taxaCartaoAtual
    };
}