// ===============================================
// CONFIGURAÇÕES DA LOJA
// ===============================================
const DADOS_LOJA = {
    horarioAbertura: 12.5,
    horarioFechamento: 17.5,
    diasFuncionamento: [0, 1, 2, 3, 4, 5, 6]
};
const CONFIG_ENTRY_ID = '2sCM9bEm5AxhgQSVXfY6pU';

// --- VARIÁVEIS GLOBAIS ---
let products = [];
let cart = [];
let taxaEntregaAtual = 0;
let taxaCartaoAtual = 0; // NOVA VARIÁVEL
let notificacaoTimeout;
let lojaForcadaFechada = false;

const bairros = [ { nome: "Barra Azul", taxa: 5.00 }, { nome: "Baixão(depois do teatro)", taxa: 8.00 }, { nome: "Bairro Matadouro", taxa: 4.00 }, { nome: "Bom Jardim", taxa: 7.00 }, { nome: "Brasil Novo (vila Ildemar)", taxa: 9.00 }, { nome: "Capeloza", taxa: 7.00 }, { nome: "Centro", taxa: 5.00 }, { nome: "Colinas Park", taxa: 3.00 }, { nome: "Getat", taxa: 6.00 }, { nome: "Jacu", taxa: 6.00 }, { nome: "Jardim América", taxa: 8.00 }, { nome: "Jardim Aulidia", taxa: 12.00 }, { nome: "Jardim de Alah", taxa: 7.00 }, { nome: "Jardim Glória I", taxa: 7.00 }, { nome: "Jardim Glória II", taxa: 7.00 }, { nome: "Jardim Glória III", taxa: 7.00 }, { nome: "Jardim Gloria City", taxa: 8.00 }, { nome: "Laranjeiras", taxa: 6.00 }, { nome: "Leolar", taxa: 6.00 }, { nome: "Morro do Urubu", taxa: 10.00 }, { nome: "Nova Açailândia I", taxa: 7.00 }, { nome: "Nova Açailândia II", taxa: 7.00 }, { nome: "Ouro Verde", taxa: 8.00 }, { nome: "Parque da Lagoa", taxa: 8.00 }, { nome: "Parque das Nações", taxa: 10.00 }, { nome: "Porto Belo", taxa: 3.00 }, { nome: "Porto Seguro I", taxa: 3.00 }, { nome: "Porto Seguro II", taxa: 3.00 }, { nome: "Residencial tropical", taxa: 8.00 }, { nome: "Tancredo", taxa: 7.00 }, { nome: "Vale do Açai", taxa: 15.00 }, { nome: "Vila Flávio Dino", taxa: 6.00 }, { nome: "Vila Ildemar", taxa: 9.00 },{ nome: "Vila Maranhão", taxa: 6.00 }, { nome: "Vila São Francisco", taxa: 8.00 }, { nome: "Vila Sucuri", taxa: 6.00 } ];
bairros.sort((a, b) => a.nome.localeCompare(b.nome));
bairros.unshift({ nome: "Selecione o bairro...", taxa: 0 });
const CONTENTFUL_SPACE_ID = '2v6jjkbg0sm7', CONTENTFUL_ACCESS_TOKEN = 'rcR_gnOYLU05IPwYNhFXS2PABltFsfh-X1Flare9fds';

// --- FUNÇÕES ---

