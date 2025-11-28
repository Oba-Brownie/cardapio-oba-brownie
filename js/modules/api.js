/* ================================================= */
/* ARQUIVO: js/modules/api.js                        */
/* Responsável por toda a comunicação externa (API)  */
/* ================================================= */

import { 
    CONTENTFUL_SPACE_ID, 
    CONTENTFUL_ACCESS_TOKEN, 
    CONFIG_ENTRY_ID,
    IS_BLACK_FRIDAY 
} from '../config/constants.js';

/**
 * Busca as configurações de horário e fechamento da loja
 * @returns {Promise<Object>} Objeto com dados da loja ou null em caso de erro
 */
export async function fetchConfiguracaoLoja() {
    if (!CONFIG_ENTRY_ID) return null;

    const url = `https://cdn.contentful.com/spaces/${CONTENTFUL_SPACE_ID}/environments/master/entries/${CONFIG_ENTRY_ID}?access_token=${CONTENTFUL_ACCESS_TOKEN}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Falha ao buscar configuração.');
        
        const data = await response.json();
        
        // Retorna um objeto limpo apenas com o que precisamos
        return {
            lojaForcadaFechada: data.fields.forcarFechamento || false,
            horarioAbertura: data.fields.horarioAbertura,
            horarioFechamento: data.fields.horarioFechamento
        };

    } catch (error) {
        console.error("Erro ao buscar configuração da loja:", error);
        return null; // Retorna null para o main.js saber que deu erro
    }
}

/**
 * Busca a lista de produtos e aplica as regras de preço e filtro (BF vs Normal)
 * @returns {Promise<Array>} Lista de produtos formatada
 */
export async function fetchProducts() {
    const url = `https://cdn.contentful.com/spaces/${CONTENTFUL_SPACE_ID}/environments/master/entries?access_token=${CONTENTFUL_ACCESS_TOKEN}&content_type=obaBrownie&order=fields.ordem`;
    
    console.log("--- API: BUSCANDO PRODUTOS ---");
    console.log("Modo Black Friday:", IS_BLACK_FRIDAY);

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Falha ao carregar os produtos.');
        
        const data = await response.json();
        const assets = data.includes?.Asset || [];
        
        let products = data.items.map(item => {
            // Campos padrões
            let originalPrice = item.fields.preco;
            let currentPrice = item.fields.preco;
            let promoPrice = item.fields.precoPromocional;
            const isPromo = promoPrice && promoPrice > 0;
            
            // --- TRATAMENTO DE IDS (SEGURANÇA) ---
            const fieldBlackFriday = item.fields.blackfriday || item.fields.blackFriday; 
            const fieldValorBlackFriday = item.fields.valorBlackFriday || item.fields.ValorBlackFriday;

            const isBFProduct = fieldBlackFriday === true;
            const bfPrice = fieldValorBlackFriday;

            // === LÓGICA DE PREÇOS (Mesma do script.js) ===
            if (IS_BLACK_FRIDAY) {
                // Página Black Friday: Usa preço BF se existir
                if (bfPrice && bfPrice > 0) {
                    currentPrice = bfPrice;
                    originalPrice = item.fields.preco; 
                }
            } else {
                // Página Normal: Usa preço promocional se existir
                if (isPromo) {
                    currentPrice = promoPrice;
                }
            }

            return {
                id: item.sys.id,
                name: item.fields.nome,
                description: item.fields.descricao,
                price: currentPrice,
                // Define se mostra o preço riscado
                originalPrice: (IS_BLACK_FRIDAY && bfPrice) ? item.fields.preco : (isPromo ? item.fields.preco : null),
                // Busca a imagem ou usa placeholder
                image: `https:${assets.find(asset => asset.sys.id === item.fields.imagem?.sys?.id)?.fields.file.url || '//placehold.co/400x400/ccc/999?text=Sem+Imagem'}`,
                categoria: item.fields.categoria,
                estoque: item.fields.estoque ?? 0,
                destaque: item.fields.destaque ?? false,
                oculto: item.fields.oculto ?? false,
                isBlackFriday: isBFProduct
            };
        })
        .filter(product => !product.oculto); // Remove ocultos

        // === FILTRO DA BLACK FRIDAY ===
        if (IS_BLACK_FRIDAY) {
            products = products.filter(p => p.isBlackFriday === true);
            console.log(`API: Produtos filtrados para BF: ${products.length}`);
        }

        return products; // Retorna a lista pronta para o main.js usar

    } catch (error) {
        console.error("Erro na API de produtos:", error);
        throw error; // Lança o erro para o main.js decidir como mostrar na tela
    }
}