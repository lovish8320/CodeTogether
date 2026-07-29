import React, { useState } from "react";
import { File, FilePlus, Trash2, Edit2, Code, FileText, Check, X, Upload } from "lucide-react";

const getFileIcon = (filename) => {
  if (filename.endsWith('.js') || filename.endsWith('.jsx')) return <Code size={16} color="#f1e05a" />;
  if (filename.endsWith('.py')) return <Code size={16} color="#3572A5" />;
  if (filename.endsWith('.html')) return <Code size={16} color="#e34c26" />;
  if (filename.endsWith('.css')) return <Code size={16} color="#563d7c" />;
  return <FileText size={16} color="#ccc" />;
};

function FileExplorer({ files, activeFileId, onFileSelect, onFileCreate, onFileDelete, onFileRename, onFileUpload }) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [editingFileId, setEditingFileId] = useState(null);
  const [editingFileName, setEditingFileName] = useState("");
  const fileInputRef = React.useRef(null);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (newFileName.trim()) {
      onFileCreate(newFileName.trim());
      setNewFileName("");
      setIsCreating(false);
    }
  };

  const handleRenameSubmit = (e, id) => {
    e.preventDefault();
    if (editingFileName.trim()) {
      onFileRename(id, editingFileName.trim());
      setEditingFileId(null);
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (typeof onFileUpload === 'function') {
            onFileUpload(file.name, event.target.result);
          }
        };
        reader.readAsText(file);
      });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="d-flex flex-column h-100" style={{ backgroundColor: '#252526', color: '#ccc', borderRight: '1px solid #333' }}>
      <div className="d-flex justify-content-between align-items-center p-2" style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>
        <span>Explorer</span>
        <div>
          <button className="btn btn-sm btn-link text-light p-0 me-2" onClick={() => fileInputRef.current && fileInputRef.current.click()} title="Upload File">
            <Upload size={16} />
          </button>
          <button className="btn btn-sm btn-link text-light p-0" onClick={() => setIsCreating(true)} title="New File">
            <FilePlus size={16} />
          </button>
        </div>
        <input 
          type="file" 
          multiple 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange} 
        />
      </div>

      <div className="flex-grow-1 overflow-auto">
        {isCreating && (
          <div className="px-3 py-1">
            <form onSubmit={handleCreateSubmit} className="d-flex align-items-center">
              <File size={16} className="me-2" />
              <input
                autoFocus
                type="text"
                className="form-control form-control-sm bg-dark text-light border-secondary"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onBlur={() => setIsCreating(false)}
                placeholder="filename.ext"
                style={{ fontSize: '12px' }}
              />
            </form>
          </div>
        )}

        {files.map(file => (
          <div
            key={file.id}
            className={`d-flex align-items-center justify-content-between px-3 py-1 ${activeFileId === file.id ? 'bg-secondary text-white' : ''}`}
            style={{ cursor: 'pointer', fontSize: '13px' }}
            onClick={() => onFileSelect(file.id)}
          >
            <div className="d-flex align-items-center text-truncate" style={{ flex: 1 }}>
              <span className="me-2">{getFileIcon(file.name)}</span>
              {editingFileId === file.id ? (
                <form onSubmit={(e) => handleRenameSubmit(e, file.id)} className="w-100 m-0 p-0">
                  <input
                    autoFocus
                    type="text"
                    className="form-control form-control-sm bg-dark text-light border-0 p-0 m-0"
                    value={editingFileName}
                    onChange={(e) => setEditingFileName(e.target.value)}
                    onBlur={(e) => handleRenameSubmit(e, file.id)}
                    style={{ fontSize: '13px', height: 'auto' }}
                  />
                </form>
              ) : (
                <span className="text-truncate">{file.name}</span>
              )}
            </div>
            
            {!editingFileId && (
              <div className="d-flex align-items-center gap-2 file-actions">
                <Edit2 size={12} className="text-secondary hover-white" onClick={(e) => {
                  e.stopPropagation();
                  setEditingFileId(file.id);
                  setEditingFileName(file.name);
                }} />
                {files.length > 1 && (
                  <Trash2 size={12} className="text-danger hover-white" onClick={(e) => {
                    e.stopPropagation();
                    onFileDelete(file.id);
                  }} />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <style>{`
        .file-actions { opacity: 0; transition: opacity 0.2s; }
        .file-actions:hover, div:hover > .file-actions { opacity: 1; }
        .hover-white:hover { color: #fff !important; }
      `}</style>
    </div>
  );
}

export default FileExplorer;
