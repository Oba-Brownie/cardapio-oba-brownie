let products = [];
let cart = [];
let taxaEntregaAtual = 0;

const bairros = [
    { nome: "Barra azul", taxa: 5.00 }, { nome: "Baixão(depois do teatro)", taxa: 8.00 }, { nome: "Bairro Matadouro", taxa: 4.00 }, { nome: "Bom Jardim", taxa: 7.00 }, { nome: "Brasil novo(vila Ildemar)", taxa: 9.00 }, { nome: "Capeloza", taxa: 7.00 }, { nome: "Centro", taxa: 5.00 }, { nome: "Colinas Park", taxa: 3.00 }, { nome: "Getat", taxa: 6.00 }, { nome: "Jacu", taxa: 6.00 }, { nome: "Jardim América", taxa: 8.00 }, { nome: "Jardim Aulidia", taxa: 12.00 }, { nome: "Jardim de Alah", taxa: 7.00 }, { nome: "Jardim Glória I", taxa: 7.00 }, { nome: "Jardim Glória II", taxa: 7.00 }, { nome: "Jardim Glória III", taxa: 7.00 }, { nome: "Jardim Gloria City", taxa: 8.00 }, { nome: "Laranjeiras", taxa: 6.00 }, { nome: "Leolar", taxa: 6.00 }, { nome: "Morro do urubu", taxa: 10.00 }, { nome: "Nova Açailândia I", taxa: 7.00 }, { nome: "Nova Açailândia II", taxa: 7.00 }, { nome: "Ouro Verde", taxa: 8.00 }, { nome: "Parque da lagoa (ifma)", taxa: 8.00 }, { nome: "Parque das nações", taxa: 10.00 }, { nome: "Porto Belo", taxa: 3.00 }, { nome: "Porto Seguro I", taxa: 3.00 }, { nome: "Porto Seguro II", taxa: 3.00 }, { nome: "Residencial tropical", taxa: 8.00 }, { nome: "Tancredo", taxa: 7.00 }, { nome: "Vale do Açai", taxa: 15.00 }, { nome: "Vila Flávio Dino", taxa: 6.00 }, { nome: "Vila Maranhão", taxa: 6.00 }, { nome: "Vila São Francisco", taxa: 8.00 }, { nome: "Vila sucuri prox a garrote", taxa: 6.00 }
];
bairros.sort((a, b) => a.nome.localeCompare(b.nome));
bairros.unshift({ nome: "Selecione o bairro...", taxa: 0 });

const CONTENTFUL_SPACE_ID = '2v6jjkbg0sm7';
const CONTENTFUL_ACCESS_TOKEN = 'rcR_gnOYLU05IPwYNhFXS2PABltFsfh-X1Flare9fds';

async function fetchProducts() {
    const url = `https://cdn.contentful.com/spaces/${CONTENTFUL_SPACE_ID}/environments/master/entries?access_token=${CONTENTFUL_ACCESS_TOKEN}&content_type=obaBrownie&order=fields.ordem`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Falha ao carregar os produtos.');
        const data = await response.json();
        const assets = data.includes?.Asset || [];
        products = data.items.map(item => ({
            id: item.sys.id, name: item.fields.nome, description: item.fields.descricao, price: item.fields.preco, image: `https:${assets.find(asset => asset.sys.id === item.fields.imagem?.sys?.id)?.fields.file.url || '//placehold.co/400x400/ccc/999?text=Sem+Imagem'}`, categoria: item.fields.categoria, estoque: item.fields.estoque ?? 0
        }));
        renderProducts();
    } catch (error) {
        console.error("Erro ao buscar produtos:", error);
        document.getElementById('product-list').innerHTML = `<p style="text-align: center; color: red;">Não foi possível carregar o cardápio. Tente novamente mais tarde.</p>`;
    }
}

function renderProducts() {
    const productListContainer = document.getElementById('product-list');
    productListContainer.innerHTML = '';
    const productsByCategory = products.reduce((acc, product) => {
        if (!acc[product.categoria]) acc[product.categoria] = [];
        acc[product.categoria].push(product);
        return acc;
    }, {});
    const categoryOrder = ['Promoções', 'Brownies', 'Doces', 'Salgados', 'Bebidas'];
    categoryOrder.forEach(categoria => {
        if (productsByCategory[categoria]) {
            const categoryTitle = document.createElement('h3');
            categoryTitle.className = 'category-title';
            categoryTitle.textContent = categoria;
            productListContainer.appendChild(categoryTitle);
            productsByCategory[categoria].forEach(product => {
                const productElement = document.createElement('div');
                productElement.className = `product-item ${product.estoque <= 0 ? 'esgotado' : ''}`;
                let buttonHTML = (product.estoque > 0)
                    ? `<button class="add-button" onclick="addToCart('${product.id}')">+</button>`
                    : `<button class="add-button-esgotado" disabled>Esgotado</button>`;
                productElement.innerHTML = `
                    <div class="product-info">
                        <h4 class="product-name">${product.name}</h4>
                        <p class="product-description">${product.description}</p>
                        <p class="product-price">R$ ${product.price.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div class="product-image-container">
                        <img src="${product.image}" alt="${product.name}" class="product-image">
                        ${buttonHTML}
                    </div>`;
                productListContainer.appendChild(productElement);
            });
        }
    });
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (product.estoque <= 0) {
        alert("Desculpe, este produto está esgotado.");
        return;
    }
    const cartItem = cart.find(item => item.id === productId);
    if (cartItem) cartItem.quantity++;
    else cart.push({ ...product, quantity: 1 });
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
            cartItemElement.innerHTML = `
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                </div>
                <div class="item-controls">
                    <label for="quantity-${item.id}" class="quantity-label">Qtd:</label>
                    <input type="number" id="quantity-${item.id}" class="quantity-input" value="${item.quantity}" min="0" onchange="updateQuantity('${item.id}', this.value)">
                    <button class="remove-button" onclick="removeFromCart('${item.id}')">×</button>
                </div>`;
            cartItemsContainer.appendChild(cartItemElement);
        });
    }
    updateCartTotal();
}

