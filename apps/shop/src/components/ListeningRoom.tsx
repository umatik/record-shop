function videoId(url: URL) {
  const host = url.hostname.replace(/^(www\.|m\.)/, "");
  const parts = url.pathname.split("/");
  const id =
    host === "youtu.be"
      ? parts[1]
      : ["youtube.com", "youtube-nocookie.com"].includes(host)
        ? url.pathname === "/watch"
          ? url.searchParams.get("v")
          : ["embed", "shorts", "live"].includes(parts[1] ?? "")
            ? parts[2]
            : null
        : null;
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

export default function ListeningRoom({ links, title, label }: { links: string[]; title: string; label: string }) {
  const urls = links.flatMap((raw) => {
    try {
      const url = new URL(raw);
      return ["https:", "http:"].includes(url.protocol) ? [url] : [];
    } catch {
      return [];
    }
  });
  const ids = [...new Set(urls.map(videoId).filter((id): id is string => Boolean(id)))];
  if (!urls.length) return null;
  return (
    <section className="listening">
      <h2>{label}</h2>
      {ids.map((id, i) => (
        <div key={id}>
          <iframe
            title={title + " · YouTube " + (i + 1)}
            src={`https://www.youtube-nocookie.com/embed/${id}`}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      ))}
      <div className="listen-controls">
        {urls
          .filter((u) => !videoId(u))
          .map((u) => (
            <a key={u.href} href={u.href}>
              {u.hostname} ↗
            </a>
          ))}
      </div>
    </section>
  );
}
