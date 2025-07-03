let socket;
let players = {};
let me;

const WIDTH = 800;
const HEIGHT = 600;
const PLAYER_SIZE = 30;

let dragStart = null;
let dragDir = { x: 0, y: 0 };
let dragActive = false;
const dragSpeed = 5; // velocidad para control táctil

function setup() {
    createCanvas(WIDTH, HEIGHT);
    socket = io();

    socket.on('players', (data) => {
        players = data;
    });

    socket.on('connect', () => {
        me = socket.id;
    });
}

function draw() {
    background(220);

    // Movimiento con teclas WASD
    if (players[me]) {
        let speed = 3;
        let p = players[me];

        if (keyIsDown(65)) p.x -= speed; // A
        if (keyIsDown(68)) p.x += speed; // D
        if (keyIsDown(87)) p.y -= speed; // W
        if (keyIsDown(83)) p.y += speed; // S

        // Movimiento táctil por arrastre
        if (dragActive) {
            p.x += dragDir.x * dragSpeed;
            p.y += dragDir.y * dragSpeed;
        }

        // Limitar dentro del canvas
        p.x = constrain(p.x, PLAYER_SIZE / 2, WIDTH - PLAYER_SIZE / 2);
        p.y = constrain(p.y, PLAYER_SIZE / 2, HEIGHT - PLAYER_SIZE / 2);

        socket.emit('move', { x: p.x, y: p.y });
    }

    // Dibujar jugadores y puntajes
    for (let id in players) {
        let p = players[id];
        fill(p.isTag ? 'red' : 'blue');
        ellipse(p.x, p.y, PLAYER_SIZE, PLAYER_SIZE);

        fill(0);
        textAlign(CENTER);
        textSize(10);
        text(id === me ? 'Tú' : id.slice(0, 4), p.x, p.y - PLAYER_SIZE / 1.5);

        textSize(12);
        fill(50, 100, 200);
        text(`Toques: ${p.score || 0}`, p.x, p.y + PLAYER_SIZE);
    }

    // Si soy la mancha, verificar colisiones para pasar la mancha
    if (players[me]?.isTag) {
        for (let id in players) {
            if (id !== me) {
                let a = players[me];
                let b = players[id];
                let d = dist(a.x, a.y, b.x, b.y);
                if (d < PLAYER_SIZE) {
                    // Calcular vector de empuje (normalizado)
                    let dx = b.x - a.x;
                    let dy = b.y - a.y;
                    let distNorm = dist(0, 0, dx, dy);
                    let pushDist = 50;

                    let pushX = (dx / distNorm) * pushDist;
                    let pushY = (dy / distNorm) * pushDist;

                    socket.emit('tag', { targetId: id, push: { x: pushX, y: pushY } });
                }
            }
        }
    }
}

// Control táctil por arrastre

function touchStarted() {
    dragStart = { x: mouseX, y: mouseY };
    dragActive = true;
    return false; // evitar scroll móvil
}

function touchMoved() {
    if (dragActive && dragStart) {
        let dx = mouseX - dragStart.x;
        let dy = mouseY - dragStart.y;

        let mag = Math.sqrt(dx * dx + dy * dy);
        if (mag > 0) {
            dragDir.x = dx / mag;
            dragDir.y = dy / mag;
        } else {
            dragDir.x = 0;
            dragDir.y = 0;
        }
    }
    return false;
}

function touchEnded() {
    dragActive = false;
    dragDir = { x: 0, y: 0 };
    return false;
}
