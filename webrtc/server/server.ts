import { WebSocketServer, WebSocket } from 'ws';

const wss = new WebSocketServer({
    port: 8080,
    // autoPong?
    // clientTracking?
    // read bout props here
});

const rooms = new Map<string, Set<WebSocket>>();

wss.on('connection', (ws: WebSocket) => {
    let currentRoom: string | null = null;

    console.log('Client connected');

    ws.on('message', (message: string) => {
        try {
            const data = JSON.parse(message.toString());

            if (data.type === 'join') {
                // Join a room
                currentRoom = data.room;

                if (!currentRoom) {
                    return;
                }

                if (!rooms.has(currentRoom)) {
                    rooms.set(currentRoom, new Set());
                }

                rooms.get(currentRoom)!.add(ws);
                console.log(`Client joined room: ${currentRoom}`);

                ws.send(JSON.stringify({ type: 'joined', room: currentRoom }));

                broadcastToRoom(currentRoom, { type: 'ready' }, ws);
            } else {
                if (currentRoom) {
                    // Forward all other messages (offer, answer, candidate, bye) to peers in the same room
                    broadcastToRoom(currentRoom, data, ws);
                }
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');

        if (currentRoom && rooms.has(currentRoom)) {
            rooms.get(currentRoom)!.delete(ws);

            broadcastToRoom(currentRoom, { type: 'bye' }, ws);

            if (rooms.get(currentRoom)!.size === 0) {
                rooms.delete(currentRoom);
            }
        }
    });
});

function broadcastToRoom(room: string, message: any, sender: WebSocket): void {
    if (!rooms.has(room)) return;

    const messageStr = JSON.stringify(message);
    rooms.get(room)!.forEach((client) => {
        if (client !== sender && client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
        }
    });
}

console.log('WebRTC signaling server running on ws://localhost:8080');
