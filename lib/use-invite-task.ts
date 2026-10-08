// lib/use-invite-task.ts — "invite friends to the boot camp" bonus task (+100 on admin approval)
"use client";

import { useState } from 'react';
import { api, errorMessage } from './api';
import { useApi } from './use-api';
import type { InviteTask } from './types';

const MAX_PROOF = 8 * 1024 * 1024;

export function useInviteTask() {
  const status = useApi<InviteTask>('/v2/tasks/invite');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!file) return setError('Add a screenshot that shows you shared the flier and link.');
    if (file.size > MAX_PROOF) return setError('Screenshot must be 8MB or smaller.');
    const fd = new FormData();
    fd.append('image', file);
    setSubmitting(true);
    try {
      status.setData(await api<InviteTask>('/v2/tasks/invite/proof', { form: fd }));
      setFile(null);
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const state = status.data?.state ?? 'NOT_STARTED';
  return {
    status,
    state,
    canSubmit: state === 'NOT_STARTED' || state === 'REJECTED',
    file, setFile, submit, submitting, error, setError,
  };
}
