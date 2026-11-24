import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, PackageCheck, Eye, Trash2, Edit3, CopyCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePortalData } from '../context/PortalDataContext';
import { getCategoryLabel } from '../data/mockData';
import { AdminSubnav } from './AdminDashboard';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import EmptyState from '../components/EmptyState';
import ItemImage from '../components/ItemImage';

const LOST_STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Potential Match Found', label: 'Potential Match Found' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Closed', label: 'Closed' },
];

const FOUND_STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Claim Pending', label: 'Claim Pending' },
  { value: 'Verified', label: 'Verified' },
  { value: 'Returned', label: 'Returned' },
  { value: 'Closed', label: 'Closed' },
];

export default function ManageItems() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { items, categories, locations, updateItem, updateItemStatus, deleteItem, recordHandover } =
    usePortalData();

  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    const qParam = searchParams.get('q');
    if (qParam !== null) setQuery(qParam);
  }, [searchParams]);

  // Edit Item Modal state
  const [editingItem, setEditingItem] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Handover Modal state
  const [handoverItem, setHandoverItem] = useState(null);
  const [handoverDate, setHandoverDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [handoverTime, setHandoverTime] = useState('11:00');
  const [handoverLocation, setHandoverLocation] = useState(
    'Student Services Office, OUTR, Bhubaneswar'
  );
  const [receiverIdType, setReceiverIdType] = useState('Student ID');
  const [receiverId, setReceiverId] = useState('');
  const [notes, setNotes] = useState('');
  const [modalError, setModalError] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (
        statusFilter !== 'all' &&
        String(item.status).toLowerCase() !== statusFilter.toLowerCase()
      ) {
        return false;
      }
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (q) {
        const hay = `${item.id} ${item.reportCode || ''} ${item.title} ${item.description} ${item.location} ${item.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, query, typeFilter, statusFilter, categoryFilter]);

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditTitle(item.title || '');
    setEditCategory(item.category || '');
    setEditLocation(item.location || '');
    setEditColor(item.color || '');
    setEditDescription(item.description || '');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem || !editTitle.trim()) return;
    await updateItem(editingItem.id, {
      title: editTitle.trim(),
      category: editCategory,
      location: editLocation,
      color: editColor.trim(),
      description: editDescription.trim(),
    });
    setEditingItem(null);
  };

  const handleMarkDuplicate = async (item) => {
    await updateItem(item.id, {
      status: 'Closed',
      title: item.title.includes('[Duplicate]') ? item.title : `${item.title} [Duplicate]`,
    });
  };

  const openHandover = (item) => {
    setHandoverItem(item);
    setHandoverDate(new Date().toISOString().split('T')[0]);
    setHandoverTime('11:00');
    setReceiverIdType('Student ID');
    setReceiverId('');
    setNotes('');
    setModalError('');
  };

  const handleSaveHandover = async (e) => {
    e.preventDefault();
    if (!handoverDate || !handoverTime || !receiverId.trim()) {
      setModalError('Please enter handover date, time, and receiver ID number.');
      return;
    }

    await recordHandover(
      handoverItem.id,
      {
        date: handoverDate,
        time: handoverTime,
        location: handoverLocation.trim() || 'Student Services Office, OUTR, Bhubaneswar',
        receiverIdType,
        receiverId: receiverId.trim(),
        notes: notes.trim(),
      },
      user?.name || 'OUTR Campus Administrator'
    );
    setHandoverItem(null);
  };

  return (
    <div>
      <section className="page-header">
        <div className="container">
          <span className="eyebrow">Administration</span>
          <h1>Manage Lost &amp; Found Reports</h1>
          <p className="page-header__lead">
            Filter reported items, edit report details, mark duplicate or suspicious submissions,
            remove inappropriate reports, and log verified handovers.
          </p>
          <AdminSubnav />
        </div>
      </section>

      <section className="section section--compact">
        <div className="container">
          <Card compact style={{ marginBottom: '1.5rem' }}>
            <div className="manage-filters">
              <div style={{ position: 'relative' }}>
                <label htmlFor="admin-item-search" className="sr-only">
                  Search items
                </label>
                <Search
                  size={17}
                  style={{
                    position: 'absolute',
                    left: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--mocha-600)',
                  }}
                  aria-hidden="true"
                />
                <input
                  id="admin-item-search"
                  type="search"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Search title, ID, description, or place"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <select
                aria-label="Filter by report type"
                className="form-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="lost">Lost Reports</option>
                <option value="found">Found Reports</option>
              </select>

              <select
                aria-label="Filter by category"
                className="form-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by status"
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Potential Match Found">Potential Match Found</option>
                <option value="Claim Pending">Claim Pending</option>
                <option value="Verified">Verified</option>
                <option value="Returned">Returned</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </Card>

          {filtered.length > 0 ? (
            <div className="table-wrapper">
              <div className="table-scroll">
                <table className="table table--responsive">
                  <thead>
                    <tr>
                      <th>Item &amp; Photograph</th>
                      <th>Type</th>
                      <th>Category</th>
                      <th>Location &amp; Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => {
                      const statusOptions =
                        item.type === 'lost' ? LOST_STATUS_OPTIONS : FOUND_STATUS_OPTIONS;
                      const isReturned =
                        String(item.status).toLowerCase() === 'returned' ||
                        String(item.status).toLowerCase() === 'resolved';

                      return (
                        <tr key={item.id}>
                          <td data-label="Item" className="td--title">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <ItemImage item={item} variant="thumb" />
                              <div style={{ minWidth: 0 }}>
                                <strong>{item.title}</strong>
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)', whiteSpace: 'nowrap' }}>
                                  {item.reportCode || item.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td data-label="Type">
                            <Badge status={item.type} />
                          </td>
                          <td data-label="Category">{getCategoryLabel(item.category)}</td>
                          <td data-label="Location & Date">
                            <div>{item.location}</div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)', whiteSpace: 'nowrap' }}>
                              {item.date}
                            </div>
                          </td>
                          <td data-label="Status">
                            <select
                              aria-label={`Change status for ${item.title}`}
                              className="form-select"
                              style={{ minWidth: '158px', padding: '0.4rem 0.65rem', fontSize: 'var(--text-xs)' }}
                              value={item.status}
                              onChange={(e) => updateItemStatus(item.id, e.target.value)}
                            >
                              {statusOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td data-label="Actions" className="td--actions">
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              <Link
                                to={`/items/${item.id}`}
                                className="btn btn--secondary btn--sm"
                                aria-label={`View details for ${item.title}`}
                              >
                                <Eye size={14} aria-hidden="true" /> View
                              </Link>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => openEditModal(item)}
                                title="Edit report information"
                              >
                                <Edit3 size={14} aria-hidden="true" /> Edit
                              </Button>
                              {item.status !== 'Closed' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkDuplicate(item)}
                                  title="Mark as duplicate report and close"
                                >
                                  <CopyCheck size={14} aria-hidden="true" /> Duplicate
                                </Button>
                              )}
                              {item.type === 'found' && (
                                <Button
                                  variant={isReturned ? 'ghost' : 'primary'}
                                  size="sm"
                                  disabled={isReturned}
                                  onClick={() => openHandover(item)}
                                >
                                  <PackageCheck size={14} aria-hidden="true" />
                                  {isReturned ? 'Returned' : 'Record Handover'}
                                </Button>
                              )}
                              <Button
                                variant="danger-outline"
                                size="sm"
                                aria-label={`Remove ${item.title}`}
                                onClick={() => deleteItem(item.id)}
                              >
                                <Trash2 size={14} aria-hidden="true" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              showIllustration
              title="No items match your filters"
              description="Try clearing the search query or selecting a broader status filter."
            />
          )}
        </div>
      </section>

      {/* Edit Report Modal */}
      <Modal
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        title={`Edit Report · ${editingItem?.reportCode || editingItem?.id || ''}`}
      >
        {editingItem && (
          <form onSubmit={handleSaveEdit}>
            <Input
              id="admin-edit-title"
              label="Item Name"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <div className="handover-modal-grid">
              <Select
                id="admin-edit-cat"
                label="Category"
                options={categories.map((c) => ({ value: c.id, label: c.label }))}
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
              />
              <Select
                id="admin-edit-loc"
                label="Campus Location"
                options={locations}
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
              />
            </div>
            <Input
              id="admin-edit-color"
              label="Color"
              value={editColor}
              onChange={(e) => setEditColor(e.target.value)}
            />
            <Input
              id="admin-edit-desc"
              label="Description"
              multiline
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <Button type="button" variant="secondary" onClick={() => setEditingItem(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Record Handover Modal */}
      <Modal
        isOpen={Boolean(handoverItem)}
        onClose={() => setHandoverItem(null)}
        title="Record Item Handover"
      >
        {handoverItem && (
          <form onSubmit={handleSaveHandover} noValidate>
            <div className="alert alert--info" style={{ marginBottom: '1.25rem' }}>
              <div>
                <strong>{handoverItem.title} ({handoverItem.reportCode || handoverItem.id})</strong>
                <p style={{ margin: '0.2rem 0 0', fontSize: 'var(--text-xs)' }}>
                  Recording handover marks this item as <strong>Returned</strong> and stores the
                  permanent handover record in the database.
                </p>
              </div>
            </div>

            <div className="handover-modal-grid">
              <Input
                id="handover-date"
                label="Handover Date"
                type="date"
                required
                value={handoverDate}
                onChange={(e) => setHandoverDate(e.target.value)}
              />
              <Input
                id="handover-time"
                label="Handover Time"
                type="time"
                required
                value={handoverTime}
                onChange={(e) => setHandoverTime(e.target.value)}
              />
            </div>

            <Input
              id="handover-location"
              label="Handover Location"
              value={handoverLocation}
              onChange={(e) => setHandoverLocation(e.target.value)}
            />

            <div className="handover-modal-grid">
              <Select
                id="handover-id-type"
                label="Receiver ID Type"
                required
                options={['Student ID', 'Employee / Staff ID', 'Government Photo ID']}
                value={receiverIdType}
                onChange={(e) => setReceiverIdType(e.target.value)}
              />
              <Input
                id="handover-id-number"
                label="Receiver ID Number"
                required
                placeholder="e.g., 23110307"
                value={receiverId}
                onChange={(e) => {
                  setReceiverId(e.target.value);
                  setModalError('');
                }}
              />
            </div>

            <Input
              id="handover-notes"
              label="Verification & Handover Notes"
              multiline
              rows={3}
              placeholder="Note ID check completed, condition of item, or any remarks..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            {modalError && (
              <p className="form-error" role="alert" style={{ marginBottom: '1rem' }}>
                {modalError}
              </p>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', justifyContent: 'flex-end' }}>
              <Button type="button" variant="secondary" onClick={() => setHandoverItem(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                <PackageCheck size={16} aria-hidden="true" /> Confirm &amp; Mark Returned
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <style>{`
        .manage-filters {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
        }

        @media (min-width: 768px) {
          .manage-filters {
            grid-template-columns: 1.8fr 1fr 1fr 1fr;
          }
        }

        .handover-modal-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0 1rem;
        }

        @media (min-width: 520px) {
          .handover-modal-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}
