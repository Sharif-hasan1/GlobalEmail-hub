import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import ProductRow from '../components/ProductRow';
import './Products.css';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('All');

  const fetchProducts = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (category && category !== 'All') params.category = category;

    axios.get('/api/products', { params })
      .then(res => setProducts(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, category]);

  useEffect(() => {
    axios.get('/api/products/categories')
      .then(res => setCategories(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  return (
    <div className="products-page">
      <div className="container">
        {/* Page header */}
        <div className="page-header">
          <h1>Email Account Marketplace</h1>
          <p>Browse our full inventory of verified, aged email accounts</p>
        </div>

        {/* Filters */}
        <div className="products-toolbar">
          <form className="search-form" onSubmit={handleSearch}>
            <div className="search-input-wrap">
              <svg className="search-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.65 16.65 7.5 7.5 0 0016.65 16.65z" />
              </svg>
              <input
                type="text"
                className="form-input search-input"
                placeholder="Search products…"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button type="button" className="search-clear" onClick={() => { setSearchInput(''); setSearch(''); }}>
                  ×
                </button>
              )}
            </div>
            <button type="submit" className="btn btn-primary btn-rounded">Search</button>
          </form>

          <div className="category-filters">
            {['All', ...categories].map(cat => (
              <button
                key={cat}
                className={`cat-btn${category === cat ? ' active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product list */}
        <div className="product-list-container">
          {/* Table header */}
          <div className="product-list-head">
            <span className="plh-info">Product Information</span>
            <span className="plh-stock">Stock</span>
            <span className="plh-price">Price per pc</span>
            <span className="plh-action">Action</span>
          </div>

          <div className="product-list-wrapper card">
            {loading ? (
              <div className="page-loading"><div className="spinner" /></div>
            ) : products.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <h3>No products found</h3>
                <p>Try adjusting your search or category filter.</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => { setSearch(''); setSearchInput(''); setCategory('All'); }}>
                  Clear Filters
                </button>
              </div>
            ) : (
              products.map(p => <ProductRow key={p._id} product={p} />)
            )}
          </div>

          {!loading && products.length > 0 && (
            <p className="results-count">{products.length} product{products.length !== 1 ? 's' : ''} found</p>
          )}
        </div>
      </div>
    </div>
  );
}
