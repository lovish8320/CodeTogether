const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const axios = require("axios");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { exec, spawn } = require("child_process");
require("dotenv").config();

const ACTIONS = require("./Actions");
const Chat = require("./models/Chat");

const app = express();
const server = http.createServer(app);

// Setup socket.io server
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// JDoodle language version configuration
const languageConfig = {
  python3: { versionIndex: "3" },
  java: { versionIndex: "3" },
  cpp: { versionIndex: "4" },
  nodejs: { versionIndex: "3" },
  c: { versionIndex: "4" },
  ruby: { versionIndex: "3" },
  go: { versionIndex: "3" },
  scala: { versionIndex: "3" },
  bash: { versionIndex: "3" },
  sql: { versionIndex: "3" },
  pascal: { versionIndex: "2" },
  csharp: { versionIndex: "3" },
  php: { versionIndex: "3" },
  swift: { versionIndex: "3" },
  rust: { versionIndex: "3" },
  r: { versionIndex: "3" },
};

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// Compile API
app.post("/compile", (req, res) => {
  const { code, language } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Empty code" });
  }

  const tempDir = path.join(__dirname, "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  const fileId = Date.now() + "_" + Math.floor(Math.random() * 1000);
  let ext, command;

  if (language === "python" || language === "python3") {
    ext = "py";
  } else if (language === "nodejs" || language === "javascript") {
    ext = "js";
  } else if (language === "cpp" || language === "c++") {
    ext = "cpp";
  } else if (language === "c") {
    ext = "c";
  } else if (language === "java") {
    ext = "java";
  } else {
    return res.status(400).json({ error: `Language ${language} not supported for local compilation yet.` });
  }

  const filepath = path.join(tempDir, `${fileId}.${ext}`);

  if (language === "python" || language === "python3") {
    command = `python "${filepath}"`;
  } else if (language === "nodejs" || language === "javascript") {
    command = `node "${filepath}"`;
  } else if (language === "cpp" || language === "c++") {
    command = `g++ "${filepath}" -o "${path.join(tempDir, fileId)}.exe" && "${path.join(tempDir, fileId)}.exe"`;
  } else if (language === "c") {
    command = `gcc "${filepath}" -o "${path.join(tempDir, fileId)}.exe" && "${path.join(tempDir, fileId)}.exe"`;
  } else if (language === "java") {
    command = `javac "${filepath}" && java -cp "${tempDir}" Main`;
  }

  fs.writeFile(filepath, code, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to write temp file" });
    }

    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
      // Clean up the files
      fs.unlink(filepath, () => {});
      if (ext === "cpp" || ext === "c") {
        fs.unlink(path.join(tempDir, `${fileId}.exe`), () => {});
      }
      if (ext === "java") {
        fs.unlink(path.join(tempDir, "Main.class"), () => {});
      }

      if (error && error.killed) {
        return res.json({ output: "Execution timed out." });
      }

      if (error || stderr) {
        return res.json({ output: stderr || (error && error.message) || "Execution failed." });
      }

      res.json({ output: stdout });
    });
  });
});

// Utility: connected users per socket
const userSocketMap = {};
const getAllConnectedClients = (roomId) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => ({
      socketId,
      username: userSocketMap[socketId],
    })
  );
};

