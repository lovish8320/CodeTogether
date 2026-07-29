import React, { useEffect, useRef, useState } from "react";
import Editor from "./Editor";
import FileExplorer from "./FileExplorer";
import ChatBox from "./ChatBox";
import VideoChat from "./VideoChat";
import Whiteboard from "./Whiteboard";
import TerminalPane from "./TerminalPane";
import Client from "./Client";
import { initSocket } from "../Socket";
import { ACTIONS } from "../Actions";
import {
  useNavigate,
  useLocation,
  Navigate,
  useParams,
} from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

// Utility to guess language from extension
const getLanguage = (filename) => {
  if (filename.endsWith('.js') || filename.endsWith('.jsx')) return 'javascript';
  if (filename.endsWith('.py')) return 'python';
  if (filename.endsWith('.html')) return 'html';
  if (filename.endsWith('.css')) return 'css';
  if (filename.endsWith('.json')) return 'json';
  if (filename.endsWith('.cpp') || filename.endsWith('.c')) return 'cpp';
  return 'plaintext';
};

const getSnippet = (filename) => {
  if (filename.endsWith('.js') || filename.endsWith('.jsx')) return '// Start coding here\nconsole.log("Hello World!");';
  if (filename.endsWith('.py')) return '# Start coding here\nprint("Hello World!")';
  if (filename.endsWith('.cpp')) return '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello World!" << endl;\n    return 0;\n}';
  if (filename.endsWith('.c')) return '#include <stdio.h>\n\nint main() {\n    printf("Hello World!\\n");\n    return 0;\n}';
  if (filename.endsWith('.java')) return 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World!");\n    }\n}';
  if (filename.endsWith('.html')) return '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <title>Document</title>\n</head>\n<body>\n    <h1>Hello World</h1>\n</body>\n</html>';
  if (filename.endsWith('.css')) return '/* Add your styles here */\nbody {\n    background-color: #f0f0f0;\n}';
  return '';
};

const getExecutionLanguage = (filename) => {
  if (filename.endsWith('.js') || filename.endsWith('.jsx')) return 'nodejs';
  if (filename.endsWith('.py')) return 'python3';
  if (filename.endsWith('.cpp')) return 'cpp';
  if (filename.endsWith('.c')) return 'c';
  if (filename.endsWith('.java')) return 'java';
  return null;
};