async function fetchConfiguracaoLoja() {
    if (!CONFIG_ENTRY_ID) return;
    const url = `https://cdn.contentful.com/spaces/${CONTENTFUL_SPACE_ID}/environments/master/entries/${CONFIG_ENTRY_ID}?access_token=${CONTENTFUL_ACCESS_TOKEN}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Falha ao buscar configuração.');
        const data = await response.json();
        lojaForcadaFechada = data.fields.forcarFechamento;
        if (data.fields.horarioAbertura) DADOS_LOJA.horarioAbertura = data.fields.horarioAbertura;
        if (data.fields.horarioFechamento) DADOS_LOJA.horarioFechamento = data.fields.horarioFechamento;
    } catch (error) { console.error("Erro ao buscar configuração da loja:", error); }
}

function lojaEstaAberta(){
    if (lojaForcadaFechada) return false;
    const agora = new Date();
    const agoraBrasil = new Date(agora.valueOf() - (3 * 60 * 60 * 1000));
    const diaAtual = agoraBrasil.getUTCDay();
    const horaDecimal = agoraBrasil.getUTCHours() + (agoraBrasil.getUTCMinutes() / 60);
    const hojeFunciona = DADOS_LOJA.diasFuncionamento.includes(diaAtual);
    const dentroDoHorario = horaDecimal >= DADOS_LOJA.horarioAbertura && horaDecimal < DADOS_LOJA.horarioFechamento;
    return hojeFunciona && dentroDoHorario;
}

async function fetchProducts(lojaAberta) {
    const url = `https://cdn.contentful.com/spaces/${CONTENTFUL_SPACE_ID}/environments/master/entries?access_token=${CONTENTFUL_ACCESS_TOKEN}&content_type=obaBrownie&order=fields.ordem`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Falha ao carregar os produtos.');
        const data = await response.json();
        const assets = data.includes?.Asset || [];
        products = data.items.map(item => {
            const originalPrice = item.fields.preco;
            const promoPrice = item.fields.precoPromocional;
            const onSale = promoPrice && promoPrice > 0;

            return {
                id: item.sys.id,
                name: item.fields.nome,
                description: item.fields.descricao,
                price: onSale ? promoPrice : originalPrice,
                originalPrice: onSale ? originalPrice : null,
                image: `https:${assets.find(asset => asset.sys.id === item.fields.imagem?.sys?.id)?.fields.file.url || '//placehold.co/400x400/ccc/999?text=Sem+Imagem'}`,
                categoria: item.fields.categoria,
                estoque: item.fields.estoque ?? 0,
                destaque: item.fields.destaque ?? false
            };
        });
        renderProducts(lojaAberta);
    } catch (error) { console.error("Erro ao buscar produtos:", error); document.getElementById('product-list').innerHTML = `<p style="text-align: center; color: red;">Não foi possível carregar o cardápio. Tente novamente mais tarde.</p>`; }
}

