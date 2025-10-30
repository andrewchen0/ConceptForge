document.addEventListener('DOMContentLoaded', () => {
    // get different html elements
    const messageTemplateUser = document.getElementById('message-template-user');
    const messageTemplateBot = document.getElementById('message-template-bot');
    const chatButton = document.getElementById('send-button');
    const chatInput = document.getElementById('user-input');
    const chatContainer = document.getElementById('chat-container');

    // global variables
    let currentModelResponse = null;
    let autoScrollEnabled = true;
    let dynamicAutoscrollRange = null;
    let isStreaming = false;

    
    // autoscroll functions
    function distanceFromBottom() {
        return chatContainer.scrollHeight - chatContainer.clientHeight - chatContainer.scrollTop;
    }

    function autoScroll() {
        const distance = distanceFromBottom();
        const currentRange = dynamicAutoscrollRange;
        if (autoScrollEnabled && distance <= currentRange) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }

    // autoscroll logic with user scrolling
    if (chatContainer) {
        chatContainer.addEventListener('scroll', () => {
            const distance = distanceFromBottom();
            const currentRange = dynamicAutoscrollRange;
            if (distance > currentRange) { autoScrollEnabled = false; } 
            else { autoScrollEnabled = true; }
        });
    }

    // autoscroll logic with up arrow key
    window.addEventListener('keydown', (ev) => {
        if (ev.key === 'ArrowUp') {
            // jump outside autoscroll range
            const distance = distanceFromBottom();
            const currentRange = dynamicAutoscrollRange;
            if (isStreaming && distance <= currentRange) {
                const jumpOutside = currentRange + 10;
                const newScrollTop = Math.max(0, chatContainer.scrollHeight - chatContainer.clientHeight - jumpOutside);
                chatContainer.scrollTop = newScrollTop;
                autoScrollEnabled = false;
                prevScrollHeight = chatContainer.scrollHeight;
            }
        }
    }, { passive: false });


    // add user message
    function appendUserMessage(text) {
        const messageNode = messageTemplateUser.content.cloneNode(true);
        const messageText = messageNode.querySelector('.message-text-user');
        messageText.textContent = text;
        chatContainer.appendChild(messageNode);
        autoScroll();
    }

    // add bot placeholder message
    function appendBotPlaceholder() {
        const botNode = messageTemplateBot.content.cloneNode(true);
        const botText = botNode.querySelector('.message-text-bot');
        botText.textContent = '';
        chatContainer.appendChild(botNode);
        autoScroll();
        return botText;
    }

    // send message function
    function sendMessage() {
        const userMessage = (chatInput.value).trim();
        chatInput.value = '';

        const history = getConversationHistory(2);

        appendUserMessage(userMessage);

        currentModelResponse = appendBotPlaceholder();

        // send user prompt and conversation history to backend
        const marker = '__HISTORY__';
        const envelope = marker + '\n' + (history || '') + '\n--USER_PROMPT--\n' + userMessage;
        generateAIResponse(envelope);
    }

    
    function generateAIResponse(userPrompt) {
        // fetch to connect with backend fastapi server
        fetch('http://127.0.0.1:8000/generate_stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: userPrompt })
        }).then(async (res) => {

            // set variables
            chatContainer.scrollTop = chatContainer.scrollHeight;
            isStreaming = true;
            jumpedOutThisStream = false;
            currentModelResponse.innerHTML = '';

            // create a think toggle button to show the model's reasoning
            const thinkToggle = document.createElement('button');
            thinkToggle.type = 'button';
            thinkToggle.className = 'think-toggle';
            thinkToggle.textContent = 'Show thoughts';
            thinkToggle.style.cursor = 'pointer';
            thinkToggle.style.fontSize = '0.85em';
            thinkToggle.style.marginBottom = '6px';

            // create divs for model's thinking and answer
            const thinkDiv = document.createElement('div');
            thinkDiv.className = 'message-think';
            thinkDiv.style.fontStyle = 'italic';
            thinkDiv.style.display = 'none';

            const answerDiv = document.createElement('div');
            answerDiv.className = 'message-answer';

            // add to html
            currentModelResponse.appendChild(thinkToggle);
            currentModelResponse.appendChild(thinkDiv);
            currentModelResponse.appendChild(answerDiv);

            // add event listening to think toggle button
            thinkToggle.addEventListener('click', () => {
                const showing = thinkDiv.style.display !== 'none';
                if (thinkDiv.style.display !== 'none') {
                    thinkDiv.style.display = 'none';
                    thinkToggle.textContent = 'Show thoughts';
                } else {
                    thinkDiv.style.display = 'block';
                    thinkToggle.textContent = 'Hide thoughts';
                }

            });

            // define miscellaneous variables for streaming
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let prevScrollHeight = chatContainer.scrollHeight;
            const streamStartedAtBottom = (distanceFromBottom() <= dynamicAutoscrollRange);
            let fullAccum = '';

            // function to update display with LaTeX and markdown rendering
            function updateDisplay(targetDiv, text) {

                // LaTeX rendering using KaTeX
                const mathList = [];
                function extractMathPlaceholders(str) {
                    let output = '';
                    let i = 0;

                    // extract math between openers and closers, store it in mathList, then insert placeholder span
                    while (i < str.length) {
                        const nextBracket = str.indexOf('\\[', i);
                        const nextParen = str.indexOf('\\(', i);

                        if (nextBracket === -1 && nextParen === -1) {
                            output += str.slice(i);
                            break;
                        }

                        // identify the delimiters
                        let openInd, openDel, closeDel, display;
                        if (nextBracket !== -1 && (nextParen === -1 || nextBracket < nextParen)) {
                            openInd = nextBracket;
                            openDel = '\\[';
                            closeDel = '\\]';
                            display = true; // display-mode math
                        } else {
                            openInd = nextParen;
                            openDel = '\\(';
                            closeDel = '\\)';
                            display = false; // inline math
                        }

                        // append the text before the math block to the output
                        output += str.slice(i, openInd);

                        // find the matching closing delimiter
                        const closeIdx = str.indexOf(closeDel, openInd + openDel.length);
                        if (closeIdx === -1) {
                            output += str.slice(openInd);
                            break;
                        }

                        // extract the math content
                        const math = str.slice(openInd + openDel.length, closeIdx);
                        const idx = mathList.length;
                        mathList.push({ tex: math, display: !!display });

                        // add placeholder span (with index and display mode data attributes)
                        output += `<span class="katex-placeholder" data-math-index="${idx}" data-display="${display?1:0}"></span>`;

                        i = closeIdx + closeDel.length;
                    }

                    return output;
                }

                const processed = extractMathPlaceholders(text);

                // markdown rendering
                targetDiv.innerHTML = marked.parse(processed);

                // render math in placeholders
                const placeholders = targetDiv.querySelectorAll ? Array.from(targetDiv.querySelectorAll('.katex-placeholder')) : [];
                if (placeholders.length) {
                    for (let i = 0; i < placeholders.length; i ++) {
                        const ph = placeholders[i];

                        // check for math expression
                        let indAttr = ph.getAttribute('data-math-index');
                        let ind = parseInt(indAttr, 10);
                        let item;
                        if (Number.isFinite(ind)) {
                            item = mathList[ind];
                        } else {
                            ph.textContent = '';
                            continue;
                        }

                        // show rendered tex, or else show temporary raw tex
                        const tex = (item.tex).trim();
                        ph.textContent = tex;
                        katex.render(tex, ph, { displayMode: Boolean(item.display), throwOnError: true });
                    }

                }

                // normalize paragraph spacing for readability
                if (targetDiv.querySelectorAll) {
                    const allParagraphs = targetDiv.querySelectorAll('p');
                    allParagraphs.forEach(function(paragraph) {
                        paragraph.style.margin = '0';
                    });
                }
            }

            function splitThink(full) {
                // unclosed think tag
                if (full.trim().toLowerCase().startsWith('<think')) {
                    const startTagEnd = full.indexOf('>');
                    if (startTagEnd === -1) return { answer: '', think: full };
                    const firstClose = full.indexOf('</think>', startTagEnd + 1);
                    if (firstClose === -1) {
                        return { answer: '', think: full.slice(startTagEnd + 1) };
                    }
                }

                // closed think tags
                const thinkingParts = [];
                let answer = full;
                while (true) {
                    const start = answer.indexOf('<think>');
                    const end = answer.indexOf('</think>');

                    if (start === -1 || end === -1 || end < start) break;

                    const content = answer.slice(start + 7, end);
                    thinkingParts.push(content);

                    // remove the think blocks
                    answer = answer.slice(0, start) + answer.slice(end + 8);
                }

                return { answer: answer, think: thinkingParts.join('\n') };
            }

            function routeChunk(chunk) {
                fullAccum += chunk;
            }

            // read streaming chunks and render the chunks
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });

                prevScrollHeight = chatContainer.scrollHeight;
                routeChunk(chunk);
                const parts = splitThink(fullAccum);
                updateDisplay(answerDiv, parts.answer);
                updateDisplay(thinkDiv, parts.think);

                const newScrollHeight = chatContainer.scrollHeight;
                const appendedDelta = newScrollHeight - prevScrollHeight;

                const nowDistance = distanceFromBottom();
                const currentRange = dynamicAutoscrollRange;
                if (streamStartedAtBottom && nowDistance > currentRange) {
                    dynamicAutoscrollRange = Math.max(currentRange, appendedDelta);
                }

                autoScroll();
            }

            isStreaming = false;

            // Process any remaining tail bytes and render final content.
            const tail = decoder.decode();
            if (tail) fullAccum += tail;

            const finalParts = splitThink(fullAccum || '');
            updateDisplay(thinkDiv, finalParts.think || '');
            updateDisplay(answerDiv, finalParts.answer || '');

        }).catch(err => {
            console.error('Fetch failed', err);
            if (currentModelResponse) currentModelResponse.textContent = 'Fetch failed: ' + String(err);
        });
    }

    if (chatButton) chatButton.addEventListener('click', sendMessage);
    if (chatInput) chatInput.addEventListener('keydown', function(event) { if (event.key === 'Enter') sendMessage(); });

    // start and back buttons
    const startScreen = document.getElementById('start-screen');
    const chatScreen = document.getElementById('chat-screen');
    const startButton = document.getElementById('start-button');
    const backButton = document.getElementById('chat-back');
    const generateScenarioButton = document.getElementById('generate-scenario-button');


    function getConversationHistory(maxEntries = 2) {
        const history = [];

        // Loop through each message in the chat container
        const messages = Array.from(chatContainer.children);
        for (const message of messages) {
            // Try to find the user's message
            const userMessage = message.querySelector('.message-text-user');
            if (userMessage && userMessage.textContent.trim()) {
                history.push('User: ' + userMessage.textContent.trim());
                continue;
            }

            // Try to find the bot's message
            const botMessage = message.querySelector('.message-answer');
            if (botMessage && botMessage.textContent.trim()) {
                history.push('Bot: ' + botMessage.textContent.trim());
            }
        }

        // Get the last few messages and join them with line breaks
        const recentMessages = history.slice(-maxEntries);
        return recentMessages.join('\n');
    }

    // handle generate scenario button click
    async function onGenerateScenarioClick() {

        const history = getConversationHistory(2);
        const marker = '__SCENARIO__';
        const payload = marker + '\n' + (history || '');

        appendUserMessage('[Generate new scenario]');
        currentModelResponse = appendBotPlaceholder();
        generateAIResponse(payload);
    }

    if (generateScenarioButton) generateScenarioButton.addEventListener('click', onGenerateScenarioClick);

    // handle menu to chat and back

    function menuToChat() {
        if (startScreen && chatScreen) {
            startScreen.style.display = 'none';
            chatScreen.style.display = 'flex';
        }
    }

    function chatToMenu() {
        if (startScreen && chatScreen) {
            chatScreen.style.display = 'none';
            startScreen.style.display = 'flex';
        }
    }

    if (startButton) startButton.addEventListener('click', menuToChat);
    if (backButton) backButton.addEventListener('click', chatToMenu);

});