function EditorPage() {
  const [clients, setClients] = useState([]);
  const [files, setFiles] = useState([{ id: uuidv4(), name: 'main.js', language: 'javascript', code: '// Start coding here\nconsole.log("Hello World");' }]);
  const [activeFileId, setActiveFileId] = useState(files[0].id);
  const [output, setOutput] = useState("");
  const [isCompiling, setIsCompiling] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isSocketReady, setIsSocketReady] = useState(false);
  const [activeTab, setActiveTab] = useState("code"); // "code" or "whiteboard"
  const terminalRef = useRef(null);

  const Location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();
  const socketRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      const socket = await initSocket();
      if (!isMounted) {
        socket.disconnect();
        return;
      }
      socketRef.current = socket;
      setIsSocketReady(true);
      socketRef.current.on("connect_error", (err) => handleErrors(err));
      socketRef.current.on("connect_failed", (err) => handleErrors(err));

      const handleErrors = (err) => {
        console.log("Error", err);
        toast.error("Socket connection failed, Try again later");
        navigate("/");
      };

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: Location.state?.username,
      });

      socketRef.current.on(
        ACTIONS.JOINED,
        ({ clients, username, socketId }) => {
          if (username !== Location.state?.username) {
            toast.success(`${username} joined the room.`);
          }
          setClients(clients);
          
          // Send current state to the newly joined client
          setFiles((currentFiles) => {
            socketRef.current.emit(ACTIONS.SYNC_CODE, {
              files: currentFiles,
              socketId,
            });
            return currentFiles;
          });
        }
      );

      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast.success(`${username} left the room`);
        setClients((prev) => prev.filter((client) => client.socketId !== socketId));
      });

      // File Sync Events
      socketRef.current.on(ACTIONS.SYNC_CODE, ({ files }) => {
        if (files && files.length > 0) {
          setFiles(files);
          setActiveFileId(files[0].id);
        }
      });

      socketRef.current.on(ACTIONS.CODE_CHANGE, ({ fileId, code }) => {
        setFiles((prevFiles) => prevFiles.map(f => f.id === fileId ? { ...f, code } : f));
      });

      socketRef.current.on(ACTIONS.FILE_CREATED, ({ file }) => {
        setFiles((prevFiles) => [...prevFiles, file]);
      });

      socketRef.current.on(ACTIONS.FILE_DELETED, ({ fileId }) => {
        setFiles((prevFiles) => prevFiles.filter(f => f.id !== fileId));
        setActiveFileId((prevId) => prevId === fileId ? null : prevId);
      });

      socketRef.current.on(ACTIONS.FILE_RENAMED, ({ fileId, newName }) => {
        setFiles((prevFiles) => prevFiles.map(f => f.id === fileId ? { ...f, name: newName, language: getLanguage(newName) } : f));
      });

      socketRef.current.on(ACTIONS.TYPING, ({ username }) => {
        setTypingUsers((prev) => {
          if (!prev.includes(username)) return [...prev, username];
          return prev;
        });
      });

      socketRef.current.on(ACTIONS.STOP_TYPING, ({ username }) => {
        setTypingUsers((prev) => prev.filter(u => u !== username));
      });
    };
    init();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.DISCONNECTED);
        socketRef.current.off(ACTIONS.SYNC_CODE);
        socketRef.current.off(ACTIONS.CODE_CHANGE);
        socketRef.current.off(ACTIONS.FILE_CREATED);
        socketRef.current.off(ACTIONS.FILE_DELETED);
        socketRef.current.off(ACTIONS.FILE_RENAMED);
        socketRef.current.off(ACTIONS.TYPING);
        socketRef.current.off(ACTIONS.STOP_TYPING);
      }
    };
  }, []);

  if (!Location.state) {
    return <Navigate to="/" />;
  }

  if (!isSocketReady) {
    return (
      <div className="d-flex vh-100 vw-100 justify-content-center align-items-center" style={{ backgroundColor: "#1e1e1e", color: "#ccc" }}>
        <h4>Connecting...</h4>
      </div>
    );
  }

  const handleCodeChange = (fileId, code) => {
    setFiles((prevFiles) => prevFiles.map(f => f.id === fileId ? { ...f, code } : f));
  };

  const handleFileCreate = (name) => {
    const newFile = { id: uuidv4(), name, language: getLanguage(name), code: getSnippet(name) };
    setFiles((prev) => [...prev, newFile]);
    setActiveFileId(newFile.id);
    socketRef.current.emit(ACTIONS.FILE_CREATED, { roomId, file: newFile });
  };

  const handleFileUpload = (name, content) => {
    const newFile = { id: uuidv4(), name, language: getLanguage(name), code: content };
    setFiles((prev) => [...prev, newFile]);
    setActiveFileId(newFile.id);
    socketRef.current.emit(ACTIONS.FILE_CREATED, { roomId, file: newFile });
  };

  const handleFileDelete = (fileId) => {
    setFiles((prev) => prev.filter(f => f.id !== fileId));
    if (activeFileId === fileId) {
      setActiveFileId(files.find(f => f.id !== fileId)?.id || null);
    }
    socketRef.current.emit(ACTIONS.FILE_DELETED, { roomId, fileId });
  };

  const handleFileRename = (fileId, newName) => {
    setFiles((prev) => prev.map(f => f.id === fileId ? { ...f, name: newName, language: getLanguage(newName) } : f));
    socketRef.current.emit(ACTIONS.FILE_RENAMED, { roomId, fileId, newName });
  };

  const handleLanguageChange = (fileId, newLanguage) => {
    setFiles((prev) => prev.map(f => f.id === fileId ? { ...f, language: newLanguage } : f));
  };

  const runCode = () => {
    const activeFile = files.find(f => f.id === activeFileId);
    if (!activeFile) return;

    const execLang = getExecutionLanguage(activeFile.name);
    if (!execLang) {
      if (terminalRef.current) {
        terminalRef.current.executeCode('', ''); // Just to clear
      }
      return;
    }

    if (terminalRef.current) {
      terminalRef.current.executeCode(activeFile.code, execLang);
    }
  };

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID copied");
    } catch (error) {
      toast.error("Unable to copy room ID");
    }
  };

  const leaveRoom = () => {
    navigate("/");
  };

  return (
    <div className="d-flex vh-100 vw-100 overflow-hidden" style={{ backgroundColor: "#1e1e1e", color: "#ccc" }}>
      {/* Left Sidebar: File Explorer & Members */}
      <div className="d-flex flex-column" style={{ width: "250px", borderRight: "1px solid #333", backgroundColor: "#252526" }}>
        <div style={{ height: "50%", borderBottom: "1px solid #333", display: "flex", flexDirection: "column" }}>
          <FileExplorer
            files={files}
            activeFileId={activeFileId}
            onFileSelect={setActiveFileId}
            onFileCreate={handleFileCreate}
            onFileDelete={handleFileDelete}
            onFileRename={handleFileRename}
            onFileUpload={handleFileUpload}
          />
        </div>
        <VideoChat socketRef={socketRef} roomId={roomId} username={Location.state?.username} />
        <div className="d-flex flex-column flex-grow-1 p-2 overflow-auto">
          <div style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '8px' }}>Members</div>
          <div className="d-flex flex-column gap-2 mb-3">
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>
          <div className="mt-auto d-flex flex-column gap-2">
            <button className="btn btn-sm btn-outline-primary" onClick={copyRoomId}>Copy Room ID</button>
            <button className="btn btn-sm btn-outline-danger" onClick={leaveRoom}>Leave Room</button>
          </div>
        </div>
      </div>

      {/* Center: Editor / Whiteboard */}
      <div className="d-flex flex-column flex-grow-1 position-relative">
        
        {/* Tabs */}
        <div className="d-flex bg-dark" style={{ borderBottom: "1px solid #333" }}>
          <button 
            className={`btn btn-sm rounded-0 px-4 py-2 ${activeTab === "code" ? "btn-primary" : "btn-dark text-secondary"}`}
            style={{ fontWeight: "bold", fontSize: "12px", borderRight: "1px solid #333" }}
            onClick={() => setActiveTab("code")}
          >
            Code Editor
          </button>
          <button 
            className={`btn btn-sm rounded-0 px-4 py-2 ${activeTab === "whiteboard" ? "btn-primary" : "btn-dark text-secondary"}`}
            style={{ fontWeight: "bold", fontSize: "12px", borderRight: "1px solid #333" }}
            onClick={() => setActiveTab("whiteboard")}
          >
            Whiteboard
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow-1 overflow-hidden">
          {activeTab === "code" ? (
            <Editor
              socketRef={socketRef}
              roomId={roomId}
              username={Location.state?.username}
              activeFile={files.find(f => f.id === activeFileId)}
              onCodeChange={handleCodeChange}
              onLanguageChange={handleLanguageChange}
            />
          ) : (
            <Whiteboard socketRef={socketRef} roomId={roomId} />
          )}
        </div>
        {typingUsers.length > 0 && (
          <div className="position-absolute bottom-0 end-0 m-3 px-3 py-1 rounded bg-dark text-white shadow-sm" style={{ fontSize: "12px", zIndex: 100, border: "1px solid #444", opacity: 0.9 }}>
            {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
          </div>
        )}
      </div>

      {/* Right Sidebar: Terminal & Chat */}
      <div className="d-flex flex-column" style={{ width: "350px", borderLeft: "1px solid #333", backgroundColor: "#1e1e1e" }}>
        
        {/* Terminal / Compiler Output */}
        {/* Output Terminal Area */}
        <div style={{ height: "30%", backgroundColor: "#1e1e1e", borderTop: "1px solid #333", display: "flex", flexDirection: "column" }}>
          <div className="d-flex justify-content-between align-items-center bg-dark p-2" style={{ borderBottom: "1px solid #333" }}>
            <span style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>Terminal</span>
            <button
              className="btn btn-sm btn-success py-0 px-3"
              style={{ fontSize: '12px', fontWeight: 'bold' }}
              onClick={runCode}
            >
              Run Code
            </button>
          </div>
          <div className="flex-grow-1 p-2" style={{ backgroundColor: "#000", overflow: 'hidden' }}>
            <TerminalPane ref={terminalRef} socketRef={socketRef} roomId={roomId} />
          </div>
        </div>

        {/* Chat Box */}
        <div className="flex-grow-1">
          <ChatBox roomId={roomId} username={Location.state?.username} socketRef={socketRef} />
        </div>
      </div>
    </div>
  );
}

export default EditorPage;