function renderProducts(lojaAberta) {
    const productListContainer = document.getElementById('product-list');
    const destaquesContainer = document.getElementById('destaques-section');
    productListContainer.innerHTML = '';
    destaquesContainer.innerHTML = '';

    const destaques = products.filter(p => p.destaque && p.estoque > 0);
    
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
            
            let priceHTML = '';
            if (product.originalPrice) {
                priceHTML = `<div class="price-container-destaque"><span class="original-price">R$ ${product.originalPrice.toFixed(2).replace('.', ',')}</span><span class="promo-price">R$ ${product.price.toFixed(2).replace('.', ',')}</span></div>`;
            } else {
                priceHTML = `<span class="card-destaque-preco">R$ ${product.price.toFixed(2).replace('.', ',')}</span>`;
            }

            card.innerHTML = `<img src="${product.image}" alt="${product.name}"><div class="card-destaque-info"><h4>${product.name}</h4><p>${product.description}</p><div class="card-destaque-footer">${priceHTML}<button class="card-destaque-add-button" onclick="addToCart('${product.id}')">Adicionar</button></div></div>`;
            carousel.appendChild(card);
        });
        destaquesContainer.appendChild(title);
        destaquesContainer.appendChild(carousel);
    } else {
        destaquesContainer.style.display = 'none';
    }

    if (!lojaAberta) {
        const productsByCategory = products.reduce((acc, product) => { if (!acc[product.categoria]) acc[product.categoria] = []; acc[product.categoria].push(product); return acc; }, {});
        const categoryOrder = ['Promoções', 'Brownies', 'Bolos','Doces', 'Salgados', 'Geladinho', 'Bebidas'];
        categoryOrder.forEach(categoria => {
            if (productsByCategory[categoria]) {
                const categoryTitle = document.createElement('h3');
                categoryTitle.className = 'category-title';
                categoryTitle.textContent = categoria;
                productListContainer.appendChild(categoryTitle);
                productsByCategory[categoria].forEach(product => {
                    const productElement = document.createElement('div');
                    productElement.className = 'product-item esgotado';
                    productElement.dataset.productId = product.id;
                    productElement.innerHTML = `<div class="product-info"><h4 class="product-name">${product.name}</h4><p class="product-description">${product.description}</p><p class="product-price">R$ ${product.price.toFixed(2).replace('.', ',')}</p></div><div class="product-image-container"><img src="${product.image}" alt="${product.name}" class="product-image"><button class="add-button-esgotado" disabled>Fechado</button></div>`;
                    productListContainer.appendChild(productElement);
                });
            }
        });
        return;
    }
    
    const availableProducts = products.filter(p => p.estoque > 0);
    const soldOutProducts = products.filter(p => p.estoque <= 0);

    const availableProductsByCategory = availableProducts.reduce((acc, product) => { if (!acc[product.categoria]) acc[product.categoria] = []; acc[product.categoria].push(product); return acc; }, {});
    const categoryOrder = ['Promoções', 'Brownies', 'Bolos', 'Doces', 'Salgados', 'Geladinho', 'Bebidas'];
    
    categoryOrder.forEach(categoria => {
        if (availableProductsByCategory[categoria]) {
            const categoryTitle = document.createElement('h3');
            categoryTitle.className = 'category-title';
            categoryTitle.textContent = categoria;
            productListContainer.appendChild(categoryTitle);
            availableProductsByCategory[categoria].forEach(product => {
                const productElement = document.createElement('div');
                productElement.className = 'product-item';
                productElement.dataset.productId = product.id;
                
                let priceHTML = '';
                if (product.originalPrice) {
                    priceHTML = `<div class="product-price-container"><span class="original-price">R$ ${product.originalPrice.toFixed(2).replace('.', ',')}</span><span class="promo-price">R$ ${product.price.toFixed(2).replace('.', ',')}</span></div>`;
                } else {
                    priceHTML = `<p class="product-price">R$ ${product.price.toFixed(2).replace('.', ',')}</p>`;
                }

                productElement.innerHTML = `<div class="product-info"><h4 class="product-name">${product.name}</h4><p class="product-description">${product.description}</p>${priceHTML}</div><div class="product-image-container"><img src="${product.image}" alt="${product.name}" class="product-image"><button class="add-button" onclick="addToCart('${product.id}')">+</button></div>`;
                productListContainer.appendChild(productElement);
            });
        }
    });

    if (soldOutProducts.length > 0) {
        const soldOutTitle = document.createElement('h3');
        soldOutTitle.className = 'category-title';
        soldOutTitle.textContent = 'Produtos Esgotados';
        productListContainer.appendChild(soldOutTitle);
        soldOutProducts.forEach(product => {
            const productElement = document.createElement('div');
            productElement.className = 'product-item esgotado';
            productElement.dataset.productId = product.id;
            productElement.innerHTML = `<div class="product-info"><h4 class="product-name">${product.name}</h4><p class="product-description">${product.description}</p><p class="product-price">R$ ${product.price.toFixed(2).replace('.', ',')}</p></div><div class="product-image-container"><img src="${product.image}" alt="${product.name}" class="product-image"><button class="add-button-esgotado" disabled>Esgotado</button></div>`;
            productListContainer.appendChild(productElement);
        });
    }
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    if (product.estoque <= 0) { alert("Desculpe, este produto está esgotado."); return; }
    
    const productCard = document.querySelector(`.product-item[data-product-id="${productId}"], .card-destaque[data-product-id="${productId}"]`);
    if (productCard) {
        productCard.classList.add('flash-success');
        setTimeout(() => { productCard.classList.remove('flash-success'); }, 700);
    }
    
    showNotificacao(`"${product.name}" adicionado!`);
    const cartItem = cart.find(item => item.id === productId);
    if (cartItem) { cartItem.quantity++; }
    else { cart.push({ ...product, quantity: 1 }); }
    renderCart();
}

function renderCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    cartItemsContainer.innerHTML = ''; 
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p>Seu carrinho está vazio.</p>';
    } else {
        cart.forEach(item => {
            const cartItemElement = document.createElement('div');
            cartItemElement.className = 'cart-item';
            cartItemElement.innerHTML = `<div class="item-info"><span class="item-name">${item.name}</span><span class="item-price">R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}</span></div><div class="item-controls"><label for="quantity-${item.id}" class="quantity-label">Qtd:</label><input type="number" id="quantity-${item.id}" class="quantity-input" value="${item.quantity}" min="1" onchange="updateQuantity('${item.id}', this.value)"><button class="remove-button" onclick="removeFromCart('${item.id}')">×</button></div>`;
            cartItemsContainer.appendChild(cartItemElement);
        });
    }
    updateCartTotal();
    updateContadorCarrinho();
}

