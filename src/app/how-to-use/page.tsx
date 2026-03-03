import { Suspense } from 'react';
import HowToUseClient from './HowToUseClient';

export default function HowToUsePage() {
  return (
    <Suspense fallback={
      <div className="container py-8 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">How to Use Toaa's TimeLogger</h1>
        <p className="text-muted-foreground">Loading your guide...</p>
      </div>
    }>
      <HowToUseClient />
    </Suspense>
  );
}
