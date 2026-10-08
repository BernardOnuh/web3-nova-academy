// app/student/materials/page.tsx — course library (GET /v2/courses/:id/library)
"use client";

import { useMemo, useState } from 'react';
import {
  BookOpen, ExternalLink, FileArchive, FileAudio, FileImage, FileSpreadsheet, FileText, FileVideo, Presentation, Search, Video, type LucideIcon,
} from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { useSession } from '@/lib/use-session';
import { formatDate } from '@/lib/format';
import type { Library, LibraryItem, Profile } from '@/lib/types';
import { Alert, Badge, Card, DataState, EmptyState, Input, PageHeader, Tabs } from '@/components/ui';

const TYPE_ICON: Record<string, LucideIcon> = {
  video: FileVideo,
  audio: FileAudio,
  image: FileImage,
  pdf: FileText,
  doc: FileText,
  text: FileText,
  slides: Presentation,
  slide: Presentation,
  csv: FileSpreadsheet,
  archive: FileArchive,
};

function ItemCard({ item }: { item: LibraryItem }) {
  const Icon = TYPE_ICON[item.type] ?? FileText;
  return (
    <a href={item.cloudinaryUrl} target="_blank" rel="noopener noreferrer" className="group">
      <Card className="flex h-full flex-col transition-colors group-hover:border-brand/40">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-xl bg-brand/10 text-brand-soft">
            <Icon size={22} />
          </span>
          <ExternalLink size={16} className="text-faint transition-colors group-hover:text-brand-soft" />
        </div>
        <p className="mt-4 font-semibold text-white line-clamp-2">{item.title}</p>
        {item.description && <p className="mt-1 text-sm text-muted line-clamp-2">{item.description}</p>}
        <div className="mt-auto flex items-center gap-2 pt-4 text-xs text-faint">
          <Badge className="uppercase">{item.type}</Badge>
          {formatDate(item.uploadedAt)}
        </div>
      </Card>
    </a>
  );
}

export default function StudentLibraryPage() {
  const session = useSession();
  const me = useApi<Profile>(session ? '/v2/auth/me' : null);
  const courses = [
    ...(me.data?.course ? [{ id: me.data.course.id, name: me.data.course.name }] : []),
    ...(me.data?.extraCourses ?? []),
  ];
  const [picked, setPicked] = useState<string | null>(null);
  const mainId = session === undefined ? undefined : session?.courseId ?? null;
  const courseId = picked ?? mainId;

  const library = useApi<Library>(courseId ? `/v2/courses/${courseId}/library` : null);
  const [tab, setTab] = useState<'materials' | 'recordings'>('materials');
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    const list = library.data?.[tab] ?? [];
    const q = query.trim().toLowerCase();
    return q ? list.filter(i => i.title.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q)) : list;
  }, [library.data, tab, query]);

  return (
    <>
      <PageHeader
        eyebrow={library.data?.course.name}
        title="Library"
        description="Slides, documents and class recordings for your course."
      />

      {courses.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Choose a course">
          {courses.map(c => (
            <button
              key={c.id}
              role="tab"
              aria-selected={courseId === c.id}
              onClick={() => setPicked(c.id)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${courseId === c.id ? 'border-brand bg-brand/15 text-white' : 'border-line text-muted hover:text-white'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {courseId === null ? (
        <Alert tone="info">You&apos;re not enrolled in a course yet, so there&apos;s nothing in your library.</Alert>
      ) : (
        <DataState loading={courseId === undefined || library.loading} error={library.error} onRetry={library.reload}>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <Tabs
              value={tab}
              onChange={setTab}
              className="border-b-0"
              tabs={[
                { id: 'materials', label: 'Materials', icon: BookOpen, count: library.data?.materials.length ?? 0 },
                { id: 'recordings', label: 'Recordings', icon: Video, count: library.data?.recordings.length ?? 0 },
              ]}
            />
            <Input
              icon={Search}
              placeholder="Search the library…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              wrapperClassName="sm:w-72"
              aria-label="Search the library"
            />
          </div>

          {items.length === 0 ? (
            <Card padded={false}>
              <EmptyState
                icon={tab === 'recordings' ? Video : BookOpen}
                title={query ? 'Nothing matches your search' : tab === 'recordings' ? 'No recordings yet' : 'No materials yet'}
                description={query ? 'Try a different keyword.' : 'Your tutors will upload resources here as the course runs.'}
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map(item => <ItemCard key={item.id} item={item} />)}
            </div>
          )}
        </DataState>
      )}
    </>
  );
}