function updateQuantity(productId, newQuantity) {
    const quantity = parseInt(newQuantity);
    const cartItem = cart.find(item => item.id === productId);
    if (cartItem) {
        if (quantity > 0) { cartItem.quantity = quantity; }
        else { removeFromCart(productId); return; }
    }
    renderCart();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    renderCart();
}

// ==============================================================
// FUNÇÃO ATUALIZADA PARA CALCULAR TAXA DO CARTÃO (PERCENTUAL)
// ==============================================================
function calculateCardFee(subtotal, paymentMethod) {
    if (paymentMethod === 'Cartão de Crédito') {
        // Calcula 4,98% sobre o subtotal para crédito
        return subtotal * 0.0498;
    }
    if (paymentMethod === 'Cartão de Débito') {
        // Calcula 1,98% sobre o subtotal para débito
        return subtotal * 0.0198;
    }
    
    // Nenhuma taxa para outros métodos de pagamento
    return 0;
}

// FUNÇÃO ATUALIZADA PARA LIDAR COM TODOS OS TOTAIS
function updateCartTotal() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const paymentMethod = document.getElementById('payment-method').value;

    // --- INÍCIO DA CORREÇÃO ---
    // Soma o subtotal e a entrega ANTES de calcular a taxa do cartão
    const valorParaTaxa = subtotal + taxaEntregaAtual;
    // Calcula a taxa do cartão com base no valor correto
    taxaCartaoAtual = calculateCardFee(valorParaTaxa, paymentMethod);
    // --- FIM DA CORREÇÃO ---
    
    const totalFinal = subtotal + taxaEntregaAtual + taxaCartaoAtual;

    document.getElementById('subtotal-cart').innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    document.getElementById('taxa-entrega-cart').innerText = `R$ ${taxaEntregaAtual.toFixed(2).replace('.', ',')}`;
    document.getElementById('cart-total').innerText = `R$ ${totalFinal.toFixed(2).replace('.', ',')}`;
    
    const cardFeeLine = document.getElementById('card-fee-line');
    const cardFeeCart = document.getElementById('card-fee-cart');
    
    if (taxaCartaoAtual > 0) {
        cardFeeCart.innerText = `R$ ${taxaCartaoAtual.toFixed(2).replace('.', ',')}`;
        cardFeeLine.style.display = 'flex';
    } else {
        cardFeeLine.style.display = 'none';
    }
}
// FUNÇÃO DE CHECKOUT ATUALIZADA
async function checkout() {
    const deliveryType = document.querySelector('input[name="delivery_type"]:checked').value;
    const name = document.getElementById('customer-name').value;
    const phone = document.getElementById('customer-phone').value;
    const observation = document.getElementById('customer-observation').value;
    const paymentMethod = document.getElementById('payment-method').value;
    const trocoPara = document.getElementById('troco-para').value;
    
    if (cart.length === 0) {
        alert("Seu carrinho está vazio!");
        return;
    }
    if (!name || !paymentMethod) {
        alert("Por favor, preencha seu nome e a forma de pagamento.");
        return;
    }

    const address = document.getElementById('customer-address').value;
    const bairroSelect = document.getElementById('bairro-select');
    const bairroNome = bairroSelect.value;
    const reference = document.getElementById('customer-reference').value;
    
    if (deliveryType === 'delivery' && (!address || bairroSelect.value === "Selecione o bairro...")) {
        alert("Para delivery, por favor, preencha o bairro e o endereço.");
        return;
    }

    const checkoutButton = document.querySelector('.final-checkout-button-container button');
    checkoutButton.disabled = true;
    checkoutButton.textContent = 'Processando...';

    try {
        // ESTA É A URL DE PRODUÇÃO QUE CONECTA COM SEU BACK-END NA VERCEL
        const apiUrl = 'https://oba-brownie-api.vercel.app/api/dar-baixa-estoque';

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(cart)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Não foi possível processar o pedido. Tente novamente.');
        }

        // Se a baixa de estoque funcionou, o código continua para montar a mensagem
        const displayName = name.trim().split(' ').slice(0, 2).join(' ');
        const numeroWhatsapp = '5599991675891';
        let message = `*🔺🔻🔺🔻🔺🔻🔺🔻🔺🔻🔺🔻*\n\n`;
        message += `*•••  PEDIDO ${displayName}  •••*\n\n`;

        if (deliveryType === 'pickup') {
            message += `*TIPO:* *RETIRADA NO LOCAL*\n`;
        } else {
            message += `*TIPO:* *DELIVERY*\n`;
            message += `*ENDEREÇO:* *${address.trim()}, ${bairroNome}*\n`;
            if (reference) { message += `*PONTO DE REFERÊNCIA:* *${reference.trim()}*\n`; }
            message += `\n*VALOR DA ENTREGA:* *R$ ${taxaEntregaAtual.toFixed(2).replace('.', ',')}*\n`;
        }

        message += `\n*PAGAMENTO:* *${paymentMethod}*`;
        if (paymentMethod === 'Dinheiro' && trocoPara) { message += ` *(Troco para R$ ${trocoPara})*`; }
        message += `\n`;
        if (phone) { message += `\n*TELEFONE:* *${phone}*\n`; }
        if (observation) { message += `\n*OBSERVAÇÃO:* *${observation.trim()}*\n`; }
        message += `\n--- *ITENS DO PEDIDO* ---\n`;
        cart.forEach(item => { message += `*${item.quantity}x ${item.name}* - *R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}*\n`; });
        
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        message += `\n*Subtotal:* *R$ ${subtotal.toFixed(2).replace('.', ',')}*`;
        
        if (taxaCartaoAtual > 0) {
            message += `\n*Taxa da Maquininha:* *R$ ${taxaCartaoAtual.toFixed(2).replace('.', ',')}*`;
        }
        
        const totalFinal = subtotal + taxaEntregaAtual + taxaCartaoAtual;
        message += `\n*Total do Pedido:* *R$ ${totalFinal.toFixed(2).replace('.', ',')}*`;
        message += `\n\n*🔺🔻🔺🔻🔺🔻🔺🔻🔺🔻🔺🔻*`;
        
        const whatsappUrl = `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(message)}`;
        
        window.location.href = whatsappUrl;

    } catch (error) {
        alert(error.message);
        checkoutButton.disabled = false;
        checkoutButton.textContent = 'Finalizar Pedido no WhatsApp';
    }
}

