import React, { useEffect, useRef, useState } from "react";

function ChatBox({ roomId, username, socketRef }) {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!socketRef || !socketRef.current) return;
    
    const socket = socketRef.current;

    socket.emit("get-chat-history", roomId);

    const handleChatHistory = (messages) => {
      setChat(messages);
    };

    const handleChatMessage = (data) => {
      setChat((prev) => [...prev, data]);
    };

    socket.on("chat-history", handleChatHistory);
    socket.on("chat-message", handleChatMessage);

    return () => {
      socket.off("chat-history", handleChatHistory);
      socket.off("chat-message", handleChatMessage);
    };
  }, [roomId, socketRef]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !socketRef.current) return;

    socketRef.current.emit("chat-message", {
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
      <h5 style={{ marginBottom: "10px", fontSize: "14px", fontWeight: "bold" }}>💬 CHAT</h5>

      <div style={{
        flex: 1,
        overflowY: "auto",
        marginBottom: "10px",
        border: "1px solid #333",
        padding: "8px",
        borderRadius: "5px",
        backgroundColor: "#0d0d0d",
        fontSize: "13px"
      }}>
        {chat.map((msg, i) => (
          <div key={i} style={{ marginBottom: "6px" }}>
            <strong style={{ color: "#58a6ff" }}>{msg.username}:</strong> {msg.message}
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
            border: "1px solid #444",
            backgroundColor: "#2e2e2e",
            color: "#fff",
            fontSize: "13px"
          }}
          placeholder="Type a message..."
        />
        <button type="submit" style={{
          padding: "8px 12px",
          borderRadius: "4px",
          backgroundColor: "#2ea043",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontSize: "13px"
        }}>
          Send
        </button>
      </form>
    </div>
  );
}

export default ChatBox;
