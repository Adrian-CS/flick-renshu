import { Suspense } from 'react';
import { Practice } from './Practice';

export const metadata = { title: '練習 · フリック練習' };

export default function Page() {
  return (
    <Suspense>
      <Practice />
    </Suspense>
  );
}