function updateQuantity(productId, newQuantity) {
    const quantity = parseInt(newQuantity);
    const cartItem = cart.find(item => item.id === productId);
    if (cartItem) {
        if (quantity > 0) cartItem.quantity = quantity;
        else { removeFromCart(productId); return; }
    }
    renderCart();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    renderCart();
}

function updateCartTotal() {
    const subtotalCart = document.getElementById('subtotal-cart');
    const taxaEntregaCart = document.getElementById('taxa-entrega-cart');
    const cartTotal = document.getElementById('cart-total');
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalFinal = subtotal + taxaEntregaAtual;
    subtotalCart.innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    taxaEntregaCart.innerText = `R$ ${taxaEntregaAtual.toFixed(2).replace('.', ',')}`;
    cartTotal.innerText = `R$ ${totalFinal.toFixed(2).replace('.', ',')}`;
}

function checkout() {
    const name = document.getElementById('customer-name').value;
    const phone = document.getElementById('customer-phone').value;
    const address = document.getElementById('customer-address').value;
    const paymentMethod = document.getElementById('payment-method').value;
    const trocoPara = document.getElementById('troco-para').value;
    const bairroSelect = document.getElementById('bairro-select');
    const bairroNome = bairroSelect.value;
    if (cart.length === 0) { alert("Seu carrinho está vazio!"); return; }
    if (!name || !address || !paymentMethod) { alert("Por favor, preencha seus dados e a forma de pagamento."); return; }
    if (bairroSelect.value === "Selecione o bairro...") { alert("Por favor, selecione um bairro para a entrega."); return; }
    const numeroWhatsapp = '5599991675891';
    let message = `Olá! Gostaria de fazer um novo pedido pelo site:\n\n*RESUMO DO PEDIDO*\n\n`;
    message += `*CLIENTE:*\nNome: ${name}\n`;
    if (phone) message += `WhatsApp: ${phone}\n`;
    message += `Endereço: ${address}, ${bairroNome}\n\n`;
    message += `*ITENS:*\n`;
    cart.forEach(item => { message += `${item.quantity}x - ${item.name}\n`; });
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    message += `\nSubtotal: R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    message += `\nTaxa de Entrega: R$ ${taxaEntregaAtual.toFixed(2).replace('.', ',')}`;
    const totalFinal = subtotal + taxaEntregaAtual;
    message += `\n*Total: R$ ${totalFinal.toFixed(2).replace('.', ',')}*\n`;
    message += `*Forma de Pagamento: ${paymentMethod}*`;
    if (paymentMethod === 'Dinheiro' && trocoPara) { message += `\n*Troco para: R$ ${trocoPara}*`; }
    const whatsappUrl = `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
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
        textArea.style.position = "absolute";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        try { document.execCommand('copy'); alert('Chave Pix copiada!'); }
        catch (err) { console.error('Falha ao copiar com método antigo: ', err); alert('Não foi possível copiar a chave.'); }
        document.body.removeChild(textArea);
    }
}

document.addEventListener('DOMContentLoaded', () => {
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

    const checkoutButton = document.getElementById('checkout-button');
    checkoutButton.addEventListener('click', checkout);
    
    // ----- LÓGICA DO FORMULÁRIO DE PAGAMENTO (COMPLETA E CORRIGIDA) -----
    const paymentMethodSelect = document.getElementById('payment-method');
    const trocoSection = document.getElementById('troco-section');
    const trocoInput = document.getElementById('troco-para');
    const taxaInfoBox = document.getElementById('taxa-info');

    const infoTaxaCredito = "No cartão de crédito cobramos taxa:\nA partir de R$30,00, acrescenta-se R$1,00.\nA partir de R$50,00, acrescenta-se R$2,00.\nA partir de R$70,00, acrescenta-se R$3,00.";
    const infoTaxaDebito = "No cartão de débito cobramos taxa:\nA partir de R$50,00, acrescenta-se R$1,00.\nA partir de R$70,00, acrescenta-se R$2,00.\nA partir de R$100,00, acrescenta-se R$3,00.";

    paymentMethodSelect.addEventListener('change', (event) => {
        const selectedValue = event.target.value;

        // Lógica do PIX
        if (selectedValue === 'Pix') {
            openPixPopup();
        }

        // Lógica do Troco
        if (selectedValue === 'Dinheiro') {
            trocoSection.style.display = 'block';
        } else {
            trocoSection.style.display = 'none';
            trocoInput.value = '';
        }

        // LÓGICA RESTAURADA DO AVISO DE TAXA
        if (selectedValue === 'Cartão de Crédito') {
            taxaInfoBox.innerText = infoTaxaCredito;
            taxaInfoBox.style.display = 'block';
        } else if (selectedValue === 'Cartão de Débito') {
            taxaInfoBox.innerText = infoTaxaDebito;
            taxaInfoBox.style.display = 'block';
        } else {
            taxaInfoBox.style.display = 'none';
            taxaInfoBox.innerText = '';
        }
    });

    trocoInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9.,]/g, '');
    });

    const pixPopup = document.getElementById('pix-popup');
    pixPopup.addEventListener('click', function(event) {
        if (event.target === this) {
            closePixPopup();
        }
    });
    
    renderCart();
    fetchProducts();
});
