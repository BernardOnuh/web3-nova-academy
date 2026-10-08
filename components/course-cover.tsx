// components/course-cover.tsx — course image, or a branded gradient when none is uploaded
import { GraduationCap } from 'lucide-react';
import type { Course } from '@/lib/types';

export default function CourseCover({ course, className = 'h-36' }: { course: Pick<Course, 'name' | 'imageUrl'>; className?: string }) {
  if (course.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- Cloudinary course image
    return <img src={course.imageUrl} alt="" className={`w-full object-cover ${className}`} />;
  }
  return (
    <div className={`relative w-full overflow-hidden bg-gradient-to-br from-brand/30 via-surface-2 to-gold/15 ${className}`}>
      <GraduationCap size={64} className="absolute -bottom-3 -right-2 text-white/10" />
    </div>
  );
}
