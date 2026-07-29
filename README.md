# CodeTogether

CodeTogether is a real-time collaborative coding platform designed for pair programming, system design interviews, and remote team collaboration.

## 🚀 Features

- **Real-Time Collaborative Code Editor**: Type alongside your peers with live cursors and typing indicators using Monaco Editor.
- **Multi-Language Interactive Execution**: Write and execute `Node.js`, `Python`, `C`, `C++`, and `Java` directly in the browser. 
- **Interactive Terminal**: Unlike standard web IDEs, CodeTogether uses an interactive `xterm.js` terminal connected to a spawned backend process, allowing you to pass standard input (`stdin`) into your running scripts!
- **File Explorer & Syncing**: Create, rename, delete, and switch between multiple files. Upload files directly from your computer, and everything syncs instantly to all connected users.
- **Collaborative Whiteboard**: Seamlessly switch from coding to architecture planning using an infinite-canvas whiteboard (`tldraw`) that syncs in real-time.
- **Peer-to-Peer Video & Audio**: No need for external meeting links. Join the built-in P2P video call powered by WebRTC (`peerjs`) to see and hear your teammates while you code.
- **Real-Time Chat**: Send messages to your room with persistent chat history.

## 🛠️ Tech Stack

- **Frontend**: React.js, Tailwind CSS (Vanilla CSS), Monaco Editor, xterm.js, tldraw
- **Backend**: Node.js, Express.js, Socket.IO, Child Processes (for execution)
- **Database**: MongoDB (for chat history)
- **WebRTC**: PeerJS

## 📦 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/lovish8320/CodeTogether.git
   cd CodeTogether
   ```

2. **Install Server Dependencies:**
   ```bash
   cd server
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the `server` directory:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   ```

4. **Install Client Dependencies:**
   ```bash
   cd ../client
   npm install
   ```

5. **Start the Application:**
   Run the backend and frontend servers simultaneously:
   - Server: `cd server && npm start`
   - Client: `cd client && npm start`

## 👨‍💻 Usage
- Open `http://localhost:3000`
- Generate a new Room ID or paste an existing one to join a session.
- Share the Room ID with your peers to collaborate instantly.
