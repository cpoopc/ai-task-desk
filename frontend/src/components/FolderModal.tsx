import React, { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  mode?: 'create' | 'rename';
  initialName?: string;
}

export default function FolderModal({ isOpen, onClose, onCreate, mode = 'create', initialName = '' }: FolderModalProps) {
  const [name, setName] = useState(initialName);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim());
      setName('');
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} onKeyDown={handleKeyDown} />
      <div className="relative bg-white rounded-lg shadow-xl w-80 max-w-[90vw]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-sm text-slate-900">
            {mode === 'rename' ? 'Rename Folder' : 'Create New Folder'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400"
          >
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Folder name"
            className={cn(
              "w-full px-3 py-2 border border-border rounded-md text-sm",
              "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
              "placeholder:text-text-muted"
            )}
            autoFocus
          />
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 text-sm border border-border rounded-md hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className={cn(
                "flex-1 px-3 py-2 text-sm rounded-md transition-colors",
                name.trim()
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              )}
            >
              {mode === 'rename' ? 'Rename' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}