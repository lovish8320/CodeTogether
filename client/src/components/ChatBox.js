import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000"); // Adjust if needed

function ChatBox({ roomId, username }) {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    socket.emit("get-chat-history", roomId);

    socket.on("chat-history", (messages) => {
      setChat(messages);
    });

    socket.on("chat-message", (data) => {
      setChat((prev) => [...prev, data]);
    });

    return () => {
      socket.off("chat-history");
      socket.off("chat-message");
    };
  }, [roomId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    socket.emit("chat-message", {
      roomId,
      username,
      message,
    });

    setMessage("");
  };

  return (
    <div style={{
      width: "100%",
      background: "#1e1e1e",
      color: "#fff",
      padding: "10px",
      height: "100%",
      display: "flex",
      flexDirection: "column",
    }}>
      <h5 style={{ marginBottom: "10px" }}>💬 Chat</h5>

      <div style={{
        flex: 1,
        overflowY: "auto",
        marginBottom: "10px",
        border: "1px solid #333",
        padding: "8px",
        borderRadius: "5px"
      }}>
        {chat.map((msg, i) => (
          <div key={i} style={{ marginBottom: "6px" }}>
            <strong>{msg.username}:</strong> {msg.message}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={sendMessage} style={{ display: "flex", gap: "6px" }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "4px",
            border: "none",
            backgroundColor: "#2e2e2e",
            color: "#fff"
          }}
          placeholder="Type a message..."
        />
        <button type="submit" style={{
          padding: "8px 12px",
          borderRadius: "4px",
          backgroundColor: "#007bff",
          color: "#fff",
          border: "none",
          cursor: "pointer"
        }}>
          Send
        </button>
      </form>
    </div>
  );
}

export default ChatBox;
