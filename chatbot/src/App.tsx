import { BrowserRouter as Router } from 'react-router-dom';
import { LanguageProvider } from './components/services/languageContext';
import Chatbot from './components/Chatbot/Chatbot';
import './index.css';

function App() {
  return (
    <Router>
      <LanguageProvider>
        <div className="App">
          <Chatbot />
        </div>
      </LanguageProvider>
    </Router>
  );
}

export default App;
