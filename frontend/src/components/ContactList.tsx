import React, { useState, useEffect } from 'react';
import { X, Plus, UserPlus, Upload, Trash2, Pencil, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { contactsAPI, type ContactResponse, type CreateContactRequest } from '../services/api';

interface ContactListProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactList({ isOpen, onClose }: ContactListProps) {
  const [contacts, setContacts] = useState<ContactResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<CreateContactRequest>({
    name: '',
    email: '',
    role: 'member',
  });

  useEffect(() => {
    if (isOpen) {
      loadContacts();
    }
  }, [isOpen]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const data = await contactsAPI.list();
      setContacts(data);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        const updated = await contactsAPI.update(editingId, formData);
        setContacts(contacts.map(c => c.id === editingId ? updated : c));
        setEditingId(null);
      } else {
        const created = await contactsAPI.create(formData);
        setContacts([...contacts, created]);
        setShowAddForm(false);
      }
      setFormData({ name: '', email: '', role: 'member' });
    } catch (err) {
      console.error('Failed to save contact:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this contact?')) return;
    try {
      await contactsAPI.delete(id);
      setContacts(contacts.filter(c => c.id !== id));
    } catch (err) {
      console.error('Failed to delete contact:', err);
    }
  };

  const handleEdit = (contact: ContactResponse) => {
    setEditingId(contact.id);
    setFormData({
      name: contact.name,
      email: contact.email,
      role: contact.role,
    });
    setShowAddForm(true);
  };

  const handleImportJira = async () => {
    const mockJiraData = [
      { displayName: 'John Smith', emailAddress: 'john@example.com', accountId: 'jira123' },
      { displayName: 'Jane Doe', emailAddress: 'jane@example.com', accountId: 'jira456' },
    ];
    try {
      const imported = await contactsAPI.importFromJira(mockJiraData);
      setContacts([...contacts, ...imported]);
    } catch (err) {
      console.error('Failed to import from Jira:', err);
    }
  };

  const handleImportSlack = async () => {
    const mockSlackData = [
      { real_name: 'Alice Johnson', email: 'alice@company.com', id: 'U12345' },
      { real_name: 'Bob Wilson', email: 'bob@company.com', id: 'U67890' },
    ];
    try {
      const imported = await contactsAPI.importFromSlack(mockSlackData);
      setContacts([...contacts, ...imported]);
    } catch (err) {
      console.error('Failed to import from Slack:', err);
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'member': return 'bg-blue-100 text-blue-700';
      case 'viewer': return 'bg-gray-100 text-gray-700';
      case 'external': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Contacts</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-100">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
          </div>
          <button
            onClick={() => { setShowAddForm(true); setEditingId(null); setFormData({ name: '', email: '', role: 'member' }); }}
            className="btn btn-primary flex items-center gap-2 h-9 text-xs"
          >
            <Plus size={14} />
            Add
          </button>
          <button onClick={handleImportJira} className="btn btn-secondary flex items-center gap-2 h-9 text-xs">
            <Upload size={14} />
            Jira
          </button>
          <button onClick={handleImportSlack} className="btn btn-secondary flex items-center gap-2 h-9 text-xs">
            <Upload size={14} />
            Slack
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleSubmit} className="px-6 py-3 border-b border-slate-100 bg-slate-50">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/20"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/20"
                required
              />
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/20"
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
                <option value="external">External</option>
              </select>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary flex-1 text-xs">
                  {editingId ? 'Update' : 'Add'} Contact
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setEditingId(null); }}
                  className="btn btn-secondary flex-1 text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No contacts found</div>
          ) : (
            <div className="space-y-2">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{contact.name}</span>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full", getRoleBadgeColor(contact.role))}>
                        {contact.role}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">{contact.email}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(contact)}
                      className="p-1.5 hover:bg-slate-200 rounded transition-colors"
                    >
                      <Pencil size={14} className="text-slate-500" />
                    </button>
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="p-1.5 hover:bg-red-100 rounded transition-colors"
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}