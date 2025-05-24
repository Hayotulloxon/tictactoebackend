const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const games = {};

app.get("/", (req, res) => {
  res.send("Tic Tac Toe backend ishlayapti!");
});

io.on("connection", (socket) => {
  socket.on("join", (gameId) => {
    socket.join(gameId);
    if (!games[gameId]) {
      games[gameId] = {
        board: Array(9).fill(null),
        turn: "X",
        starter: "X",
        winner: null
      };
    }
    socket.emit("state", games[gameId]);
    socket.to(gameId).emit("player-joined");
  });

  socket.on("move", ({ gameId, idx, player }) => {
    const game = games[gameId];
    if (!game || game.winner || game.board[idx] || game.turn !== player) return;
    game.board[idx] = player;
    game.turn = player === "X" ? "O" : "X";
    game.winner = checkWinner(game.board);
    io.to(gameId).emit("state", game);
  });

  // TUZATISH: restart da {gameId, turn} obyektini kutamiz va har ikki tomon uchun navbatni qaytarib yuboramiz
  socket.on("restart", ({ gameId, turn }) => {
    if (games[gameId]) {
      games[gameId].starter = turn || (games[gameId].starter === "X" ? "O" : "X");
      games[gameId].board = Array(9).fill(null);
      games[gameId].turn = games[gameId].starter;
      games[gameId].winner = null;
      // "restart" hodisasi: yangi turn ni yuboramiz (frontend ham shuni kutadi)
      io.to(gameId).emit("restart", games[gameId].turn);
      // Yangi holatni ham jo‘natamiz
      io.to(gameId).emit("state", games[gameId]);
    }
  });

  socket.on("leave", (gameId) => {
    socket.leave(gameId);
  });
});

function checkWinner(board) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (let l of lines) {
    const [a,b,c] = l;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  if (board.every(Boolean)) return 'draw';
  return null;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server listening on port", PORT);
});
