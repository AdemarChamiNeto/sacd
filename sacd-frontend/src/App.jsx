import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import React from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import MinhasDenuncias from './components/MinhasDenuncias';
import Home from './pages/Home';
import Login from './pages/Login';
import Denuncia from './pages/Denuncia';
import Mapa from './pages/Mapa';
import Dashboard from './pages/Dashboard';
import DenunciaDetalhes from './pages/DenunciaDetalhes';
import DenunciasArquivadas from './pages/DenunciasArquivadas';
import Estatisticas from './pages/Estatisticas';
import Usuarios from './pages/Usuarios';
import ProtectedRoute from './components/ProtectedRoute';

// Captura erros de render e mostra mensagem amigável em vez de tela branca
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Erro desconhecido' };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
          <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center border border-rose-100">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Algo deu errado</h2>
            <p className="text-slate-500 text-sm mb-6">{this.state.message}</p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}
              className="bg-primary-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-primary-700 transition-all"
            >
              Voltar para Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

//Componente principal monta o header, minhas denuncias e define as rotas
function AppContent() {
  const location = useLocation();
  const isMapPage = location.pathname === '/mapa';

  return (
    <div className="flex flex-col min-h-screen bg-sacd-light text-sacd-black selection:bg-primary-100 selection:text-primary-700">
      <Header />
      {/* Barra de Minhas Denúncias */}
      {location.pathname === '/' && <MinhasDenuncias />}

{/* mapa tela cheia quando usuario eh cidadao */}
      {isMapPage ? (
        <div className="flex-grow">
          <Routes>
            <Route path="/mapa" element={
              <ProtectedRoute requiredRole="cidadao">
                <Mapa />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      ) : (
        <>
          <main className="flex-grow container mx-auto px-4 pt-8 pb-16">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              {/* Rotas protegidas por nível de acesso */}
              {/* Cidadão e acima */}
              <Route path="/denuncia" element={
                <ProtectedRoute requiredRole="cidadao">
                  <Denuncia />
                </ProtectedRoute>
              } />

              {/* Gerenciador e acima */}
              <Route path="/denuncias" element={
                <ProtectedRoute requiredRole="gerenciador">
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute requiredRole="gerenciador">
                  <Dashboard />
                </ProtectedRoute>
              } />
              {/* Detalhes de denúncia — cidadão vê a sua, gerenciador vê todas */}
              <Route path="/denuncias/:id" element={
                <ProtectedRoute requiredRole="cidadao">
                  <DenunciaDetalhes />
                </ProtectedRoute>
              } />

              {/* Administrador e acima */}
              <Route path="/estatisticas" element={
                <ProtectedRoute requiredRole="administrador">
                  <Estatisticas />
                </ProtectedRoute>
              } />
              <Route path="/arquivadas" element={
                <ProtectedRoute requiredRole="administrador">
                  <DenunciasArquivadas />
                </ProtectedRoute>
              } />

              {/* Somente Técnico */}
              <Route path="/usuarios" element={
                <ProtectedRoute requiredRole="tecnico">
                  <Usuarios />
                </ProtectedRoute>
              } />
            </Routes>
          </main>
          <Footer />
        </>
      )}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppContent />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
