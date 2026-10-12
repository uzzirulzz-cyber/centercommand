import { notFound } from 'next/navigation';
import { APPS, appBySlug } from '../../../../lib/apps';
import AppDetail from '../../../../components/AppDetail';

export function generateStaticParams() {
  return APPS.map((a) => ({ slug: a.slug }));
}

export default function AppPage({ params }) {
  const app = appBySlug(params.slug);
  if (!app) notFound();
  return <AppDetail app={app} />;
}
