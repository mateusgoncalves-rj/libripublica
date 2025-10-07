document.addEventListener('DOMContentLoaded', () => {

    // COLE AQUI O OBJETO de configuração do Firebase que você copiou
    const firebaseConfig = {
        apiKey: "AIzaSyBRoduTrmEk0sROpQJKCpksSVozsdDrULI",
        authDomain: "libripublica.firebaseapp.com",
        projectId: "libripublica",
        storageBucket: "libripublica.firebasestorage.app",
        messagingSenderId: "1059691316359"
    };

    // Inicializa o Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    const provider = new firebase.auth.GoogleAuthProvider();

    // Referências aos elementos do DOM
    const loginPage = document.getElementById('login-page');
    const mainApp = document.getElementById('main-app');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userNameSpan = document.getElementById('user-name');
    const bookGallery = document.getElementById('book-gallery');
    
    const ebookReader = document.getElementById('ebook-reader');
    const readerTitle = document.getElementById('reader-title');
    const readerContent = document.getElementById('reader-content');
    const closeReaderBtn = document.getElementById('close-reader-btn');
    const increaseFontBtn = document.getElementById('increase-font');
    const decreaseFontBtn = document.getElementById('decrease-font');

    const toggleFontStyleBtn = document.getElementById('toggle-font-style');

    // Inicializa com as configurações de fonte do CSS Minimalista (19px)
    let currentFontSize = 19; 
    let isSerif = true;

    // --- AUTENTICAÇÃO ---

    // Observador do estado de autenticação
    auth.onAuthStateChanged(user => {
        if (user) {
            // Usuário está logado
            loginPage.classList.add('hidden');
            mainApp.classList.remove('hidden');
            userNameSpan.textContent = `Olá, ${user.displayName.split(' ')[0]}`;
            loadBooks();
        } else {
            // Usuário está deslogado
            mainApp.classList.add('hidden');
            loginPage.classList.remove('hidden');
        }
    });

    // Evento de clique para Login
    loginBtn.addEventListener('click', () => {
        auth.signInWithPopup(provider).catch(error => {
            console.error("Erro no login:", error);
        });
    });

    // Evento de clique para Logout
    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });

    // --- CARREGAMENTO DOS LIVROS ---
    
    async function loadBooks() {
        bookGallery.innerHTML = '<p>Carregando livros...</p>';
        try {
            const snapshot = await db.collection('books').get();
            if (snapshot.empty) {
                bookGallery.innerHTML = '<p>Nenhum livro encontrado.</p>';
                return;
            }

            bookGallery.innerHTML = ''; // Limpa a galeria
            snapshot.forEach(doc => {
                const book = doc.data();
                
                // Trata URL undefined/vazio
                const contentUrl = book.contentFile && book.contentFile.trim() ? book.contentFile : '#';
                
                const bookCard = `
                    <div class="book-card" data-content="${contentUrl}" data-title="${book.title}">
                        <img src="${book.coverImage}" alt="Capa de ${book.title}">
                        <h4>${book.title}</h4>
                        <p>${book.author}</p>
                    </div>
                `;
                bookGallery.innerHTML += bookCard;
            });

            // Adiciona eventos de clique aos cards recém-criados
            document.querySelectorAll('.book-card').forEach(card => {
                card.addEventListener('click', () => {
                    const contentUrl = card.dataset.content;
                    const title = card.dataset.title;
                    
                    if (contentUrl === '#') {
                        console.error('URL de conteúdo não definido para este livro no Firestore. Verifique o campo `contentFile`.');
                        alert('O arquivo deste livro não está configurado corretamente no banco de dados. Por favor, contate o administrador.');
                        return;
                    }

                    openReader(title, contentUrl);
                });
            });

        } catch (error) {
            console.error("Erro ao carregar livros:", error);
            bookGallery.innerHTML = '<p>Ocorreu um erro ao carregar os livros. Tente novamente mais tarde.</p>';
        }
    }

    // --- LEITOR DE EBOOK ---
    
    async function openReader(title, contentUrl) {
        readerTitle.textContent = title;
        readerContent.innerHTML = '<p class="loading-text">Carregando livro...</p>';
        ebookReader.classList.remove('hidden');
        
        // ** INÍCIO DA CORREÇÃO CORS **
        // Usa um proxy para contornar a Política de Mesma Origem ao carregar o arquivo do Project Gutenberg.
        const proxyUrl = 'https://corsproxy.io/?';
        const finalUrl = proxyUrl + encodeURIComponent(contentUrl);

        try {
            const response = await fetch(finalUrl); // Fetch AGORA usa o proxy
            // ** FIM DA CORREÇÃO CORS **
            
            if (!response.ok) {
                // Mensagem detalhada no console para debug
                throw new Error(`Falha ao buscar o conteúdo do livro. Status: ${response.status}. URL de Origem: ${contentUrl}`);
            }
            let text = await response.text();
            
            // Simples formatação: substitui quebras de linha por parágrafos
            const formattedText = text.split(/\n\s*\n/).map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`).join('');

            readerContent.innerHTML = formattedText;
            readerContent.scrollTop = 0; // Vai para o topo do livro
            
            // Garante que o estado inicial da fonte esteja aplicado
            readerContent.style.fontSize = `${currentFontSize}px`;
            readerContent.style.fontFamily = isSerif ? `'Merriweather', serif` : `'Lato', sans-serif`;

        } catch (error) {
            console.error("Erro ao carregar conteúdo do livro:", error);
            // Mensagem de erro para o usuário
            readerContent.innerHTML = '<p class="loading-text">Não foi possível carregar o livro. Verifique o console para mais detalhes sobre o erro.</p>';
        }
    }

    closeReaderBtn.addEventListener('click', () => {
        ebookReader.classList.add('hidden');
        readerContent.innerHTML = ''; // Limpa o conteúdo para liberar memória
    });
    
    increaseFontBtn.addEventListener('click', () => {
        currentFontSize = Math.min(32, currentFontSize + 2); // Limite máximo de 32px
        readerContent.style.fontSize = `${currentFontSize}px`;
    });

    decreaseFontBtn.addEventListener('click', () => {
        currentFontSize = Math.max(12, currentFontSize - 2); // Limite mínimo de 12px
        readerContent.style.fontSize = `${currentFontSize}px`;
    });

    // Lógica para alternar entre SERIF e SANS-SERIF
    toggleFontStyleBtn.addEventListener('click', () => {
        // Alterna a variável de controle
        isSerif = !isSerif;
        
        if (isSerif) {
            readerContent.style.fontFamily = `'Merriweather', serif`;
        } else {
            readerContent.style.fontFamily = `'Lato', sans-serif`;
        }
    });
});