import { RankingSkeleton } from '@/src/components/page-skeletons';

// Shown at once on navigation while the server renders the page
export default function Loading() {
  return <RankingSkeleton />;
}
