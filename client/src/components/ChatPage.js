import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ChatBox from "./ChatBox";

const ChatPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomId, username } = location.state || {};

  const goBackToEditor = () => {
    navigate(`/editor/${roomId}`, { state: { username } });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#000",
        padding: "2rem",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        color: "#fff",
      }}
    >
      <h2 style={{ fontWeight: "700", fontSize: "2rem", marginBottom: "0.5rem" }}>
        💬 Live Chat
      </h2>

      <p style={{ marginTop: 0, marginBottom: "1rem", fontWeight: "500" }}>
        Room ID: <span style={{ fontWeight: "700" }}>{roomId}</span>
        <br />
        Username: <span style={{ fontWeight: "700" }}>{username}</span>
      </p>

      <button
        onClick={goBackToEditor}
        style={{
          marginBottom: "1.5rem",
          padding: "12px 24px",
          backgroundColor: "#1a73e8",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          fontWeight: "600",
          fontSize: "1rem",
          cursor: "pointer",
          transition: "background-color 0.3s ease",
          userSelect: "none",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#155ab6")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1a73e8")}
      >
        🔙 Back to Editor
      </button>

      <div style={{ height: "500px", overflowY: "auto" }}>
        <ChatBox roomId={roomId} username={username} />
      </div>
    </div>
  );
};

export default ChatPage;
