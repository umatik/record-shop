export default function DiscogsCredit({ release, master }: { release?: number; master?: number }) {
  const path = release ? "release/" + release : master ? "master/" + master : null;
  return path ? (
    <small className="discogs-credit" lang="en">
      Data provided by <a href={"https://www.discogs.com/" + path}>Discogs</a>.
    </small>
  ) : null;
}
