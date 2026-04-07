import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Header from './components/Header';
import Footer from './components/Footer';
import CartSidebar from './components/CartSidebar';
import FloatingContact from './components/FloatingContact';
import Home from './pages/Home';
import Products from './pages/Products';
import Login from './pages/Login';
import Register from './pages/Register';
import Orders from './pages/Orders';
import Support from './pages/Support';
import Checkout from './pages/Checkout';
import AdminPanel from './pages/admin/AdminPanel';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="app-wrapper">
            <Header />
            <CartSidebar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/support" element={<Support />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/admin/*" element={<AdminPanel />} />
              </Routes>
            </main>
            <Footer />
            <FloatingContact />
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
