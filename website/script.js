document.addEventListener('DOMContentLoaded', () => {

    // Loader
    const loader = document.getElementById('loader');
    setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500);
    }, 2500);

    // Scroll Animations using Intersection Observer
    const observerOptions = {
        threshold: 0.2,
        rootMargin: "0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Only animate once
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.fade-in-up, .fade-in-left, .fade-in-right');
    animatedElements.forEach(el => observer.observe(el));


    // Parallax Effect for Hero Background
    const heroBg = document.querySelector('.hero-bg');
    window.addEventListener('scroll', () => {
        const scrollPosition = window.pageYOffset;
        if (heroBg) {
            heroBg.style.transform = `scale(1.1) translateY(${scrollPosition * 0.5}px)`;
        }
    });

    // Smooth Scrolling for Nav Links (Optional if scroll-behavior: smooth in CSS isn't enough/supported)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Simple Navbar Background Transparency Toggle
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.padding = '15px 50px';
            navbar.style.background = 'rgba(10, 10, 10, 0.95)';
        } else {
            navbar.style.padding = '20px 50px';
            navbar.style.background = 'rgba(10, 10, 10, 0.8)';
        }
    });

    // --- Interactive Chat Feature ---

    const chatWindow = document.getElementById('chat-window');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');

    let apiKey = '';

    // HISTORY & CONTEXT STATE
    let chatHistory = [];
    let pdfContext = "";

    // 1. Initial Prompt for API Key
    setTimeout(() => {
        const storedKey = localStorage.getItem('gemini_api_key');
        if (storedKey) {
            apiKey = storedKey;
            console.log("API Key loaded.");
            loadPdfContext();
        } else {
            console.log("No API Key found.");
            appendMessage("system", "Please configure your Google Gemini API Key settings to chat.");
        }
    }, 1000);

    // 2. Load Context
    function loadPdfContext() {
        if (window.extractedPDFContext) {
            pdfContext = window.extractedPDFContext;
            console.log("PDF Context Loaded (" + pdfContext.length + " chars).");
        } else {
            console.warn("Static context missing.");
        }
    }

    // 3. Send Message Logic
    async function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;

        if (!apiKey) {
            // Simplified prompt for now
            const keyInput = prompt("Enter Google Gemini API Key:");
            if (keyInput) {
                apiKey = keyInput;
                localStorage.setItem('gemini_api_key', apiKey);
                loadPdfContext();
            } else {
                appendMessage("system", "API Key required.");
                return;
            }
        }

        userInput.value = '';
        appendMessage("user", text);
        showTypingIndicator();

        chatHistory.push({ role: "user", parts: [{ text: text }] });

        await fetchGeminiResponse();
    }

    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    function appendMessage(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message');
        msgDiv.classList.add(sender === 'user' ? 'user-message' : (sender === 'system' ? 'system-message' : 'anne-message'));
        msgDiv.innerText = text;
        chatWindow.appendChild(msgDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    let typingIndicator = null;
    function showTypingIndicator() {
        if (typingIndicator) return;
        typingIndicator = document.createElement('div');
        typingIndicator.classList.add('message', 'anne-message');
        typingIndicator.style.fontStyle = 'italic';
        typingIndicator.innerText = "Anne is writing...";
        chatWindow.appendChild(typingIndicator);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function removeTypingIndicator() {
        if (typingIndicator) {
            typingIndicator.remove();
            typingIndicator = null;
        }
    }

    async function fetchGeminiResponse() {
        // Updated to use the 2.5 flash as requested by user previously, though 1.5 is standard. 
        // User manually changed to 2.5-flash in Step 151. Keeping that.
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        let systemText = `
        Context: You are an AI educational assistant roleplaying as Anne Frank.
        Persona: Anne Frank (age 13-15).
        Tone: Intelligent, observant, hopeful, honest.
        Knowledge Base: Use this context from the book:
        === CONTEXT ===
        ${pdfContext.substring(0, 30000)} 
        === END CONTEXT ===
        
        Task: Answer correctly and concisely from Anne's perspective.
        Safety: Educational purpose only.
        Keep responses concise (max 3 sentences).
        `;

        const contents = [...chatHistory];

        const requestBody = {
            systemInstruction: { parts: [{ text: systemText }] },
            contents: contents,
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
            ]
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            removeTypingIndicator();
            console.log("API Log:", data);

            if (data.error) {
                console.error("Gemini Error:", data.error);
                appendMessage("system", "Error: " + data.error.message);
                return;
            }

            if (!data.candidates || data.candidates.length === 0) {
                if (data.promptFeedback) console.warn("Safety:", data.promptFeedback);
                appendMessage("system", "Anne is silent (Safety Block).");
                return;
            }

            const aiText = data.candidates[0].content.parts[0].text;
            appendMessage("anne", aiText);

            chatHistory.push({ role: "model", parts: [{ text: aiText }] });

        } catch (error) {
            console.error("Net Error:", error);
            removeTypingIndicator();
            appendMessage("system", "Network Error: " + error.message);
        }
    }

    // --- Dynamic Mindmap Logic ---
    // --- Mindmap Logic Removed ---

});
