import dotenv from 'dotenv';
import http from 'http';
import axios from 'axios';
import { app } from './app.js';
import { Server } from 'socket.io';

dotenv.config({ path: './.env' });

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ['https://mindvault-engi.vercel.app'],
        credentials: true,
        methods: ['GET', 'POST'],
    },
});

io.on('connection', (socket) => {
    console.log(`Socket Connected: ${socket.id}`);

    socket.on("join_room", ({ roomId, userId }) => {
        socket.join(roomId);
        console.log(`User ${userId} joined room ${roomId}`);
        io.to(roomId).emit("user_joined", { userId, roomId });
    });

    socket.on("user_message", async ({ roomId, message, userId }) => {
        console.log(`Message from ${userId} in room ${roomId}: ${message}`);

        io.to(roomId).emit("new_message", { userId, message, from: "user" });

        try {
        const response = await axios.post(`${process.env.FASTAPI_URL}/chat`, {
            message,
            userId,
            roomId,
        });

        const aiReply = response.data.reply;
        io.to(roomId).emit("new_message", { userId: "AI", message: aiReply, from: "ai" });
        console.log(` AI replied: ${aiReply}`);
        } catch (error) {
        console.error("❌ Error communicating with FastAPI:", error);
        io.to(roomId).emit("new_message", {
            userId: "AI",
            message: "Sorry, I'm facing a technical issue right now.",
            from: "ai",
        });
        }
    });

    socket.on('disconnect', () => {
        console.log(`Socket Disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
