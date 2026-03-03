import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const LoadingSpinner = ({ className }: { className?: string }) => {
  return <Loader2 className={cn('h-8 w-8 animate-spin text-primary', className)} />;
};

export default LoadingSpinner;
