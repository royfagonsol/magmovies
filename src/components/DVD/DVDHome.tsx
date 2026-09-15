import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../Framework/hooks";
import {
  IDisc,
  NewDisc,
  createDisc,
  deleteDisc,
  fetchDiscs,
  lookupCoverByBarcode,
  resetCoverLookupStatus,
  selectCategories,
  selectDiscs,
  selectDvdError,
  selectDvdStatus,
  selectSavingIds,
  updateDisc,
  uploadCoverImage,
} from "../../redux/DVDSlice";
import { ELoadingStatus } from "../../redux/Enums";
import coverPlaceholder from "../../images/cover-placeholder.svg";
import "./Dvd.css";

const emptyDraft: NewDisc = {
  title: "",
  mainTitle: "",
  barcode: "",
  format: "",
  category: "Uncategorized",
  cast: [],
  year: undefined,
  imageUrl: null,
  coverSource: null,
  notes: "",
};

export default function DVDHome() {
  const dispatch = useAppDispatch();
  const discs = useAppSelector(selectDiscs);
  const status = useAppSelector(selectDvdStatus);
  const error = useAppSelector(selectDvdError);
  const savingIds = useAppSelector(selectSavingIds);
  const categories = useAppSelector(selectCategories);

  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [editing, setEditing] = useState<IDisc | null>(null);
  const [creating, setCreating] = useState<NewDisc | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [pasteBusy, setPasteBusy] = useState(false);

  useEffect(() => {
    dispatch(fetchDiscs());
  }, [dispatch]);

  const visibleDiscs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return discs.filter((disc) => {
      const inCategory =
        activeCategory === "All" || (disc.category || "Uncategorized") === activeCategory;
      if (!inCategory) return false;
      if (!query) return true;
      return (
        disc.mainTitle.toLowerCase().includes(query) || disc.title.toLowerCase().includes(query)
      );
    });
  }, [discs, activeCategory, searchTerm]);

  const grouped = useMemo(() => {
    const map = new Map<string, IDisc[]>();
    visibleDiscs.forEach((disc) => {
      const key = disc.category || "Uncategorized";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(disc);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [visibleDiscs]);

  const startEdit = (disc: IDisc) =>
    setEditing({ ...disc, mainTitle: disc.mainTitle.trim() || disc.title });
  const startCreate = () => {
    setBarcodeInput("");
    setCreating({ ...emptyDraft });
  };

  const runBarcodeLookup = async (barcode: string, target: "editing" | "creating") => {
    if (!barcode.trim()) return;
    setLookupBusy(true);
    try {
      const result = await dispatch(lookupCoverByBarcode(barcode.trim())).unwrap();
      if (target === "editing" && editing) {
        setEditing({
          ...editing,
          barcode: barcode.trim(),
          imageUrl: result.imageUrl ?? editing.imageUrl,
          coverSource: result.coverSource ?? editing.coverSource,
          mainTitle: editing.mainTitle || result.suggestedMainTitle || editing.mainTitle,
        });
      }
      if (target === "creating" && creating) {
        setCreating({
          ...creating,
          barcode: barcode.trim(),
          imageUrl: result.imageUrl ?? creating.imageUrl,
          coverSource: result.coverSource ?? creating.coverSource,
          mainTitle: creating.mainTitle || result.suggestedMainTitle || "",
        });
      }
    } catch {
      // surfaced via selectDvdError / selectCoverLookupStatus if a banner is added later
    } finally {
      setLookupBusy(false);
      dispatch(resetCoverLookupStatus());
    }
  };

  const handleCoverPaste = async (event: React.ClipboardEvent<HTMLElement>) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    const imageItem = Array.from(items).find((item) => item.type.startsWith("image/"));
    if (!imageItem) return; // let normal text paste (e.g. into the title field) proceed

    const blob = imageItem.getAsFile();
    if (!blob) return;

    event.preventDefault();
    setPasteBusy(true);
    try {
      const barcode = editing ? editing.barcode : barcodeInput;
      const result = await dispatch(uploadCoverImage({ blob, barcode })).unwrap();
      if (editing) {
        setEditing({ ...editing, imageUrl: result.imageUrl, coverSource: "manual" });
      } else if (creating) {
        setCreating({ ...creating, imageUrl: result.imageUrl, coverSource: "manual" });
      }
    } catch {
      // surfaced via selectDvdError if an error banner is added later
    } finally {
      setPasteBusy(false);
    }
  };

  const saveEdit = () => {
    if (!editing) return;
    const { id, createdAt, updatedAt, ...changes } = editing;
    dispatch(updateDisc({ id, changes }));
    setEditing(null);
  };

  const saveCreate = () => {
    if (!creating || !creating.title.trim() || !creating.mainTitle.trim()) return;
    dispatch(createDisc(creating));
    setCreating(null);
  };

  const removeDisc = (id: string) => {
    if (window.confirm("Remove this disc from the library?")) {
      dispatch(deleteDisc(id));
    }
  };

  return (
    <div className="dvd-shell">
      <header className="dvd-topbar">
        <span className="dvd-brand">DVD <span>LIBRARY</span></span>
        <input
          className="dvd-search"
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search titles…"
          aria-label="Search titles"
        />
        <div className="dvd-rule" />
        <button className="dvd-add" onClick={startCreate}>+ Add disc</button>
      </header>

      <div className="dvd-layout">
        <aside className="dvd-sidebar" aria-label="Categories">
          <p className="dvd-eyebrow">Categories</p>
          <nav>
            <button
              className={activeCategory === "All" ? "dvd-cat active" : "dvd-cat"}
              onClick={() => setActiveCategory("All")}
            >
              All <small>{discs.length}</small>
            </button>
            {categories.map((category) => (
              <button
                key={category}
                className={activeCategory === category ? "dvd-cat active" : "dvd-cat"}
                onClick={() => setActiveCategory(category)}
              >
                {category}
                <small>{discs.filter((d) => (d.category || "Uncategorized") === category).length}</small>
              </button>
            ))}
          </nav>
        </aside>

        <main className="dvd-main">
          {status === ELoadingStatus.loading && <p className="dvd-muted">Loading your library…</p>}
          {status === ELoadingStatus.error && <p className="dvd-error">{error}</p>}
          {status === ELoadingStatus.loaded && discs.length === 0 && (
            <section className="dvd-empty">
              <span>▧</span>
              <h2>No discs yet</h2>
              <p>Add your first disc, or scan a barcode to pull cover art automatically.</p>
            </section>
          )}
          {status === ELoadingStatus.loaded && discs.length > 0 && visibleDiscs.length === 0 && (
            <section className="dvd-empty">
              <span>⌕</span>
              <h2>No matches</h2>
              <p>Nothing matches "{searchTerm}"{activeCategory !== "All" ? ` in ${activeCategory}` : ""}.</p>
            </section>
          )}

          {grouped.map(([category, items]) => (
            <section key={category} className="dvd-group">
              <h2>{category}</h2>
              <div className="dvd-grid">
                {items.map((disc) => (
                  <article key={disc.id} className="dvd-card">
                    <button className="dvd-cover" onClick={() => startEdit(disc)}>
                      <img
                        src={disc.imageUrl || coverPlaceholder}
                        alt={disc.mainTitle}
                        loading="lazy"
                        onError={(event) => {
                          (event.target as HTMLImageElement).src = coverPlaceholder;
                        }}
                      />
                    </button>
                    <div className="dvd-card-body">
                      <h3>{disc.mainTitle}</h3>
                      <p className="dvd-raw-title">{disc.title}</p>
                      <div className="dvd-card-meta">
                        {disc.format && <span>{disc.format}</span>}
                        {disc.year && <span>{disc.year}</span>}
                      </div>
                      <div className="dvd-card-actions">
                        <button onClick={() => startEdit(disc)} disabled={savingIds.includes(disc.id)}>
                          Edit
                        </button>
                        <button
                          className="dvd-delete"
                          onClick={() => removeDisc(disc.id)}
                          disabled={savingIds.includes(disc.id)}
                        >
                          {savingIds.includes(disc.id) ? "…" : "Delete"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </main>
      </div>

      {(editing || creating) && (
        <div
          className="dvd-modal"
          onMouseDown={(event) => event.target === event.currentTarget && (setEditing(null), setCreating(null))}
        >
          <section className="dvd-modal-content" tabIndex={0} onPaste={handleCoverPaste}>
            <h2>{editing ? "Edit disc" : "Add disc"}</h2>
            <p className="dvd-paste-hint">
              {pasteBusy ? "Uploading pasted image…" : "Tip: copy an image and paste (Ctrl+V) anywhere here to use it as the cover."}
            </p>

            <label>
              Barcode
              <div className="dvd-barcode-row">
                <input
                  value={editing ? editing.barcode ?? "" : barcodeInput}
                  onChange={(event) =>
                    editing
                      ? setEditing({ ...editing, barcode: event.target.value })
                      : setBarcodeInput(event.target.value)
                  }
                  placeholder="Scan or type barcode"
                />
                <button
                  disabled={lookupBusy}
                  onClick={() =>
                    runBarcodeLookup(editing ? editing.barcode ?? "" : barcodeInput, editing ? "editing" : "creating")
                  }
                >
                  {lookupBusy ? "Looking up…" : "Fetch cover"}
                </button>
              </div>
            </label>

            <label>
              Raw title (as printed on the case)
              <input
                value={editing ? editing.title : creating?.title ?? ""}
                onChange={(event) =>
                  editing
                    ? setEditing({ ...editing, title: event.target.value })
                    : setCreating({ ...(creating as NewDisc), title: event.target.value })
                }
                placeholder='e.g. "The Matrix (Keanu Reeves, Laurence Fishburne) [Blu-ray]"'
              />
            </label>

            <label>
              Main title (cleaned, no cast or format)
              <input
                value={editing ? editing.mainTitle : creating?.mainTitle ?? ""}
                onChange={(event) =>
                  editing
                    ? setEditing({ ...editing, mainTitle: event.target.value })
                    : setCreating({ ...(creating as NewDisc), mainTitle: event.target.value })
                }
                placeholder="e.g. The Matrix"
              />
            </label>

            <div className="dvd-modal-row">
              <label>
                Category
                <input
                  value={editing ? editing.category : creating?.category ?? ""}
                  onChange={(event) =>
                    editing
                      ? setEditing({ ...editing, category: event.target.value })
                      : setCreating({ ...(creating as NewDisc), category: event.target.value })
                  }
                  placeholder="Action, Comedy, TV…"
                />
              </label>
              <label>
                Format
                <input
                  value={editing ? editing.format ?? "" : creating?.format ?? ""}
                  onChange={(event) =>
                    editing
                      ? setEditing({ ...editing, format: event.target.value })
                      : setCreating({ ...(creating as NewDisc), format: event.target.value })
                  }
                  placeholder="DVD / Blu-ray / 4K UHD"
                />
              </label>
              <label>
                Year
                <input
                  type="number"
                  value={editing ? editing.year ?? "" : creating?.year ?? ""}
                  onChange={(event) => {
                    const year = event.target.value ? Number(event.target.value) : undefined;
                    editing
                      ? setEditing({ ...editing, year })
                      : setCreating({ ...(creating as NewDisc), year });
                  }}
                />
              </label>
            </div>

            {(editing?.imageUrl || creating?.imageUrl) && (
              <img
                className="dvd-modal-preview"
                src={editing ? editing.imageUrl! : creating!.imageUrl!}
                alt="cover preview"
              />
            )}

            <div className="dvd-modal-actions">
              <button
                className="dvd-cancel"
                onClick={() => {
                  setEditing(null);
                  setCreating(null);
                }}
              >
                Cancel
              </button>
              <button
                className="dvd-save"
                onClick={editing ? saveEdit : saveCreate}
                disabled={editing ? !editing.title.trim() || !editing.mainTitle.trim() : !creating?.title.trim() || !creating?.mainTitle.trim()}
              >
                Save
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
