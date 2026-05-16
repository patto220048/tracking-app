import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Play, Pause, Square, Plus, Settings2, Target, Crosshair, MonitorPlay } from "lucide-react";
import "./App.css";

function App() {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleStartTracking = async () => {
    try {
      const response = await invoke<string>("init_ai_engine");
      alert(response);
    } catch (error) {
      alert(error);
    }
  };

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
      {/* HEADER */}
      <header className="linear-border linear-bg-surface" style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target className="linear-accent" size={18} />
          <span style={{ fontWeight: 600, fontSize: '13px', letterSpacing: '-0.01em' }}>NanoTrack Studio</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="linear-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <Plus size={14} /> Import Video
          </button>
          <button className="linear-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            Export
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* LEFT TOOLBAR */}
        <div className="linear-bg-surface linear-border" style={{ width: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: '8px', borderRight: '1px solid' }}>
          <button className="linear-icon-btn" title="Select Tool">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="m13 13 6 6"/></svg>
          </button>
          <button className="linear-icon-btn" title="Lock-on Target" style={{ color: '#EEEEEE', backgroundColor: '#222222' }}>
            <Crosshair size={18} />
          </button>
          <button className="linear-icon-btn" title="Settings" style={{ marginTop: 'auto' }}>
            <Settings2 size={18} />
          </button>
        </div>

        {/* CENTER VIDEO VIEWER */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', backgroundColor: '#0A0A0A', position: 'relative' }}>
          <div className="linear-border linear-bg-elevated" style={{ flex: 1, borderRadius: '12px', border: '1px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', overflow: 'hidden', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)' }}>
            <MonitorPlay size={48} className="linear-text-muted" style={{ opacity: 0.2, marginBottom: '16px' }} />
            <p className="linear-text-muted" style={{ fontSize: '13px' }}>No video selected. Import a video to begin.</p>
          </div>
          
          {/* PLAYER CONTROLS */}
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
             <button className="linear-icon-btn" style={{ padding: '4px' }}>
               <Square size={16} fill="currentColor" />
             </button>
             <button className="linear-icon-btn" style={{ padding: '4px' }} onClick={() => setIsPlaying(!isPlaying)}>
               {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
             </button>
             <div style={{ fontSize: '12px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }} className="linear-text-muted">
                00:00:00:00 / 00:00:00:00
             </div>
          </div>
        </div>

        {/* RIGHT PROPERTY PANEL */}
        <div className="linear-bg-surface linear-border" style={{ width: '280px', borderLeft: '1px solid', display: 'flex', flexDirection: 'column' }}>
           <div className="linear-border" style={{ padding: '12px 16px', borderBottom: '1px solid', fontSize: '11px', fontWeight: 600, color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
             Inspector
           </div>
           
           <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                 <label style={{ fontSize: '12px', color: '#888888', marginBottom: '8px', display: 'block', fontWeight: 500 }}>Tracking Engine</label>
                 <select className="linear-border" style={{ width: '100%', backgroundColor: '#0A0A0A', color: '#EEE', padding: '8px', borderRadius: '6px', fontSize: '12px', outline: 'none', border: '1px solid' }}>
                    <option>NanoTrack AI (Recommended)</option>
                    <option>OpenCV CSRT (Legacy)</option>
                 </select>
              </div>
              
              <div>
                 <label style={{ fontSize: '12px', color: '#888888', marginBottom: '8px', display: 'block', fontWeight: 500 }}>Smoothing (EMA Alpha)</label>
                 <input type="range" min="1" max="100" defaultValue="30" style={{ width: '100%', accentColor: '#5E6AD2', height: '4px', backgroundColor: '#282828', borderRadius: '2px', appearance: 'none' }} />
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666', marginTop: '6px' }}>
                    <span>Laggy</span>
                    <span>Smooth</span>
                    <span>Jittery</span>
                 </div>
              </div>
              
              <div className="linear-border" style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#1A1A1A', marginTop: '8px', border: '1px solid' }}>
                 <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#EEEEEE' }}>How to track</div>
                 <ol style={{ fontSize: '12px', color: '#888888', lineHeight: 1.6, paddingLeft: '16px', margin: 0 }}>
                   <li>Select the crosshair tool.</li>
                   <li>Draw a box over your target.</li>
                   <li>Press Start Tracking.</li>
                 </ol>
                 <button className="linear-btn-primary" onClick={handleStartTracking} style={{ width: '100%', marginTop: '16px', fontSize: '12px', backgroundColor: '#5E6AD2', color: '#FFF' }}>
                    Start AI Tracking
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* BOTTOM TIMELINE */}
      <div className="linear-bg-surface linear-border" style={{ height: '220px', borderTop: '1px solid', display: 'flex', flexDirection: 'column' }}>
         <div className="linear-border" style={{ padding: '8px 16px', borderBottom: '1px solid', fontSize: '11px', color: '#888888', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timeline</span>
            <span style={{ padding: '2px 6px', backgroundColor: '#1A1A1A', borderRadius: '4px', border: '1px solid #282828' }}>Fit to view</span>
         </div>
         <div style={{ flex: 1, backgroundColor: '#0A0A0A', position: 'relative', padding: '12px 0' }}>
            
            {/* Playhead */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '25%', width: '1px', backgroundColor: '#F44336', zIndex: 10 }}>
                <div style={{ position: 'absolute', top: 0, left: '-4px', width: '9px', height: '9px', backgroundColor: '#F44336', borderBottomLeftRadius: '50%', borderBottomRightRadius: '50%' }}></div>
            </div>
            
            {/* Tracks */}
            <div style={{ height: '48px', backgroundColor: '#141414', margin: '4px 16px', borderRadius: '6px', border: '1px solid #282828', display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '11px', color: '#888' }}>
               <div style={{ width: '100px', borderRight: '1px solid #282828', marginRight: '12px' }}>Video 1</div>
               <div style={{ height: '32px', backgroundColor: '#5E6AD2', opacity: 0.2, width: '40%', borderRadius: '4px', border: '1px solid rgba(94, 106, 210, 0.5)' }}></div>
            </div>
            
            <div style={{ height: '48px', backgroundColor: '#141414', margin: '4px 16px', borderRadius: '6px', border: '1px solid #282828', display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '11px', color: '#888' }}>
               <div style={{ width: '100px', borderRight: '1px solid #282828', marginRight: '12px' }}>FX (Lock-on)</div>
            </div>
         </div>
      </div>

    </div>
  );
}

export default App;
