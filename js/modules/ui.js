/* ================================================= */
/* ARQUIVO: js/modules/ui.js                         */
/* Responsável pela manipulação do DOM (Interface)   */
/* ================================================= */

import { IS_BLACK_FRIDAY } from '../config/constants.js';

let notificacaoTimeout;

// --- NOTIFICAÇÕES E POP-UPS ---

/**
 * Exibe o toast de notificação no topo (ex: "Produto adicionado")
 */
export function showNotificacao(mensagem) {
    const notificacao = document.getElementById('notificacao-carrinho');
    if (!notificacao) return;

    notificacao.textContent = mensagem;
    notificacao.classList.add('visible');
    
    clearTimeout(notificacaoTimeout);
    notificacaoTimeout = setTimeout(() => { 
        notificacao.classList.remove('visible'); 
    }, 5000);
}

/**
 * Inicializa e exibe o aviso especial de Frete Grátis da Black Friday
 */
export function initBlackFridayPopup() {

    const aviso = document.getElementById('aviso-promo-bf');
    if (aviso) {
        // Espera 1 segundo para aparecer
        setTimeout(() => {
            aviso.classList.add('visivel');
            // Some após 7 segundos
            setTimeout(() => {
                aviso.classList.remove('visivel');
            }, 7000); 
        }, 1000);
    }
}

/**
 * Esconde a tela de carregamento (Splash Screen)
 */
export function hideSplashScreen() {
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) { 
        setTimeout(() => { 
            splashScreen.classList.add('hidden'); 
        }, 2000); 
    }
}

// --- RENDERIZAÇÃO DE PRODUTOS ---

/**
 * Gera o HTML do preço (trata promoções e Black Friday)
 * @param {Object} product 
 */
function generatePriceHTML(product) {
    // Se tiver preço original (promoção ou BF), mostra o "De/Por"
    if (product.originalPrice) {
        return `
            <div class="product-price-container">
                <span class="original-price">R$ ${product.originalPrice.toFixed(2).replace('.', ',')}</span>
                <span class="promo-price">R$ ${product.price.toFixed(2).replace('.', ',')}</span>
            </div>`;
    } 
    // Preço normal
    return `<p class="product-price">R$ ${product.price.toFixed(2).replace('.', ',')}</p>`;
}

/**
 * Função principal que desenha os produtos na tela
 * @param {Array} products - Lista completa de produtos
 * @param {Boolean} lojaAberta - Se a loja está aberta ou em agendamento
 */
export function renderProducts(products, lojaAberta) {
    const productListContainer = document.getElementById('product-list');
    const destaquesContainer = document.getElementById('destaques-section');
    
    if (!productListContainer || !destaquesContainer) return;

    productListContainer.innerHTML = '';
    destaquesContainer.innerHTML = '';

    // Separa os destaques (apenas com estoque)
    const destaques = products.filter(p => p.destaque && p.estoque > 0);
    
    // 1. RENDERIZA DESTAQUES (Carrossel)
    if (destaques.length > 0 && lojaAberta) {
        destaquesContainer.style.display = 'block';
        
        const title = document.createElement('h3');
        title.className = 'category-title';
        title.textContent = 'Destaques';
        
        const carousel = document.createElement('div');
        carousel.className = 'destaques-carousel';
        
        destaques.forEach(product => {
            const card = document.createElement('div');
            card.className = 'card-destaque';
            card.dataset.productId = product.id;
            
            const priceHTML = generatePriceHTML(product);

            // Nota: onclick="addToCart(...)" funciona porque vamos expor a função globalmente no main.js
            card.innerHTML = `
                <img src="${product.image}" alt="${product.name}">
                <div class="card-destaque-info">
                    <h4>${product.name}</h4>
                    <p>${product.description}</p>
                    <div class="card-destaque-footer">
                        ${priceHTML}
                        <button class="card-destaque-add-button" onclick="addToCart('${product.id}')">Adicionar</button>
                    </div>
                </div>`;
            carousel.appendChild(card);
        });
        
        destaquesContainer.appendChild(title);
        destaquesContainer.appendChild(carousel);
    } else {
        destaquesContainer.style.display = 'none';
    }

    // Agrupa produtos por categoria
    // Se a loja estiver fechada, mostramos TODOS (inclusive sem estoque) como fechados.
    // Se aberta, filtramos estoque > 0 para a lista principal.
    
    let productsToRender = [];
    if (lojaAberta) {
        productsToRender = products.filter(p => p.estoque > 0);
    } else {
        productsToRender = products; // Mostra tudo, mas bloqueado
    }

    const productsByCategory = productsToRender.reduce((acc, product) => { 
        if (!acc[product.categoria]) acc[product.categoria] = []; 
        acc[product.categoria].push(product); 
        return acc; 
    }, {});

    const categoryOrder = ['Promoções', 'Brownies','Cookies', 'Bolos', 'Doces', 'Salgados', 'Geladinho', 'Bebidas'];

    // 2. RENDERIZA LISTA PRINCIPAL
    categoryOrder.forEach(categoria => {
        if (productsByCategory[categoria]) {
            const categoryTitle = document.createElement('h3');
            categoryTitle.className = 'category-title';
            categoryTitle.textContent = categoria;
            productListContainer.appendChild(categoryTitle);

            productsByCategory[categoria].forEach(product => {
                const productElement = document.createElement('div');
                const priceHTML = generatePriceHTML(product);

                // Lógica de Bloqueio (Loja Fechada ou Esgotado visualmente)
                if (!lojaAberta) {
                    // MODO LOJA FECHADA
                    productElement.className = 'product-item esgotado';
                    productElement.innerHTML = `
                        <div class="product-info">
                            <h4 class="product-name">${product.name}</h4>
                            <p class="product-description">${product.description}</p>
                            ${priceHTML}
                        </div>
                        <div class="product-image-container">
                            <img src="${product.image}" alt="${product.name}" class="product-image">
                            <button class="add-button-esgotado" disabled>Fechado</button>
                        </div>`;
                } else {
                    // MODO LOJA ABERTA (Disponível)
                    productElement.className = 'product-item';
                    productElement.dataset.productId = product.id;
                    productElement.innerHTML = `
                        <div class="product-info">
                            <h4 class="product-name">${product.name}</h4>
                            <p class="product-description">${product.description}</p>
                            ${priceHTML}
                        </div>
                        <div class="product-image-container">
                            <img src="${product.image}" alt="${product.name}" class="product-image">
                            <button class="add-button" onclick="addToCart('${product.id}')">+</button>
                        </div>`;
                }
                productListContainer.appendChild(productElement);
            });
        }
    });

    // 3. RENDERIZA PRODUTOS ESGOTADOS (Apenas se loja aberta)
    if (lojaAberta) {
        const soldOutProducts = products.filter(p => p.estoque <= 0);
        
        if (soldOutProducts.length > 0) {
            const soldOutTitle = document.createElement('h3');
            soldOutTitle.className = 'category-title';
            soldOutTitle.textContent = 'Produtos Esgotados';
            productListContainer.appendChild(soldOutTitle);
            
            soldOutProducts.forEach(product => {
                const productElement = document.createElement('div');
                productElement.className = 'product-item esgotado';
                productElement.innerHTML = `
                    <div class="product-info">
                        <h4 class="product-name">${product.name}</h4>
                        <p class="product-description">${product.description}</p>
                        <p class="product-price">R$ ${product.price.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div class="product-image-container">
                        <img src="${product.image}" alt="${product.name}" class="product-image">
                        <button class="add-button-esgotado" disabled>Esgotado</button>
                    </div>`;
                productListContainer.appendChild(productElement);
            });
        }
    }
}