const JSONBIN_MASTER_KEY = 'YOUR_JSONBIN_MASTER_KEY'; // Replace in production or pass via URL

async function loadTranscript() {
    const urlParams = new URLSearchParams(window.location.search);
    const binId = urlParams.get('id');
    const masterKey = urlParams.get('key') || JSONBIN_MASTER_KEY;

    if (!binId) {
        document.getElementById('messages').innerHTML = '<div class="error">No transcript ID provided</div>';
        return;
    }

    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
            headers: {
                'X-Master-Key': masterKey
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load transcript');
        }

        const data = await response.json();
        const transcript = data.record;

        displayTranscript(transcript);
    } catch (error) {
        console.error('Error loading transcript:', error);
        document.getElementById('messages').innerHTML =
            '<div class="error">Failed to load transcript. Please check the link and try again.</div>';
    }
}

function displayTranscript(transcript) {
    document.getElementById('ticket-name').textContent = transcript.channelName || 'Ticket Transcript';
    document.getElementById('created-date').textContent = new Date(transcript.createdAt).toLocaleString();
    document.getElementById('message-count').textContent = transcript.messages.length;
    document.getElementById('closed-by').textContent = transcript.closedBy || 'Unknown';

    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = '';

    transcript.messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';

        const avatar = document.createElement('img');
        avatar.className = 'avatar';
        // Use base64 avatar if available, otherwise fallback
        avatar.src = msg.avatar_base64 || msg.avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png';
        avatar.alt = msg.username;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        const headerDiv = document.createElement('div');
        headerDiv.className = 'message-header';

        const username = document.createElement('span');
        username.className = 'username';
        username.textContent = msg.username;

        const timestamp = document.createElement('span');
        timestamp.className = 'timestamp';
        timestamp.textContent = new Date(msg.timestamp).toLocaleString();

        headerDiv.appendChild(username);
        headerDiv.appendChild(timestamp);

        contentDiv.appendChild(headerDiv);

        if (msg.content) {
            const textDiv = document.createElement('div');
            textDiv.className = 'message-text';
            textDiv.textContent = msg.content;
            contentDiv.appendChild(textDiv);
        }

        if (msg.embeds && msg.embeds.length > 0) {
            msg.embeds.forEach(embed => {
                const embedDiv = document.createElement('div');
                embedDiv.className = 'embed';

                if (embed.color) {
                    embedDiv.style.borderLeftColor = `#${embed.color.toString(16).padStart(6, '0')}`;
                }

                if (embed.title) {
                    const title = document.createElement('div');
                    title.className = 'embed-title';
                    title.textContent = embed.title;
                    embedDiv.appendChild(title);
                }

                if (embed.description) {
                    const desc = document.createElement('div');
                    desc.className = 'embed-description';
                    desc.textContent = embed.description;
                    embedDiv.appendChild(desc);
                }

                if (embed.fields && embed.fields.length > 0) {
                    embed.fields.forEach(field => {
                        const fieldDiv = document.createElement('div');
                        fieldDiv.className = 'embed-field';

                        const fieldName = document.createElement('div');
                        fieldName.className = 'embed-field-name';
                        fieldName.textContent = field.name;

                        const fieldValue = document.createElement('div');
                        fieldValue.className = 'embed-field-value';
                        fieldValue.textContent = field.value;

                        fieldDiv.appendChild(fieldName);
                        fieldDiv.appendChild(fieldValue);
                        embedDiv.appendChild(fieldDiv);
                    });
                }

                if (embed.image) {
                    const img = document.createElement('img');
                    img.className = 'embed-image';
                    // Use base64 if available, otherwise try URL
                    img.src = embed.image.base64 || embed.image.url;
                    embedDiv.appendChild(img);
                }

                if (embed.footer) {
                    const footer = document.createElement('div');
                    footer.className = 'embed-footer';
                    footer.textContent = embed.footer.text || embed.footer;
                    embedDiv.appendChild(footer);
                }

                contentDiv.appendChild(embedDiv);
            });
        }

        if (msg.attachments && msg.attachments.length > 0) {
            msg.attachments.forEach(att => {
                // Check if it's an image attachment with base64 data
                if (att.base64 && att.contentType && att.contentType.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.className = 'attachment-image';
                    img.src = att.base64;
                    img.alt = att.name;
                    img.style.maxWidth = '100%';
                    img.style.marginTop = '8px';
                    img.style.borderRadius = '4px';
                    contentDiv.appendChild(img);
                } else if (att.base64) {
                    // Non-image file with base64 data
                    const attLink = document.createElement('a');
                    attLink.className = 'attachment';
                    attLink.href = att.base64;
                    attLink.download = att.name;
                    attLink.textContent = `📎 ${att.name}`;
                    contentDiv.appendChild(attLink);
                } else if (att.url) {
                    // Fallback to URL if no base64 (may be broken if channel deleted)
                    const attLink = document.createElement('a');
                    attLink.className = 'attachment';
                    attLink.href = att.url;
                    attLink.target = '_blank';
                    attLink.textContent = `📎 ${att.name} (external link)`;
                    attLink.style.opacity = '0.6';
                    contentDiv.appendChild(attLink);
                }
            });
        }

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);
        messagesContainer.appendChild(messageDiv);
    });

    if (transcript.closeReason) {
        const reasonDiv = document.createElement('div');
        reasonDiv.className = 'message';
        reasonDiv.innerHTML = `
            <div class="message-content">
                <div class="embed" style="border-left-color: #f04747;">
                    <div class="embed-title">🔒 Ticket Closed</div>
                    <div class="embed-description">Reason: ${transcript.closeReason}</div>
                </div>
            </div>
        `;
        messagesContainer.appendChild(reasonDiv);
    }
}

// Helper function to convert image URL to base64 (for use when creating transcripts)
async function convertImageToBase64(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error converting image to base64:', error);
        return null;
    }
}

// Helper function to process transcript and embed images (call this when SAVING transcript)
async function processTranscriptForStorage(transcript) {
    for (const msg of transcript.messages) {
        // Convert avatar to base64
        if (msg.avatar_url && !msg.avatar_base64) {
            msg.avatar_base64 = await convertImageToBase64(msg.avatar_url);
        }

        // Convert attachments to base64
        if (msg.attachments) {
            for (const att of msg.attachments) {
                if (att.url && !att.base64) {
                    att.base64 = await convertImageToBase64(att.url);
                    // Store content type for proper display
                    if (!att.contentType) {
                        att.contentType = att.url.match(/\.(png|jpe?g|gif|webp)/i) ? 
                            `image/${att.url.split('.').pop().toLowerCase()}` : 'application/octet-stream';
                    }
                }
            }
        }

        // Convert embed images to base64
        if (msg.embeds) {
            for (const embed of msg.embeds) {
                if (embed.image && embed.image.url && !embed.image.base64) {
                    embed.image.base64 = await convertImageToBase64(embed.image.url);
                }
            }
        }
    }
    return transcript;
}

loadTranscript();