function openPixPopup() { document.getElementById('pix-popup').style.display = 'flex'; }
function closePixPopup() { document.getElementById('pix-popup').style.display = 'none'; }
function copyPixKey() {
    const pixKeyText = document.getElementById('pix-key').innerText;
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(pixKeyText).then(() => { alert('Chave Pix copiada!'); }).catch(err => { console.error('Falha ao copiar: ', err); alert('Não foi possível copiar a chave.'); });
    } else {
        const textArea = document.createElement("textarea");
        textArea.value = pixKeyText;
        textArea.style.position = "absolute"; textArea.style.left = "-9999px"; document.body.appendChild(textArea); textArea.select();
        try { document.execCommand('copy'); alert('Chave Pix copiada!'); }
        catch (err) { console.error('Falha ao copiar com método antigo: ', err); alert('Não foi possível copiar a chave.'); }
        document.body.removeChild(textArea);
    }
}

function showNotificacao(mensagem) {
    const notificacao = document.getElementById('notificacao-carrinho');
    notificacao.textContent = mensagem;
    notificacao.classList.add('visible');
    clearTimeout(notificacaoTimeout);
    notificacaoTimeout = setTimeout(() => { notificacao.classList.remove('visible'); }, 3000);
}

function updateContadorCarrinho() {
    const contador = document.getElementById('contador-carrinho');
    const totalItens = cart.reduce((total, item) => total + item.quantity, 0);
    contador.textContent = totalItens;
    if (totalItens > 0) { contador.classList.add('visible'); }
    else { contador.classList.remove('visible'); }
}

