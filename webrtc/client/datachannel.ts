let dc: RTCDataChannel | null = null;
const incomingFiles = new Map<string, { name: string; mime: string; chunks: ArrayBuffer[]; received: number; }>();

const dcStatus = document.getElementById('dcStatus') as HTMLDivElement | null;
const chatMessages = document.getElementById('chatMessages') as HTMLDivElement | null;

function appendMessage(text: string): void {
    if (!chatMessages) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = text;
    chatMessages.appendChild(wrap);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

export function setupIncomingDataChannel(channel: RTCDataChannel): void {
    dc = channel;
    setupCommonHandlers();
}

export function createDataChannel(pc: RTCPeerConnection, label = 'chat'): RTCDataChannel {
    dc = pc.createDataChannel(label);
    setupCommonHandlers();
    return dc!;
}

function setupCommonHandlers(): void {
    if (!dc) return;
    dc.onopen = () => {
        if (dcStatus) dcStatus.textContent = 'DC: open';
        appendMessage('DataChannel opened');
    };
    dc.onclose = () => {
        if (dcStatus) dcStatus.textContent = 'DC: closed';
        appendMessage('DataChannel closed');
        dc = null;
    };
    dc.onerror = (ev) => console.error('DataChannel error', ev);
    dc.onmessage = async (e) => {
        if (typeof e.data === 'string') {
            try {
                const msg = JSON.parse(e.data);
                if (msg.type === 'file-meta') {
                    const mime = msg.mime ?? 'application/octet-stream';
                    incomingFiles.set(msg.id, { name: msg.name, mime, chunks: [], received: 0 });
                    appendMessage(`Receiving file: ${msg.name}`);
                } else if (msg.type === 'file-done') {
                    const info = incomingFiles.get(msg.id);
                    if (info) {
                        const blob = new Blob(info.chunks, { type: info.mime });
                        const url = URL.createObjectURL(blob);
                        if (chatMessages) {
                            const div = document.createElement('div');
                            div.textContent = `File received: ${info.name} (`;
                            const a = document.createElement('a');
                            a.href = url;
                            a.textContent = 'download';
                            a.target = '_blank';
                            a.download = info.name;
                            div.appendChild(a);
                            div.appendChild(document.createTextNode(')'));
                            chatMessages.appendChild(div);
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        } else {
                            appendMessage(`File received: ${info.name} (download: ${url})`);
                        }
                        incomingFiles.delete(msg.id);
                    }
                } else if (msg.type === 'message') {
                    appendMessage(`Peer: ${msg.text}`);
                }
            } catch (err) {
                console.warn('Invalid JSON message', err);
            }
        } else {
            // binary chunk may be ArrayBuffer or Blob depending on runtime
            let buf: ArrayBuffer;
            if (e.data instanceof ArrayBuffer) {
                buf = e.data;
            } else if (e.data instanceof Blob) {
                buf = await e.data.arrayBuffer();
            } else {
                try {
                    buf = e.data as ArrayBuffer;
                } catch {
                    return;
                }
            }
            const last = Array.from(incomingFiles.keys()).pop();
            if (last) {
                const info = incomingFiles.get(last)!;
                info.chunks.push(buf);
                info.received += buf.byteLength;
            }
        }
    };
}

export function closeDataChannel(): void {
    if (dc) {
        try { dc.close(); } catch (e) { /* ignore */ }
        dc = null;
        if (dcStatus) dcStatus.textContent = 'DC: not connected';
    }
}

export async function sendMessage(text: string): Promise<void> {
    if (!dc || dc.readyState !== 'open') {
        appendMessage('DataChannel not open');
        return;
    }
    const msg = { type: 'message', text };
    dc.send(JSON.stringify(msg));
    appendMessage(`You: ${text}`);
}

function waitForBufferedLow(threshold = 512 * 1024): Promise<void> {
    return new Promise((resolve) => {
        if (!dc) return resolve();
        if (dc.bufferedAmount <= threshold) return resolve();
        const old = dc.bufferedAmountLowThreshold;
        dc.bufferedAmountLowThreshold = threshold;
        const onLow = () => {
            dc!.removeEventListener('bufferedamountlow', onLow);
            dc!.bufferedAmountLowThreshold = old;
            resolve();
        };
        dc.addEventListener('bufferedamountlow', onLow);
    });
}

export async function sendFile(file: File): Promise<void> {
    if (!dc || dc.readyState !== 'open') {
        appendMessage('DataChannel not open');
        return;
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    dc.send(JSON.stringify({ type: 'file-meta', id, name: file.name, mime: file.type }));
    const CHUNK = 16 * 1024;
    for (let offset = 0; offset < file.size; offset += CHUNK) {
        const slice = file.slice(offset, offset + CHUNK);
        const buf = await slice.arrayBuffer();
        dc.send(buf);
        if (dc.bufferedAmount > 512 * 1024) await waitForBufferedLow();
    }
    dc.send(JSON.stringify({ type: 'file-done', id }));
    appendMessage(`Sent file: ${file.name}`);
}
