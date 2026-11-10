import { Suspense } from 'react';
import { TextPractice } from './TextPractice';

export const metadata = { title: 'Mis textos · フリック練習' };

export default function Page() {
  return (
    <Suspense>
      <TextPractice />
    </Suspense>
  );
}
