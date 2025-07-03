const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(express.static('public')); // Servir archivos estáticos

const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

let players = {};
let tagId = null;
const PLAYER_SIZE = 30;

io.on('connection', (socket) => {
    console.log('Nuevo jugador conectado:', socket.id);

    // Añadir nuevo jugador con score inicial 0
    players[socket.id] = {
        id: socket.id,
        x: Math.random() * 800,
        y: Math.random() * 600,
        isTag: false,
        score: 0
    };

    // Si no hay "la mancha", asignar al primero
    if (!tagId) {
        tagId = socket.id;
        players[socket.id].isTag = true;
        players[socket.id].score += 1; // El primero también suma 1 toque
    }

    io.emit('players', players);

    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            io.emit('players', players);
        }
    });

    socket.on('tag', (data) => {
        const { targetId, push } = typeof data === 'object' ? data : { targetId: data, push: null };

        if (players[socket.id]?.isTag && players[targetId]) {
            players[socket.id].isTag = false;
            players[targetId].isTag = true;
            players[targetId].score = (players[targetId].score || 0) + 1;

            // Aplicar empuje si existe
            if (push) {
                players[targetId].x += push.x;
                players[targetId].y += push.y;

                // Limitar dentro del área (800x600)
                players[targetId].x = Math.min(Math.max(players[targetId].x, PLAYER_SIZE / 2), 800 - PLAYER_SIZE / 2);
                players[targetId].y = Math.min(Math.max(players[targetId].y, PLAYER_SIZE / 2), 600 - PLAYER_SIZE / 2);
            }

            tagId = targetId;
            io.emit('players', players);
        }
    });

    socket.on('disconnect', () => {
        console.log('Jugador desconectado:', socket.id);
        const wasTag = socket.id === tagId;
        delete players[socket.id];

        if (wasTag) {
            const ids = Object.keys(players);
            if (ids.length > 0) {
                const newTag = ids[0];
                players[newTag].isTag = true;
                players[newTag].score = (players[newTag].score || 0) + 1; // nuevo manchado suma toque
                tagId = newTag;
            } else {
                tagId = null;
            }
        }
        io.emit('players', players);
    });
});

server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