document.addEventListener('DOMContentLoaded', async () => {
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) { setTimeout(() => { splashScreen.classList.add('hidden'); }, 2000); }
    
    await fetchConfiguracaoLoja();
    const lojaAberta = lojaEstaAberta();
    const checkoutButton = document.getElementById('checkout-button');
    if (!lojaAberta) {
        document.body.classList.add('loja-fechada-filter');
        const avisoContainer = document.getElementById('aviso-loja-fechada');
        let avisoMsg = `<p><strong>Desculpe, estamos fechados no momento!</strong></p>`;
        if (!lojaForcadaFechada) {
            const abertura = `${Math.floor(DADOS_LOJA.horarioAbertura)}:${(DADOS_LOJA.horarioAbertura % 1 * 60).toString().padStart(2, '0')}`;
            const fechamento = `${Math.floor(DADOS_LOJA.horarioFechamento)}:${(DADOS_LOJA.horarioFechamento % 1 * 60).toString().padStart(2, '0')}`;
            avisoMsg += `<p>Nosso horário de funcionamento é das ${abertura} às ${fechamento}.</p>`;
        }
        avisoContainer.innerHTML = avisoMsg;
        avisoContainer.style.display = 'block';
        checkoutButton.disabled = true;
        checkoutButton.textContent = 'Estamos Fechados :(';
    }
    
    const bairroSelect = document.getElementById('bairro-select');
    bairros.forEach(bairro => {
        const option = document.createElement('option');
        option.value = bairro.nome;
        option.textContent = (bairro.taxa > 0) ? `${bairro.nome} - R$ ${bairro.taxa.toFixed(2).replace('.', ',')}` : bairro.nome;
        bairroSelect.appendChild(option);
    });
    bairroSelect.addEventListener('change', (event) => {
        const bairroSelecionado = bairros.find(b => b.nome === event.target.value);
        taxaEntregaAtual = bairroSelecionado ? bairroSelecionado.taxa : 0;
        updateCartTotal();
    });

    checkoutButton.addEventListener('click', checkout);
    const paymentMethodSelect = document.getElementById('payment-method');
    const trocoSection = document.getElementById('troco-section');
    const trocoInput = document.getElementById('troco-para');
    const taxaInfoBox = document.getElementById('taxa-info');
    const infoTaxaCredito = "No cartão de crédito cobramos taxa.";
    const infoTaxaDebito = "No cartão de débito cobramos taxa.";
    
    paymentMethodSelect.addEventListener('change', (event) => {
        const selectedValue = event.target.value;
        if (selectedValue === 'Pix') { openPixPopup(); }
        if (selectedValue === 'Dinheiro') { trocoSection.style.display = 'block'; }
        else { trocoSection.style.display = 'none'; trocoInput.value = ''; }
        if (selectedValue === 'Cartão de Crédito') { taxaInfoBox.innerText = infoTaxaCredito; taxaInfoBox.style.display = 'block'; }
        else if (selectedValue === 'Cartão de Débito') { taxaInfoBox.innerText = infoTaxaDebito; taxaInfoBox.style.display = 'block'; }
        else { taxaInfoBox.style.display = 'none'; taxaInfoBox.innerText = ''; }
        updateCartTotal(); // Recalcula o total para aplicar ou remover a taxa do cartão
    });
    
    trocoInput.addEventListener('input', function() { this.value = this.value.replace(/[^0-9.,]/g, ''); });
    const pixPopup = document.getElementById('pix-popup');
    pixPopup.addEventListener('click', function(event) { if (event.target === this) { closePixPopup(); } });
    const carrinhoFlutuante = document.getElementById('carrinho-flutuante');
    carrinhoFlutuante.addEventListener('click', () => { document.querySelector('.checkout-area').scrollIntoView({ behavior: 'smooth' }); });

    // LÓGICA PARA AS OPÇÕES DE DELIVERY E RETIRADA
    const deliveryFields = document.getElementById('delivery-fields');
    const pickupAddressInfo = document.getElementById('pickup-address-info');
    const deliveryFeeLine = document.getElementById('delivery-fee-line');

    document.querySelectorAll('input[name="delivery_type"]').forEach(radio => {
        radio.addEventListener('change', (event) => {
            if (event.target.value === 'pickup') {
                deliveryFields.style.display = 'none';
                pickupAddressInfo.style.display = 'block';
                deliveryFeeLine.style.display = 'none';
                taxaEntregaAtual = 0;
                bairroSelect.selectedIndex = 0; // Reseta a seleção de bairro
            } else { // 'delivery'
                deliveryFields.style.display = 'block';
                pickupAddressInfo.style.display = 'none';
                deliveryFeeLine.style.display = 'flex';
                // Recalcula a taxa caso um bairro já estivesse selecionado
                const bairroSelecionado = bairros.find(b => b.nome === bairroSelect.value);
                taxaEntregaAtual = bairroSelecionado ? bairroSelecionado.taxa : 0;
            }
            updateCartTotal();
        });
    });

    renderCart();
    fetchProducts(lojaAberta);
});
