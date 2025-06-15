import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { initSocket } from "../Socket";
import { ACTIONS } from "../Actions";
import toast from "react-hot-toast";
import { MessageSquare } from "lucide-react";

function Editor() {
  const socketRef = useRef(null);
  const codeRef = useRef("");
  const location = useLocation();
  const { roomId } = useParams();
  const [code, setCode] = useState("");
  const username = location.state?.username;
  const [, setClients] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      try {
        socketRef.current = await initSocket();
        socketRef.current.emit(ACTIONS.JOIN, { roomId, username });

        socketRef.current.on("connect_error", handleError);
        socketRef.current.on("connect_failed", handleError);

        function handleError(e) {
          toast.error("Socket connection failed.");
        }

        socketRef.current.on(ACTIONS.JOINED, ({ clients, username: joinedUser, socketId }) => {
          if (joinedUser !== username) {
            toast.success(`${joinedUser} joined the room.`);
          }

          setClients(clients);

          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current,
            socketId,
          });
        });

        socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
          toast(`${username} left the room.`);
          setClients((prev) => prev.filter((client) => client.socketId !== socketId));
        });

        socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
          setCode(code);
          codeRef.current = code;
        });
      } catch (err) {
        toast.error("Something went wrong.");
      }
    };

    init();

    return () => {
      socketRef.current.disconnect();
      socketRef.current.off(ACTIONS.JOINED);
      socketRef.current.off(ACTIONS.DISCONNECTED);
    };
  }, [roomId, username]);

  const handleCodeChange = (e) => {
    const value = e.target.value;
    setCode(value);
    codeRef.current = value;

    socketRef.current.emit(ACTIONS.CODE_CHANGE, {
      roomId,
      code: value,
    });
  };

  const goToChat = () => {
    navigate("/chat", { state: { roomId, username } });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100%",
        overflow: "hidden",
        backgroundColor: "#121212",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          backgroundColor: "#1e1e1e",
          borderBottom: "1px solid #333",
          flexShrink: 0,
          width: "100%",
        }}
      >
        <span style={{ color: "#58a6ff", fontWeight: "bold", fontSize: "16px" }}>
          Room ID: {roomId}
        </span>
        <button
          onClick={goToChat}
          style={{
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "6px 12px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            cursor: "pointer",
          }}
        >
          <MessageSquare size={18} />
          Chat
        </button>
      </div>

      {/* Code Editor */}
      <textarea
        value={code}
        onChange={handleCodeChange}
        placeholder="Write your code here..."
        style={{
          flex: 1,
          width: "100%",
          height: "100%",
          backgroundColor: "#1e1e1e",
          color: "#ffffff",
          border: "none",
          padding: "16px",
          fontSize: "16px",
          fontFamily: "monospace",
          outline: "none",
          resize: "none",
          boxSizing: "border-box",
          overflow: "auto",
        }}
      />
    </div>
  );
}

export default Editor;
