import { getMarketData } from '@/lib/market';
import Feed from '@/components/Feed';

export const revalidate = 1800; // refresh data every 30 min

export default async function Page() {
  const data = await getMarketData().catch(() => null);
  return <Feed data={data} />;
}
