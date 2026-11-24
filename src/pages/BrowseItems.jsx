import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  PlusCircle,
  LayoutGrid,
  List,
  MapPin,
  Calendar,
  Tag,
  ArrowRight,
  X,
} from 'lucide-react';
import { usePortalData } from '../context/PortalDataContext';
import { getCategoryLabel } from '../data/mockData';
import ItemCard from '../components/ItemCard';
import ItemImage from '../components/ItemImage';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import Button from '../components/Button';
import Card from '../components/Card';

const PAGE_SIZE = 6;

export default function BrowseItems() {
  const { items, categories, locations } = usePortalData();
  const [searchParams, setSearchParams] = useSearchParams();

  const [inputQuery, setInputQuery] = useState(searchParams.get('q') || '');
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [typeFilter, setTypeFilter] = useState('all');
  const categoryFilter = searchParams.get('category') || 'all';
  const [locationFilter, setLocationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const setCategoryFilter = (value) => {
    setPage(1);
    if (value === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ category: value });
    }
  };

  const activeAdvancedCount = [
    categoryFilter !== 'all',
    locationFilter !== 'all',
    statusFilter !== 'all',
    Boolean(dateFrom),
    Boolean(dateTo),
    sortBy !== 'newest',
  ].filter(Boolean).length;

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);

    return items
      .map((item) => {
        const hay = `${item.title} ${item.description} ${item.color || ''} ${item.brand || ''} ${
          item.distinguishingFeatures || ''
        } ${item.location} ${item.reportCode || ''}`.toLowerCase();
        let relevance = 0;
        if (tokens.length > 0) {
          tokens.forEach((tok) => {
            if (item.title.toLowerCase().includes(tok)) relevance += 3;
            if (hay.includes(tok)) relevance += 1;
          });
        }
        return { item, hay, relevance };
      })
      .filter(({ item, hay }) => {
        if (typeFilter !== 'all' && item.type !== typeFilter) return false;
        if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
        if (locationFilter !== 'all' && item.location !== locationFilter) return false;
        if (statusFilter !== 'all' && String(item.status).toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
        if (dateFrom && item.date < dateFrom) return false;
        if (dateTo && item.date > dateTo) return false;
        if (q && !tokens.every((tok) => hay.includes(tok))) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'relevance' && q) return b.relevance - a.relevance;
        if (sortBy === 'oldest') return String(a.item.date).localeCompare(String(b.item.date));
        if (sortBy === 'title') return a.item.title.localeCompare(b.item.title);
        return String(b.item.date).localeCompare(String(a.item.date));
      })
      .map(({ item }) => item);
  }, [items, query, typeFilter, categoryFilter, locationFilter, statusFilter, dateFrom, dateTo, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const hasActiveFilters =
    query ||
    typeFilter !== 'all' ||
    categoryFilter !== 'all' ||
    locationFilter !== 'all' ||
    statusFilter !== 'all' ||
    dateFrom ||
    dateTo;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setQuery(inputQuery);
    setPage(1);
    if (inputQuery.trim()) setSortBy('relevance');
  };

  const resetFilters = () => {
    setInputQuery('');
    setQuery('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setLocationFilter('all');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setSortBy('newest');
    setPage(1);
    setSearchParams({});
  };

  return (
    <div>
      <section className="page-header">
        <div className="container">
          <span className="eyebrow">Campus Item Discovery</span>
          <h1>Browse Lost &amp; Found Items</h1>
          <p className="page-header__lead">
            Search reported campus belongings by item name, keywords, description, category,
            location, status, and date.
          </p>
        </div>
      </section>

      <section className="section section--compact">
        <div className="container">
          {/* Filter Panel */}
          <Card compact className="browse-filters" as="section" aria-label="Filter items">
            <div className="browse-filters__top">
              <form className="browse-search" onSubmit={handleSearchSubmit}>
                <label htmlFor="browse-search-input" className="sr-only">
                  Search reported items
                </label>
                <Search size={18} className="browse-search__icon" aria-hidden="true" />
                <input
                  id="browse-search-input"
                  type="search"
                  className="form-input browse-search__input"
                  placeholder="Search title, description, location..."
                  value={inputQuery}
                  onChange={(e) => {
                    setInputQuery(e.target.value);
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
                {inputQuery && (
                  <button
                    type="button"
                    className="browse-search__clear"
                    aria-label="Clear search query"
                    onClick={() => {
                      setInputQuery('');
                      setQuery('');
                      setPage(1);
                    }}
                  >
                    <X size={15} />
                  </button>
                )}
                <Button type="submit" variant="primary" size="sm" className="browse-search__btn">
                  Search
                </Button>
              </form>

              <div className="browse-filters__controls">
                <div className="toggle-group" role="group" aria-label="Filter by report type">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'lost', label: 'Lost' },
                    { value: 'found', label: 'Found' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`toggle-group__btn ${typeFilter === opt.value ? 'toggle-group__btn--active' : ''}`}
                      onClick={() => {
                        setTypeFilter(opt.value);
                        setPage(1);
                      }}
                      aria-pressed={typeFilter === opt.value}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="btn btn--secondary btn--sm browse-filters__mobile-toggle"
                  onClick={() => setMobileFiltersOpen((prev) => !prev)}
                  aria-expanded={mobileFiltersOpen}
                  aria-controls="browse-advanced-filters"
                >
                  <SlidersHorizontal size={15} aria-hidden="true" />
                  Filters{activeAdvancedCount > 0 ? ` (${activeAdvancedCount})` : ''}
                </button>
              </div>
            </div>

            <div
              id="browse-advanced-filters"
              className={`browse-filters__grid ${mobileFiltersOpen ? 'browse-filters__grid--open' : ''}`}
            >
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="filter-category" className="form-label">
                  Category
                </label>
                <select
                  id="filter-category"
                  className="form-select"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="filter-location" className="form-label">
                  Campus Location
                </label>
                <select
                  id="filter-location"
                  className="form-select"
                  value={locationFilter}
                  onChange={(e) => {
                    setLocationFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All Locations</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="filter-status" className="form-label">
                  Status
                </label>
                <select
                  id="filter-status"
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Potential Match Found">Potential Match Found</option>
                  <option value="Claim Pending">Claim Pending</option>
                  <option value="Verified">Verified</option>
                  <option value="Returned">Returned</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="filter-date-from" className="form-label">
                  Date From
                </label>
                <input
                  id="filter-date-from"
                  type="date"
                  className="form-input"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="filter-sort" className="form-label">
                  Sort By
                </label>
                <select
                  id="filter-sort"
                  className="form-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest">Newest First</option>
                  <option value="relevance">Relevance</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title">Title (A–Z)</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Results Toolbar */}
          <div className="browse-toolbar">
            <p className="browse-toolbar__count" aria-live="polite">
              <SlidersHorizontal size={15} aria-hidden="true" />
              Showing <strong>{filteredItems.length}</strong> of {items.length} campus reports
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              <div className="toggle-group" role="group" aria-label="View layout">
                <button
                  type="button"
                  className={`toggle-group__btn ${viewMode === 'grid' ? 'toggle-group__btn--active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  aria-pressed={viewMode === 'grid'}
                  aria-label="Grid view"
                  style={{ padding: '0.45rem 0.7rem' }}
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  type="button"
                  className={`toggle-group__btn ${viewMode === 'list' ? 'toggle-group__btn--active' : ''}`}
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  aria-label="List view"
                  style={{ padding: '0.45rem 0.7rem' }}
                >
                  <List size={15} />
                </button>
              </div>

              {hasActiveFilters && (
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  <RotateCcw size={14} aria-hidden="true" /> Clear Filters
                </Button>
              )}
              <Button to="/report" variant="primary" size="sm">
                <PlusCircle size={15} aria-hidden="true" /> Report an Item
              </Button>
            </div>
          </div>

          {/* Grid View / List View / Empty State */}
          {paginatedItems.length > 0 ? (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid--3">
                  {paginatedItems.map((item) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {paginatedItems.map((item) => (
                    <Card key={item.id} hover compact className="browse-list-item">
                      <ItemImage item={item} variant="thumb" large />
                      <div className="browse-list-item__body">
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.35rem' }}>
                          <Badge status={item.type} />
                          {item.status && item.status !== item.type && <Badge status={item.status} />}
                          {item.reportCode && <Badge variant="neutral">{item.reportCode}</Badge>}
                        </div>
                        <h3 style={{ fontSize: 'var(--text-xl)', marginBottom: '0.3rem' }}>
                          <Link to={`/items/${item.id}`} style={{ color: 'var(--mocha-900)' }}>
                            {item.title}
                          </Link>
                        </h3>
                        <p style={{ fontSize: 'var(--text-sm)', marginBottom: '0.5rem' }}>
                          {item.description}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', fontSize: 'var(--text-xs)', color: 'var(--mocha-600)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Tag size={13} /> {getCategoryLabel(item.category)}
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <MapPin size={13} /> {item.location}
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Calendar size={13} /> {item.date}
                          </span>
                        </div>
                      </div>
                      <div className="browse-list-item__action">
                        <Button to={`/items/${item.id}`} variant="secondary" size="sm">
                          View Details <ArrowRight size={14} />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <nav className="browse-pagination" aria-label="Pagination">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <div className="browse-pagination__pages">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setPage(num)}
                        aria-current={currentPage === num ? 'page' : undefined}
                        className={`browse-pagination__btn ${
                          currentPage === num ? 'browse-pagination__btn--active' : ''
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </nav>
              )}
            </>
          ) : (
            <EmptyState
              showIllustration
              title="No matching items found"
              description="No campus reports match your current search or filter criteria. Try broadening your filters or post a new lost or found report."
              action={
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                  <Button variant="secondary" onClick={resetFilters}>
                    Reset All Filters
                  </Button>
                  <Button to="/report" variant="primary">
                    Post a New Report
                  </Button>
                </div>
              }
            />
          )}
        </div>
      </section>

      <style>{`
        .browse-filters {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 1.75rem;
        }

        .browse-filters__top {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        @media (min-width: 900px) {
          .browse-filters__top {
            flex-direction: row;
            align-items: center;
          }
        }

        .browse-search {
          position: relative;
          flex: 1;
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .browse-search__icon {
          position: absolute;
          left: 0.9rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--mocha-600);
          pointer-events: none;
        }

        .browse-search__input {
          padding-left: 2.65rem;
          padding-right: 2.2rem;
        }

        .browse-search__clear {
          position: absolute;
          right: 5.8rem;
          top: 50%;
          transform: translateY(-50%);
          border: none;
          background: transparent;
          color: var(--mocha-600);
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          align-items: center;
        }

        .browse-filters__controls {
          display: flex;
          flex-wrap: wrap;
          gap: 0.65rem;
          align-items: center;
        }

        .browse-filters__controls .toggle-group {
          flex: 1 1 180px;
          min-width: 0;
        }

        @media (max-width: 479px) {
          .browse-filters__controls .toggle-group__btn {
            padding: 0.5rem 0.55rem;
            font-size: var(--text-xs);
          }
        }

        .browse-filters__mobile-toggle {
          display: inline-flex;
        }

        .browse-filters__grid {
          display: none;
          grid-template-columns: 1fr;
          gap: 0.9rem;
        }

        .browse-filters__grid--open {
          display: grid;
        }

        @media (min-width: 768px) {
          .browse-filters__controls .toggle-group {
            flex: 0 0 auto;
          }

          .browse-filters__mobile-toggle {
            display: none;
          }

          .browse-filters__grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .browse-filters__grid {
            grid-template-columns: repeat(5, 1fr);
          }
        }

        .browse-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.85rem;
          margin-bottom: 1.5rem;
        }

        .browse-toolbar__count {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          font-size: var(--text-sm);
          color: var(--mocha-600);
          margin: 0;
        }

        .browse-toolbar__count strong {
          color: var(--mocha-900);
        }

        .browse-list-item {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        @media (min-width: 640px) {
          .browse-list-item {
            flex-direction: row;
            align-items: center;
          }
        }

        .browse-list-item__body {
          flex: 1;
          min-width: 0;
        }

        .browse-list-item__action {
          flex-shrink: 0;
        }

        .browse-pagination {
          margin-top: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .browse-pagination__pages {
          display: flex;
          gap: 0.35rem;
        }

        .browse-pagination__btn {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          border: 1px solid var(--sand-300);
          background-color: var(--cream-50);
          color: var(--mocha-900);
          font-weight: 600;
          cursor: pointer;
        }

        .browse-pagination__btn--active {
          background-color: var(--mocha-900);
          color: var(--cream-50);
          border-color: var(--mocha-900);
        }
      `}</style>
    </div>
  );
}
