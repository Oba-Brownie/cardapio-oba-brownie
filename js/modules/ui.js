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
/**
 * Função principal que desenha os produtos na tela
 * @param {Array} products - Lista completa de produtos
 * @param {Boolean} lojaAberta - Se a loja está aberta ou em agendamento
 */
export function renderProducts(products, lojaAberta) {
    const productListContainer = document.getElementById('product-list');
    const destaquesContainer = document.getElementById('destaques-section');
    const natalContainer = document.getElementById('natal-section'); // NOVO CONTAINER
    
    if (!productListContainer) return;

    // Limpa containers
    productListContainer.innerHTML = '';
    if(destaquesContainer) destaquesContainer.innerHTML = '';
    if(natalContainer) natalContainer.innerHTML = '';

// =========================================================
    // 1. SESSÃO ESPECIAL DE NATAL
    // =========================================================
    const produtosNatal = products.filter(p => p.categoria === 'Natal' && p.estoque > 0);

 
    if (natalContainer && produtosNatal.length > 0) {
        
        const headerHTML = `
            <div class="natal-header">
                <h3 class="natal-title">Doce Natal Oba Brownie!</h3>
                <span class="natal-subtitle">Presente para quem você ama na doçura Oba Brownie!</span>
            </div>
        `;
        
        const gridDiv = document.createElement('div');
        gridDiv.className = 'natal-grid';

        produtosNatal.forEach(product => {
            const card = document.createElement('div');
            card.className = 'natal-card';
            
            // Define o visual do botão (Ativo ou Fechado)
            let buttonHTML;
            if (lojaAberta) {
                buttonHTML = `<button class="natal-add-btn" onclick="addToCart('${product.id}')">Adicionar</button>`;
            } else {
                // Botão Cinza se a loja estiver fechada
                buttonHTML = `<button class="natal-add-btn" style="background-color: #a9a9a9; cursor: not-allowed;" disabled>Fechado</button>`;
            }

            let priceDisplay = `R$ ${product.price.toFixed(2).replace('.', ',')}`;

            card.innerHTML = `
                <div class="natal-card-img-container">
                    <img src="${product.image}" alt="${product.name}" class="natal-card-img">
                </div>
                <div class="natal-card-info">
                    <h4 class="natal-card-name">${product.name}</h4>
                    <span class="natal-card-price">${priceDisplay}</span>
                    ${buttonHTML}
                </div>
            `;
            gridDiv.appendChild(card);
        });

        natalContainer.innerHTML = headerHTML;
        natalContainer.appendChild(gridDiv);
    }
    // =========================================================
    // 2. DESTAQUES (CÓDIGO ORIGINAL - DESATIVADO TEMPORARIAMENTE)
    // =========================================================
    /* const destaques = products.filter(p => p.destaque && p.estoque > 0);
    if (destaquesContainer && destaques.length > 0 && lojaAberta) {
        destaquesContainer.style.display = 'block';
        // ... (código original do carrossel omitido para economizar espaço e manter desativado)
    } else if (destaquesContainer) {
        destaquesContainer.style.display = 'none';
    }
    */

    // =========================================================
    // 3. RENDERIZA LISTA PRINCIPAL (OUTRAS CATEGORIAS)
    // =========================================================
    
    let productsToRender = [];
    if (lojaAberta) {
        productsToRender = products.filter(p => p.estoque > 0);
    } else {
        productsToRender = products; // Mostra tudo se fechado
    }

    const productsByCategory = productsToRender.reduce((acc, product) => { 
        if (!acc[product.categoria]) acc[product.categoria] = []; 
        acc[product.categoria].push(product); 
        return acc; 
    }, {});

    // REMOVI 'Natal' dessa lista para ele não aparecer duplicado (já apareceu no grid lá em cima)
    const categoryOrder = ['Promoções', 'Brownies', 'Bolos', 'Doces', 'Salgados', 'Geladinho', 'Bebidas'];

    categoryOrder.forEach(categoria => {
        // Se a categoria for Natal, pulamos aqui pois ela já foi renderizada no topo
        if (categoria === 'Natal') return;

        if (productsByCategory[categoria]) {
            const categoryTitle = document.createElement('h3');
            categoryTitle.className = 'category-title';
            categoryTitle.textContent = categoria;
            productListContainer.appendChild(categoryTitle);

            productsByCategory[categoria].forEach(product => {
                const productElement = document.createElement('div');
                // ... (Mantém a mesma lógica de geração de preço original)
                let priceHTML = `<p class="product-price">R$ ${product.price.toFixed(2).replace('.', ',')}</p>`;
                if (product.originalPrice) {
                    priceHTML = `
                        <div class="product-price-container">
                            <span class="original-price">R$ ${product.originalPrice.toFixed(2).replace('.', ',')}</span>
                            <span class="promo-price">R$ ${product.price.toFixed(2).replace('.', ',')}</span>
                        </div>`;
                }

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
                    // MODO LOJA ABERTA
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

    // 4. RENDERIZA PRODUTOS ESGOTADOS (Mantém igual)
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