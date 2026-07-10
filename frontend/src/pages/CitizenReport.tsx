import { useState, useEffect } from 'react';
import { api, API_BASE } from '../lib/api';
import { Landmark, FilePlus, ClipboardCheck, ArrowRight, UploadCloud, Compass, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type InputMode = 'UPLOAD' | 'DEMO';
type LocationStatus = 'idle' | 'detecting' | 'success' | 'denied';

export default function CitizenReport() {
  const navigate = useNavigate();
  const [inputMode, setInputMode] = useState<InputMode>('UPLOAD');
  
  // Demo Mode States
  const [images, setImages] = useState<string[]>([]);
  const [selectedDemoImage, setSelectedDemoImage] = useState('');
  
  // Upload Mode States
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);

  // Common Report States
  const [citizenName, setCitizenName] = useState('Anonymous');
  const [phone, setPhone] = useState('+91-98200-11111');
  const [description, setDescription] = useState('');
  
  // Location States (explicit for Upload mode)
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');

  const [submitting, setSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<any>(null);

  // Default coordinate presets corresponding to seed images for reliable demo clustering
  const PRESET_COORDS: Record<string, { lat: number; lon: number; addr: string; ward: string; desc: string }> = {
    'leak_01.jpg': {
      lat: 19.1190,
      lon: 72.8470,
      addr: 'Near Chakala Junction, Andheri East',
      ward: 'Ward 7 - Andheri East',
      desc: 'Major underground pipe leak. Water gushing onto the road causing erosion.',
    },
    'road_damage_01.jpg': {
      lat: 19.1192,
      lon: 72.8472,
      addr: 'Chakala Junction Main Road, Andheri East',
      ward: 'Ward 7 - Andheri East',
      desc: 'Cracked asphalt base near Chakala. Road surface crumbling.',
    },
    'pothole_01.jpg': {
      lat: 19.1188,
      lon: 72.8468,
      addr: 'Opposite Star Mall, Andheri East',
      ward: 'Ward 7 - Andheri East',
      desc: 'Deep pothole filled with muddy water. Hazardous for vehicles.',
    },
    'waterlogging_01.jpg': {
      lat: 19.1191,
      lon: 72.8469,
      addr: 'Chakala Signal Road, Andheri East',
      ward: 'Ward 7 - Andheri East',
      desc: 'Flooded road section near Chakala. Water accumulating post-rain.',
    },
    'exposed_wire_01.jpg': {
      lat: 19.0760,
      lon: 72.8780,
      addr: 'Near St. Xavier\'s School Gate, Marine Lines',
      ward: 'Ward 3 - Marine Lines',
      desc: 'Exposed electrical wires hanging low. Extremely hazardous.',
    },
    'garbage_01.jpg': {
      lat: 19.0719,
      lon: 72.8558,
      addr: 'Tilak Nagar Colony, Kurla',
      ward: 'Ward 6 - Kurla',
      desc: 'Waste bins overflowing. Debris scattered into drainage inlets.',
    },
    'drain_01.jpg': {
      lat: 19.0720,
      lon: 72.8560,
      addr: 'Tilak Nagar Market Road, Kurla',
      ward: 'Ward 6 - Kurla',
      desc: 'Drainage grate blocked by plastic waste and trash.',
    }
  };

  useEffect(() => {
    api.getSeedImages().then(res => {
      // Filter out resolution/success images for initial submission list
      const initialSeedImages = (res.images || []).filter((img: string) => !img.startsWith('resolved'));
      setImages(initialSeedImages);
    }).catch(console.error);
  }, []);

  // Demo selection handler
  const handleSelectDemoImage = (img: string) => {
    setSelectedDemoImage(img);
    const preset = PRESET_COORDS[img];
    if (preset) {
      setDescription(preset.desc);
      setLocationName(preset.addr);
      setLatitude(String(preset.lat));
      setLongitude(String(preset.lon));
    }
  };

  // Browser Geolocation
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setLocationStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(String(position.coords.latitude.toFixed(6)));
        setLongitude(String(position.coords.longitude.toFixed(6)));
        setLocationName('Current Location');
        setLocationStatus('success');
      },
      (error) => {
        console.error(error);
        setLocationStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Drag and Drop validation helpers
  const handleFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Unsupported file format. Only JPG, PNG, and WEBP are supported.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds the 10 MB limit.');
      return;
    }
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Drag Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setFilePreview('');
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (inputMode === 'UPLOAD' && !uploadedFile) {
      alert('Please upload a civic issue photo.');
      return;
    }
    if (inputMode === 'DEMO' && !selectedDemoImage) {
      alert('Please select a demo image.');
      return;
    }
    if (!latitude || !longitude) {
      alert('Location is required. Please use "Use My Current Location" to capture your GPS coordinates.');
      return;
    }

    setSubmitting(true);
    try {
      // Automatically map ward based on coordinate presets, fallback to general ward
      let calculatedWard = 'Ward 1 - Municipal General';
      if (inputMode === 'DEMO' && selectedDemoImage) {
        calculatedWard = PRESET_COORDS[selectedDemoImage]?.ward || calculatedWard;
      }

      const payload = {
        citizen_name: citizenName,
        phone,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: locationName || 'Unknown Location',
        ward: calculatedWard,
        description,
        image_filename: inputMode === 'DEMO' ? selectedDemoImage : undefined,
        image_file: inputMode === 'UPLOAD' ? uploadedFile : null,
      };

      const res = await api.submitReport(payload);
      setSubmittedReport(res);
    } catch (err: any) {
      console.error(err);
      alert(`Submission failed: ${err.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
          Submit Citizen Report
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Submit a new civic grievance complaint. Choose between real image uploads with automatic GPS detection, or pre-seeded scenario images to trigger demo clustering.
        </p>
      </div>

      {!submittedReport ? (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          
          {/* Segmented Selector for Input Mode */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 8,
            padding: 4,
            width: 'fit-content',
            marginBottom: 4,
          }}>
            <button
              type="button"
              className={`btn ${inputMode === 'UPLOAD' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setInputMode('UPLOAD');
                removeFile();
                setSelectedDemoImage('');
                setLatitude('');
                setLongitude('');
                setLocationName('');
                setLocationStatus('idle');
              }}
              style={{ border: 'none', padding: '6px 16px', fontSize: 12 }}
            >
              Upload Your Photo
            </button>
            <button
              type="button"
              className={`btn ${inputMode === 'DEMO' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setInputMode('DEMO');
                removeFile();
                setSelectedDemoImage('');
                setLatitude('');
                setLongitude('');
                setLocationName('');
                setLocationStatus('idle');
              }}
              style={{ border: 'none', padding: '6px 16px', fontSize: 12 }}
            >
              Choose Demo Image
            </button>
          </div>

          {/* UPLOAD MODE VIEW */}
          {inputMode === 'UPLOAD' && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                Report Issue Photo
              </label>

              {!filePreview ? (
                /* Drag & Drop Input Area */
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  style={{
                    border: `2px dashed ${dragActive ? 'var(--accent-blue)' : 'var(--border-secondary)'}`,
                    borderRadius: 8,
                    background: dragActive ? 'rgba(37, 99, 235, 0.04)' : 'var(--bg-primary)',
                    padding: '32px 16px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => document.getElementById('citizen-photo-input')?.click()}
                >
                  <UploadCloud size={32} color={dragActive ? 'var(--accent-blue)' : 'var(--text-tertiary)'} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                      Upload Civic Issue Photo
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      Drag and drop an image here or click to browse
                    </div>
                  </div>
                  
                  <input
                    id="citizen-photo-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                  />

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: 11, padding: '4px 12px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById('citizen-photo-input')?.click();
                    }}
                  >
                    CHOOSE IMAGE
                  </button>

                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                    JPG, PNG, WEBP • Max 10 MB
                  </div>
                </div>
              ) : (
                /* Preview Area */
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: 12,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 8,
                }}>
                  <img
                    src={filePreview}
                    alt="Citizen Upload Preview"
                    style={{
                      width: 90,
                      height: 70,
                      borderRadius: 6,
                      objectFit: 'cover',
                      border: '1px solid var(--border-primary)'
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Image Selected</span>
                      <span style={{ fontSize: 10, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                        File: {uploadedFile?.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => document.getElementById('citizen-photo-input')?.click()}
                        style={{ fontSize: 10, padding: '3px 8px' }}
                      >
                        Replace Image
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={removeFile}
                        style={{ fontSize: 10, padding: '3px 8px' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DEMO MODE VIEW */}
          {inputMode === 'DEMO' && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Choose Demo Scenario Image
                </label>
                <span className="badge badge-medium" style={{ fontSize: 9 }}>DEMO MODE</span>
              </div>
              <div className="seed-image-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                {images.map((img) => (
                  <div
                    key={img}
                    className={`seed-image-card ${selectedDemoImage === img ? 'selected' : ''}`}
                    onClick={() => handleSelectDemoImage(img)}
                    style={{
                      borderWidth: 2,
                      borderStyle: 'solid',
                      borderColor: selectedDemoImage === img ? 'var(--accent-blue)' : 'transparent',
                      borderRadius: 8,
                      overflow: 'hidden',
                      background: 'var(--bg-primary)',
                    }}
                  >
                    <img
                      src={`${API_BASE}/seed-images/${img}`}
                      alt={img}
                      style={{ width: '100%', height: 90, objectFit: 'cover' }}
                    />
                    <div style={{ padding: 6, fontSize: 10, textAlign: 'center', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {img}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact Details Card */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Contact Details</h3>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Name</label>
                <input
                  className="input"
                  value={citizenName}
                  onChange={(e) => setCitizenName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Phone</label>
                <input
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Location Manager Details Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Report Location</h3>

              {inputMode === 'UPLOAD' ? (
                /* Auto-detect location for Upload Mode */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {locationStatus === 'idle' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '12px 0' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                        Tap below to automatically detect your current location
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleGetLocation}
                        style={{ fontSize: 11, padding: '8px 16px', gap: 6 }}
                      >
                        <Compass size={14} />
                        Use My Current Location
                      </button>
                    </div>
                  )}

                  {locationStatus === 'detecting' && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 14px',
                      borderRadius: 8,
                      background: 'rgba(37, 99, 235, 0.06)',
                      border: '1px solid rgba(37, 99, 235, 0.15)',
                    }}>
                      <Compass size={16} color="var(--accent-blue)" className="animate-spin" />
                      <span style={{ fontSize: 12, color: 'var(--accent-blue)', fontWeight: 500 }}>Detecting your location…</span>
                    </div>
                  )}

                  {locationStatus === 'success' && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 14px',
                      borderRadius: 8,
                      background: 'rgba(34, 197, 94, 0.06)',
                      border: '1px solid rgba(34, 197, 94, 0.2)',
                    }}>
                      <CheckCircle2 size={18} color="#22c55e" />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>📍 Location Detected</span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Current location captured successfully</span>
                      </div>
                    </div>
                  )}

                  {locationStatus === 'denied' && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      padding: '12px 14px',
                      borderRadius: 8,
                      background: 'rgba(239, 68, 68, 0.06)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertTriangle size={16} color="#ef4444" />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#ef4444' }}>Location Access Denied</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        Location access is required to connect this report with nearby civic incidents.
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleGetLocation}
                        style={{ fontSize: 10, padding: '5px 12px', gap: 4, width: 'fit-content' }}
                      >
                        <Compass size={12} />
                        Retry Location Access
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Static Display fields for Demo Mode */
                selectedDemoImage ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: 'rgba(37, 99, 235, 0.06)',
                    border: '1px solid rgba(37, 99, 235, 0.15)',
                  }}>
                    <MapPin size={18} color="var(--accent-blue)" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>📍 Demo Location</span>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {PRESET_COORDS[selectedDemoImage]?.addr} — {PRESET_COORDS[selectedDemoImage]?.ward}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: '100%', color: 'var(--text-tertiary)', fontSize: 12 }}>
                    <Landmark size={18} />
                    Choose a seed image above to set geo-coordinates
                  </div>
                )
              )}
            </div>
          </div>

          {/* Description Card */}
          <div className="card">
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
              Description
            </label>
            <textarea
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a brief description of the issue..."
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || (inputMode === 'UPLOAD' && !uploadedFile) || (inputMode === 'DEMO' && !selectedDemoImage)}
            style={{ padding: 12, justifyContent: 'center' }}
          >
            {submitting ? (
              <span className="spinner" />
            ) : (
              <>
                <FilePlus size={16} />
                Submit Complaint Report
              </>
            )}
          </button>
        </form>
      ) : (
        /* Submission Success View */
        <div className="card" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          textAlign: 'center',
          gap: 16,
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--status-resolved-bg)',
            border: '1px solid var(--status-resolved)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <ClipboardCheck size={24} color="var(--status-resolved)" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              Grievance Successfully Filed
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Your complaint has been logged under ID: <strong className="font-mono" style={{ color: 'var(--accent-blue)' }}>{submittedReport.report_id}</strong>
            </p>
          </div>

          <div style={{
            display: 'flex',
            gap: 12,
            marginTop: 12,
          }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSubmittedReport(null);
                setUploadedFile(null);
                setFilePreview('');
                setSelectedDemoImage('');
                setLatitude('');
                setLongitude('');
                setLocationName('');
                setDescription('');
              }}
            >
              Submit Another Report
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                navigate('/', { state: { autoAnalyzeId: submittedReport.report_id } });
              }}
            >
              Go to Dashboard and Analyze
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
