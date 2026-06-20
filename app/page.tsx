import { ReaderApp } from "@/app/components/ReaderApp";
import { getErrorMessage } from "@/lib/api";
import { getReaderEntries, getReaderFeeds } from "@/lib/reader-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    const [feeds, entries] = await Promise.all([getReaderFeeds(), getReaderEntries()]);
    return <ReaderApp initialFeeds={feeds} initialEntries={entries} />;
  } catch (error) {
    return <ReaderApp initialError={getErrorMessage(error)} />;
  }
}
