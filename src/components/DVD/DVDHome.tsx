import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../Framework/hooks";
import { logout, selectAuthEmail } from "../../redux/AuthSlice";
import { TripFolder, tripFolders } from "../../data/TripFolders";
import { FolderMedia, imageId, loadGalleryManifest, mediaUrl } from "../../data/GalleryMedia";
import { loadGalleryFolderImages, loadImageDetails, saveMyCaption, saveSharedTags, selectImageDetails, uploadGalleryImages } from "../../redux/GallerySlice";
import "./Gallery.css";

type GalleryView = "photos" | "videos";

export default function GalleryHome() {
  const dispatch = useAppDispatch();
  const email = useAppSelector(selectAuthEmail);
  const [selected, setSelected] = useState<TripFolder>(tripFolders[0]);
  const [view, setView] = useState<GalleryView>("photos");
  const [media, setMedia] = useState<Record<string, FolderMedia>>({});
  const [manifestLoaded, setManifestLoaded] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState("");
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const currentImageId = selectedImage ? imageId(selected.name, selectedImage) : "";
  const details = useAppSelector(state => currentImageId ? selectImageDetails(state, currentImageId) : undefined);

  useEffect(() => {
    loadGalleryManifest()
      .then(manifest => setMedia(manifest.folders))
      .catch(() => setMedia({}))
      .finally(() => setManifestLoaded(true));
  }, []);

  useEffect(() => {
    if (!manifestLoaded || view !== "photos") return;
    dispatch(loadGalleryFolderImages(selected.name)).unwrap()
      .then(result=>setMedia(current=>({...current,[result.folder]:{...(current[result.folder]??{images:[],videos:[]}),images:result.images}})))
      .catch(()=>undefined);
  }, [dispatch, manifestLoaded, selected.name, view]);

  useEffect(() => {
    if (currentImageId) dispatch(loadImageDetails(currentImageId));
  }, [currentImageId, dispatch]);

  useEffect(() => {
    if (details?.status === "loaded") {
      setCaptionText(details.captions.find(caption => caption.isMine)?.text ?? "");
      setEditedTags(details.tags);
    }
  }, [details]);

  const choose = (folder: TripFolder, nextView: GalleryView) => {
    setSelected(folder);
    setView(nextView);
    setSelectedImage(null);
    setSelectedVideo(null);
  };
  const folderMedia = media[selected.name] ?? { images: [], videos: [] };
  const selectedImageIndex = selectedImage ? folderMedia.images.indexOf(selectedImage) : -1;
  const navigateImage = (offset: number) => {
    if (selectedImageIndex < 0 || folderMedia.images.length === 0) return;
    const nextIndex = (selectedImageIndex + offset + folderMedia.images.length) % folderMedia.images.length;
    setSelectedImage(folderMedia.images[nextIndex]);
  };
  const addTags = () => {
    const additions=tagDraft.split(",").map(tag=>tag.trim()).filter(Boolean);
    setEditedTags(current=>[...current,...additions].filter((tag,index,all)=>all.findIndex(value=>value.toLowerCase()===tag.toLowerCase())===index));
    setTagDraft("");
  };
  const uploadImages = (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    setUploadMessage(null);
    dispatch(uploadGalleryImages({folder:selected.name,files})).unwrap()
      .then(result => {
        const uploaded=result.files.filter(file=>file.uploaded).map(file=>file.fileName);
        const skipped=result.files.filter(file=>!file.uploaded);
        if(uploaded.length){
          setMedia(current=>({...current,[selected.name]:{...(current[selected.name]??{images:[],videos:[]}),images:[...(current[selected.name]?.images??[]),...uploaded]}}));
        }
        setUploadMessage(`${uploaded.length} uploaded${skipped.length?`; ${skipped.length} skipped: ${skipped.map(file=>file.fileName).join(", ")}`:"."}`);
      })
      .catch(error=>setUploadMessage(error?.message??"Upload failed."))
      .finally(()=>setUploading(false));
  };

  useEffect(() => {
    if (!selectedImage && !selectedVideo) return;
    const handleKey = (event: KeyboardEvent) => {
      if (selectedImage && event.key === "ArrowLeft") navigateImage(-1);
      if (selectedImage && event.key === "ArrowRight") navigateImage(1);
      if (event.key === "Escape") {
        setSelectedImage(null);
        setSelectedVideo(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  return <div className="gallery-shell">
    <header className="gallery-topbar">
      <button className="gallery-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>LADS <span>TRIP</span></button>
      <div className="gallery-rule" />
      <span className="gallery-user">{email}</span>
      <button className="gallery-signout" onClick={() => dispatch(logout())}>Sign out</button>
    </header>
    <div className="gallery-layout">
      <aside className="gallery-sidebar" aria-label="Trip folders">
        <p className="gallery-eyebrow">The archive</p>
        <nav>{tripFolders.map(folder => <div key={folder.name} className={selected.name === folder.name ? "gallery-trip-row active" : "gallery-trip-row"}>
          <button className="gallery-trip" onClick={() => choose(folder, "photos")}>
            <span className="gallery-flags">{folder.countries.map(code => <img key={code} src={`https://flagcdn.com/w40/${code}.png`} alt={`${code.toUpperCase()} flag`} />)}</span>
            <span>{folder.name}</span><small>{folder.imageCount}</small>
          </button>
          {folder.videoCount > 0 && <button className={selected.name === folder.name && view === "videos" ? "gallery-video-link selected" : "gallery-video-link"} onClick={() => choose(folder, "videos")}>▶ Videos <span>{folder.videoCount}</span></button>}
        </div>)}</nav>
      </aside>
      <main className="gallery-main">
        <section className="gallery-heading">
          <p className="gallery-eyebrow">{view === "photos" ? "Field notes" : "Moving pictures"} / {selected.name.slice(0, 4)}</p>
          <h1>{selected.name}</h1>
          <p>{view === "photos" ? `${selected.imageCount.toLocaleString()} photographs` : `${selected.videoCount.toLocaleString()} videos`} from the archive</p>
          {view === "photos" && <div className="gallery-upload">
            <label className={uploading ? "disabled" : ""} title="Upload images to this trip">
              <span aria-hidden="true">⇧</span>{uploading ? "Uploading…" : "Upload images"}
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading} onChange={event=>{uploadImages(Array.from(event.target.files??[]));event.target.value="";}} />
            </label>
            {uploadMessage&&<p>{uploadMessage}</p>}
          </div>}
        </section>
        {view === "photos" && folderMedia.images.length > 0 ? <section className="gallery-grid">{folderMedia.images.map((file, index) => <button key={file} className="gallery-photo" onClick={() => setSelectedImage(file)}><img src={mediaUrl(selected.name, file)} loading="lazy" alt={file} /><span><b>{String(index + 1).padStart(3, "0")}</b>{file}</span></button>)}</section> :
          view === "videos" && folderMedia.videos.length > 0 ? <section className="gallery-grid">{folderMedia.videos.map(file => <button key={file} className="gallery-photo" onClick={() => setSelectedVideo(file)}><span className="gallery-video-thumb"><video src={`${mediaUrl(selected.name, file)}#t=1`} muted preload="metadata" /><i>▶</i></span><span>{file}</span></button>)}</section> :
          <section className="gallery-empty"><span>{view === "photos" ? "▧" : "▶"}</span><h2>{view === "photos" ? "Photographs" : "Videos"}</h2><p>Generate gallery-manifest.json from the server media folder to list this content.</p></section>}
      </main>
    </div>
    {selectedImage && <div className="gallery-modal" onMouseDown={event => event.target === event.currentTarget && setSelectedImage(null)}>
      <button className="gallery-modal-close" onClick={() => setSelectedImage(null)} aria-label="Close">×</button>
      <section className="gallery-modal-content">
        <div className="gallery-modal-image">
          <button className="gallery-modal-nav previous" onClick={() => navigateImage(-1)} aria-label="Previous image">‹</button>
          <img src={mediaUrl(selected.name, selectedImage)} alt={selectedImage} />
          <button className="gallery-modal-nav next" onClick={() => navigateImage(1)} aria-label="Next image">›</button>
        </div>
        <aside className="gallery-details">
          <p className="gallery-eyebrow">The story</p><h2>{selectedImage}</h2>
          {details?.status === "loading" ? <p className="gallery-muted">Loading captions…</p> : <>
            <section className="gallery-tags"><label>Shared tags</label><div>{editedTags.map(tag=><button key={tag} onClick={()=>setEditedTags(current=>current.filter(value=>value!==tag))}>{tag}<span>×</span></button>)}</div><div className="gallery-tag-entry"><input value={tagDraft} maxLength={200} placeholder="Add tags, separated by commas" onChange={event=>setTagDraft(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();addTags();}}}/><button onClick={addTags} disabled={!tagDraft.trim()}>Add</button></div><button className="gallery-save-secondary" disabled={details?.saving} onClick={()=>dispatch(saveSharedTags({imageId:currentImageId,tags:editedTags}))}>Save shared tags</button></section>
            <section className="gallery-captions">{details?.captions.length ? details.captions.map(caption=><blockquote key={caption.id}><p>{caption.text}</p><footer>{caption.userEmail}{caption.isMine&&<em>Yours</em>}</footer></blockquote>) : <p className="gallery-muted">No captions yet. Be the first.</p>}</section>
            <label className="gallery-caption-editor">Your caption<textarea maxLength={500} value={captionText} placeholder="What was happening here?" onChange={event=>setCaptionText(event.target.value)}/><small>{captionText.length}/500</small></label>
            {details?.error&&<p className="gallery-detail-error">{details.error}</p>}
            <button className="gallery-save-primary" disabled={details?.saving||!captionText.trim()} onClick={()=>dispatch(saveMyCaption({imageId:currentImageId,text:captionText}))}>{details?.saving?"Saving…":details?.captions.some(caption=>caption.isMine)?"Update my caption":"Add my caption"}</button>
          </>}
        </aside>
      </section>
      <span className="gallery-modal-count">{selectedImageIndex + 1} / {folderMedia.images.length}</span>
    </div>}
    {selectedVideo && <div className="gallery-modal gallery-video-modal" onMouseDown={event => event.target === event.currentTarget && setSelectedVideo(null)}>
      <button className="gallery-modal-close" onClick={() => setSelectedVideo(null)} aria-label="Close video">×</button>
      <section className="gallery-video-player">
        <video src={mediaUrl(selected.name, selectedVideo)} controls autoPlay playsInline preload="metadata" />
        <footer>
          <span>{selectedVideo}</span>
          <a href={mediaUrl(selected.name, selectedVideo)} download={selectedVideo}>Download video</a>
        </footer>
      </section>
    </div>}
  </div>;
}
