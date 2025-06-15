import './App.css';
import { Routes, Route } from "react-router-dom";
import Home from './components/Home';
import EditorPage from './components/EditorPage';
import ChatPage from './components/ChatPage'; // ✅ import this
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      <div>
        <Toaster position='top-center' />
      </div>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/editor/:roomId' element={<EditorPage />} />
        <Route path='/chat' element={<ChatPage />} /> {/* ✅ new chat route */}
      </Routes>
    </>
  );
}

export default App;