// Socket.IO event handling
io.on("connection", (socket) => {
  console.log("⚡ Connected:", socket.id);

  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);

    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, fileId, code }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { fileId, code });
  });

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, files }) => {
    io.to(socketId).emit(ACTIONS.SYNC_CODE, { files });
  });

  socket.on(ACTIONS.FILE_CREATED, ({ roomId, file }) => {
    socket.in(roomId).emit(ACTIONS.FILE_CREATED, { file });
  });

  socket.on(ACTIONS.FILE_DELETED, ({ roomId, fileId }) => {
    socket.in(roomId).emit(ACTIONS.FILE_DELETED, { fileId });
  });

  socket.on(ACTIONS.FILE_RENAMED, ({ roomId, fileId, newName }) => {
    socket.in(roomId).emit(ACTIONS.FILE_RENAMED, { fileId, newName });
  });

  socket.on(ACTIONS.TYPING, ({ roomId, username }) => {
    socket.in(roomId).emit(ACTIONS.TYPING, { username });
  });

  socket.on(ACTIONS.STOP_TYPING, ({ roomId, username }) => {
    socket.in(roomId).emit(ACTIONS.STOP_TYPING, { username });
  });

  socket.on(ACTIONS.CURSOR_CHANGE, ({ roomId, username, position }) => {
    socket.in(roomId).emit(ACTIONS.CURSOR_CHANGE, { username, position });
  });

  socket.on(ACTIONS.USER_CALL, ({ roomId, peerId, username }) => {
    socket.in(roomId).emit(ACTIONS.USER_CALL, { peerId, username });
  });

  socket.on(ACTIONS.WHITEBOARD_UPDATE, ({ roomId, updates }) => {
    socket.in(roomId).emit(ACTIONS.WHITEBOARD_UPDATE, { updates });
  });

  const runningProcesses = {};

  socket.on(ACTIONS.EXECUTE_START, ({ roomId, code, language }) => {
    // Kill existing process if any
    if (runningProcesses[roomId]) {
      runningProcesses[roomId].kill();
      delete runningProcesses[roomId];
    }

    const tempDir = path.join(__dirname, "temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    const fileId = Date.now() + "_" + Math.floor(Math.random() * 1000);
    
    let ext, command, args;
    if (language === "python" || language === "python3") {
      ext = "py";
      command = "python";
      args = [];
    } else if (language === "nodejs" || language === "javascript") {
      ext = "js";
      command = "node";
      args = [];
    } else if (language === "cpp" || language === "c++") {
      ext = "cpp";
    } else if (language === "c") {
      ext = "c";
    } else if (language === "java") {
      ext = "java";
    } else {
      io.in(roomId).emit(ACTIONS.EXECUTE_OUTPUT, { output: `\r\nLanguage ${language} not supported for interactive execution.\r\n` });
      return;
    }

    const filepath = path.join(tempDir, `${fileId}.${ext}`);
    fs.writeFile(filepath, code, (err) => {
      if (err) return io.in(roomId).emit(ACTIONS.EXECUTE_OUTPUT, { output: "\r\nFailed to write temp file\r\n" });
      
      const spawnProcess = (cmd, cmdArgs) => {
        const child = spawn(cmd, cmdArgs);
        runningProcesses[roomId] = child;

        child.stdout.on('data', (data) => {
          io.in(roomId).emit(ACTIONS.EXECUTE_OUTPUT, { output: data.toString() });
        });
        
        child.stderr.on('data', (data) => {
          io.in(roomId).emit(ACTIONS.EXECUTE_OUTPUT, { output: data.toString() });
        });

        child.on('close', (code) => {
          io.in(roomId).emit(ACTIONS.EXECUTE_END, { exitCode: code });
          delete runningProcesses[roomId];
          fs.unlink(filepath, () => {});
        });
      };

      if (ext === "py" || ext === "js") {
        spawnProcess(command, [filepath]);
      } else if (ext === "cpp" || ext === "c") {
        const exePath = path.join(tempDir, `${fileId}.exe`);
        const compileCmd = ext === "cpp" ? "g++" : "gcc";
        exec(`${compileCmd} "${filepath}" -o "${exePath}"`, (error, stdout, stderr) => {
          if (error || stderr) {
            io.in(roomId).emit(ACTIONS.EXECUTE_OUTPUT, { output: stderr || error.message });
            io.in(roomId).emit(ACTIONS.EXECUTE_END, { exitCode: 1 });
            fs.unlink(filepath, () => {});
          } else {
            spawnProcess(exePath, []);
          }
        });
      } else if (ext === "java") {
        exec(`javac "${filepath}"`, (error, stdout, stderr) => {
          if (error || stderr) {
            io.in(roomId).emit(ACTIONS.EXECUTE_OUTPUT, { output: stderr || error.message });
            io.in(roomId).emit(ACTIONS.EXECUTE_END, { exitCode: 1 });
            fs.unlink(filepath, () => {});
          } else {
            spawnProcess("java", ["-cp", tempDir, "Main"]);
          }
        });
      }
    });
  });

  socket.on(ACTIONS.EXECUTE_INPUT, ({ roomId, data }) => {
    if (runningProcesses[roomId]) {
      runningProcesses[roomId].stdin.write(data);
    }
  });

  // Handle chat messages
  socket.on("chat-message", async ({ roomId, username, message }) => {
    const chatMsg = new Chat({ roomId, username, message });
    await chatMsg.save();

    io.in(roomId).emit("chat-message", {
      username,
      message,
      timestamp: chatMsg.createdAt,
    });
  });

  // Handle chat history request
  socket.on("get-chat-history", async (roomId) => {
    const messages = await Chat.find({ roomId })
      .sort({ createdAt: 1 })
      .limit(100);

    socket.emit("chat-history", messages);
  });

  // Handle disconnect
  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];

    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });

    delete userSocketMap[socket.id];
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
