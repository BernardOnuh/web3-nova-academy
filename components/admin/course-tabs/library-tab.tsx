// components/admin/course-tabs/library-tab.tsx — V2 materials & recordings (/v2/admin/courses/:id/materials)
"use client";

import { useState } from 'react';
import { BookOpen, ExternalLink, FileText, FileVideo, Trash2, UploadCloud, Video } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatDate } from '@/lib/format';
import type { LibraryItem } from '@/lib/types';
import { useFeedback } from '../../feedback';
import { Alert, Badge, Button, Card, DataState, EmptyState, FileInput, IconButton, Input, Modal, Select, Textarea } from '../../ui';

export default function LibraryTab({ courseId }: { courseId: string }) {
  const { toast, confirm } = useFeedback();
  const items = useApi<LibraryItem[]>(`/v2/admin/courses/${courseId}/materials`);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'MATERIAL' });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => { setForm({ title: '', description: '', category: 'MATERIAL' }); setFile(null); setError(null); };

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setError('Choose a file to upload.');
    setSaving(true);
    setError(null);
    const fd = new FormData();
    fd.append('title', form.title.trim());
    fd.append('category', form.category);
    if (form.description.trim()) fd.append('description', form.description.trim());
    fd.append('file', file);
    try {
      const created = await api<LibraryItem>(`/v2/admin/courses/${courseId}/materials`, { form: fd });
      items.setData(prev => [created, ...(prev ?? [])]);
      toast(`${created.title} uploaded`);
      setOpen(false);
      reset();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m: LibraryItem) => {
    if (!(await confirm({ title: `Delete “${m.title}”?`, description: 'Students will lose access to this file.', confirmLabel: 'Delete', danger: true }))) return;
    try {
      await api(`/v2/admin/materials/${m.id}`, { method: 'DELETE' });
      items.setData(prev => (prev ?? []).filter(x => x.id !== m.id));
      toast('Deleted');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const list = items.data ?? [];
  const groups = [
    { key: 'MATERIAL', title: 'Materials', icon: BookOpen, rows: list.filter(m => m.category !== 'RECORDING') },
    { key: 'RECORDING', title: 'Recordings', icon: Video, rows: list.filter(m => m.category === 'RECORDING') },
  ];

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">Files here appear in every enrolled student&apos;s Library.</p>
        <Button icon={UploadCloud} onClick={() => setOpen(true)}>Upload</Button>
      </div>

      <DataState loading={items.loading} error={items.error} onRetry={items.reload}>
        {list.length === 0 ? (
          <Card padded={false}>
            <EmptyState icon={BookOpen} title="The library is empty" description="Upload slides, documents or class recordings."
              action={<Button icon={UploadCloud} onClick={() => setOpen(true)}>Upload a file</Button>} />
          </Card>
        ) : (
          <div className="space-y-6">
            {groups.filter(g => g.rows.length).map(g => (
              <div key={g.key}>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200">
                  <g.icon size={16} className="text-brand-soft" /> {g.title} <span className="text-faint">({g.rows.length})</span>
                </h3>
                <Card padded={false}>
                  <ul className="divide-y divide-line">
                    {g.rows.map(m => (
                      <li key={m.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-muted">
                          {m.type === 'video' ? <FileVideo size={18} /> : <FileText size={18} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-white">{m.title}</p>
                          <p className="truncate text-xs text-faint">{m.description || formatDate(m.uploadedAt)}</p>
                        </div>
                        <Badge className="hidden uppercase sm:inline-flex">{m.type}</Badge>
                        <a href={m.cloudinaryUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${m.title}`}
                          className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-white">
                          <ExternalLink size={16} />
                        </a>
                        <IconButton icon={Trash2} label={`Delete ${m.title}`} tone="danger" onClick={() => remove(m)} />
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            ))}
          </div>
        )}
      </DataState>

      <Modal
        open={open}
        onClose={() => { setOpen(false); reset(); }}
        title="Upload to library"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
            <Button type="submit" form="upload-material" icon={UploadCloud} loading={saving}>Upload</Button>
          </>
        }
      >
        <form id="upload-material" onSubmit={upload} className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <Input label="Title" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Week 1 — Intro slides" />
          <Select label="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
            <option value="MATERIAL">Material (slides, documents…)</option>
            <option value="RECORDING">Class recording</option>
          </Select>
          <Textarea label="Description (optional)" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <FileInput label="File" file={file} onChange={e => setFile(e.target.files?.[0] ?? null)} hint="Up to 50MB. The file type is detected automatically." />
        </form>
      </Modal>
    </>
  );
}
