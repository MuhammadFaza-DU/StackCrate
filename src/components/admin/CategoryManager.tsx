'use client';

import * as React from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Category } from '@/lib/types/asset';
import type { ToastType } from '@/components/ui/toast';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { formatCount, formatMessage } from '@/i18n/server';
import type { Message } from '@/i18n/types';
import { localizeResponseError } from '@/lib/api-error';

const text = (message: Message) => typeof message === 'function' ? message() : message;

interface CategoryManagerProps {
  categories: Category[];
  showToast: (type: ToastType, message: string) => void;
  onChanged: () => void;
}

export function CategoryManager({ categories, showToast, onChanged }: CategoryManagerProps) {
  const { locale, dictionary } = useLocale();
  const [form, setForm] = React.useState({ name: '', slug: '', icon: '', sort_order: 0 });
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const subSlug = (v: string) =>
    v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const handleNameChange = (value: string) => {
    setForm((f) => ({ ...f, name: value, slug: f.slug === subSlug(f.name) ? subSlug(value) : f.slug }));
  };

  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) {
      showToast('error', text(dictionary.errors.requiredFields));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, sort_order: Number(form.sort_order) || 0 }),
      });
      if (!res.ok) {
        showToast('error', await localizeResponseError(res, dictionary, dictionary.errors.failedToCreateCategory));
        return;
      }
      showToast('success', formatMessage(text(dictionary.admin.categoryCreateSuccess), { name: form.name }));
      resetCloseAndRefresh();
      onChanged();
    } catch {
      showToast('error', text(dictionary.errors.failedToCreateCategory));
    } finally {
      setBusy(false);
    }
  };

  const updateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/categories/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, sort_order: Number(form.sort_order) || 0 }),
      });
      if (!res.ok) {
        showToast('error', await localizeResponseError(res, dictionary, dictionary.errors.failedToUpdateCategory));
        return;
      }
      showToast('success', formatMessage(text(dictionary.admin.categoryUpdateSuccess), { name: form.name }));
      resetCloseAndRefresh();
      onChanged();
    } catch {
      showToast('error', text(dictionary.errors.failedToUpdateCategory));
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setForm({ name: c.name, slug: c.slug, icon: c.icon ?? '', sort_order: c.sort_order });
  };

  const resetCloseAndRefresh = () => {
    setEditingId(null);
    setForm({ name: '', slug: '', icon: '', sort_order: 0 });
  };

  const deleteCategory = async (c: Category) => {
    if (!window.confirm(formatMessage(text(dictionary.admin.categoryDeleteConfirm), { name: c.name }))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/categories/${c.id}`, { method: 'DELETE' });
      if (!res.ok) {
        showToast('error', await localizeResponseError(res, dictionary, dictionary.errors.failedToDeleteCategory));
        return;
      }
      showToast('success', formatMessage(text(dictionary.admin.categoryDeleteSuccess), { name: c.name }));
      if (editingId === c.id) resetCloseAndRefresh();
      onChanged();
    } catch {
      showToast('error', text(dictionary.errors.failedToDeleteCategory));
    } finally {
      setBusy(false);
    }
  };

  const isEditing = !!editingId;

  return (
    <div className="space-y-4">
      <form onSubmit={isEditing ? updateCategory : createCategory} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="lg:col-span-2">
          <label htmlFor="admin-category-name" className="text-xs font-medium text-muted-foreground">{text(dictionary.admin.categoryName)}</label>
          <Input id="admin-category-name" value={form.name} onChange={(e) => handleNameChange(e.target.value)} placeholder={text(dictionary.admin.categoryNamePlaceholder)} />
        </div>
        <div>
          <label htmlFor="admin-category-slug" className="text-xs font-medium text-muted-foreground">{text(dictionary.admin.categorySlug)}</label>
          <Input
            id="admin-category-slug"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: subSlug(e.target.value) }))}
            placeholder={text(dictionary.admin.categorySlugPlaceholder)}
          />
        </div>
        <div>
          <label htmlFor="admin-category-icon" className="text-xs font-medium text-muted-foreground">{text(dictionary.admin.categoryIcon)}</label>
          <Input
            id="admin-category-icon"
            value={form.icon}
            onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
            placeholder={text(dictionary.admin.categoryIconPlaceholder)}
            maxLength={8}
          />
        </div>
        <div>
          <label htmlFor="admin-category-order" className="text-xs font-medium text-muted-foreground">{text(dictionary.admin.categoryOrder)}</label>
          <Input
            id="admin-category-order"
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))}
            min={0}
          />
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" variant="warm" disabled={busy}>
            {isEditing ? <><Pencil className="w-4 h-4" /> {text(dictionary.admin.saveCategory)}</> : <><Plus className="w-4 h-4" /> {text(dictionary.admin.addCategory)}</>}
          </Button>
          {isEditing && (
            <Button type="button" variant="ghost" onClick={resetCloseAndRefresh} disabled={busy}>
              {text(dictionary.admin.cancelEdit)}
            </Button>
          )}
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <div
            key={c.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-accent/40 px-3 py-1.5 text-sm"
          >
            {c.icon && <span>{c.icon}</span>}
            <span className="font-medium">{c.name}</span>
            <span className="text-xs text-muted-foreground">#{formatCount(c.sort_order, locale)}</span>
            <button
              type="button"
              onClick={() => startEdit(c)}
              className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
              title={formatMessage(text(dictionary.admin.editCategoryLabel), { name: c.name })}
              aria-label={formatMessage(text(dictionary.admin.editCategoryLabel), { name: c.name })}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => deleteCategory(c)}
              className="text-muted-foreground hover:text-red-500 transition-colors"
              title={formatMessage(text(dictionary.admin.deleteCategoryLabel), { name: c.name })}
              aria-label={formatMessage(text(dictionary.admin.deleteCategoryLabel), { name: c.name })}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {categories.length === 0 && <p className="text-sm text-muted-foreground">{text(dictionary.admin.emptyCategories)}</p>}
      </div>
    </div>
  );
}
